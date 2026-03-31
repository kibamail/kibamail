import { prisma } from "@/lib/db";

export interface WorkspaceSettingsData {
  companyName: string;
  streetAddress: string;
  city: string;
  state: string | null;
  zipCode: string | null;
  country: string;
  termsUrl: string;
  privacyUrl: string;
}

export const KIBAMAIL_DEFAULTS: WorkspaceSettingsData = {
  companyName: "Kibamail Messaging Systems Ltd",
  streetAddress: "63 N. Burritt Ave, Room 100 East PMB1247",
  city: "Buffalo",
  state: "WY",
  zipCode: "82834",
  country: "United States",
  termsUrl: "https://kibamail.com/legal/terms-of-service",
  privacyUrl: "https://kibamail.com/legal/privacy-policy",
};

export async function resolveWorkspaceSettings(
  workspaceId: string,
): Promise<WorkspaceSettingsData> {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings) {
    return KIBAMAIL_DEFAULTS;
  }

  return {
    companyName: settings.companyName,
    streetAddress: settings.streetAddress,
    city: settings.city,
    state: settings.state,
    zipCode: settings.zipCode,
    country: settings.country,
    termsUrl: settings.termsUrl ?? KIBAMAIL_DEFAULTS.termsUrl,
    privacyUrl: settings.privacyUrl ?? KIBAMAIL_DEFAULTS.privacyUrl,
  };
}

export function formatBusinessAddress(
  settings: WorkspaceSettingsData,
): string {
  const parts = [settings.companyName, settings.streetAddress];

  const cityLine = [
    settings.city,
    settings.state ? `${settings.state} ${settings.zipCode ?? ""}`.trim() : settings.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityLine) {
    parts.push(cityLine);
  }

  parts.push(settings.country);

  return parts.join("\n");
}

export function buildComplianceVariables(
  settings: WorkspaceSettingsData,
): Record<string, string> {
  return {
    business_address: formatBusinessAddress(settings),
    terms_url: settings.termsUrl,
    privacy_url: settings.privacyUrl,
  };
}
