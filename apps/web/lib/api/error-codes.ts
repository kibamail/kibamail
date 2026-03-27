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
  FORM_NOT_DELETABLE = "FORM_NOT_DELETABLE",
  FORM_HAS_DRAFT_VERSION = "FORM_HAS_DRAFT_VERSION",
  FORM_NO_FIELDS = "FORM_NO_FIELDS",
  FORM_MISSING_EMAIL_FIELD = "FORM_MISSING_EMAIL_FIELD",
  FORM_UNMAPPED_FIELDS = "FORM_UNMAPPED_FIELDS",
  FORM_SLUG_CONFLICT = "FORM_SLUG_CONFLICT",
  FORM_VALIDATION_ERROR = "FORM_VALIDATION_ERROR",

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
  SENDING_DOMAIN_NOT_VERIFIED = "SENDING_DOMAIN_NOT_VERIFIED",

  // ============================================================================
  // BROADCAST ERRORS
  // ============================================================================
  BROADCAST_NOT_FOUND = "BROADCAST_NOT_FOUND",
  BROADCAST_INVALID_FROM_DOMAIN = "BROADCAST_INVALID_FROM_DOMAIN",
  BROADCAST_NOT_EDITABLE = "BROADCAST_NOT_EDITABLE",
  BROADCAST_DETAILS_PRUNED = "BROADCAST_DETAILS_PRUNED",

  // ============================================================================
  // EMAIL TEMPLATE ERRORS
  // ============================================================================
  TEMPLATE_NOT_FOUND = "TEMPLATE_NOT_FOUND",
  TEMPLATE_ALREADY_PUBLISHED = "TEMPLATE_ALREADY_PUBLISHED",
  TEMPLATE_NOT_PUBLISHED = "TEMPLATE_NOT_PUBLISHED",
  TEMPLATE_NOT_EDITABLE = "TEMPLATE_NOT_EDITABLE",
  TEMPLATE_HAS_DRAFT_VERSION = "TEMPLATE_HAS_DRAFT_VERSION",
  TEMPLATE_NO_CONTENT = "TEMPLATE_NO_CONTENT",

  // ============================================================================
  // INBOX/CONVERSATION ERRORS
  // ============================================================================
  ConversationNotFound = "CONVERSATION_NOT_FOUND",
  MessageNotFound = "MESSAGE_NOT_FOUND",

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
  INVALID_ATTACHMENT_FORMAT = "INVALID_ATTACHMENT_FORMAT",
  ATTACHMENT_TOO_LARGE = "ATTACHMENT_TOO_LARGE",

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
 * Agent-actionable hints for every error code.
 * Added to API error responses so AI agents know exactly how to recover.
 */
