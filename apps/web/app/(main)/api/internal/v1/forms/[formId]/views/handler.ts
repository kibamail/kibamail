/**
 * Public Form Views Handler (Internal API)
 *
 * Business logic for tracking form page views.
 * No authentication required - this is a public endpoint.
 */

import type { NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { responseCreated } from "@/lib/api/responses";

/**
 * Parse user agent string to extract device, OS, and browser info
 */
function parseUserAgent(userAgent: string | null): {
  device: string | null;
  os: string | null;
  browser: string | null;
} {
  if (!userAgent) {
    return { device: null, os: null, browser: null };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type;
  let device: string | null = null;
  if (deviceType === "mobile") device = "mobile";
  else if (deviceType === "tablet") device = "tablet";
  else device = "desktop";

  const os = result.os.name
    ? `${result.os.name}${result.os.version ? ` ${result.os.version}` : ""}`
    : null;

  const browser = result.browser.name || null;

  return { device, os, browser };
}

/**
 * POST /api/internal/v1/forms/[formId]/views
 *
 * Track a page view for a public form.
 *
 * @param formId - Form ID from URL parameter
 * @param request - Next.js request object
 */
export async function createFormPageView(
  formId: string,
  request: NextRequest
) {
  // Fetch the form to get workspaceId
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      parentId: null,
      deletedAt: null,
    },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!form) {
    throw new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;
  const referrerUrl = request.headers.get("referer") || null;

  const { device, os, browser } = parseUserAgent(userAgent);

  const pageView = await prisma.pageView.create({
    data: {
      workspaceId: form.workspaceId,
      formId: form.id,
      pageType: "FORM",
      ipAddress,
      userAgent,
      device,
      os,
      browser,
      referrerUrl,
    },
  });

  return responseCreated({ id: pageView.id }, "page_view");
}
