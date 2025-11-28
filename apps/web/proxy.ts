import { getLogtoContext } from "@logto/next/server-actions";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logtoConfig } from "./config/logto";
import { CookieKey, Cookies } from "./lib/cookies";

export default async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.set("x-current-path", request.nextUrl.pathname);

  const { isAuthenticated } = await getLogtoContext(logtoConfig);

  if (isAuthenticated) {
    return NextResponse.next({ headers });
  }

  await Cookies.set(CookieKey.ROUTE_INTENDED, request.url);

  return NextResponse.redirect(new URL("/api/auth/signin", request.url), {
    headers,
  });
}

export const config = {
  matcher: ["/w/:path*", "/invitations", "/flows/:path*"],
};
