/**
 * API Response Helpers
 *
 * Standardized response utilities for Next.js API routes.
 * Provides consistent response formatting across all endpoints.
 *
 * SUCCESS RESPONSES (use these):
 * - responseOk() - 200 OK
 * - responseCreated() - 201 Created
 * - responseNoContent() - 204 No Content
 *
 * ERROR RESPONSES (DEPRECATED - throw errors instead):
 * - Instead of responseBadRequest(), throw new BadRequestError()
 * - Instead of responseNotFound(), throw new NotFoundError()
 * - Instead of responseUnauthorized(), throw new UnauthorizedError()
 * - All errors will be automatically formatted by withErrorHandling middleware
 *
 * @example
 * ```ts
 * // Success responses (correct usage)
 * return responseOk({ user: { id: '123', name: 'John' } })
 * return responseCreated({ workspace: { id: 'ws_1', name: 'Acme' } })
 *
 * // Error responses (NEW - use throw instead)
 * throw new NotFoundError('User not found', ErrorCode.RESOURCE_NOT_FOUND)
 * throw new BadRequestError('Invalid input', ErrorCode.INVALID_PARAMETER)
 * throw new ValidationError('Validation failed', ErrorCode.VALIDATION_FAILED, errors)
 * ```
 */

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiObjectType = "api_key" | "api_key_list" | "contact" | "contact_list" | "tag" | "tag_list" | "topic" | "topic_list" | "segment" | "segment_list" | "contact_property" | "contact_property_list" | "automation" | "automation_list" | "form" | "form_list";

/**
 * Standard API response structure (for external API v1)
 */
type ApiResponse<T = unknown> = {
  object?: ApiObjectType;
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
  object?: ApiObjectType,
  meta?: unknown
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = { object, ...data };
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
  object?: ApiObjectType
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ object, ...data }, { status: 201 });
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
 * @deprecated Use `throw new BadRequestError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message
 * @returns NextResponse with status 400
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseBadRequest('Missing required field: email')
 *
 * // NEW (correct)
 * throw new BadRequestError('Missing required field: email', ErrorCode.MISSING_PARAMETER)
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
 * @deprecated Use `throw new UnauthorizedError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Authentication required")
 * @returns NextResponse with status 401
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseUnauthorized('Invalid API key')
 *
 * // NEW (correct)
 * throw new UnauthorizedError('Invalid API key', ErrorCode.INVALID_API_KEY)
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
 * @deprecated Use `throw new ForbiddenError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Access denied")
 * @returns NextResponse with status 403
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseForbidden('You do not have permission to access this resource')
 *
 * // NEW (correct)
 * throw new ForbiddenError('You do not have permission to access this resource', ErrorCode.ACCESS_DENIED)
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
 * @deprecated Use `throw new NotFoundError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Resource not found")
 * @returns NextResponse with status 404
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseNotFound('Workspace not found')
 *
 * // NEW (correct)
 * throw new NotFoundError('Workspace not found', ErrorCode.RESOURCE_NOT_FOUND)
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
 * @deprecated Use `throw new ConflictError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message
 * @returns NextResponse with status 409
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseConflict('Email already exists')
 *
 * // NEW (correct)
 * throw new ConflictError('Email already exists', ErrorCode.EMAIL_ALREADY_EXISTS)
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
 * @deprecated Zod errors are now automatically handled by withErrorHandling middleware. No need to call this function.
 * @param zodError - Zod validation error
 * @returns NextResponse with status 422 and field errors
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * try {
 *   schema.parse(data)
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return responseValidationFailed(error)
 *   }
 * }
 *
 * // NEW (correct) - Just let it throw, withErrorHandling will catch it
 * const validatedData = schema.parse(data) // Will throw if validation fails
 * // Or for custom validation errors:
 * throw new ValidationError('Validation failed', ErrorCode.VALIDATION_FAILED, validationErrors)
 * ```
 *
 * New response format:
 * ```json
 * {
 *   "error": {
 *     "type": "validation_error",
 *     "code": "VALIDATION_FAILED",
 *     "message": "Validation failed",
 *     "requestId": "req_abc123",
 *     "validationErrors": [
 *       { "field": "name", "code": "INVALID_FIELD_VALUE", "message": "Name must be at least 3 characters" },
 *       { "field": "email", "code": "INVALID_FIELD_VALUE", "message": "Invalid email format" }
 *     ]
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
 * @deprecated Use `throw new RateLimitError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Rate limit exceeded")
 * @returns NextResponse with status 429
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseRateLimitExceeded('Too many requests. Try again in 60 seconds')
 *
 * // NEW (correct)
 * throw new RateLimitError('Too many requests. Try again in 60 seconds', ErrorCode.RATE_LIMIT_EXCEEDED)
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
 * @deprecated Use `throw new InternalServerError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Internal server error")
 * @returns NextResponse with status 500
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseServerError('Database connection failed')
 *
 * // NEW (correct)
 * throw new InternalServerError('Database connection failed', ErrorCode.DATABASE_ERROR)
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
 * @deprecated Use `throw new ServiceUnavailableError()` instead. All errors are now handled by withErrorHandling middleware.
 * @param error - Error message (defaults to "Service temporarily unavailable")
 * @returns NextResponse with status 503
 *
 * @example
 * ```ts
 * // OLD (deprecated)
 * return responseServiceUnavailable('Maintenance in progress')
 *
 * // NEW (correct)
 * throw new ServiceUnavailableError('Maintenance in progress', ErrorCode.SERVICE_UNAVAILABLE)
 * ```
 */
export function responseServiceUnavailable(
  error = "Service temporarily unavailable"
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status: 503 });
}
