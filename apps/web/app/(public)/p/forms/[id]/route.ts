/**
 * Public Form Route Handler
 *
 * GET /p/forms/[id] — Serves the deployed HTML form page.
 *
 * Reads query params from submission redirects to render state
 * (success messages, validation errors, repopulated field values).
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { renderFormHtml, type FormRenderState } from "@/lib/forms/html-renderer";
import { trackUniqueFormView } from "@/lib/forms/view-tracking";

interface FormContent {
  html: string;
  deployId: string;
  files: Array<{ name: string; url: string; size: number; type: string }>;
}

async function getPublishedFormHtml(
  idOrSlug: string,
): Promise<{ html: string; formId: string; workspaceId: string } | null> {
  const rootForm = await prisma.form.findFirst({
    where: {
      parentId: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      id: true,
      fields: true,
      workspaceId: true,
      publishedVersionId: true,
    },
  });

  if (!rootForm) return null;

  // If there's a published version, use its content
  if (rootForm.publishedVersionId) {
    const publishedVersion = await prisma.form.findFirst({
      where: { id: rootForm.publishedVersionId },
      select: { fields: true },
    });

    if (publishedVersion) {
      const content = publishedVersion.fields as FormContent | null;
      if (content?.html) {
        return {
          html: content.html,
          formId: rootForm.id,
          workspaceId: rootForm.workspaceId,
        };
      }
    }
  }

  // Fall back to root form's content (preview before publishing)
  const content = rootForm.fields as FormContent | null;
  if (content?.html) {
    return {
      html: content.html,
      formId: rootForm.id,
      workspaceId: rootForm.workspaceId,
    };
  }

  return null;
}

/**
 * Parse submission state from query params (base64url encoded).
 */
function parseRenderState(request: NextRequest): FormRenderState {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "success" | "error" | null;

  if (!status) return {};

  const state: FormRenderState = { status };

  const errorsParam = url.searchParams.get("errors");
  if (errorsParam) {
    try {
      state.errors = JSON.parse(
        Buffer.from(errorsParam, "base64url").toString("utf-8"),
      );
    } catch {
      // ignore malformed params
    }
  }

  const messageParam = url.searchParams.get("message");
  if (messageParam) {
    try {
      state.message = Buffer.from(messageParam, "base64url").toString("utf-8");
    } catch {
      // ignore
    }
  }

  const valuesParam = url.searchParams.get("values");
  if (valuesParam) {
    try {
      state.values = JSON.parse(
        Buffer.from(valuesParam, "base64url").toString("utf-8"),
      );
    } catch {
      // ignore
    }
  }

  return state;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idOrSlug } = await params;

  const result = await getPublishedFormHtml(idOrSlug);

  if (!result) {
    return new NextResponse("Form not found", { status: 404 });
  }

  // Track unique page view
  const { tracked } = await trackUniqueFormView(
    result.formId,
    result.workspaceId,
  );

  // Parse submission state from query params
  const renderState = parseRenderState(request);

  // Render HTML with state (errors, success, values)
  const html = renderFormHtml(result.html, renderState);

  // Build response
  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  // Set view cookie if this is a new unique view
  if (tracked) {
    const cookieName = `kiba_fv_${result.formId}`;
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    response.headers.append(
      "Set-Cookie",
      `${cookieName}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    );
  }

  return response;
}
