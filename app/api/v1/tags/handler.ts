/**
 * Tags Endpoints - Business Logic (External API)
 *
 * Handlers for managing tags via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiKey } from "@prisma/client";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  responseCreated,
  responseOk,
  responseNotFound,
} from "@/lib/api/responses";
import { createTagSchema, updateTagSchema } from "./schema";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";

/**
 * POST /api/v1/tags
 *
 * Create a new tag for the workspace.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch unique constraint violations.
 */
export async function createTag(apiKey: ApiKey, request: NextRequest) {
  const data = await validateRequestBody(createTagSchema, request);
  const workspaceId = apiKey.workspaceId;

  const tag = await prisma.tag.create({
    data: {
      workspaceId,
      name: data.name,
      color: data.color,
    },
  });

  return responseCreated(
    {
      id: tag.id,
    },
    "tag"
  );
}

/**
 * GET /api/v1/tags
 *
 * List tags for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Takes one extra item to determine if there are more results.
 * Reverses order for "before" cursor to maintain chronological order.
 */
export async function listTags(apiKey: ApiKey, request: NextRequest) {
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const tags = after
    ? await prisma.tag.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.tag.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.tag.findMany(baseQuery);

  const hasMore = tags.length > limit;
  const items = hasMore ? tags.slice(0, -1) : tags;

  if (before) {
    items.reverse();
  }

  const formattedTags = items.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedTags,
    hasMore,
    "tag_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/tags/[tagId]
 *
 * Get a specific tag by ID.
 * Workspace is determined from the authenticated API key.
 */
export async function getTag(apiKey: ApiKey, tagId: string) {
  const workspaceId = apiKey.workspaceId;

  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      workspaceId,
    },
  });

  if (!tag) {
    return responseNotFound("Tag not found");
  }

  return responseOk(
    {
      id: tag.id,
      name: tag.name,
      color: tag.color,
    },
    "tag"
  );
}

/**
 * PUT /api/v1/tags/[tagId]
 *
 * Update a specific tag by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch constraint violations and not found errors.
 */
export async function updateTag(
  apiKey: ApiKey,
  tagId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateTagSchema, request);
  const workspaceId = apiKey.workspaceId;

  const updatedTag = await prisma.tag.update({
    where: {
      id: tagId,
      workspaceId,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
    },
  });

  return responseOk(
    {
      id: updatedTag.id,
    },
    "tag"
  );
}

/**
 * DELETE /api/v1/tags/[tagId]
 *
 * Delete a specific tag by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 * Cascade deletes all contact_tag relationships.
 */
export async function deleteTag(apiKey: ApiKey, tagId: string) {
  const workspaceId = apiKey.workspaceId;

  const deletedTag = await prisma.tag.delete({
    where: {
      id: tagId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedTag.id,
    },
    "tag"
  );
}
