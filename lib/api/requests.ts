/**
 * API Request Middleware
 *
 * Composable middleware utilities for Next.js API routes.
 * Provides authentication, authorization, and error handling.
 *
 * @example
 * ```ts
 * // Single middleware
 * export async function POST(request: NextRequest) {
 *   return withSession(request, async (session, request) => {
 *     // handler has access to session
 *     return responseOk({ user: session.user })
 *   })
 * }
 *
 * // With permission checks
 * export async function DELETE(request: NextRequest) {
 *   return withSession(
 *     request,
 *     async (session, request) => {
 *       // Only executes if user has permission
 *       return responseOk({})
 *     },
 *     ["delete:workspace"]
 *   )
 * }
 *
 * // Stacked middleware with error handling
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, () =>
 *     withSession(
 *       request,
 *       async (session, request) => {
 *         // Can throw ApiError here, it will be caught and handled
 *         throw new NotFoundError('Resource not found')
 *       },
 *       ["manage:members"]
 *     )
 *   )
 * }
 * ```
 */

import { revalidatePath } from "next/cache";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResp } from "next/server";
import { ZodError } from "zod";
import { ApiError, UnauthorizedError, ConflictError, NotFoundError } from "@/lib/api/errors";
import {
  responseUnauthorized,
  responseValidationFailed,
} from "@/lib/api/responses";
import { getSession, type UserSession } from "@/lib/auth/get-session";
import { requirePermissions } from "@/lib/auth/permissions";
import type { Permission } from "@/config/rbac";
import { prisma } from "@/lib/db";
import type { ApiKey } from "@prisma/client";

/**
 * Handler that receives session and request
 */
type SessionHandler = (
  session: UserSession,
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

/**
 * Require authenticated session
 *
 * Verifies the user is authenticated and injects the session into the handler.
 * Returns 401 if the user is not authenticated.
 * Optionally checks for required permissions before executing the handler.
 * Automatically revalidates /w/* routes after handler executes successfully.
 *
 * @param request - Next.js request object
 * @param handler - Handler function that receives session and request
 * @param requiredPermissions - Optional array of permissions to check before executing handler
 * @returns Response from handler or 401 Unauthorized
 *
 * @example Basic usage
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withSession(request, async (session, request) => {
 *     return responseOk({
 *       user: session.user,
 *       organization: session.currentOrganization
 *     })
 *   })
 * }
 * ```
 *
 * @example With permission checks
 * ```ts
 * export async function DELETE(request: NextRequest) {
 *   return withSession(
 *     request,
 *     async (session, request) => {
 *       // Only executes if user has delete:workspace permission
 *       await deleteWorkspace(session.currentOrganization.id)
 *       return responseOk({})
 *     },
 *     ["delete:workspace"]
 *   )
 * }
 * ```
 *
 * @example Multiple permissions
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withSession(
 *     request,
 *     async (session, request) => {
 *       // User must have both permissions
 *       return responseOk({ ... })
 *     },
 *     ["manage:billing", "read:workspace"]
 *   )
 * }
 * ```
 *
 * @example Stack with other middleware
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, () =>
 *     withSession(
 *       request,
 *       async (session, req) => {
 *         return responseCreated({ workspace })
 *       },
 *       ["manage:members"]
 *     )
 *   )
 * }
 * ```
 */
export async function withSession(
  request: NextRequest,
  handler: SessionHandler,
  requiredPermissions?: Permission[],
): Promise<NextResponse> {
  const session = await getSession();

  // Check required permissions if specified
  if (requiredPermissions && requiredPermissions.length > 0) {
    for (const permission of requiredPermissions) {
      requirePermissions(session, permission);
    }
  }

  const response = await handler(session, request);

  revalidatePath("/w", "layout");

  return response;
}

/**
 * Handler function type
 */
type Handler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

/**
 * Global error handling middleware
 *
 * Catches all errors thrown in handlers and converts them to appropriate responses.
 * Handles ApiError, ZodError, and unexpected errors.
 *
 * @param request - Next.js request object
 * @param handler - Handler function to execute
 * @returns Response from handler or error response
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, async (req) => {
 *     // Can throw any error
 *     throw new NotFoundError('User not found')
 *     throw new ValidationError('Invalid input', { email: ['Required'] })
 *     throw new Error('Something went wrong')
 *
 *     // All will be caught and converted to proper responses
 *   })
 * }
 * ```
 *
 * @example Stack with other middleware
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, (req) =>
 *     withSession(req, async (session, req) => {
 *       // Errors thrown here are caught by withErrorHandling
 *       if (!session.currentOrganization) {
 *         throw new BadRequestError('No organization found')
 *       }
 *       return responseOk({ org: session.currentOrganization })
 *     })
 *   )
 * }
 * ```
 */
export async function withErrorHandling(
  request: NextRequest,
  handler: Handler,
): Promise<NextResponse> {
  try {
    return await handler(request);
  } catch (error) {
    // Handle custom API errors
    if (error instanceof ApiError) {
      return NextResp.json(
        {
          error: error.message,
          ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
        },
        { status: error.statusCode },
      );
    }

    if (
      error instanceof ZodError ||
      (error && typeof error === "object" && "issues" in error)
    ) {
      return responseValidationFailed(error as ZodError);
    }

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; message: string };

      // Unique constraint violation
      if (prismaError.code === "P2002") {
        return NextResp.json(
          { error: "A record with this information already exists" },
          { status: 409 }
        );
      }

      // Record not found
      if (prismaError.code === "P2025") {
        return NextResp.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }
    }

    return NextResp.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}

