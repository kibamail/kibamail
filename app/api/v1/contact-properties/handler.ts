/**
 * Contact Properties Endpoints - Business Logic (External API)
 *
 * Handlers for managing contact properties via external API.
 * Uses API key authentication (withApiSession).
 * Workspace is deduced from the API key, not from URL parameters.
 * Slot assignment is handled internally and not exposed via API.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiKey, ContactPropertyType } from "@prisma/client";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  responseCreated,
  responseOk,
  responseNotFound,
  responseBadRequest,
  responseConflict,
} from "@/lib/api/responses";
import {
  createContactPropertySchema,
  updateContactPropertySchema,
} from "./schema";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";

/**
 * Find next available slot for a given property type
 * Returns null if all slots are occupied
 */
async function findAvailableSlot(
  workspaceId: string,
  type: ContactPropertyType
): Promise<string | null> {
  const slotPrefix =
    type === "NUMBER"
      ? "propertyNum"
      : type === "DATE"
      ? "propertyDate"
      : "propertyString";

  const occupiedSlots = await prisma.contactProperty.findMany({
    where: {
      workspaceId,
      slot: {
        startsWith: slotPrefix,
      },
    },
    select: { slot: true },
  });

  const occupiedSlotNumbers = new Set(
    occupiedSlots.map((prop) => {
      const match = prop.slot.match(/\d+$/);
      return match ? parseInt(match[0], 10) : -1;
    })
  );

  for (let i = 0; i < 25; i++) {
    if (!occupiedSlotNumbers.has(i)) {
      return `${slotPrefix}${i}`;
    }
  }

  return null;
}

/**
 * POST /api/v1/contact-properties
 *
 * Create a new contact property for the workspace.
 * Automatically assigns an available slot based on the property type.
 * Returns error if all slots of the specified type are occupied.
 */
export async function createContactProperty(
  apiKey: ApiKey,
  request: NextRequest
) {
  const data = await validateRequestBody(createContactPropertySchema, request);
  const workspaceId = apiKey.workspaceId;

  const existingProperty = await prisma.contactProperty.findFirst({
    where: {
      workspaceId,
      name: data.name,
    },
  });

  if (existingProperty) {
    return responseConflict(
      `A contact property with the name "${data.name}" already exists in this workspace.`
    );
  }

  const slot = await findAvailableSlot(workspaceId, data.type);

  if (!slot) {
    return responseBadRequest(
      `No available slots for property type ${data.type}. Maximum of 25 properties per type reached.`
    );
  }

  const contactProperty = await prisma.contactProperty.create({
    data: {
      workspaceId,
      name: data.name,
      type: data.type,
      slot,
      defaultValue: data.defaultValue,
    },
  });

  return responseCreated(
    {
      id: contactProperty.id,
    },
    "contact_property"
  );
}

/**
 * GET /api/v1/contact-properties
 *
 * List contact properties for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Slot field is not exposed in the response.
 */
export async function listContactProperties(
  apiKey: ApiKey,
  request: NextRequest
) {
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

  const baseQuery = {
    where: { workspaceId },
    orderBy: before ? { id: "asc" as const } : { id: "desc" as const },
    take: limit + 1,
  };

  const contactProperties = after
    ? await prisma.contactProperty.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.contactProperty.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.contactProperty.findMany(baseQuery);

  const hasMore = contactProperties.length > limit;
  const items = hasMore ? contactProperties.slice(0, -1) : contactProperties;

  if (before) {
    items.reverse();
  }

  const formattedProperties = items.map((property) => ({
    id: property.id,
    name: property.name,
    type: property.type,
    defaultValue: property.defaultValue,
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedProperties,
    hasMore,
    "contact_property_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/contact-properties/[contactPropertyId]
 *
 * Get a specific contact property by ID.
 * Workspace is determined from the authenticated API key.
 * Slot field is not exposed in the response.
 */
export async function getContactProperty(
  apiKey: ApiKey,
  contactPropertyId: string
) {
  const workspaceId = apiKey.workspaceId;

  const contactProperty = await prisma.contactProperty.findFirst({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  if (!contactProperty) {
    return responseNotFound("Contact property not found");
  }

  return responseOk(
    {
      id: contactProperty.id,
      name: contactProperty.name,
      type: contactProperty.type,
      defaultValue: contactProperty.defaultValue,
    },
    "contact_property"
  );
}

/**
 * PUT /api/v1/contact-properties/[contactPropertyId]
 *
 * Update a specific contact property by ID.
 * Workspace is determined from the authenticated API key.
 * Type and slot cannot be changed after creation.
 * Global error handler will catch constraint violations and not found errors.
 */
export async function updateContactProperty(
  apiKey: ApiKey,
  contactPropertyId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateContactPropertySchema, request);
  const workspaceId = apiKey.workspaceId;

  const existingProperty = await prisma.contactProperty.findFirst({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  if (!existingProperty) {
    return responseNotFound("Contact property not found");
  }

  if (data.defaultValue !== undefined && data.defaultValue !== null) {
    const { type } = existingProperty;
    const value = data.defaultValue;

    if (type === "DATE") {
      const dateRegex = /^\d+$/;
      if (!dateRegex.test(value)) {
        return responseBadRequest(
          "Date default value must be a Unix timestamp in milliseconds"
        );
      }
      const timestamp = parseInt(value, 10);
      if (timestamp <= 0 || timestamp > Date.now() + 315360000000) {
        return responseBadRequest(
          "Unix timestamp must be a valid date within acceptable range"
        );
      }
    } else if (type === "NUMBER") {
      const numberRegex = /^-?\d+(\.\d+)?$/;
      if (!numberRegex.test(value)) {
        return responseBadRequest(
          "Number default value must be a decimal number"
        );
      }
    } else if (type === "STRING") {
      if (value.length < 1 || value.length > 255) {
        return responseBadRequest(
          "String default value must be 1-255 characters"
        );
      }
    }
  }

  if (data.name !== undefined && data.name !== existingProperty.name) {
    const duplicateName = await prisma.contactProperty.findFirst({
      where: {
        workspaceId,
        name: data.name,
        id: {
          not: contactPropertyId,
        },
      },
    });

    if (duplicateName) {
      return responseConflict(
        `A contact property with the name "${data.name}" already exists in this workspace.`
      );
    }
  }

  const updatedProperty = await prisma.contactProperty.update({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
    data: {
      ...data,
    },
  });

  return responseOk(
    {
      id: updatedProperty.id,
    },
    "contact_property"
  );
}

/**
 * DELETE /api/v1/contact-properties/[contactPropertyId]
 *
 * Delete a specific contact property by ID (soft delete).
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 */
export async function deleteContactProperty(
  apiKey: ApiKey,
  contactPropertyId: string
) {
  const workspaceId = apiKey.workspaceId;

  const deletedProperty = await prisma.contactProperty.delete({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedProperty.id,
    },
    "contact_property"
  );
}
