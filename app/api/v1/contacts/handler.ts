/**
 * Contacts Endpoints - Business Logic (External API)
 *
 * Handlers for managing contacts via external API
 * Uses API key authentication (withApiSession)
 * Workspace is deduced from the API key, not from URL parameters
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validateRequestBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  responseCreated,
  responseOk,
  responseNotFound,
  responseBadRequest,
} from "@/lib/api/responses";
import {
  createContactSchema,
  updateContactSchema,
  searchContactsSchema,
} from "./schema";
import {
  conditionsToPrismaWhere,
  validateConditionFields,
} from "@/lib/segments/conditions-to-prisma";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";

/**
 * Build properties object for a contact from contact property definitions
 * Maps property names to their values from the contact's slot columns
 *
 * @param contact - The contact record with slot columns (propertyFloat0, propertyString5, etc.)
 * @param properties - Array of contact property definitions for the workspace
 * @returns Object with property names as keys and contact values from slots
 *
 * @example
 * ```ts
 * const properties = [
 *   { name: "Age", slot: "propertyFloat0", type: "NUMBER" },
 *   { name: "Join Date", slot: "propertyFloat1", type: "DATE" }
 * ];
 * const result = buildContactProperties(contact, properties);
 * // Returns: { "Age": 25, "Join Date": 1699564800000 }
 * ```
 */
function buildContactProperties(
  contact: any,
  properties: Array<{ name: string; slot: string }>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const property of properties) {
    const value = contact[property.slot];

    if (value !== null && value !== undefined) {
      result[property.name] = value;
    }
  }

  return result;
}

/**
 * Map property names to slot columns for creating/updating contacts
 * Validates that all provided property names exist in the workspace
 *
 * @param properties - Object with property names as keys and values to set
 * @param contactProperties - Array of contact property definitions for the workspace
 * @returns Object with slot column names as keys and values to set, or error response
 *
 * @example
 * ```ts
 * const properties = { "Age": 30, "Department": "Engineering" };
 * const contactProperties = [
 *   { name: "Age", slot: "propertyNum0" },
 *   { name: "Department", slot: "propertyString1" }
 * ];
 * const result = mapPropertiesToSlots(properties, contactProperties);
 * // Returns: { propertyNum0: 30, propertyString1: "Engineering" }
 * ```
 */
function mapPropertiesToSlots(
  properties: Record<string, string | number>,
  contactProperties: Array<{ name: string; slot: string }>
): { slotData?: Record<string, any>; error?: NextResponse } {
  const slotData: Record<string, any> = {};
  const propertyNameToSlot = new Map(
    contactProperties.map((prop) => [prop.name, prop.slot])
  );

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    const slot = propertyNameToSlot.get(propertyName);

    if (!slot) {
      return {
        error: responseBadRequest(
          `Property "${propertyName}" does not exist in this workspace`
        ),
      };
    }

    slotData[slot] = propertyValue;
  }

  return { slotData };
}

/**
 * POST /api/v1/contacts
 *
 * Create a new contact for the workspace.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch constraint violations.
 * Supports optional properties object that maps property names to values.
 */
export async function createContact(workspaceId: string, request: NextRequest) {
  const data = await validateRequestBody(createContactSchema, request);

  const { properties, ...contactData } = data;

  let slotData = {};

  if (properties && Object.keys(properties).length > 0) {
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true },
    });

    const mappingResult = mapPropertiesToSlots(properties, contactProperties);

    if (mappingResult.error) {
      return mappingResult.error;
    }

    slotData = mappingResult.slotData || {};
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      ...contactData,
      ...slotData,
    },
  });

  return responseCreated(
    {
      id: contact.id,
    },
    "contact"
  );
}

/**
 * GET /api/v1/contacts
 *
 * List contacts for the workspace with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Takes one extra item to determine if there are more results.
 * Reverses order for "before" cursor to maintain chronological order.
 */
