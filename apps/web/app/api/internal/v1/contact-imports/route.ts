/**
 * Contact Imports API Route
 *
 * POST /api/internal/v1/contact-imports
 *
 * Create a new contact import by uploading a CSV file.
 * The file is stored in S3 and a database record is created.
 *
 * Accepts multipart/form-data with a "file" field containing a CSV file.
 */

import type { NextRequest } from "next/server";

import { withErrorHandling, withSession } from "@/lib/api/requests";

import { createContactImport } from "./handler";

export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withSession(request, (session) => createContactImport(session, request)),
  );
}
