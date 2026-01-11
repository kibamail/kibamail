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

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const baseUrl = getBaseUrl(request);
  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);
  const path = normalizePath(intended ?? "");

  const user = await getLogtoContext(logtoConfig);

  if (user?.claims?.sub) {
    const orgs = await getUserWithOrganizations(user?.claims?.sub);

    if (orgs.organizations.length === 0) {
      await createWorkspaceViaLogto(
        {
          name: user?.claims?.email as string,
        },
        user?.claims?.sub
      );
    }
    await invalidateUserCache(user?.claims?.sub);
  }

  return NextResponse.redirect(`${baseUrl}${path}`);
}
