/**
 * Topics Handler (External API)
 *
 * Business logic for topic CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateRequestBody } from "@/lib/api/validation";
import {
  responseCreated,
  responseOk,
  responseNotFound,
} from "@/lib/api/responses";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { createTopicSchema, updateTopicSchema } from "./schema";

/**
 * POST /api/v1/topics
 *
 * Create a new topic for the workspace.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch unique constraint violations.
 */
export async function createTopic(apiKey: ApiKey, request: NextRequest) {
  const data = await validateRequestBody(createTopicSchema, request);
  const workspaceId = apiKey.workspaceId;

  const topic = await prisma.topic.create({
    data: {
      workspaceId,
      ...data,
    },
  });

  return responseCreated(
    {
      id: topic.id,
    },
    "topic"
  );
}

/**
 * GET /api/v1/topics
 *
 * List topics for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Takes one extra item to determine if there are more results.
 * Reverses order for "before" cursor to maintain chronological order.
 */
export async function listTopics(apiKey: ApiKey, request: NextRequest) {
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const topics = after
    ? await prisma.topic.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.topic.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.topic.findMany(baseQuery);

  const hasMore = topics.length > limit;
  const items = hasMore ? topics.slice(0, -1) : topics;

  if (before) {
    items.reverse();
  }

  const formattedTopics = items.map((topic) => ({
    id: topic.id,
    name: topic.name,
    description: topic.description,
    slug: topic.slug,
    visibility: topic.visibility,
    isPrimary: topic.isPrimary,
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedTopics,
    hasMore,
    "topic_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/topics/[topicId]
 *
 * Get a specific topic by ID.
 * Workspace is determined from the authenticated API key.
 * Returns 404 if topic not found or belongs to a different workspace.
 */
export async function getTopic(apiKey: ApiKey, topicId: string) {
  const workspaceId = apiKey.workspaceId;

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      workspaceId,
    },
  });

  if (!topic) {
    return responseNotFound("Topic not found");
  }

  return responseOk(
    {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      slug: topic.slug,
      visibility: topic.visibility,
      isPrimary: topic.isPrimary,
    },
    "topic"
  );
}

/**
 * PUT /api/v1/topics/[topicId]
 *
 * Update a specific topic by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch unique constraint violations and not found errors.
 */
export async function updateTopic(
  apiKey: ApiKey,
  topicId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateTopicSchema, request);
  const workspaceId = apiKey.workspaceId;

  const updatedTopic = await prisma.topic.update({
    where: {
      id: topicId,
      workspaceId,
    },
    data: {
      ...data,
    },
  });

  return responseOk(
    {
      id: updatedTopic.id,
    },
    "topic"
  );
}

/**
 * DELETE /api/v1/topics/[topicId]
 *
 * Delete a specific topic by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 * Cascade deletes all contact_topic relationships.
 */
export async function deleteTopic(apiKey: ApiKey, topicId: string) {
  const workspaceId = apiKey.workspaceId;

  const deletedTopic = await prisma.topic.delete({
    where: {
      id: topicId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedTopic.id,
    },
    "topic"
  );
}
