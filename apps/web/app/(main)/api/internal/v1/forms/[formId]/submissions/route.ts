/**
 * Public Form Submissions Route (Internal API)
 *
 * POST /api/internal/v1/forms/[formId]/submissions - Submit data to a public form
 *
 * Authentication: None (public endpoint)
 * This endpoint is designed for public form pages where end-users submit forms.
 */

import type { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/requests";
import { createPublicFormSubmission } from "./handler";

/**
 * POST /api/internal/v1/forms/[formId]/submissions
 *
 * Submit data to a public form
 * - For SIGN_UP forms: Creates or updates a contact
 * - For SURVEY forms: Creates a form submission record
 *
 * No authentication required - this is a public endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  return withErrorHandling(request, () =>
    createPublicFormSubmission(formId, request),
  );
}
