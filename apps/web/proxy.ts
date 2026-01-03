import { getLogtoContext } from "@logto/next/server-actions";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logtoConfig } from "./config/logto";
import { CookieKey, Cookies } from "./lib/cookies";
import { getBaseUrl } from "./lib/url";

export default async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.set("x-current-path", request.nextUrl.pathname);

  const { isAuthenticated } = await getLogtoContext(logtoConfig);

  if (isAuthenticated) {
    return NextResponse.next({ headers });
  }

  const baseUrl = getBaseUrl(request);
  const intendedPath = request.nextUrl.pathname + request.nextUrl.search;

  await Cookies.set(CookieKey.ROUTE_INTENDED, intendedPath);

  return NextResponse.redirect(`${baseUrl}/api/auth/signin`, { headers });
}

export const config = {
  matcher: ["/w/:path*", "/invitations", "/flows/:path*"],
};
