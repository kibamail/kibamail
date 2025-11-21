/**
 * Logto Error Handling Utilities
 *
 * Type-safe error handling for Logto API errors.
 */

/**
 * Known Logto error codes as string literals
 *
 * Add more codes as you encounter them in the Logto API.
 */
export type LogtoErrorCode =
  /**
   * Entity already exists (duplicate key violation)
   *
   * @example User with this email already exists in organization
   */
  | "entity.unique_integrity_violation"
  /**
   * Entity not found
   */
  | "entity.not_found"
  /**
   * Invalid input
   */
  | "request.invalid_input"
  /**
   * Unauthorized request
   */
  | "auth.unauthorized"
  /**
   * Forbidden - insufficient permissions
   */
  | "auth.forbidden";

/**
 * Typed Logto error
 */
export interface LogtoError {
  code: LogtoErrorCode;
  message: string;
}

/**
 * Valid Logto error codes for runtime checking
 */
const VALID_LOGTO_ERROR_CODES: LogtoErrorCode[] = [
  "entity.unique_integrity_violation",
  "entity.not_found",
  "request.invalid_input",
  "auth.unauthorized",
  "auth.forbidden",
];

/**
 * Type guard to check if an error is a Logto error
 *
 * @param error - Unknown error object
 * @returns True if error has a code property matching LogtoErrorCode
 */
export function isLogtoError(error: unknown): error is LogtoError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const hasCode = "code" in error && typeof error.code === "string";
  if (!hasCode) {
    return false;
  }

  // Check if code matches any valid code
  return VALID_LOGTO_ERROR_CODES.includes(error.code as LogtoErrorCode);
}

/**
 * Convert unknown error to typed LogtoError
 *
 * @param error - Unknown error (typically from catch block)
 * @returns Typed LogtoError if valid, null otherwise
 *
 * @example
 * ```ts
 * try {
 *   await logto.workspaces().members(id).invite(...)
 * } catch (error) {
 *   const logtoError = toLogtoError(error);
 *   if (logtoError?.code === LogtoErrorCode.ENTITY_UNIQUE_INTEGRITY_VIOLATION) {
 *     throw new ConflictError('User already exists in organization');
 *   }
 *   throw error;
 * }
 * ```
 */
export function toLogtoError(error: never): LogtoError {
  if (isLogtoError(error)) {
    return {
      code: (error as LogtoError).code,
      message: (error as LogtoError).message,
    };
  }

  return error;
}
