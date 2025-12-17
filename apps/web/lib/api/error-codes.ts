/**
 * API Error Codes and Types
 *
 * Standardized error codes and types for consistent error handling across the API.
 * Error codes are in CAPITAL_CASE for easy identification and industry standard compliance.
 *
 * @example
 * ```ts
 * throw new NotFoundError("Form not found", ErrorCode.RESOURCE_NOT_FOUND)
 * throw new BadRequestError("Cannot edit published form", ErrorCode.FORM_NOT_EDITABLE)
 * ```
 */

/**
 * Error Type Categories
 *
 * Five main categories of errors:
 * - authentication_error: Auth/permission issues (401, 403)
 * - invalid_request_error: Client errors (400, 404, 409)
 * - validation_error: Input validation failures (422)
 * - rate_limit_error: Rate limiting (429)
 * - api_error: Server errors (500, 503)
 */
export enum ErrorType {
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  INVALID_REQUEST_ERROR = "INVALID_REQUEST_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  API_ERROR = "API_ERROR",
}

/**
 * Standard Error Codes
 *
 * Comprehensive list of all possible error codes in the API.
 * Codes are grouped by category for easier maintenance.
 */
export enum ErrorCode {
  // ============================================================================
  // AUTHENTICATION ERRORS (401, 403)
  // ============================================================================
  INVALID_API_KEY = "INVALID_API_KEY",
  MISSING_API_KEY = "MISSING_API_KEY",
  MISSING_AUTHORIZATION_HEADER = "MISSING_AUTHORIZATION_HEADER",
  INVALID_AUTHORIZATION_HEADER = "INVALID_AUTHORIZATION_HEADER",
  INSUFFICIENT_SCOPE = "INSUFFICIENT_SCOPE",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  API_KEY_EXPIRED = "API_KEY_EXPIRED",
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  ACCESS_DENIED = "ACCESS_DENIED",

  // ============================================================================
  // RESOURCE ERRORS (400, 404, 409)
  // ============================================================================
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  INVALID_PARAMETER = "INVALID_PARAMETER",
  MISSING_PARAMETER = "MISSING_PARAMETER",

  // ============================================================================
  // FORM SPECIFIC ERRORS
  // ============================================================================
  FORM_NOT_FOUND = "FORM_NOT_FOUND",
  FORM_ALREADY_PUBLISHED = "FORM_ALREADY_PUBLISHED",
  FORM_NOT_EDITABLE = "FORM_NOT_EDITABLE",
  FORM_HAS_DRAFT_VERSION = "FORM_HAS_DRAFT_VERSION",
  FORM_NO_FIELDS = "FORM_NO_FIELDS",
  FORM_MISSING_EMAIL_FIELD = "FORM_MISSING_EMAIL_FIELD",

  // ============================================================================
  // CONTACT ERRORS
  // ============================================================================
  CONTACT_NOT_FOUND = "CONTACT_NOT_FOUND",
  CONTACT_ALREADY_EXISTS = "CONTACT_ALREADY_EXISTS",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",

  // ============================================================================
  // TOPIC ERRORS
  // ============================================================================
  TOPIC_NOT_FOUND = "TOPIC_NOT_FOUND",
  TOPIC_ALREADY_EXISTS = "TOPIC_ALREADY_EXISTS",
  SLUG_ALREADY_EXISTS = "SLUG_ALREADY_EXISTS",

  // ============================================================================
  // SEGMENT ERRORS
  // ============================================================================
  SEGMENT_NOT_FOUND = "SEGMENT_NOT_FOUND",

  // ============================================================================
  // AUTOMATION ERRORS
  // ============================================================================
  AUTOMATION_NOT_FOUND = "AUTOMATION_NOT_FOUND",
  AUTOMATION_VALIDATION_FAILED = "AUTOMATION_VALIDATION_FAILED",

  // ============================================================================
  // CONTACT PROPERTY ERRORS
  // ============================================================================
  CONTACT_PROPERTY_NOT_FOUND = "CONTACT_PROPERTY_NOT_FOUND",
  CONTACT_PROPERTY_ALREADY_EXISTS = "CONTACT_PROPERTY_ALREADY_EXISTS",
  CONTACT_PROPERTY_LIMIT_REACHED = "CONTACT_PROPERTY_LIMIT_REACHED",

  // ============================================================================
  // SENDING DOMAIN ERRORS
  // ============================================================================
  SENDING_DOMAIN_NOT_FOUND = "SENDING_DOMAIN_NOT_FOUND",
  SENDING_DOMAIN_ALREADY_EXISTS = "SENDING_DOMAIN_ALREADY_EXISTS",

  // ============================================================================
  // BROADCAST ERRORS
  // ============================================================================
  BROADCAST_NOT_FOUND = "BROADCAST_NOT_FOUND",
  BROADCAST_INVALID_FROM_DOMAIN = "BROADCAST_INVALID_FROM_DOMAIN",
  BROADCAST_NOT_EDITABLE = "BROADCAST_NOT_EDITABLE",

  // ============================================================================
  // VALIDATION ERRORS (422)
  // ============================================================================
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_EMAIL_FORMAT = "INVALID_EMAIL_FORMAT",
  INVALID_FIELD_VALUE = "INVALID_FIELD_VALUE",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  FIELD_TOO_LONG = "FIELD_TOO_LONG",
  FIELD_TOO_SHORT = "FIELD_TOO_SHORT",
  INVALID_JSON = "INVALID_JSON",
  INVALID_FIELD_TYPE = "INVALID_FIELD_TYPE",

  // ============================================================================
  // RATE LIMITING (429)
  // ============================================================================
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // ============================================================================
  // SERVER ERRORS (500, 503)
  // ============================================================================
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

/**
 * Map HTTP status codes to error types
 */
export function getErrorTypeFromStatus(statusCode: number): ErrorType {
  if (statusCode === 401 || statusCode === 403) {
    return ErrorType.AUTHENTICATION_ERROR;
  }
  if (statusCode === 422) {
    return ErrorType.VALIDATION_ERROR;
  }
  if (statusCode === 429) {
    return ErrorType.RATE_LIMIT_ERROR;
  }
  if (statusCode >= 500) {
    return ErrorType.API_ERROR;
  }
  return ErrorType.INVALID_REQUEST_ERROR;
}
