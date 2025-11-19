/**
 * API Validation Helpers
 *
 * Type-safe validation utilities for Next.js API routes using Zod.
 * Provides a consistent validation pattern across all endpoints.
 *
 * @example
 * ```ts
 * const result = validateRequest(createUserSchema, await request.json())
 *
 * if (!result.success) {
 *   return responseValidationFailed(result.error)
 * }
 *
 * const { email, name } = result.data
 * ```
 */

import type { ZodError, ZodType } from "zod";

/**
 * Validation result for successful validation
 */
type ValidationSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Validation result for failed validation
 */
type ValidationFailure = {
  success: false;
  error: ZodError;
};

/**
 * Combined validation result type
 */
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate data against a Zod schema
 *
 * Type-safe validation that returns a discriminated union.
 * Use the `success` field to narrow the type.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success status, data, or error
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2)
 * })
 *
 * const result = validateRequest(schema, { email: 'test@example.com', name: 'John' })
 *
 * if (!result.success) {
 *   // TypeScript knows result.error is available here
 *   return responseValidationFailed(result.error)
 * }
 *
 * // TypeScript knows result.data is available here
 * const { email, name } = result.data
 * ```
 */
export function validateRequest<T>(
  schema: ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate data and throw on error
 *
 * Simpler API for cases where you want to handle validation errors
 * with try/catch instead of checking success.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 *
 * @example
 * ```ts
 * try {
 *   const validated = validateOrThrow(createUserSchema, body)
 *   // validated is typed as CreateUserInput
 *   return responseCreated({ user: validated })
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return responseValidationFailed(error)
 *   }
 *   throw error
 * }
 * ```
 */
export function validateOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate request body from Next.js request
 *
 * Convenience wrapper that parses JSON body and validates in one step.
 * By default, throws ZodError on validation failure (for use with withErrorHandling).
 * Set shouldThrow: false to return a validation result instead.
 *
 * @param schema - Zod schema to validate against
 * @param request - Next.js request object
 * @param options - Validation options
 * @param options.shouldThrow - Whether to throw on validation error (default: true)
 * @returns Validated data (when shouldThrow: true) or validation result (when shouldThrow: false)
 * @throws ZodError if validation fails and shouldThrow is true
 *
 * @example Throw on validation error (default)
 * ```ts
 * export async function POST(request: NextRequest) {
 *   // Throws ZodError if validation fails - caught by withErrorHandling
 *   const data = await validateRequestBody(createUserSchema, request)
 *
 *   const user = await createUser(data)
 *   return responseCreated({ user })
 * }
 * ```
 *
 * @example Return validation result
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const result = await validateRequestBody(createUserSchema, request, { shouldThrow: false })
 *
 *   if (!result.success) {
 *     return responseValidationFailed(result.error)
 *   }
 *
 *   const user = await createUser(result.data)
 *   return responseCreated({ user })
 * }
 * ```
 */
export async function validateRequestBody<T>(
  schema: ZodType<T>,
  request: Request
): Promise<T>;
export async function validateRequestBody<T>(
  schema: ZodType<T>,
  request: Request,
  options: { shouldThrow: false }
): Promise<ValidationResult<T>>;
export async function validateRequestBody<T>(
  schema: ZodType<T>,
  request: Request,
  options?: { shouldThrow?: boolean }
): Promise<ValidationResult<T> | T> {
  const shouldThrow = options?.shouldThrow ?? true;

  let body: unknown;
  try {
    body = await request.json();
  } catch (_error) {
    // JSON parsing failed
    const issues = [
      {
        code: "custom" as const,
        path: [],
        message: "Invalid JSON in request body",
      },
    ];

    // Create a minimal ZodError-compatible object
    const zodError = new Error("Invalid JSON") as unknown as ZodError;
    Object.assign(zodError, { issues, name: "ZodError" });

    if (shouldThrow) {
      throw zodError;
    }

    return {
      success: false,
      error: zodError,
    };
  }

  // Now validate the parsed body
  const result = validateRequest(schema, body);

  if (!result.success) {
    if (shouldThrow) {
      throw result.error;
    }
    return result;
  }

  return shouldThrow ? result.data : result;
}
