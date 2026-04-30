/**
 * Tests for the shared pagination utilities at lib/api/pagination.ts.
 *
 * These helpers underpin every list endpoint in the public and internal
 * API surface (15+ handler files use parseCursorPaginationParams alone).
 * Bugs in defaults, bounds clamping, or NaN handling would silently leak
 * across most of the product, so they're worth pinning with focused
 * unit tests.
 */

import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import {
  createCursorPaginatedResponse,
  createPaginationMeta,
  parseCursorPaginationParams,
  parsePaginationParams,
} from "@/lib/api/pagination";

function buildRequest(query = ""): NextRequest {
  const url = `http://localhost:3000/api/items${query ? `?${query}` : ""}`;
  return new NextRequest(url);
}

describe("parsePaginationParams", () => {
  test("returns defaults when no query params are supplied", () => {
    const { page, limit, skip } = parsePaginationParams(buildRequest());
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(skip).toBe(0);
  });

  test("computes skip from page and limit", () => {
    const { page, limit, skip } = parsePaginationParams(
      buildRequest("page=3&limit=25"),
    );
    expect(page).toBe(3);
    expect(limit).toBe(25);
    expect(skip).toBe(50);
  });

  test("clamps limit to MAX_LIMIT (100)", () => {
    const { limit } = parsePaginationParams(buildRequest("limit=999"));
    expect(limit).toBe(100);
  });

  test("clamps limit lower bound to 1", () => {
    const { limit } = parsePaginationParams(buildRequest("limit=0"));
    expect(limit).toBe(1);
  });

  test("rejects negative limit by clamping to 1", () => {
    const { limit } = parsePaginationParams(buildRequest("limit=-50"));
    expect(limit).toBe(1);
  });

  test("clamps page lower bound to 1 (no negative pages)", () => {
    const { page, skip } = parsePaginationParams(buildRequest("page=0"));
    expect(page).toBe(1);
    expect(skip).toBe(0);
  });

  test("clamps negative page to 1 (no negative skip)", () => {
    const { page, skip } = parsePaginationParams(buildRequest("page=-5"));
    expect(page).toBe(1);
    expect(skip).toBe(0);
  });

  test("ignores trailing non-numeric characters on integer parse", () => {
    // parseInt is lenient — "42abc" => 42. Pin this to lock in current behavior.
    const { page, limit } = parsePaginationParams(
      buildRequest("page=42abc&limit=10xyz"),
    );
    expect(page).toBe(42);
    expect(limit).toBe(10);
  });
});

describe("parseCursorPaginationParams", () => {
  test("returns DEFAULT_LIMIT when limit is missing", () => {
    const { limit, after, before } = parseCursorPaginationParams(buildRequest());
    expect(limit).toBe(20);
    expect(after).toBeUndefined();
    expect(before).toBeUndefined();
  });

  test("falls back to DEFAULT_LIMIT when limit is non-numeric (NaN)", () => {
    const { limit } = parseCursorPaginationParams(buildRequest("limit=abc"));
    expect(limit).toBe(20);
  });

  test("clamps limit upper bound to 100", () => {
    const { limit } = parseCursorPaginationParams(buildRequest("limit=500"));
    expect(limit).toBe(100);
  });

  test("clamps limit lower bound to 1 (zero is not allowed)", () => {
    const { limit } = parseCursorPaginationParams(buildRequest("limit=0"));
    expect(limit).toBe(1);
  });

  test("clamps negative limit to 1", () => {
    const { limit } = parseCursorPaginationParams(buildRequest("limit=-3"));
    expect(limit).toBe(1);
  });

  test("returns after/before cursors verbatim when present", () => {
    const { after, before } = parseCursorPaginationParams(
      buildRequest("after=cur_abc&before=cur_xyz"),
    );
    expect(after).toBe("cur_abc");
    expect(before).toBe("cur_xyz");
  });

  test("treats empty cursor strings as undefined", () => {
    // Empty-string cursors come back as undefined, otherwise Prisma would
    // be asked to seek to a non-existent row.
    const { after, before } = parseCursorPaginationParams(
      buildRequest("after=&before="),
    );
    expect(after).toBeUndefined();
    expect(before).toBeUndefined();
  });
});

describe("createPaginationMeta", () => {
  test("computes totalPages and navigation flags for a middle page", () => {
    const meta = createPaginationMeta(95, 3, 20);
    expect(meta).toEqual({
      page: 3,
      limit: 20,
      total: 95,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  test("first page has no previous, has next when there are more pages", () => {
    const meta = createPaginationMeta(50, 1, 20);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.totalPages).toBe(3);
  });

  test("last page has no next, has previous", () => {
    const meta = createPaginationMeta(50, 3, 20);
    expect(meta.hasPreviousPage).toBe(true);
    expect(meta.hasNextPage).toBe(false);
  });

  test("single-page result: no next, no previous", () => {
    const meta = createPaginationMeta(5, 1, 20);
    expect(meta).toMatchObject({
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  test("zero results: 0 totalPages, no next, no previous", () => {
    // ceil(0/20) = 0. page=1 > totalPages=0, so hasNextPage stays false.
    const meta = createPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });

  test("partial last page is counted via Math.ceil", () => {
    // 21 items at limit=20 => 2 pages, the second has 1 item.
    const meta = createPaginationMeta(21, 2, 20);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });
});

describe("createCursorPaginatedResponse", () => {
  test("wraps data with object + hasMore fields", () => {
    const response = createCursorPaginatedResponse(
      [{ id: "1" }, { id: "2" }],
      true,
      "contact_list",
    );
    expect(response).toEqual({
      object: "contact_list",
      data: [{ id: "1" }, { id: "2" }],
      hasMore: true,
    });
  });

  test("hasMore=false when caller signals no further pages", () => {
    const response = createCursorPaginatedResponse([], false, "api_key_list");
    expect(response.hasMore).toBe(false);
    expect(response.data).toEqual([]);
  });

  test("preserves item ordering as supplied (no sorting/mutation)", () => {
    const items = [{ id: "z" }, { id: "a" }, { id: "m" }];
    const response = createCursorPaginatedResponse(
      items,
      false,
      "broadcast_list",
    );
    expect(response.data.map((i) => i.id)).toEqual(["z", "a", "m"]);
  });
});
