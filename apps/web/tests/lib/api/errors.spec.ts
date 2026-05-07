/**
 * Tests for API Error classes and error code helpers
 *
 * These error classes and the status -> type mapping are the spine of every
 * API response in the app. A regression here can cause:
 *   - wrong HTTP status codes returned to clients/SDKs,
 *   - wrong error_type categories surfaced through the public API,
 *   - missing or wrong agent-facing hints (ERROR_HINTS) for AI clients.
 */

import { describe, expect, test } from "vitest";
import {
  ErrorCode,
  ErrorType,
  ERROR_HINTS,
  getErrorTypeFromStatus,
} from "@/lib/api/error-codes";
import {
  ApiError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  type ValidationErrorDetail,
} from "@/lib/api/errors";

describe("getErrorTypeFromStatus", () => {
  test("maps 401 to AUTHENTICATION_ERROR", () => {
    expect(getErrorTypeFromStatus(401)).toBe(ErrorType.AUTHENTICATION_ERROR);
  });

  test("maps 403 to AUTHENTICATION_ERROR", () => {
    expect(getErrorTypeFromStatus(403)).toBe(ErrorType.AUTHENTICATION_ERROR);
  });

  test("maps 422 to VALIDATION_ERROR", () => {
    expect(getErrorTypeFromStatus(422)).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("maps 429 to RATE_LIMIT_ERROR", () => {
    expect(getErrorTypeFromStatus(429)).toBe(ErrorType.RATE_LIMIT_ERROR);
  });

  test("maps 500/502/503 to API_ERROR", () => {
    expect(getErrorTypeFromStatus(500)).toBe(ErrorType.API_ERROR);
    expect(getErrorTypeFromStatus(502)).toBe(ErrorType.API_ERROR);
    expect(getErrorTypeFromStatus(503)).toBe(ErrorType.API_ERROR);
  });

  test("maps 400/404/409 to INVALID_REQUEST_ERROR", () => {
    expect(getErrorTypeFromStatus(400)).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(getErrorTypeFromStatus(404)).toBe(ErrorType.INVALID_REQUEST_ERROR);
    expect(getErrorTypeFromStatus(409)).toBe(ErrorType.INVALID_REQUEST_ERROR);
  });

  test("maps 200 to INVALID_REQUEST_ERROR (default bucket)", () => {
    // 200 should never reach this function in practice, but we assert the
    // documented fallback so callers get a deterministic result.
    expect(getErrorTypeFromStatus(200)).toBe(ErrorType.INVALID_REQUEST_ERROR);
  });
});

describe("ERROR_HINTS", () => {
  test("provides a non-empty hint for every ErrorCode", () => {
    const codes = Object.values(ErrorCode);
    for (const code of codes) {
      const hint = ERROR_HINTS[code];
      expect(
        hint,
        `Missing ERROR_HINTS entry for ${code}`,
      ).toBeDefined();
      expect(typeof hint).toBe("string");
      expect((hint ?? "").length).toBeGreaterThan(0);
    }
  });
});

describe("ApiError base class", () => {
  test("captures status, code, type and details", () => {
    const cause = new Error("upstream");
    const err = new ApiError(
      "boom",
      500,
      ErrorCode.DATABASE_ERROR,
      undefined,
      { foo: "bar" },
      cause,
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("boom");
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe(ErrorCode.DATABASE_ERROR);
    expect(err.errorType).toBe(ErrorType.API_ERROR);
    expect(err.details).toEqual({ foo: "bar" });
    expect(err.cause).toBe(cause);
    expect(err.name).toBe("ApiError");
  });

  test("derives errorType from statusCode for each subclass", () => {
    expect(new BadRequestError("x").errorType).toBe(
      ErrorType.INVALID_REQUEST_ERROR,
    );
    expect(new UnauthorizedError().errorType).toBe(
      ErrorType.AUTHENTICATION_ERROR,
    );
    expect(new ForbiddenError().errorType).toBe(
      ErrorType.AUTHENTICATION_ERROR,
    );
    expect(new NotFoundError().errorType).toBe(
      ErrorType.INVALID_REQUEST_ERROR,
    );
    expect(new ConflictError("x").errorType).toBe(
      ErrorType.INVALID_REQUEST_ERROR,
    );
    expect(new ValidationError("x").errorType).toBe(ErrorType.VALIDATION_ERROR);
    expect(new InternalServerError().errorType).toBe(ErrorType.API_ERROR);
  });
});

describe("BadRequestError", () => {
  test("uses 400 + INVALID_PARAMETER by default", () => {
    const err = new BadRequestError("nope");
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe(ErrorCode.INVALID_PARAMETER);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("BadRequestError");
  });

  test("respects custom error code and details", () => {
    const err = new BadRequestError(
      "missing email",
      ErrorCode.MISSING_PARAMETER,
      { param: "email" },
    );
    expect(err.errorCode).toBe(ErrorCode.MISSING_PARAMETER);
    expect(err.details).toEqual({ param: "email" });
  });
});

describe("UnauthorizedError", () => {
  test("defaults to 401 + AUTHENTICATION_REQUIRED with default message", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe(ErrorCode.AUTHENTICATION_REQUIRED);
    expect(err.message).toBe("Authentication required");
  });

  test("accepts custom message and code", () => {
    const err = new UnauthorizedError("bad key", ErrorCode.INVALID_API_KEY);
    expect(err.message).toBe("bad key");
    expect(err.errorCode).toBe(ErrorCode.INVALID_API_KEY);
  });
});

describe("ForbiddenError", () => {
  test("defaults to 403 + ACCESS_DENIED with default message", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.errorCode).toBe(ErrorCode.ACCESS_DENIED);
    expect(err.message).toBe("Access denied");
  });
});

describe("NotFoundError", () => {
  test("defaults to 404 + RESOURCE_NOT_FOUND", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(err.message).toBe("Resource not found");
  });

  test("accepts a specific resource code", () => {
    const err = new NotFoundError("Form not found", ErrorCode.FORM_NOT_FOUND);
    expect(err.errorCode).toBe(ErrorCode.FORM_NOT_FOUND);
    expect(err.message).toBe("Form not found");
  });
});

describe("ConflictError", () => {
  test("defaults to 409 + RESOURCE_CONFLICT", () => {
    const err = new ConflictError("conflict");
    expect(err.statusCode).toBe(409);
    expect(err.errorCode).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

describe("ValidationError", () => {
  test("defaults to 422 + VALIDATION_FAILED with empty validationErrors", () => {
    const err = new ValidationError("invalid");
    expect(err.statusCode).toBe(422);
    expect(err.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
    expect(err.errorType).toBe(ErrorType.VALIDATION_ERROR);
    expect(err.validationErrors).toEqual([]);
  });

  test("preserves field-level validationErrors", () => {
    const fields: ValidationErrorDetail[] = [
      {
        field: "email",
        code: ErrorCode.INVALID_EMAIL_FORMAT,
        message: "Invalid email format",
      },
      {
        field: "name",
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: "Name is required",
      },
    ];
    const err = new ValidationError(
      "Validation failed",
      ErrorCode.VALIDATION_FAILED,
      fields,
    );
    expect(err.validationErrors).toEqual(fields);
  });
});

describe("InternalServerError", () => {
  test("defaults to 500 + INTERNAL_SERVER_ERROR", () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(err.errorType).toBe(ErrorType.API_ERROR);
    expect(err.message).toBe("Internal server error");
  });
});