export const ERROR_HINTS: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.INVALID_API_KEY]: "Check that your API key is correct. Generate a new key at the Kibamail dashboard under Settings > API Keys.",
  [ErrorCode.MISSING_API_KEY]: "Include your API key in the Authorization header: 'Authorization: Bearer sk-xxx'.",
  [ErrorCode.MISSING_AUTHORIZATION_HEADER]: "Add an Authorization header with your API key: 'Authorization: Bearer sk-xxx'.",
  [ErrorCode.INVALID_AUTHORIZATION_HEADER]: "The Authorization header format is invalid. Use: 'Authorization: Bearer sk-xxx'.",
  [ErrorCode.INSUFFICIENT_SCOPE]: "Your API key does not have the required scope for this operation. Create a new key with the needed scopes.",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: "Your API key does not have permission for this operation.",
  [ErrorCode.API_KEY_EXPIRED]: "This API key has expired. Generate a new key at the Kibamail dashboard.",
  [ErrorCode.AUTHENTICATION_REQUIRED]: "This endpoint requires authentication. Pass your API key in the Authorization header.",
  [ErrorCode.ACCESS_DENIED]: "Access denied. Check that your API key has the required permissions.",

  // Resources
  [ErrorCode.RESOURCE_NOT_FOUND]: "The requested resource does not exist. Verify the ID is correct.",
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: "A resource with these unique fields already exists.",
  [ErrorCode.RESOURCE_CONFLICT]: "The operation conflicts with the current state of the resource.",
  [ErrorCode.INVALID_PARAMETER]: "One or more parameters are invalid. Check the field names and value types.",
  [ErrorCode.MISSING_PARAMETER]: "A required parameter is missing from the request.",

  // Forms
  [ErrorCode.FORM_NOT_FOUND]: "The form ID does not exist. List available forms with GET /v1/forms.",
  [ErrorCode.FORM_ALREADY_PUBLISHED]: "This form is already published. Archive it first or create a new version.",
  [ErrorCode.FORM_NOT_EDITABLE]: "Only DRAFT forms can be edited. Create a new version to modify a published form.",
  [ErrorCode.FORM_NOT_DELETABLE]: "This form cannot be deleted in its current state. Archive it first.",
  [ErrorCode.FORM_HAS_DRAFT_VERSION]: "A draft version already exists for this form. Edit the existing draft instead.",
  [ErrorCode.FORM_NO_FIELDS]: "The form has no fields defined. Add at least one field before publishing.",
  [ErrorCode.FORM_MISSING_EMAIL_FIELD]: "Sign-up forms require an email field. Add a field with type 'email'.",
  [ErrorCode.FORM_UNMAPPED_FIELDS]: "Some form fields are not mapped to contact properties. Map all fields before publishing.",
  [ErrorCode.FORM_SLUG_CONFLICT]: "This URL slug is already in use by another form. Choose a different slug.",
  [ErrorCode.FORM_VALIDATION_ERROR]: "The form configuration has validation errors. Check the details for specifics.",

  // Contacts
  [ErrorCode.CONTACT_NOT_FOUND]: "The contact ID does not exist. List contacts with GET /v1/contacts.",
  [ErrorCode.CONTACT_ALREADY_EXISTS]: "A contact with this email already exists. Use PUT /v1/contacts/{id} to update it.",
  [ErrorCode.EMAIL_ALREADY_EXISTS]: "This email address is already in use by another contact in this workspace.",

  // Topics
  [ErrorCode.TOPIC_NOT_FOUND]: "The topic ID does not exist. List topics with GET /v1/topics.",
  [ErrorCode.TOPIC_ALREADY_EXISTS]: "A topic with this name already exists in this workspace.",
  [ErrorCode.SLUG_ALREADY_EXISTS]: "This slug is already in use. Choose a different slug.",

  // Segments
  [ErrorCode.SEGMENT_NOT_FOUND]: "The segment ID does not exist. List segments with GET /v1/segments.",

  // Automations
  [ErrorCode.AUTOMATION_NOT_FOUND]: "The automation ID does not exist. List automations with GET /v1/automations.",
  [ErrorCode.AUTOMATION_VALIDATION_FAILED]: "The automation flow has configuration errors. Check the 'details.errors' array for specific node issues.",

  // Contact Properties
  [ErrorCode.CONTACT_PROPERTY_NOT_FOUND]: "The contact property ID does not exist. List properties with GET /v1/contact-properties.",
  [ErrorCode.CONTACT_PROPERTY_ALREADY_EXISTS]: "A property with this name already exists. Use a different name.",
  [ErrorCode.CONTACT_PROPERTY_LIMIT_REACHED]: "Maximum number of custom properties reached for this workspace.",

  // Sending Domains
  [ErrorCode.SENDING_DOMAIN_NOT_FOUND]: "The sending domain ID does not exist. List domains with GET /v1/domains.",
  [ErrorCode.SENDING_DOMAIN_ALREADY_EXISTS]: "This domain is already configured in this workspace.",
  [ErrorCode.SENDING_DOMAIN_NOT_VERIFIED]: "This sending domain has not been verified. Complete DNS verification first.",

  // Broadcasts
  [ErrorCode.BROADCAST_NOT_FOUND]: "The broadcast ID does not exist. List broadcasts with GET /v1/broadcasts.",
  [ErrorCode.BROADCAST_INVALID_FROM_DOMAIN]: "The from email domain does not match any verified sending domain.",
  [ErrorCode.BROADCAST_NOT_EDITABLE]: "Only DRAFT broadcasts can be edited.",
  [ErrorCode.BROADCAST_DETAILS_PRUNED]: "Detailed send data for this broadcast has been pruned after the retention period.",

  // Templates
  [ErrorCode.TEMPLATE_NOT_FOUND]: "The template ID does not exist. List templates with GET /v1/templates.",
  [ErrorCode.TEMPLATE_ALREADY_PUBLISHED]: "This template is already published. Create a new version to make changes.",
  [ErrorCode.TEMPLATE_NOT_PUBLISHED]: "This template has not been published yet.",
  [ErrorCode.TEMPLATE_NOT_EDITABLE]: "Only DRAFT templates can be edited.",
  [ErrorCode.TEMPLATE_HAS_DRAFT_VERSION]: "A draft version already exists. Edit the existing draft instead.",
  [ErrorCode.TEMPLATE_NO_CONTENT]: "The template has no content. Add content before publishing.",

  // Conversations
  [ErrorCode.ConversationNotFound]: "The conversation ID does not exist.",
  [ErrorCode.MessageNotFound]: "The message ID does not exist.",

  // Validation
  [ErrorCode.VALIDATION_FAILED]: "Request body failed validation. Check the 'validationErrors' array for field-level details.",
  [ErrorCode.INVALID_EMAIL_FORMAT]: "The email address format is invalid. Use a standard format like 'user@example.com'.",
  [ErrorCode.INVALID_FIELD_VALUE]: "The field value is invalid for the expected type.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "A required field is missing from the request body.",
  [ErrorCode.FIELD_TOO_LONG]: "The field value exceeds the maximum allowed length.",
  [ErrorCode.FIELD_TOO_SHORT]: "The field value is shorter than the minimum required length.",
  [ErrorCode.INVALID_JSON]: "The request body is not valid JSON. Ensure proper JSON formatting.",
  [ErrorCode.INVALID_FIELD_TYPE]: "The field type is not supported. Use one of the allowed types.",
  [ErrorCode.INVALID_ATTACHMENT_FORMAT]: "The attachment format is not supported.",
  [ErrorCode.ATTACHMENT_TOO_LARGE]: "The attachment exceeds the maximum allowed size.",

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Wait for the duration specified in the 'retry-after' response header before retrying.",

  // Server
  [ErrorCode.INTERNAL_SERVER_ERROR]: "An internal server error occurred. If this persists, contact support.",
  [ErrorCode.SERVICE_UNAVAILABLE]: "The service is temporarily unavailable. Retry after a short delay.",
  [ErrorCode.DATABASE_ERROR]: "A database error occurred. Retry the request.",
  [ErrorCode.UNEXPECTED_ERROR]: "An unexpected error occurred. If this persists, contact support.",
};

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
