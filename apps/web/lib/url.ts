import type { NextRequest } from "next/server";
import { env } from "@/env/schema";

export function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return env.LOGTO_BASE_URL;
}

export function normalizePath(path: string): string {
  if (!path) return "/w";

  if (path.startsWith("/")) return path;

  try {
    return new URL(path).pathname;
  } catch {
    return `/${path}`;
  }
}
