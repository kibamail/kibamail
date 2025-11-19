/**
 * Segments Handler (External API)
 *
 * Business logic for segment CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import {
  responseCreated,
  responseOk,
} from "@/lib/api/responses";
import {
  NotFoundError,
  BadRequestError,
} from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  conditionsToPrismaWhere,
  validateConditionFields,
} from "@/lib/segments/conditions-to-prisma";
import { getRedisClient } from "@/lib/storage/redis-client";
import { getSegmentContactsKey } from "@/lib/storage/redis-keys";
import type { ConditionInput } from "./schema";
import { createSegmentSchema, updateSegmentSchema } from "./schema";

/**
 * POST /api/v1/segments
 *
 * Create a new segment for the workspace.
 * Workspace is determined from the authenticated API key.
 * Validates that all fields in conditions are either built-in or custom properties.
 */
export async function createSegment(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createSegmentSchema, request);

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  // Validate that all fields in conditions are valid
  const validation = validateConditionFields(
    data.conditions,
    contactProperties,
  );
  if (!validation.isValid) {
    throw new BadRequestError(
      `Invalid field(s) in conditions: ${validation.invalidFields.join(", ")}. ` +
        `Fields must be built-in contact fields or defined custom properties.`,
      ErrorCode.INVALID_PARAMETER
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

  // Clear the cached segment contact counts to trigger recomputation
  const redis = getRedisClient();
  const cacheKey = getSegmentContactsKey(workspaceId);
  await redis.del(cacheKey);

  return responseCreated(
    {
      id: segment.id,
    },
    "segment",
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
export async function listSegments(workspaceId: string, request: NextRequest) {
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
    "segment_list",
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
export async function getSegment(workspaceId: string, segmentId: string) {
  const segment = await prisma.segment.findFirst({
    where: {
      id: segmentId,
      workspaceId,
    },
  });

  if (!segment) {
    throw new NotFoundError("Segment not found", ErrorCode.SEGMENT_NOT_FOUND);
  }

  return responseOk(
    {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      conditions: segment.conditions,
    },
    "segment",
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
  workspaceId: string,
  segmentId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateSegmentSchema, request);

  // If conditions are being updated, validate them
  if (data.conditions !== undefined) {
    // Fetch contact properties for this workspace
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true, type: true },
    });

    // Validate that all fields in conditions are valid
    const validation = validateConditionFields(
      data.conditions,
      contactProperties,
    );
    if (!validation.isValid) {
      throw new BadRequestError(
        `Invalid field(s) in conditions: ${validation.invalidFields.join(", ")}. ` +
          `Fields must be built-in contact fields or defined custom properties.`,
        ErrorCode.INVALID_PARAMETER
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
      ...(data.conditions !== undefined && {
        conditions: data.conditions as Prisma.InputJsonValue,
      }),
    },
  });

  // Clear the cached segment contact counts to trigger recomputation
  const redis = getRedisClient();
  const cacheKey = getSegmentContactsKey(workspaceId);
  await redis.del(cacheKey);

  return responseOk(
    {
      id: updatedSegment.id,
    },
    "segment",
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
export async function deleteSegment(workspaceId: string, segmentId: string) {
  const deletedSegment = await prisma.segment.delete({
    where: {
      id: segmentId,
      workspaceId,
    },
  });

  // Clear the cached segment contact counts to trigger recomputation
  const redis = getRedisClient();
  const cacheKey = getSegmentContactsKey(workspaceId);
  await redis.del(cacheKey);

  return responseOk(
    {
      id: deletedSegment.id,
    },
    "segment",
  );
}

/**
 * GET /api/v1/segments/[segmentId]/contacts
 *
 * Get all contacts that match a segment's conditions.
 * Workspace is determined from the authenticated API key.
 * Returns cursor-paginated results with contact properties.
 */
export async function getSegmentContacts(
  workspaceId: string,
  segmentId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  // Fetch the segment and verify it belongs to this workspace
  const segment = await prisma.segment.findFirst({
    where: {
      id: segmentId,
      workspaceId,
    },
  });

  if (!segment) {
    throw new NotFoundError("Segment not found", ErrorCode.SEGMENT_NOT_FOUND);
  }

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  // Convert segment conditions to Prisma where clause
  const conditionsWhere = conditionsToPrismaWhere(
    segment.conditions as ConditionInput,
    contactProperties,
  );

  const baseQuery = {
    where: {
      workspaceId,
      ...conditionsWhere,
    },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const contacts = after
    ? await prisma.contact.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.contact.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.contact.findMany(baseQuery);

  const hasMore = contacts.length > limit;
  const items = hasMore ? contacts.slice(0, -1) : contacts;

  if (before) {
    items.reverse();
  }

  // Build contact properties for each contact
  const formattedContacts = items.map((contact) => {
    const properties: Record<string, any> = {};
    for (const property of contactProperties) {
      const value = contact[property.slot as keyof typeof contact];
      if (value !== null && value !== undefined) {
        properties[property.name] = value;
      }
    }

    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      country: contact.country,
      timezone: contact.timezone,
      city: contact.city,
      status: contact.status,
      properties,
    };
  });

  const paginatedResponse = createCursorPaginatedResponse(
    formattedContacts,
    hasMore,
    "contact_list",
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}
