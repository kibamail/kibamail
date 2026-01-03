import { handleSignIn } from "@logto/next/server-actions";
import { type NextRequest, NextResponse } from "next/server";
import { logtoConfig } from "@/config/logto";
import { CookieKey, Cookies } from "@/lib/cookies";
import { getBaseUrl, normalizePath } from "@/lib/url";

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const baseUrl = getBaseUrl(request);
  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);
  const path = normalizePath(intended ?? "");

  return NextResponse.redirect(`${baseUrl}${path}`);
}
