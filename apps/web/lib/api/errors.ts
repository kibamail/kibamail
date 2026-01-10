/**
 * API Error Classes
 *
 * Custom error classes for API routes that include HTTP status codes, error codes, and types.
 * These errors are automatically handled by the withErrorHandling middleware.
 *
 * @example
 * ```ts
 * // Throw errors in handlers
 * throw new BadRequestError('Invalid email format', ErrorCode.INVALID_EMAIL_FORMAT)
 * throw new NotFoundError('User not found', ErrorCode.RESOURCE_NOT_FOUND)
 * throw new UnauthorizedError('Invalid credentials', ErrorCode.INVALID_API_KEY)
 * throw new ValidationError('Validation failed', ErrorCode.VALIDATION_FAILED, validationErrors)
 * ```
 */

import {
  ErrorCode,
  type ErrorType,
  getErrorTypeFromStatus,
} from "./error-codes";

/**
 * Validation error detail structure
 */
export interface ValidationErrorDetail {
  field: string;
  code: ErrorCode;
  message: string;
}

/**
 * Base API Error
 *
 * All API errors extend this class and include:
 * - HTTP status code
 * - Error code (CAPITAL_CASE)
 * - Error type (category)
 * - Optional validation errors
 * - Optional additional details
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly errorType: ErrorType;
  public readonly validationErrors?: ValidationErrorDetail[];
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    validationErrors?: ValidationErrorDetail[],
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errorType = getErrorTypeFromStatus(statusCode);
    this.validationErrors = validationErrors;
    this.details = details;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 *
 * @example
 * ```ts
 * throw new BadRequestError('Missing required field', ErrorCode.MISSING_PARAMETER)
 * throw new BadRequestError('Invalid input', ErrorCode.INVALID_PARAMETER, undefined, { param: 'email' })
 * ```
 */
export class BadRequestError extends ApiError {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.INVALID_PARAMETER,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 400, errorCode, undefined, details, cause);
  }
}

/**
 * 401 Unauthorized
 *
 * @example
 * ```ts
 * throw new UnauthorizedError('Invalid API key', ErrorCode.INVALID_API_KEY)
 * throw new UnauthorizedError('Missing API key', ErrorCode.MISSING_API_KEY)
 * ```
 */
export class UnauthorizedError extends ApiError {
  constructor(
    message = "Authentication required",
    errorCode: ErrorCode = ErrorCode.AUTHENTICATION_REQUIRED,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 401, errorCode, undefined, details, cause);
  }
}

/**
 * 403 Forbidden
 *
 * @example
 * ```ts
 * throw new ForbiddenError('Insufficient permissions', ErrorCode.INSUFFICIENT_PERMISSIONS)
 * throw new ForbiddenError('Access denied', ErrorCode.ACCESS_DENIED)
 * ```
 */
export class ForbiddenError extends ApiError {
  constructor(
    message = "Access denied",
    errorCode: ErrorCode = ErrorCode.ACCESS_DENIED,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 403, errorCode, undefined, details, cause);
  }
}

/**
 * 404 Not Found
 *
 * @example
 * ```ts
 * throw new NotFoundError('Form not found', ErrorCode.FORM_NOT_FOUND)
 * throw new NotFoundError('Contact not found', ErrorCode.CONTACT_NOT_FOUND)
 * ```
 */
export class NotFoundError extends ApiError {
  constructor(
    message = "Resource not found",
    errorCode: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 404, errorCode, undefined, details, cause);
  }
}

/**
 * 409 Conflict
 *
 * @example
 * ```ts
 * throw new ConflictError('Email already exists', ErrorCode.EMAIL_ALREADY_EXISTS)
 * throw new ConflictError('Resource conflict', ErrorCode.RESOURCE_CONFLICT)
 * ```
 */
export class ConflictError extends ApiError {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.RESOURCE_CONFLICT,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 409, errorCode, undefined, details, cause);
  }
}

/**
 * 422 Validation Error
 *
 * Includes field-level validation errors.
 *
 * @example
 * ```ts
 * throw new ValidationError('Validation failed', ErrorCode.VALIDATION_FAILED, [
 *   { field: 'email', code: ErrorCode.INVALID_EMAIL_FORMAT, message: 'Invalid email format' },
 *   { field: 'name', code: ErrorCode.MISSING_REQUIRED_FIELD, message: 'Name is required' }
 * ])
 * ```
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.VALIDATION_FAILED,
    validationErrors: ValidationErrorDetail[] = [],
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 422, errorCode, validationErrors, details, cause);
  }
}

/**
 * 429 Rate Limit Exceeded
 *
 * @example
 * ```ts
 * throw new RateLimitError('Too many requests', ErrorCode.RATE_LIMIT_EXCEEDED)
 * ```
 */
class _RateLimitError extends ApiError {
  constructor(
    message = "Rate limit exceeded",
    errorCode: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 429, errorCode, undefined, details, cause);
  }
}

/**
 * 500 Internal Server Error
 *
 * @example
 * ```ts
 * throw new InternalServerError('Database connection failed', ErrorCode.DATABASE_ERROR)
 * throw new InternalServerError('Unexpected error', ErrorCode.INTERNAL_SERVER_ERROR)
 * ```
 */
export class InternalServerError extends ApiError {
  constructor(
    message = "Internal server error",
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 500, errorCode, undefined, details, cause);
  }
}

/**
 * 503 Service Unavailable
 *
 * @example
 * ```ts
 * throw new ServiceUnavailableError('Maintenance in progress', ErrorCode.SERVICE_UNAVAILABLE)
 * ```
 */
class _ServiceUnavailableError extends ApiError {
  constructor(
    message = "Service temporarily unavailable",
    errorCode: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, 503, errorCode, undefined, details, cause);
  }
}
