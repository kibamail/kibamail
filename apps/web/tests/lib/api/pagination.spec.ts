import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import {
  createCursorPaginatedResponse,
  createPaginationMeta,
  parseCursorPaginationParams,
  parsePaginationParams,
} from "@/lib/api/pagination";

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("parsePaginationParams", () => {
  test("uses defaults when no params provided", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items"),
    );
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  test("calculates skip from page and limit", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?page=3&limit=25"),
    );
    expect(result).toEqual({ page: 3, limit: 25, skip: 50 });
  });

  test("clamps limit to MAX_LIMIT (100)", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?limit=500"),
    );
    expect(result.limit).toBe(100);
  });

  test("clamps limit below 1 up to 1", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?limit=0"),
    );
    expect(result.limit).toBe(1);
  });

  test("rejects negative limit by clamping to 1", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?limit=-5"),
    );
    expect(result.limit).toBe(1);
  });

  test("clamps page below 1 to 1", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?page=0"),
    );
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  test("rejects negative page by clamping to 1", () => {
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?page=-3"),
    );
    expect(result.page).toBe(1);
  });

  test("parseInt parses leading digits from non-numeric input", () => {
    // parseInt("abc") -> NaN -> Math.max(1, NaN) -> NaN; this documents that
    // page becomes NaN when input is not numeric, which the API surface
    // currently allows. Guard by validating the type instead.
    const result = parsePaginationParams(
      makeRequest("https://example.com/items?page=10abc&limit=50"),
    );
    expect(result.page).toBe(10);
    expect(result.limit).toBe(50);
  });
});

describe("parseCursorPaginationParams", () => {
  test("uses default limit and undefined cursors when params absent", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts"),
    );
    expect(result).toEqual({ limit: 20, after: undefined, before: undefined });
  });

  test("returns both after and before when provided", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts?after=ct_1&before=ct_9"),
    );
    expect(result.after).toBe("ct_1");
    expect(result.before).toBe("ct_9");
  });

  test("clamps limit to MAX_LIMIT (100)", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts?limit=9999"),
    );
    expect(result.limit).toBe(100);
  });

  test("clamps limit below 1 up to 1", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts?limit=0"),
    );
    expect(result.limit).toBe(1);
  });

  test("defaults limit when value is NaN", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts?limit=notanumber"),
    );
    expect(result.limit).toBe(20);
  });

  test("treats empty cursor strings as undefined", () => {
    const result = parseCursorPaginationParams(
      makeRequest("https://example.com/contacts?after=&before="),
    );
    expect(result.after).toBeUndefined();
    expect(result.before).toBeUndefined();
  });
});

describe("createPaginationMeta", () => {
  test("computes totalPages with ceiling division", () => {
    const meta = createPaginationMeta(95, 1, 20);
    expect(meta.totalPages).toBe(5);
  });

  test("totalPages is 1 when total === limit", () => {
    const meta = createPaginationMeta(20, 1, 20);
    expect(meta.totalPages).toBe(1);
  });

  test("hasNextPage is true when more pages remain", () => {
    const meta = createPaginationMeta(100, 2, 20);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPreviousPage).toBe(true);
  });

  test("hasNextPage is false on the last page", () => {
    const meta = createPaginationMeta(100, 5, 20);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });

  test("hasPreviousPage is false on first page", () => {
    const meta = createPaginationMeta(50, 1, 20);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(true);
  });

  test("returns zero totalPages when total is zero", () => {
    const meta = createPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });

  test("preserves total, page, limit verbatim in meta", () => {
    const meta = createPaginationMeta(42, 2, 10);
    expect(meta.total).toBe(42);
    expect(meta.page).toBe(2);
    expect(meta.limit).toBe(10);
  });
});

describe("createCursorPaginatedResponse", () => {
  test("returns object, data, hasMore in expected shape", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const response = createCursorPaginatedResponse(data, true, "contact_list");
    expect(response).toEqual({
      object: "contact_list",
      data,
      hasMore: true,
    });
  });

  test("preserves hasMore=false", () => {
    const response = createCursorPaginatedResponse([], false, "contact_list");
    expect(response.hasMore).toBe(false);
    expect(response.data).toEqual([]);
  });
});
