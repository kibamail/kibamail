/**
 * Public Form Views Route (Internal API)
 *
 * POST /api/internal/v1/forms/[formId]/views - Track a form page view
 *
 * Authentication: None (public endpoint)
 * This endpoint is designed for public form pages to track views.
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { createFormPageView } from "./handler";

/**
 * POST /api/internal/v1/forms/[formId]/views
 *
 * Track a page view for a public form.
 * Used to calculate form conversion rates.
 *
 * No authentication required - this is a public endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () => createFormPageView(formId, request));
}
