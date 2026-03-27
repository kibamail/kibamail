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

import type { ApiKey } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResp } from "next/server";
import { ZodError } from "zod";
import type { Permission } from "@/config/rbac";
import { ErrorCode, ERROR_HINTS } from "@/lib/api/error-codes";
import {
  ApiError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  type ValidationErrorDetail,
} from "@/lib/api/errors";
import { getSession, type UserSession } from "@/lib/auth/get-session";
import { requirePermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

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
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`;
}

/**
 * Convert Zod errors to ValidationErrorDetail format
 */
function zodErrorToValidationDetails(
  zodError: ZodError,
): ValidationErrorDetail[] {
  return zodError.issues.map((issue) => ({
    field: issue.path.join("."),
    code: ErrorCode.INVALID_FIELD_VALUE,
    message: issue.message,
  }));
}

/**
 * Global error handling middleware
 *
 * Catches all errors thrown in handlers and converts them to standardized error responses.
 * All errors follow the format:
 * {
 *   error: {
 *     type: "validation_error",
 *     code: "FORM_NOT_FOUND",
 *     message: "Human readable message",
 *     requestId: "req_abc123",
 *     validationErrors?: [...],
 *     details?: {...}
 *   }
 * }
 *
 * Handles:
 * - ApiError (custom error classes)
 * - ZodError (validation errors)
 * - Prisma errors (database errors)
 * - Unexpected errors
 *
 * @param request - Next.js request object
 * @param handler - Handler function to execute
 * @returns Response from handler or standardized error response
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, async (req) => {
 *     // Can throw any error - will be converted to standard format
 *     throw new NotFoundError('User not found', ErrorCode.RESOURCE_NOT_FOUND)
 *     throw new ValidationError('Invalid input', ErrorCode.VALIDATION_FAILED, validationErrors)
 *     throw new Error('Something went wrong')
 *   })
 * }
 * ```
 *
 * @example Stack with other middleware
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(request, (req) =>
 *     withSession(req, async (session, req) => {
 *       // Errors thrown here are caught and standardized
 *       if (!session.currentOrganization) {
 *         throw new BadRequestError('No organization found', ErrorCode.RESOURCE_NOT_FOUND)
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
  const requestId = generateRequestId();

  try {
    return await handler(request);
  } catch (error) {
    // Handle custom API errors
    if (error instanceof ApiError) {
      return NextResp.json(
        {
          error: {
            type: error.errorType,
            code: error.errorCode,
            message: error.message,
            hint: ERROR_HINTS[error.errorCode] ?? null,
            requestId,
            ...(error.validationErrors &&
              error.validationErrors.length > 0 && {
                validationErrors: error.validationErrors,
              }),
            ...(error.details && { details: error.details }),
          },
        },
        { status: error.statusCode },
      );
    }

    // Handle Zod validation errors
    if (
      error instanceof ZodError ||
      (error && typeof error === "object" && "issues" in error)
    ) {
      const zodError = error as ZodError;
      const validationErrors = zodErrorToValidationDetails(zodError);

      const validationError = new ValidationError(
        "Validation failed",
        ErrorCode.VALIDATION_FAILED,
        validationErrors,
      );

      return NextResp.json(
        {
          error: {
            type: validationError.errorType,
            code: validationError.errorCode,
            message: validationError.message,
            hint: ERROR_HINTS[ErrorCode.VALIDATION_FAILED],
            requestId,
            validationErrors: validationError.validationErrors,
          },
        },
        { status: 422 },
      );
    }

    // Handle Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; message: string };

      // Unique constraint violation
      if (prismaError.code === "P2002") {
        const conflictError = new ConflictError(
          "A record with this information already exists",
          ErrorCode.RESOURCE_ALREADY_EXISTS,
        );

        return NextResp.json(
          {
            error: {
              type: conflictError.errorType,
              code: conflictError.errorCode,
              message: conflictError.message,
              hint: ERROR_HINTS[ErrorCode.RESOURCE_ALREADY_EXISTS],
              requestId,
            },
          },
          { status: 409 },
        );
      }

      // Record not found
      if (prismaError.code === "P2025") {
        const notFoundError = new NotFoundError(
          "Record not found",
          ErrorCode.RESOURCE_NOT_FOUND,
        );

        return NextResp.json(
          {
            error: {
              type: notFoundError.errorType,
              code: notFoundError.errorCode,
              message: notFoundError.message,
              hint: ERROR_HINTS[ErrorCode.RESOURCE_NOT_FOUND],
              requestId,
            },
          },
          { status: 404 },
        );
      }

      // Other database errors
      const dbError = new InternalServerError(
        "Database error occurred",
        ErrorCode.DATABASE_ERROR,
      );

      return NextResp.json(
        {
          error: {
            type: dbError.errorType,
            code: dbError.errorCode,
            message: dbError.message,
            hint: ERROR_HINTS[ErrorCode.DATABASE_ERROR],
            requestId,
            details: {
              prismaCode: prismaError.code,
            },
          },
        },
        { status: 500 },
      );
    }

    // Handle unexpected errors
    const unexpectedError = new InternalServerError(
      error instanceof Error ? error.message : "An unexpected error occurred",
      ErrorCode.UNEXPECTED_ERROR,
    );

    return NextResp.json(
      {
        error: {
          type: unexpectedError.errorType,
          code: unexpectedError.errorCode,
          message: unexpectedError.message,
          hint: ERROR_HINTS[ErrorCode.UNEXPECTED_ERROR],
          requestId,
        },
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
      ErrorCode.MISSING_AUTHORIZATION_HEADER,
    );
  }

  const apiKeyValue = authHeader.slice(7); // Remove "Bearer " prefix

  if (!apiKeyValue) {
    throw new UnauthorizedError(
      "API key is required",
      ErrorCode.MISSING_API_KEY,
    );
  }

  // Hash the API key
  const keyHash = await hashApiKey(apiKeyValue);

  // Query database for the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    throw new UnauthorizedError("Invalid API key", ErrorCode.INVALID_API_KEY);
  }

  // Check required scopes if specified
  if (requiredScopes && requiredScopes.length > 0) {
    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    const missingScopes = requiredScopes.filter(
      (scope) => !scopes.includes(scope),
    );

    if (missingScopes.length > 0) {
      throw new UnauthorizedError(
        `Missing required scope: ${missingScopes.join(", ")}`,
        ErrorCode.INSUFFICIENT_SCOPE,
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
