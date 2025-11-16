/**
 * Automations Handler (External API)
 *
 * Business logic for automation CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Automation, AutomationStatus, AutomationTrigger, Prisma } from "@prisma/client";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import {
  responseBadRequest,
  responseCreated,
  responseNotFound,
  responseOk,
} from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { createAutomationSchema, updateAutomationSchema } from "./schema";

/**
 * Format automation for API response
 */
function formatAutomationResponse(automation: Automation) {
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    status: automation.status,
    version: automation.version,
    parentId: automation.parentId,
    trigger: {
      type: automation.triggerType,
      config: (automation.triggerConfig || {}) as Record<string, unknown>,
    },
    nodes: automation.nodes as unknown[],
    edges: automation.edges as unknown[],
    stats: (automation.stats || {}) as Record<string, unknown>,
    publishedAt: automation.publishedAt,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
  };
}

/**
 * POST /api/v1/automations
 *
 * Create a new automation for the workspace.
 * Workspace is determined from the authenticated API key.
 * Creates version 1 as DRAFT by default.
 */
export async function createAutomation(
  workspaceId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(createAutomationSchema, request);

  // Create the automation (first version)
  const automation = await prisma.automation.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      status: "DRAFT",
      version: 1,
      parentId: null,
      triggerType: data.trigger.type as AutomationTrigger,
      triggerConfig: data.trigger.config as Prisma.JsonObject,
      nodes: data.nodes as Prisma.JsonArray,
      edges: data.edges as Prisma.JsonArray,
      settings: {},
      stats: {},
    },
  });

  return responseCreated(formatAutomationResponse(automation), "automation");
}

/**
 * GET /api/v1/automations
 *
 * List automations for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * By default, returns only PUBLISHED versions (not DRAFT or ARCHIVED).
 */
export async function listAutomations(
  workspaceId: string,
  request: NextRequest
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  // Get status filter from query params (default to PUBLISHED)
  const statusFilter =
    (request.nextUrl.searchParams.get("status") as AutomationStatus) ||
    "PUBLISHED";

  const baseQuery = {
    where: {
      workspaceId,
      status: statusFilter as AutomationStatus,
      deletedAt: null,
    },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const automations = after
    ? await prisma.automation.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.automation.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.automation.findMany(baseQuery);

  const hasMore = automations.length > limit;
  const items = hasMore ? automations.slice(0, -1) : automations;

  if (before) {
    items.reverse();
  }

  const formattedAutomations = items.map(formatAutomationResponse);

  const paginatedResponse = createCursorPaginatedResponse(
    formattedAutomations,
    hasMore,
    "automation_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/automations/[automationId]
 *
 * Get a specific automation by ID.
 * Workspace is determined from the authenticated API key.
 * Returns 404 if automation not found or belongs to a different workspace.
 */
export async function getAutomation(
  workspaceId: string,
  automationId: string
) {
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    return responseNotFound("Automation not found");
  }

  return responseOk(formatAutomationResponse(automation), "automation");
}

/**
 * PUT /api/v1/automations/[automationId]
 *
 * Update a specific automation by ID.
 * Only DRAFT versions can be updated.
 * Workspace is determined from the authenticated API key.
 */
export async function updateAutomation(
  workspaceId: string,
  automationId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateAutomationSchema, request);

  // Check if automation exists and is a DRAFT
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    return responseNotFound("Automation not found");
  }

  if (automation.status !== "DRAFT") {
    return responseBadRequest(
      "Only DRAFT automations can be updated. Create a new version to modify a PUBLISHED automation."
    );
  }

  const updatedAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.trigger && {
        triggerType: data.trigger.type as AutomationTrigger,
        triggerConfig: data.trigger.config as Prisma.JsonObject,
      }),
      ...(data.nodes && { nodes: data.nodes as Prisma.JsonArray }),
      ...(data.edges && { edges: data.edges as Prisma.JsonArray }),
    },
  });

  return responseOk(formatAutomationResponse(updatedAutomation), "automation");
}

/**
 * DELETE /api/v1/automations/[automationId]
 *
 * Soft delete a specific automation by ID.
 * Only DRAFT and ARCHIVED versions can be deleted.
 * PUBLISHED versions must be archived first.
 * Workspace is determined from the authenticated API key.
 */
export async function deleteAutomation(
  workspaceId: string,
  automationId: string
) {
  // Check if automation exists
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    return responseNotFound("Automation not found");
  }

  if (automation.status === "PUBLISHED") {
    return responseBadRequest(
      "Cannot delete a PUBLISHED automation. Archive it first or create a new version."
    );
  }

  const deletedAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return responseOk(formatAutomationResponse(deletedAutomation), "automation");
}
