/**
 * Form Deploy Handler (External API)
 *
 * Accepts a multipart file bundle (one .html + assets), validates,
 * uploads assets to S3, processes the HTML (path rewriting, form action
 * injection, SEO meta injection, validation), and stores the result.
 */

import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";
import { uploadPublicFile } from "@/lib/storage";
import {
  validateFormHtml,
  validateHtmlFieldMapping,
  type ApiFieldMapping,
} from "@/lib/forms/html-validation";
import { rewriteRelativePaths } from "@/lib/forms/path-rewriter";
import * as cheerio from "cheerio";

const MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Allowed file extensions and their MIME types.
 */
const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".mp4",
  ".webm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
  ".ico",
]);

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * POST /api/v1/forms/{formId}/deploy
 *
 * Deploy a site bundle to a form.
 */
export async function deployForm(
  workspaceId: string,
  formId: string,
  request: NextRequest,
) {
  // Verify form exists, belongs to workspace, is DRAFT
  const form = await prisma.form.findFirst({
    where: { id: formId, workspaceId },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  if (form.status !== "DRAFT") {
    throw new BadRequestError(
      "Only forms in DRAFT status can be deployed. Create a new version to update a published form.",
      ErrorCode.FORM_NOT_EDITABLE,
    );
  }

  const fieldMapping = form.fieldMapping as ApiFieldMapping | null;

  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    throw new BadRequestError(
      "Form must have a fieldMapping before deploying. Set fieldMapping when creating or updating the form.",
      ErrorCode.FORM_NO_FIELDS,
    );
  }

  // Extract files from multipart upload
  const formData = await request.formData();
  const files: File[] = [];

  for (const entry of formData.getAll("files")) {
    if (entry instanceof File) {
      files.push(entry);
    }
  }

  if (files.length === 0) {
    throw new BadRequestError(
      "No files provided. Upload at least one .html file.",
    );
  }

  // Validate files
  const htmlFiles: File[] = [];
  let totalSize = 0;

  for (const file of files) {
    const ext = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestError(
        `File '${file.name}' has unsupported extension '${ext}'. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      );
    }

    if (file.size > MAX_INDIVIDUAL_FILE_SIZE) {
      throw new BadRequestError(
        `File '${file.name}' exceeds maximum size of ${MAX_INDIVIDUAL_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    totalSize += file.size;

    if (ext === ".html") {
      htmlFiles.push(file);
    }
  }

  if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
    throw new BadRequestError(
      `Total upload size exceeds maximum of ${MAX_TOTAL_UPLOAD_SIZE / 1024 / 1024}MB`,
    );
  }

  if (htmlFiles.length === 0) {
    throw new BadRequestError(
      "Bundle must contain exactly one .html file. None found.",
    );
  }

  if (htmlFiles.length > 1) {
    throw new BadRequestError(
      `Bundle must contain exactly one .html file. Found ${htmlFiles.length}: ${htmlFiles.map((f) => f.name).join(", ")}`,
    );
  }

  const htmlFile = htmlFiles[0];
  const assetFiles = files.filter((f) => f !== htmlFile);

  // Generate deploy ID
  const deployId = String(Date.now());
  const s3BaseKey = `forms/${formId}/site/${deployId}`;

  // Upload asset files to S3
  const uploadedFiles: { name: string; url: string; size: number; type: string }[] = [];

  for (const file of assetFiles) {
    const sanitized = sanitizeFilename(file.name);
    const key = `${s3BaseKey}/${sanitized}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = getMimeType(file.name);
    const result = await uploadPublicFile(key, buffer, contentType);

    uploadedFiles.push({
      name: file.name,
      url: result.publicUrl,
      size: file.size,
      type: contentType,
    });
  }

  // Process the HTML
  let html = await htmlFile.text();

  // Rewrite relative paths to S3 URLs
  const s3BaseUrl = uploadedFiles.length > 0
    ? uploadedFiles[0].url.substring(0, uploadedFiles[0].url.lastIndexOf("/"))
    : `${s3BaseKey}`;

  // Only rewrite if there are assets
  if (assetFiles.length > 0) {
    // Derive the base URL from the first uploaded file
    const firstUrl = uploadedFiles[0].url;
    const baseUrl = firstUrl.substring(0, firstUrl.lastIndexOf("/"));
    html = rewriteRelativePaths(html, baseUrl);
  }

  // Set form action and method
  const $ = cheerio.load(html);
  $("form").attr("action", `/api/internal/v1/forms/${formId}/submissions`);
  $("form").attr("method", "post");

  // Inject SEO meta tags if configured
  if (form.seoTitle || form.seoDescription || form.seoImageUrl || form.seoFaviconUrl) {
    let head = $("head");
    if (head.length === 0) {
      $("html").prepend("<head></head>");
      head = $("head");
    }

    if (form.seoTitle) {
      if (head.find("title").length === 0) {
        head.append(`<title>${escapeHtml(form.seoTitle)}</title>`);
      }
      head.append(
        `<meta property="og:title" content="${escapeAttr(form.seoTitle)}" />`,
      );
    }

    if (form.seoDescription) {
      head.append(
        `<meta name="description" content="${escapeAttr(form.seoDescription)}" />`,
      );
      head.append(
        `<meta property="og:description" content="${escapeAttr(form.seoDescription)}" />`,
      );
    }

    if (form.seoImageUrl) {
      head.append(
        `<meta property="og:image" content="${escapeAttr(form.seoImageUrl)}" />`,
      );
    }

    if (form.seoFaviconUrl) {
      head.append(
        `<link rel="icon" href="${escapeAttr(form.seoFaviconUrl)}" />`,
      );
    }
  }

  html = $.html();

  // Validate the processed HTML
  const htmlValidation = validateFormHtml(html);
  if (!htmlValidation.valid) {
    throw new BadRequestError(
      htmlValidation.errors.map((e) => e.message).join("; "),
      ErrorCode.FORM_VALIDATION_ERROR,
    );
  }

  const fieldValidation = validateHtmlFieldMapping(
    html,
    fieldMapping,
    form.type,
  );
  if (!fieldValidation.valid) {
    throw new BadRequestError(
      fieldValidation.errors.map((e) => e.message).join("; "),
      ErrorCode.FORM_VALIDATION_ERROR,
    );
  }

  // Store processed HTML and deploy info in the fields column
  const allFiles = [
    { name: htmlFile.name, url: "", size: htmlFile.size, type: "text/html" },
    ...uploadedFiles,
  ];

  await prisma.form.update({
    where: { id: formId },
    data: {
      fields: {
        html,
        deployId,
        files: allFiles,
      } as never,
    },
  });

  return responseOk({
    deployId,
    files: allFiles.map((f) => ({ name: f.name, url: f.url })),
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
