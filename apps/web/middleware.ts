import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware to fix request URL when running behind a reverse proxy in Kubernetes.
 *
 * Problem: Next.js constructs request.url using the internal pod hostname instead
 * of the actual domain from the Host header. This causes redirects to go to the
 * wrong URL (e.g., https://pod-name:3000/w instead of https://staging.kibamail.com/w).
 *
 * Solution: Rewrite the request URL using the Host header before it reaches route handlers.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";

  // Only rewrite if we have a valid host and it differs from the URL
  if (host && !request.url.includes(host)) {
    const originalUrl = new URL(request.url);
    const newUrl = new URL(originalUrl.pathname + originalUrl.search, `${proto}://${host}`);

    // Clone the request with the corrected URL
    return NextResponse.rewrite(newUrl, {
      request: {
        headers: request.headers,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
