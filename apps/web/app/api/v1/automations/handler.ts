/**
 * Automations Handler (External API)
 *
 * Business logic for automation CRUD operations.
 * Workspace is automatically determined from the API key.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type {
  Automation,
  AutomationStatus,
  AutomationTrigger,
  Prisma,
} from "@prisma/client";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { ErrorCode } from "@/lib/api/error-codes";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { createAutomationSchema, updateAutomationSchema } from "./schema";
import { AUTOMATION_TRIGGERS } from "@/lib/automations/config";
import { validateAutomationForPublish } from "@/lib/automations/validation";

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

  const triggerType =
    data.trigger?.type || AUTOMATION_TRIGGERS.CONTACT_SUBSCRIBED.type;
  const triggerConfig = data.trigger?.config || {};

  let nodes = data.nodes;
  if (!nodes || nodes.length === 0) {
    const triggerNodeId = AUTOMATION_TRIGGERS.CONTACT_SUBSCRIBED.id;
    nodes = [
      {
        id: `trigger-${Date.now()}`,
        type: triggerNodeId,
        position: { x: 250, y: 100 },
        data: { triggerType },
      },
    ];
  }

  const automation = await prisma.automation.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      status: "DRAFT",
      version: 1,
      parentId: null,
      triggerType: triggerType as AutomationTrigger,
      triggerConfig: triggerConfig as Prisma.JsonObject,
      nodes: nodes as Prisma.JsonArray,
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
export async function getAutomation(workspaceId: string, automationId: string) {
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  return responseOk(formatAutomationResponse(automation), "automation");
}

/**
 * PUT /api/v1/automations/[automationId]
 *
 * Update a specific automation by ID.
 * Name can be updated regardless of status.
 * Other fields can only be updated for DRAFT versions.
 * Workspace is determined from the authenticated API key.
 */
export async function updateAutomation(
  workspaceId: string,
  automationId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateAutomationSchema, request);

  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const isDraft = automation.status === "DRAFT";
  const hasNonNameUpdates =
    data.description !== undefined ||
    data.trigger !== undefined ||
    data.nodes !== undefined ||
    data.edges !== undefined;

  if (!isDraft && hasNonNameUpdates) {
    throw new BadRequestError(
      "Only DRAFT automations can be updated. Create a new version to modify a PUBLISHED automation.",
      ErrorCode.INVALID_PARAMETER
    );
  }

  const updateData: Prisma.AutomationUpdateInput = {};

  if (data.name) {
    updateData.name = data.name;
  }

  if (isDraft) {
    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.trigger) {
      updateData.triggerType = data.trigger.type as AutomationTrigger;
      updateData.triggerConfig = data.trigger.config as Prisma.JsonObject;
    }

    if (data.nodes) {
      updateData.nodes = data.nodes as Prisma.JsonArray;
    }

    if (data.edges) {
      updateData.edges = data.edges as Prisma.JsonArray;
    }
  }

  const updatedAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: updateData,
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
  const automation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!automation) {
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (automation.status === "PUBLISHED") {
    throw new BadRequestError(
      "Cannot delete a PUBLISHED automation. Archive it first or create a new version.",
      ErrorCode.INVALID_PARAMETER
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

/**
 * POST /api/v1/automations/[automationId]/publish
 *
 * Publish a DRAFT automation.
 * Validates all nodes and edges before publishing.
 * If this is a version (has parentId), archive the currently published version.
 * Workspace is determined from the authenticated API key.
 */
export async function publishAutomation(
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
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (automation.status !== "DRAFT") {
    throw new BadRequestError(
      "Only DRAFT automations can be published",
      ErrorCode.INVALID_PARAMETER
    );
  }

  const nodes = automation.nodes as unknown[];
  const edges = automation.edges as unknown[];
  const validation = validateAutomationForPublish(nodes, edges);

  if (!validation.valid) {
    throw new BadRequestError(
      "Automation validation failed. Please fix the errors before publishing.",
      ErrorCode.AUTOMATION_VALIDATION_FAILED,
      { errors: validation.errors }
    );
  }

  const rootId = automation.parentId || automation.id;

  await prisma.automation.updateMany({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      workspaceId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    data: {
      status: "ARCHIVED",
    },
  });

  const publishedAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return responseOk(
    formatAutomationResponse(publishedAutomation),
    "automation"
  );
}

/**
 * POST /api/v1/automations/[automationId]/archive
 *
 * Archive a PUBLISHED automation.
 * Workspace is determined from the authenticated API key.
 */
export async function archiveAutomation(
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
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (automation.status !== "PUBLISHED") {
    throw new BadRequestError(
      "Only PUBLISHED automations can be archived",
      ErrorCode.INVALID_PARAMETER
    );
  }

  const archivedAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: {
      status: "ARCHIVED",
    },
  });

  return responseOk(formatAutomationResponse(archivedAutomation), "automation");
}

/**
 * GET /api/v1/automations/[automationId]/versions
 *
 * List all versions of an automation (root and children).
 * Workspace is determined from the authenticated API key.
 */
export async function listAutomationVersions(
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
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const rootId = automation.parentId || automation.id;

  const versions = await prisma.automation.findMany({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      workspaceId,
      deletedAt: null,
    },
    orderBy: { version: "desc" },
  });

  const formattedVersions = versions.map(formatAutomationResponse);

  return NextResponse.json(
    {
      object: "automation_list",
      hasMore: false,
      data: formattedVersions,
    },
    { status: 200 }
  );
}

