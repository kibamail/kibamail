/**
 * List API Keys Handler
 *
 * GET /api/v1/api-keys
 */

import type { NextRequest } from "next/server";
import {
  createPaginationMeta,
  parsePaginationParams,
} from "@/lib/api/pagination";
import { responseOk } from "@/lib/api/responses";
import { prisma } from "@/lib/db";

/**
 * Get all API keys for the workspace (paginated)
 *
 * Workspace is determined from the authenticated API key.
 * Keys are returned WITHOUT the actual key value (only preview).
 *
 * @param apiKey - Authenticated API key from withApiSession
 * @param request - Next.js request object
 * @returns Paginated response with API keys
 */
export async function listApiKeysHandler(
  workspaceId: string,
  request: NextRequest,
) {
  const { page, limit, skip } = parsePaginationParams(request);

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: { workspaceId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.apiKey.count({
      where: { workspaceId },
    }),
  ]);

  return responseOk(
    { data: keys },
    "api_key_list",
    createPaginationMeta(total, page, limit),
  );
}
