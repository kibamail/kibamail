/**
 * Logto Email Webhook - Handler
 *
 * Business logic for /api/internal/v1/logto endpoint.
 * Handles email sending requests from Logto for authentication flows.
 *
 * This handler uses the Kibamail SDK to send Kibamail's own authentication emails,
 * leveraging the template-based transactional email feature.
 */

import { Kibamail } from "kibamail";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/env/schema";

/**
 * Logto email request payload structure
 *
 * Template Types:
 * - SignIn: Verification code for sign-in
 * - Register: Verification code for registration
 * - ForgotPassword: Password reset code
 * - OrganizationInvitation: Organization invite with link
 * - Generic: General purpose
 * - UserPermissionValidation: Sensitive operation validation
 * - BindNewIdentifier: Binding new identifiers
 * - MfaVerification: MFA codes
 * - BindMfa: MFA binding
 */
interface LogtoEmailRequest {
  /** Recipient email address */
  to: string;
  /** Template type matching our template uniqueSlug (e.g., SignIn, Register, ForgotPassword) */
  type: string;
  /** Template variables from Logto */
  payload: {
    /** Verification code (10-minute expiration) */
    code?: string;
    /** Verification/invitation link */
    link?: string;
    /** Resolved user language preference */
    locale?: string;
    /** Space-separated list of BCP 47 language tags from auth request */
    uiLocales?: string;
    /** Application details */
    application?: {
      id?: string;
      name?: string;
      displayName?: string;
      branding?: {
        logoUrl?: string;
        darkLogoUrl?: string;
        favicon?: string;
      };
    };
    /** Organization details */
    organization?: {
      id?: string;
      name?: string;
      branding?: {
        logoUrl?: string;
        darkLogoUrl?: string;
      };
    };
    /** User details */
    user?: {
      id?: string;
      name?: string;
      username?: string;
      primaryEmail?: string;
      primaryPhone?: string;
      avatar?: string;
    };
    /** Inviter details (for OrganizationInvitation) */
    inviter?: {
      name?: string;
    };
    /** Additional dynamic properties */
    [key: string]: unknown;
  };
}

/**
 * Validate the internal service key from the request
 */
export async function validateServiceKey(
  request: NextRequest,
): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const providedKey = authHeader.slice(7);

  return providedKey === env.INTERNAL_SERVICE_KEY;
}

/**
 * Flatten Logto payload into template variables
 *
 * Converts nested Logto payload structure into flat key-value pairs
 * suitable for template variable substitution.
 *
 * Variable naming convention uses camelCase with prefixes for nested objects:
 * - Top-level: code, link, locale, uiLocales
 * - Application: applicationId, applicationName, applicationDisplayName, applicationLogoUrl, etc.
 * - Organization: organizationId, organizationName, organizationLogoUrl, etc.
 * - User: userId, userName, userUsername, userEmail, userPhone, userAvatar
 * - Inviter: inviterName
 */
function flattenPayloadToVariables(
  payload: LogtoEmailRequest["payload"],
): Record<string, string | number> {
  const variables: Record<string, string | number> = {};

  // Top-level fields
  if (payload.code) {
    variables.code = payload.code;
  }

  if (payload.link) {
    variables.link = payload.link;
  }

  if (payload.locale) {
    variables.locale = payload.locale;
  }

  if (payload.uiLocales) {
    variables.uiLocales = payload.uiLocales;
  }

  // Application fields
  if (payload.application?.id) {
    variables.applicationId = payload.application.id;
  }

  if (payload.application?.name) {
    variables.applicationName = payload.application.name;
  }

  if (payload.application?.displayName) {
    variables.applicationDisplayName = payload.application.displayName;
  }

  if (payload.application?.branding?.logoUrl) {
    variables.applicationLogoUrl = payload.application.branding.logoUrl;
  }

  if (payload.application?.branding?.darkLogoUrl) {
    variables.applicationDarkLogoUrl = payload.application.branding.darkLogoUrl;
  }

  if (payload.application?.branding?.favicon) {
    variables.applicationFavicon = payload.application.branding.favicon;
  }

  // Organization fields
  if (payload.organization?.id) {
    variables.organizationId = payload.organization.id;
  }

  if (payload.organization?.name) {
    variables.organizationName = payload.organization.name;
  }

  if (payload.organization?.branding?.logoUrl) {
    variables.organizationLogoUrl = payload.organization.branding.logoUrl;
  }

  if (payload.organization?.branding?.darkLogoUrl) {
    variables.organizationDarkLogoUrl =
      payload.organization.branding.darkLogoUrl;
  }

  // User fields
  if (payload.user?.id) {
    variables.userId = payload.user.id;
  }

  if (payload.user?.name) {
    variables.userName = payload.user.name;
  }

  if (payload.user?.username) {
    variables.userUsername = payload.user.username;
  }

  if (payload.user?.primaryEmail) {
    variables.userEmail = payload.user.primaryEmail;
  }

  if (payload.user?.primaryPhone) {
    variables.userPhone = payload.user.primaryPhone;
  }

  if (payload.user?.avatar) {
    variables.userAvatar = payload.user.avatar;
  }

  // Inviter fields (for OrganizationInvitation)
  if (payload.inviter?.name) {
    variables.inviterName = payload.inviter.name;
  }

  return variables;
}

/**
 * POST /api/internal/v1/logto
 *
 * Handle incoming email send request from Logto.
 * Uses Kibamail SDK to send template-based transactional emails.
 *
 * The Logto `type` field is used directly as the template identifier (uniqueSlug),
 * allowing templates like "SignIn", "Register", "ForgotPassword" to be configured
 * in the Kibamail dashboard.
 *
 * @param request - Next.js request object containing email details
 * @returns 200 OK response on success, error response on failure
 */
export async function handleLogtoWebhook(request: NextRequest) {
  const body = (await request.json()) as LogtoEmailRequest;
  const { to, type, payload } = body;

  const kibamail = new Kibamail(env.KIBAMAIL_API_KEY);

  const variables = flattenPayloadToVariables(payload);

  const { data, error } = await kibamail.emails.send({
    from: env.KIBAMAIL_FROM_EMAIL,
    to,
    template: {
      id: `Logto${type}`,
      variables,
    },
  });

  if (error) {
    console.error("[Logto Webhook] Failed to send email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 },
    );
  }

  console.log({ data });

  return NextResponse.json(
    { success: true, emailId: data?.id },
    { status: 200 },
  );
}
