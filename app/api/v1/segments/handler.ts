/**
 * Segments Handler (External API)
 *
 * Business logic for segment CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiKey } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateRequestBody } from "@/lib/api/validation";
import {
  responseCreated,
  responseOk,
  responseNotFound,
  responseBadRequest,
} from "@/lib/api/responses";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { createSegmentSchema, updateSegmentSchema } from "./schema";
import { validateConditionFields } from "@/lib/segments/conditions-to-prisma";

/**
 * POST /api/v1/segments
 *
 * Create a new segment for the workspace.
 * Workspace is determined from the authenticated API key.
 * Validates that all fields in conditions are either built-in or custom properties.
 */
export async function createSegment(apiKey: ApiKey, request: NextRequest) {
  const data = await validateRequestBody(createSegmentSchema, request);
  const workspaceId = apiKey.workspaceId;

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  // Validate that all fields in conditions are valid
  const validation = validateConditionFields(data.conditions, contactProperties);
  if (!validation.isValid) {
    return responseBadRequest(
      `Invalid field(s) in conditions: ${validation.invalidFields.join(", ")}. ` +
        `Fields must be built-in contact fields or defined custom properties.`
    );
  }

  const segment = await prisma.segment.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      conditions: data.conditions as Prisma.InputJsonValue,
    },
  });

  return responseCreated(
    {
      id: segment.id,
    },
    "segment"
  );
}

/**
 * GET /api/v1/segments
 *
 * List segments for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Takes one extra item to determine if there are more results.
 * Reverses order for "before" cursor to maintain chronological order.
 */
export async function listSegments(apiKey: ApiKey, request: NextRequest) {
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const segments = after
    ? await prisma.segment.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.segment.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.segment.findMany(baseQuery);

  const hasMore = segments.length > limit;
  const items = hasMore ? segments.slice(0, -1) : segments;

  if (before) {
    items.reverse();
  }

  const formattedSegments = items.map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    conditions: segment.conditions,
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedSegments,
    hasMore,
    "segment_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/segments/[segmentId]
 *
 * Get a specific segment by ID.
 * Workspace is determined from the authenticated API key.
 * Returns 404 if segment not found or belongs to a different workspace.
 */
export async function getSegment(apiKey: ApiKey, segmentId: string) {
  const workspaceId = apiKey.workspaceId;

  const segment = await prisma.segment.findFirst({
    where: {
      id: segmentId,
      workspaceId,
    },
  });

  if (!segment) {
    return responseNotFound("Segment not found");
  }

  return responseOk(
    {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      conditions: segment.conditions,
    },
    "segment"
  );
}

/**
 * PUT /api/v1/segments/[segmentId]
 *
 * Update a specific segment by ID.
 * Workspace is determined from the authenticated API key.
 * Validates that all fields in conditions are either built-in or custom properties.
 * Global error handler will catch not found errors.
 */
export async function updateSegment(
  apiKey: ApiKey,
  segmentId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateSegmentSchema, request);
  const workspaceId = apiKey.workspaceId;

  // If conditions are being updated, validate them
  if (data.conditions !== undefined) {
    // Fetch contact properties for this workspace
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true, type: true },
    });

    // Validate that all fields in conditions are valid
    const validation = validateConditionFields(data.conditions, contactProperties);
    if (!validation.isValid) {
      return responseBadRequest(
        `Invalid field(s) in conditions: ${validation.invalidFields.join(", ")}. ` +
          `Fields must be built-in contact fields or defined custom properties.`
      );
    }
  }

  const updatedSegment = await prisma.segment.update({
    where: {
      id: segmentId,
      workspaceId,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.conditions !== undefined && { conditions: data.conditions as Prisma.InputJsonValue }),
    },
  });

  return responseOk(
    {
      id: updatedSegment.id,
    },
    "segment"
  );
}

/**
 * DELETE /api/v1/segments/[segmentId]
 *
 * Delete a specific segment by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 * Cascade deletes all contact_segment relationships.
 */
export async function deleteSegment(apiKey: ApiKey, segmentId: string) {
  const workspaceId = apiKey.workspaceId;

  const deletedSegment = await prisma.segment.delete({
    where: {
      id: segmentId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedSegment.id,
    },
    "segment"
  );
}
