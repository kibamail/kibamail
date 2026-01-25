import { getLogtoContext, handleSignIn } from "@logto/next/server-actions";
import { type NextRequest, NextResponse } from "next/server";
import { logtoConfig } from "@/config/logto";
import { CookieKey, Cookies } from "@/lib/cookies";
import { getBaseUrl, normalizePath } from "@/lib/url";
import {
  getUserWithOrganizations,
  invalidateUserCache,
} from "@/lib/auth/user-cache";
import { createWorkspaceViaLogto } from "../../api/internal/v1/workspaces/handler";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const baseUrl = getBaseUrl(request);
  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);
  const path = normalizePath(intended ?? "");

  const user = await getLogtoContext(logtoConfig);

  if (user?.claims?.sub) {
    const orgs = await getUserWithOrganizations(user?.claims?.sub);
    const isNewUser = orgs.organizations.length === 0;

    if (isNewUser) {
      await createWorkspaceViaLogto(
        {
          name: user?.claims?.email as string,
        },
        user?.claims?.sub,
      );
    }
    await invalidateUserCache(user?.claims?.sub);

    const posthog = getPostHogClient();

    posthog.capture({
      distinctId: user.claims.sub,
      event: "user_signed_in",
      properties: {
        email: user.claims.email,
        is_new_user: isNewUser,
        source: "logto_oauth",
      },
    });
    posthog.identify({
      distinctId: user.claims.sub,
      properties: {
        email: user.claims.email,
        created_at: isNewUser ? new Date().toISOString() : undefined,
      },
    });
  }

  return NextResponse.redirect(`${baseUrl}${path}`);
}
