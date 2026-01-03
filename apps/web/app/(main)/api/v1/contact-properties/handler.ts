/**
 * Contact Properties Endpoints - Business Logic (External API)
 *
 * Handlers for managing contact properties via external API.
 * Uses API key authentication (withApiSession).
 * Workspace is deduced from the API key, not from URL parameters.
 * Slot assignment is handled internally and not exposed via API.
 */

import type { ContactPropertyType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/api/error-codes";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";
import { responseCreated, responseOk } from "@/lib/api/responses";
import { validateRequestBody } from "@/lib/api/validation";
import { getMaxSlots, getSlotPrefix } from "@/lib/contact-properties/config";
import { prisma } from "@/lib/db";
import {
  createContactPropertySchema,
  updateContactPropertySchema,
} from "./schema";

/**
 * Find next available slot for a given property type
 * Returns null if all slots are occupied
 *
 * Slot limits are defined in @/lib/contact-properties/config
 */
async function findAvailableSlot(
  workspaceId: string,
  type: ContactPropertyType,
): Promise<string | null> {
  const slotPrefix = getSlotPrefix(type);
  const maxSlots = getMaxSlots(type);

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
    }),
  );

  for (let i = 0; i < maxSlots; i++) {
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
  workspaceId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(createContactPropertySchema, request);

  const slot = await findAvailableSlot(workspaceId, data.type);

  if (!slot) {
    const maxSlots = getMaxSlots(data.type);
    throw new BadRequestError(
      `No available slots for property type ${data.type}. Maximum of ${maxSlots} properties per type reached.`,
      ErrorCode.CONTACT_PROPERTY_LIMIT_REACHED,
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
    "contact_property",
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
  workspaceId: string,
  request: NextRequest,
) {
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
    "contact_property_list",
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
  workspaceId: string,
  contactPropertyId: string,
) {
  const contactProperty = await prisma.contactProperty.findFirst({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  if (!contactProperty) {
    throw new NotFoundError(
      "Contact property not found",
      ErrorCode.CONTACT_PROPERTY_NOT_FOUND,
    );
  }

  return responseOk(
    {
      id: contactProperty.id,
      name: contactProperty.name,
      type: contactProperty.type,
      defaultValue: contactProperty.defaultValue,
    },
    "contact_property",
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
  workspaceId: string,
  contactPropertyId: string,
  request: NextRequest,
) {
  const data = await validateRequestBody(updateContactPropertySchema, request);

  const existingProperty = await prisma.contactProperty.findFirst({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  if (!existingProperty) {
    throw new NotFoundError(
      "Contact property not found",
      ErrorCode.CONTACT_PROPERTY_NOT_FOUND,
    );
  }

  if (data.defaultValue !== undefined && data.defaultValue !== null) {
    const { type } = existingProperty;
    const value = data.defaultValue;

    if (type === "DATE") {
      const dateRegex = /^\d+$/;
      if (!dateRegex.test(value)) {
        throw new BadRequestError(
          "Date default value must be a Unix timestamp in milliseconds",
          ErrorCode.INVALID_FIELD_VALUE,
        );
      }
      const timestamp = parseInt(value, 10);
      if (timestamp <= 0 || timestamp > Date.now() + 315360000000) {
        throw new BadRequestError(
          "Unix timestamp must be a valid date within acceptable range",
          ErrorCode.INVALID_FIELD_VALUE,
        );
      }
    } else if (type === "NUMBER") {
      const numberRegex = /^-?\d+(\.\d+)?$/;
      if (!numberRegex.test(value)) {
        throw new BadRequestError(
          "Number default value must be a decimal number",
          ErrorCode.INVALID_FIELD_VALUE,
        );
      }
    } else if (type === "STRING") {
      if (value.length < 1 || value.length > 255) {
        throw new BadRequestError(
          "String default value must be 1-255 characters",
          ErrorCode.INVALID_FIELD_VALUE,
        );
      }
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
    "contact_property",
  );
}

/**
 * DELETE /api/v1/contact-properties/[contactPropertyId]
 *
 * Delete a specific contact property by ID (soft delete).
 * To support unique constraints with soft deletes,
 * we rename the property on deletion to free up the name for reuse.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 */
export async function deleteContactProperty(
  workspaceId: string,
  contactPropertyId: string,
) {
  const property = await prisma.contactProperty.findFirst({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
  });

  if (!property) {
    throw new NotFoundError(
      "Contact property not found",
      ErrorCode.CONTACT_PROPERTY_NOT_FOUND,
    );
  }

  const timestamp = Date.now();
  const renamedName = `${property.name}__deleted__${timestamp}`;
  const renamedSlot = `${property.slot}__deleted__${timestamp}`;

  await prisma.contactProperty.update({
    where: {
      id: contactPropertyId,
      workspaceId,
    },
    data: {
      name: renamedName,
      slot: renamedSlot,
    },
  });

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
    "contact_property",
  );
}
