/**
 * Pagination Utilities
 *
 * Standard pagination types and helpers for API endpoints.
 * Provides consistent pagination interface across all endpoints.
 *
 * @example
 * ```ts
 * import { parsePaginationParams, createPaginatedResponse } from "@/lib/api/pagination";
 *
 * export async function GET(request: NextRequest) {
 *   const { page, limit, skip } = parsePaginationParams(request);
 *
 *   const [items, total] = await Promise.all([
 *     prisma.item.findMany({ skip, take: limit }),
 *     prisma.item.count(),
 *   ]);
 *
 *   return responseOk(createPaginatedResponse(items, total, page, limit));
 * }
 * ```
 */

import type { NextRequest } from "next/server";
import type { ApiObjectType } from "./responses";

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Number of items to skip (calculated from page and limit) */
  skip: number;
}

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Paginated response structure (legacy - for backward compatibility)
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  /** Number of items per page */
  limit: number;
  /** Cursor for next page (ID to start after) */
  after?: string;
  /** Cursor for previous page (ID to start before) */
  before?: string;
}

/**
 * Cursor-based pagination response structure
 */
export interface CursorPaginatedResponse<T> {
  /** Resource object identifier (e.g., "contact_list", "api_key_list") */
  object: ApiObjectType;
  /** Array of items for the current page */
  data: T[];
  /** Whether there are more elements available */
  hasMore: boolean;
}

/**
 * Parse pagination parameters from request URL
 *
 * Extracts `page` and `limit` query parameters from the request URL.
 * Provides sensible defaults and enforces maximum limits.
 *
 * @param request - Next.js request object
 * @returns Pagination parameters including calculated skip value
 *
 * @example
 * ```ts
 * // GET /api/items?page=2&limit=50
 * const { page, limit, skip } = parsePaginationParams(request);
 * // Returns: { page: 2, limit: 50, skip: 50 }
 * ```
 */
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams;

  const pageParam = searchParams.get("page");
  const page = Math.max(1, Number.parseInt(pageParam ?? String(DEFAULT_PAGE)));

  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(limitParam ?? String(DEFAULT_LIMIT))),
  );

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse cursor-based pagination parameters from request URL
 *
 * Extracts `limit`, `after`, and `before` query parameters from the request URL.
 * Provides sensible defaults and enforces maximum limits.
 *
 * @param request - Next.js request object
 * @returns Cursor pagination parameters
 *
 * @example
 * ```ts
 * // GET /api/contacts?limit=50&after=contact_123
 * const { limit, after, before } = parseCursorPaginationParams(request);
 * // Returns: { limit: 50, after: "contact_123", before: undefined }
 * ```
 */
export function parseCursorPaginationParams(
  request: NextRequest,
): CursorPaginationParams {
  const searchParams = request.nextUrl.searchParams;

  const limitParam = searchParams.get("limit");
  const parsedLimit = Number.parseInt(limitParam ?? String(DEFAULT_LIMIT));

  // Handle NaN by defaulting to DEFAULT_LIMIT
  const limit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(MAX_LIMIT, Math.max(1, parsedLimit));

  const after = searchParams.get("after") || undefined;
  const before = searchParams.get("before") || undefined;

  return { limit, after, before };
}

/**
 * Create pagination metadata
 *
 * Generates pagination metadata for API responses.
 * Calculates total pages and navigation flags automatically.
 *
 * @param total - Total number of items across all pages
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @returns Pagination metadata object
 *
 * @example
 * ```ts
 * const items = await prisma.item.findMany({ skip, take: limit });
 * const total = await prisma.item.count();
 * const meta = createPaginationMeta(total, page, limit);
 *
 * return responseOk('item_list', items, meta);
 * ```
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create a paginated response object (legacy)
 *
 * @deprecated Use createPaginationMeta() with responseOk() instead
 *
 * Generates a standardized paginated response with metadata.
 * Calculates total pages and navigation flags automatically.
 *
 * @param data - Array of items for the current page
 * @param total - Total number of items across all pages
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @returns Paginated response object
 *
 * @example
 * ```ts
 * const items = await prisma.item.findMany({ skip, take: limit });
 * const total = await prisma.item.count();
 *
 * return responseOk(
 *   createPaginatedResponse(items, total, page, limit)
 * );
 * ```
 */
function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(total, page, limit),
  };
}

/**
 * Create a cursor-based paginated response
 *
 * Generates a standardized cursor-based paginated response
 * The hasMore field indicates whether there are more elements available.
 *
 * @param data - Array of items for the current page
 * @param hasMore - Whether there are more items available
 * @param type - Resource type identifier (e.g., "contact_list", "api_key_list")
 * @returns Cursor-based paginated response object
 *
 * @example
 * ```ts
 * const contacts = await prisma.contact.findMany({
 *   where: { workspaceId },
 *   orderBy: { createdAt: "desc" },
 *   take: limit + 1, // Take one extra to check if there are more
 *   ...(after && { cursor: { id: after }, skip: 1 }),
 * });
 *
 * const hasMore = contacts.length > limit;
 * const items = hasMore ? contacts.slice(0, -1) : contacts;
 *
 * return responseOk(createCursorPaginatedResponse(items, hasMore, "contact_list"));
 * ```
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  hasMore: boolean,
  object: ApiObjectType,
): CursorPaginatedResponse<T> {
  return {
    object,
    data,
    hasMore,
  };
}