/**
 * Handler that receives API key and request
 */
type ApiKeyHandler = (
  apiKey: ApiKey,
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

/**
 * Hash API key using SHA-256
 *
 * @param key - Plain text API key
 * @returns SHA-256 hash of the key
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Require API key authentication
 *
 * Authenticates requests using API key from Authorization Bearer header.
 * Extracts the key, hashes it, queries the database, and injects the API key data into the handler.
 * Returns 401 if the key is invalid or missing.
 * Automatically updates lastUsedAt timestamp on successful authentication.
 *
 * @param request - Next.js request object
 * @param handler - Handler function that receives API key and request
 * @param requiredScopes - Optional array of scopes to check before executing handler
 * @returns Response from handler or 401 Unauthorized
 *
 * @example Basic usage
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withApiSession(request, async (apiKey, request) => {
 *     const contacts = await prisma.contact.findMany({
 *       where: { workspaceId: apiKey.workspaceId }
 *     });
 *     return responseOk({ contacts });
 *   });
 * }
 * ```
 *
 * @example With scope checks
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withApiSession(
 *     request,
 *     async (apiKey, request) => {
 *       // Only executes if API key has write:broadcasts scope
 *       const broadcast = await createBroadcast(apiKey.workspaceId, data);
 *       return responseCreated({ broadcast });
 *     },
 *     ["write:broadcasts"]
 *   );
 * }
 * ```
 */
export async function withApiSession(
  request: NextRequest,
  handler: ApiKeyHandler,
  requiredScopes?: string[],
): Promise<NextResponse> {
  // Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Missing or invalid Authorization header. Expected format: Bearer <api_key>",
    );
  }

  const apiKeyValue = authHeader.slice(7); // Remove "Bearer " prefix

  if (!apiKeyValue) {
    throw new UnauthorizedError("API key is required");
  }

  // Hash the API key
  const keyHash = await hashApiKey(apiKeyValue);

  // Query database for the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Check required scopes if specified
  if (requiredScopes && requiredScopes.length > 0) {
    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    const missingScopes = requiredScopes.filter(
      (scope) => !scopes.includes(scope),
    );

    if (missingScopes.length > 0) {
      throw new UnauthorizedError(
        `Missing required scopes: ${missingScopes.join(", ")}`,
      );
    }
  }

  // Update lastUsedAt timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      console.error("Failed to update API key lastUsedAt:", error);
    });

  // Execute handler with API key data
  return await handler(apiKey, request);
}
