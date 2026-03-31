/**
 * Workspace Settings Handler (Internal API)
 *
 * Business logic for workspace settings operations.
 * Manages company address and compliance URLs per workspace.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { KIBAMAIL_DEFAULTS } from "@/lib/workspace/settings";
import { responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { updateWorkspaceSettingsSchema } from "./schema";

/**
 * GET /api/internal/v1/workspace-settings
 *
 * Fetch workspace settings. Returns Kibamail defaults with
 * `isUsingDefaults: true` when no custom settings exist.
 */
export async function getWorkspaceSettings(workspaceId: string) {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings) {
    return responseOk({
      ...KIBAMAIL_DEFAULTS,
      isUsingDefaults: true,
    });
  }

  return responseOk({
    companyName: settings.companyName,
    streetAddress: settings.streetAddress,
    city: settings.city,
    state: settings.state,
    zipCode: settings.zipCode,
    country: settings.country,
    termsUrl: settings.termsUrl,
    privacyUrl: settings.privacyUrl,
    isUsingDefaults: false,
  });
}

/**
 * PUT /api/internal/v1/workspace-settings
 *
 * Create or update workspace settings.
 */
export async function updateWorkspaceSettings(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(
    updateWorkspaceSettingsSchema,
    request,
  );

  const settings = await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      companyName: data.companyName,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      country: data.country,
      termsUrl: data.termsUrl ?? null,
      privacyUrl: data.privacyUrl ?? null,
    },
    update: {
      companyName: data.companyName,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      country: data.country,
      termsUrl: data.termsUrl ?? null,
      privacyUrl: data.privacyUrl ?? null,
    },
  });

  return responseOk({
    companyName: settings.companyName,
    streetAddress: settings.streetAddress,
    city: settings.city,
    state: settings.state,
    zipCode: settings.zipCode,
    country: settings.country,
    termsUrl: settings.termsUrl,
    privacyUrl: settings.privacyUrl,
    isUsingDefaults: false,
  });
}