/**
 * POST /api/v1/automations/[automationId]/rollback
 *
 * Rollback to an archived version of an automation.
 * Archives the currently published version and publishes the target version.
 * Only ARCHIVED versions can be rolled back to.
 * Workspace is determined from the authenticated API key.
 */
export async function rollbackAutomation(
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
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  if (automation.status !== "ARCHIVED") {
    throw new BadRequestError(
      `Only ARCHIVED automations can be rolled back. This version is currently ${automation.status}.`,
      ErrorCode.INVALID_PARAMETER
    );
  }

  const rootId = automation.parentId || automation.id;

  const existingDraft = await prisma.automation.findFirst({
    where: {
      OR: [
        { id: rootId, status: "DRAFT" },
        { parentId: rootId, status: "DRAFT" },
      ],
      workspaceId,
      deletedAt: null,
    },
  });

  if (existingDraft) {
    throw new BadRequestError(
      "Cannot rollback while a DRAFT version exists. Please publish or delete the draft first.",
      ErrorCode.RESOURCE_CONFLICT
    );
  }

  await prisma.automation.updateMany({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      workspaceId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    data: {
      status: "ARCHIVED",
    },
  });

  const rolledBackAutomation = await prisma.automation.update({
    where: {
      id: automationId,
      workspaceId,
    },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return responseOk(
    formatAutomationResponse(rolledBackAutomation),
    "automation"
  );
}

/**
 * POST /api/v1/automations/[automationId]/versions
 *
 * Create a new version of an automation.
 * Copies nodes, edges, and settings from the source automation.
 * Cannot create if a DRAFT version already exists.
 * Workspace is determined from the authenticated API key.
 */
export async function createAutomationVersion(
  workspaceId: string,
  automationId: string,
  request: NextRequest
) {
  const sourceAutomation = await prisma.automation.findFirst({
    where: {
      id: automationId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!sourceAutomation) {
    throw new NotFoundError(
      "Automation not found",
      ErrorCode.RESOURCE_NOT_FOUND
    );
  }

  const rootId = sourceAutomation.parentId || sourceAutomation.id;

  const existingDraft = await prisma.automation.findFirst({
    where: {
      OR: [
        { id: rootId, status: "DRAFT" },
        { parentId: rootId, status: "DRAFT" },
      ],
      workspaceId,
      deletedAt: null,
    },
  });

  if (existingDraft) {
    throw new BadRequestError(
      "A DRAFT version already exists. Publish or delete it before creating a new version.",
      ErrorCode.RESOURCE_CONFLICT
    );
  }

  const maxVersionResult = await prisma.automation.aggregate({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      workspaceId,
      deletedAt: null,
    },
    _max: { version: true },
  });

  const newVersion = (maxVersionResult._max.version || 0) + 1;

  const overrides: Partial<{ name: string; description: string }> = {};

  let body: { name?: string; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine, use defaults
  }

  if (body.name) {
    overrides.name = body.name;
  }

  if (body.description !== undefined) {
    overrides.description = body.description;
  }

  const newAutomation = await prisma.automation.create({
    data: {
      workspaceId,
      name: overrides.name || sourceAutomation.name,
      description: overrides.description ?? sourceAutomation.description,
      status: "DRAFT",
      version: newVersion,
      parentId: rootId,
      triggerType: sourceAutomation.triggerType,
      triggerConfig:
        (sourceAutomation.triggerConfig as Prisma.JsonObject) || {},
      nodes: sourceAutomation.nodes as Prisma.JsonArray,
      edges: sourceAutomation.edges as Prisma.JsonArray,
      settings: (sourceAutomation.settings as Prisma.JsonObject) || {},
      stats: {},
    },
  });

  return responseCreated(formatAutomationResponse(newAutomation), "automation");
}
