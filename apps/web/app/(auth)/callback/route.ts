import { handleSignIn } from "@logto/next/server-actions";
import { NextResponse, type NextRequest } from "next/server";
import { logtoConfig } from "@/config/logto";
import { CookieKey, Cookies } from "@/lib/cookies";
import { env } from "@/env/schema";

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return env.LOGTO_BASE_URL;
}

function extractPath(url: string, fallbackBase: string): string {
  try {
    const parsed = new URL(url, fallbackBase);
    return parsed.pathname + parsed.search;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function buildRedirectUrl(
  baseUrl: string,
  intended: string | undefined
): string {
  if (intended) {
    return `${baseUrl}${extractPath(intended, baseUrl)}`;
  }

  return `${baseUrl}/w`;
}

export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);

  const baseUrl = getBaseUrl(request);
  const intended = await Cookies.get(CookieKey.ROUTE_INTENDED);
  const redirectUrl = buildRedirectUrl(baseUrl, intended);

  return NextResponse.redirect(redirectUrl);
}