export async function listContacts(workspaceId: string, request: NextRequest) {
  const { limit, after, before } = parseCursorPaginationParams(request);

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const baseQuery = {
    where: { workspaceId },
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

  const formattedContacts = items.map((contact) => ({
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    country: contact.country,
    timezone: contact.timezone,
    city: contact.city,
    status: contact.status,
    properties: buildContactProperties(contact, contactProperties),
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedContacts,
    hasMore,
    "contact_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * POST /api/v1/contacts/search
 *
 * Search contacts using segment conditions with cursor-based pagination.
 * Workspace is determined from the authenticated API key.
 * Filters are converted from MongoDB-style conditions to Prisma where clauses.
 */
export async function searchContacts(
  workspaceId: string,
  request: NextRequest
) {
  const { filters } = await validateRequestBody(searchContactsSchema, request);
  const { limit, after, before } = parseCursorPaginationParams(request);

  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  // Validate that all fields in conditions are valid
  const validation = validateConditionFields(filters, contactProperties);
  if (!validation.isValid) {
    return responseBadRequest(
      `Invalid field(s) in conditions: ${validation.invalidFields.join(
        ", "
      )}. ` +
        `Fields must be built-in contact fields or defined custom properties.`
    );
  }

  // Convert segment conditions to Prisma where clause
  const conditionsWhere = conditionsToPrismaWhere(filters, contactProperties);

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

  const formattedContacts = items.map((contact) => ({
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    country: contact.country,
    timezone: contact.timezone,
    city: contact.city,
    status: contact.status,
    properties: buildContactProperties(contact, contactProperties),
  }));

  const paginatedResponse = createCursorPaginatedResponse(
    formattedContacts,
    hasMore,
    "contact_list"
  );
  return NextResponse.json(paginatedResponse, { status: 200 });
}

/**
 * GET /api/v1/contacts/[contactId]
 *
 * Get a specific contact by ID.
 * Workspace is determined from the authenticated API key.
 */
export async function getContact(workspaceId: string, contactId: string) {
  // Fetch contact properties for this workspace
  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true },
  });

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      workspaceId,
    },
  });

  if (!contact) {
    return responseNotFound("Contact not found");
  }

  return responseOk(
    {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      country: contact.country,
      timezone: contact.timezone,
      city: contact.city,
      status: contact.status,
      properties: buildContactProperties(contact, contactProperties),
    },
    "contact"
  );
}

/**
 * PUT /api/v1/contacts/[contactId]
 *
 * Update a specific contact by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch constraint violations and not found errors.
 * Supports optional properties object that maps property names to values.
 */
export async function updateContact(
  workspaceId: string,
  contactId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateContactSchema, request);

  // Extract properties from data
  const { properties, ...contactData } = data;

  // If properties are provided, fetch contact properties and map to slots
  let slotData = {};
  if (properties && Object.keys(properties).length > 0) {
    const contactProperties = await prisma.contactProperty.findMany({
      where: { workspaceId },
      select: { name: true, slot: true },
    });

    const mappingResult = mapPropertiesToSlots(properties, contactProperties);

    if (mappingResult.error) {
      return mappingResult.error;
    }

    slotData = mappingResult.slotData || {};
  }

  const updatedContact = await prisma.contact.update({
    where: {
      id: contactId,
      workspaceId,
    },
    data: {
      ...contactData,
      ...slotData,
    },
  });

  return responseOk(
    {
      id: updatedContact.id,
    },
    "contact"
  );
}

/**
 * DELETE /api/v1/contacts/[contactId]
 *
 * Delete a specific contact by ID.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch not found errors.
 */
export async function deleteContact(workspaceId: string, contactId: string) {
  const deletedContact = await prisma.contact.delete({
    where: {
      id: contactId,
      workspaceId,
    },
  });

  return responseOk(
    {
      id: deletedContact.id,
    },
    "contact"
  );
}
