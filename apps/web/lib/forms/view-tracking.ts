/**
 * Server-side Form View Tracking
 *
 * Tracks unique page views for forms using cookies to deduplicate.
 * - Server component checks if view should be tracked (cookie read is allowed)
 * - If needed, creates the PageView record server-side
 * - Cookie is set via response from the API route
 */

import { cookies, headers } from "next/headers";
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/db";

const VIEW_COOKIE_PREFIX = "kiba_fv_";
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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
 * Get the cookie name for a specific form
 */
function getViewCookieName(formId: string): string {
  return `${VIEW_COOKIE_PREFIX}${formId}`;
}

/**
 * Check if a form view has already been tracked (server component safe)
 * Only reads cookies - does not set them.
 */
async function hasFormBeenViewed(formId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieName = getViewCookieName(formId);
  const existingCookie = cookieStore.get(cookieName);
  return !!existingCookie;
}

/**
 * Track a unique page view for a form (server-side)
 *
 * This creates the PageView record but does NOT set cookies
 * (cookies can only be set in Route Handlers or Server Actions).
 *
 * Call this from a server component after checking hasFormBeenViewed().
 *
 * @param formId - The root form ID
 * @param workspaceId - The workspace ID
 * @returns The created page view ID
 */
async function trackFormView(
  formId: string,
  workspaceId: string,
): Promise<string> {
  const headerStore = await headers();

  // Extract request metadata from headers
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || null;
  const userAgent = headerStore.get("user-agent") || null;
  const referrerUrl = headerStore.get("referer") || null;

  const { device, os, browser } = parseUserAgent(userAgent);

  // Create the page view record
  const pageView = await prisma.pageView.create({
    data: {
      workspaceId,
      formId,
      pageType: "FORM",
      ipAddress,
      userAgent,
      device,
      os,
      browser,
      referrerUrl,
    },
  });

  return pageView.id;
}

/**
 * Track a unique form view and return info for cookie setting
 *
 * Checks if already viewed, and if not, creates the record.
 * Returns whether tracking happened and the form ID for cookie setting.
 */
export async function trackUniqueFormView(
  formId: string,
  workspaceId: string,
): Promise<{ tracked: boolean; formId: string }> {
  const alreadyViewed = await hasFormBeenViewed(formId);

  if (alreadyViewed) {
    return { tracked: false, formId };
  }

  await trackFormView(formId, workspaceId);
  return { tracked: true, formId };
}
