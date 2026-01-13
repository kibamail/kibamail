/**
 * Template Groups Handler (Internal API)
 *
 * Business logic for template group CRUD operations.
 * Template groups organize email templates into logical categories.
 */

import type { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  createTemplateGroupSchema,
  updateTemplateGroupSchema,
} from "./schema";

/**
 * POST /api/internal/v1/template-groups
 *
 * Create a new template group for the workspace.
 */
export async function createTemplateGroup(
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createTemplateGroupSchema, request);

  // Check for duplicate name in the same workspace
  const existingGroup = await prisma.templateGroup.findFirst({
    where: {
      workspaceId,
      name: data.name,
      deletedAt: null,
    },
  });

  if (existingGroup) {
    throw new ConflictError(
      "A template group with this name already exists in this workspace",
      ErrorCode.RESOURCE_ALREADY_EXISTS,
    );
  }

  const group = await prisma.templateGroup.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
    },
  });

  return responseCreated(
    {
      id: group.id,
    },
    "template_group",
  );
}

/**
 * GET /api/internal/v1/template-groups
 *
 * List template groups for the workspace with cursor-based pagination.
 */
export async function listTemplateGroups(
  workspaceId: string,
  request: NextRequest,
) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: {
      workspaceId,
      deletedAt: null,
    },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
    include: {
      _count: {
        select: { templates: true },
      },
    },
  };

  const groups = after
    ? await prisma.templateGroup.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.templateGroup.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.templateGroup.findMany(baseQuery);

  const hasMore = groups.length > limit;
  const items = hasMore ? groups.slice(0, -1) : groups;

  if (before) {
    items.reverse();
  }

  const formattedGroups = items.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    icon: group.icon,
    templateCount: group._count.templates,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }));

  return responseOk(
    createCursorPaginatedResponse(
      formattedGroups,
      hasMore,
      "template_group_list",
    ),
  );
}

/**
 * GET /api/internal/v1/template-groups/[groupId]
 *
 * Get a specific template group by ID.
 */
export async function getTemplateGroup(workspaceId: string, groupId: string) {
  const group = await prisma.templateGroup.findFirst({
    where: {
      id: groupId,
      workspaceId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: { templates: true },
      },
    },
  });

  if (!group) {
    throw new NotFoundError(
      "Template group not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  return responseOk(
    {
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      icon: group.icon,
      templateCount: group._count.templates,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    },
    "template_group",
  );
}

/**
 * PUT /api/internal/v1/template-groups/[groupId]
 *
 * Update a specific template group by ID.
 */
export async function updateTemplateGroup(
  workspaceId: string,
  groupId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateTemplateGroupSchema, request);

  const existingGroup = await prisma.templateGroup.findFirst({
    where: {
      id: groupId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!existingGroup) {
    throw new NotFoundError(
      "Template group not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  // Check for duplicate name if name is being changed
  if (data.name && data.name !== existingGroup.name) {
    const duplicateGroup = await prisma.templateGroup.findFirst({
      where: {
        workspaceId,
        name: data.name,
        deletedAt: null,
        id: { not: groupId },
      },
    });

    if (duplicateGroup) {
      throw new ConflictError(
        "A template group with this name already exists in this workspace",
        ErrorCode.RESOURCE_ALREADY_EXISTS,
      );
    }
  }

  const updatedGroup = await prisma.templateGroup.update({
    where: { id: groupId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
  });

  return responseOk(
    {
      id: updatedGroup.id,
    },
    "template_group",
  );
}

/**
 * DELETE /api/internal/v1/template-groups/[groupId]
 *
 * Soft delete a specific template group by ID.
 * Templates in the group will have their templateGroupId set to null.
 */
export async function deleteTemplateGroup(
  workspaceId: string,
  groupId: string,
) {
  const group = await prisma.templateGroup.findFirst({
    where: {
      id: groupId,
      workspaceId,
      deletedAt: null,
    },
  });

  if (!group) {
    throw new NotFoundError(
      "Template group not found",
      ErrorCode.RESOURCE_NOT_FOUND,
    );
  }

  // Soft delete the group - templates will be automatically unlinked due to onDelete: SetNull
  await prisma.templateGroup.update({
    where: { id: groupId },
    data: { deletedAt: new Date() },
  });

  // Explicitly set templateGroupId to null for all templates in this group
  // This is needed because soft delete doesn't trigger the foreign key onDelete
  await prisma.emailTemplate.updateMany({
    where: { templateGroupId: groupId },
    data: { templateGroupId: null },
  });

  return responseOk(
    {
      id: groupId,
    },
    "template_group",
  );
}
