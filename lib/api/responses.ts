/**
 * API Response Helpers
 *
 * Standardized response utilities for Next.js API routes.
 * Provides consistent response formatting across all endpoints.
 *
 * @example
 * ```ts
 * // Success responses
 * return responseOk({ user: { id: '123', name: 'John' } })
 * return responseCreated({ workspace: { id: 'ws_1', name: 'Acme' } })
 *
 * // Error responses
 * return responseValidationFailed(zodError)
 * return responseBadRequest('Invalid input')
 * return responseNotFound('User not found')
 * return responseUnauthorized('Authentication required')
 * return responseServerError('Database connection failed')
 * ```
 */

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiObjectType = "api_key" | "api_key_list" | "contact" | "contact_list" | "tag" | "tag_list" | "topic" | "topic_list" | "segment" | "segment_list";

/**
 * Standard API response structure (for external API v1)
 */
type ApiResponse<T = unknown> = {
  type?: ApiObjectType;
  data?: T;
  meta?: unknown;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * 200 OK - Successful request
 *
 * @param type - Resource type identifier
 * @param data - Response data
 * @param meta - Optional metadata (e.g., pagination)
 * @returns NextResponse with status 200
 *
 * @example
 * ```ts
 * return responseOk('user_list', users, { page: 1, total: 100 })
 * ```
 */
export function responseOk<T>(
  data?: T,
  type?: ApiObjectType,
  meta?: unknown
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = { type, ...data };
  if (meta) {
    response.meta = meta;
  }
  return NextResponse.json(response, { status: 200 });
}

/**
 * 201 Created - Resource successfully created
 *
 * @param type - Resource type identifier
 * @param data - Created resource data
 * @returns NextResponse with status 201
 *
 * @example
 * ```ts
 * return responseCreated('api_key', { id: '123', name: 'My Key' })
 * ```
 */
export function responseCreated<T>(
  data: T,
  type?: ApiObjectType
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ type, ...data }, { status: 201 });
}

/**
 * 204 No Content - Successful request with no response body
 *
 * @returns NextResponse with status 204
 *
 * @example
 * ```ts
 * // After deleting a resource
 * return responseNoContent()
 * ```
 */
export function responseNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 400 Bad Request - Invalid request
 *
 * @param error - Error message
 * @returns NextResponse with status 400
 *
 * @example
 * ```ts
 * return responseBadRequest('Missing required field: email')
 * ```
 */
export function responseBadRequest(
  error: string
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * 401 Unauthorized - Authentication required or failed
 *
 * @param error - Error message (defaults to "Authentication required")
 * @returns NextResponse with status 401
 *
 * @example
 * ```ts
 * return responseUnauthorized()
 * return responseUnauthorized('Invalid API key')
 * ```
 */
export function responseUnauthorized(
  error = "Authentication required"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 401 });
}

/**
 * 403 Forbidden - Authenticated but not authorized
 *
 * @param error - Error message (defaults to "Access denied")
 * @returns NextResponse with status 403
 *
 * @example
 * ```ts
 * return responseForbidden()
 * return responseForbidden('You do not have permission to access this resource')
 * ```
 */
export function responseForbidden(
  error = "Access denied"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 403 });
}

/**
 * 404 Not Found - Resource not found
 *
 * @param error - Error message (defaults to "Resource not found")
 * @returns NextResponse with status 404
 *
 * @example
 * ```ts
 * return responseNotFound()
 * return responseNotFound('Workspace not found')
 * ```
 */
export function responseNotFound(
  error = "Resource not found"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 404 });
}

/**
 * 409 Conflict - Request conflicts with current state
 *
 * @param error - Error message
 * @returns NextResponse with status 409
 *
 * @example
 * ```ts
 * return responseConflict('Email already exists')
 * ```
 */
export function responseConflict(
  error: string
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 409 });
}

/**
 * 422 Unprocessable Entity - Validation failed
 *
 * Automatically formats Zod validation errors into field-level errors.
 *
 * @param zodError - Zod validation error
 * @returns NextResponse with status 422 and field errors
 *
 * @example
 * ```ts
 * try {
 *   schema.parse(data)
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return responseValidationFailed(error)
 *   }
 * }
 * ```
 *
 * Response format:
 * ```json
 * {
 *   "error": "Validation failed",
 *   "fieldErrors": {
 *     "name": ["Name must be at least 3 characters"],
 *     "email": ["Invalid email format"]
 *   }
 * }
 * ```
 */
export function responseValidationFailed(
  zodError: ZodError
): NextResponse<ApiResponse<never>> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.join(".") || "root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return NextResponse.json(
    {
      error: "Validation failed",
      fieldErrors,
    },
    { status: 422 }
  );
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 *
 * @param error - Error message (defaults to "Rate limit exceeded")
 * @returns NextResponse with status 429
 *
 * @example
 * ```ts
 * return responseRateLimitExceeded()
 * return responseRateLimitExceeded('Too many requests. Try again in 60 seconds')
 * ```
 */
export function responseRateLimitExceeded(
  error = "Rate limit exceeded"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 429 });
}

/**
 * 500 Internal Server Error - Unexpected server error
 *
 * @param error - Error message (defaults to "Internal server error")
 * @returns NextResponse with status 500
 *
 * @example
 * ```ts
 * return responseServerError()
 * return responseServerError('Database connection failed')
 * ```
 */
export function responseServerError(
  error = "Internal server error"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 500 });
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 *
 * @param error - Error message (defaults to "Service temporarily unavailable")
 * @returns NextResponse with status 503
 *
 * @example
 * ```ts
 * return responseServiceUnavailable()
 * return responseServiceUnavailable('Maintenance in progress')
 * ```
 */
export function responseServiceUnavailable(
  error = "Service temporarily unavailable"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 503 });
}
