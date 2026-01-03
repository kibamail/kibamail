/**
 * Service-to-Service Authentication
 *
 * Middleware for authenticating internal service requests (e.g., email-agent to control-plane).
 * Uses a shared secret key for authentication.
 */

import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/env/schema";
import { ErrorCode } from "@/lib/api/error-codes";
import { UnauthorizedError } from "@/lib/api/errors";

/**
 * Handler that receives the request after service authentication
 */
type ServiceHandler = (
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Service authentication middleware
 *
 * Validates service-to-service requests using a shared secret key.
 * Expects Authorization header with format: Bearer <service_key>
 *
 * @param request - Next.js request object
 * @param handler - Handler function to execute after authentication
 * @returns Response from handler or 401 Unauthorized
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withErrorHandling(request, () =>
 *     withServiceAuth(request, async (req) => {
 *       return responseOk({ data: "..." });
 *     })
 *   );
 * }
 * ```
 */
export async function withServiceAuth(
  request: NextRequest,
  handler: ServiceHandler,
): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Missing or invalid Authorization header",
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
  }

  const providedKey = authHeader.slice(7);

  if (!providedKey) {
    throw new UnauthorizedError(
      "Service key is required",
      ErrorCode.MISSING_API_KEY,
    );
  }

  // Validate against internal service key
  const serviceKey = env.INTERNAL_SERVICE_KEY;

  if (!serviceKey) {
    throw new UnauthorizedError(
      "Service authentication not configured",
      ErrorCode.INVALID_API_KEY,
    );
  }

  if (!secureCompare(providedKey, serviceKey)) {
    throw new UnauthorizedError(
      "Invalid service key",
      ErrorCode.INVALID_API_KEY,
    );
  }

  return handler(request);
}
