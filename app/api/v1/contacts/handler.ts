/**
 * Contacts Endpoints - Business Logic (External API)
 *
 * Handlers for managing contacts via external API
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
import { createContactSchema, updateContactSchema, searchContactsSchema } from "./schema";
import { conditionsToPrismaWhere } from "@/lib/segments/conditions-to-prisma";
import {
  createCursorPaginatedResponse,
  parseCursorPaginationParams,
} from "@/lib/api/pagination";

/**
 * POST /api/v1/contacts
 *
 * Create a new contact for the workspace.
 * Workspace is determined from the authenticated API key.
 * Global error handler will catch constraint violations.
 */
export async function createContact(apiKey: ApiKey, request: NextRequest) {
  const data = await validateRequestBody(createContactSchema, request);
  const workspaceId = apiKey.workspaceId;

  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      ...data,
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
export async function listContacts(apiKey: ApiKey, request: NextRequest) {
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

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
export async function searchContacts(apiKey: ApiKey, request: NextRequest) {
  const { filters } = await validateRequestBody(searchContactsSchema, request);
  const workspaceId = apiKey.workspaceId;
  const { limit, after, before } = parseCursorPaginationParams(request);

  // Convert segment conditions to Prisma where clause
  const conditionsWhere = conditionsToPrismaWhere(filters);

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
export async function getContact(apiKey: ApiKey, contactId: string) {
  const workspaceId = apiKey.workspaceId;

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
 */
export async function updateContact(
  apiKey: ApiKey,
  contactId: string,
  request: NextRequest
) {
  const data = await validateRequestBody(updateContactSchema, request);
  const workspaceId = apiKey.workspaceId;

  const updatedContact = await prisma.contact.update({
    where: {
      id: contactId,
      workspaceId,
    },
    data: {
      ...data,
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
export async function deleteContact(apiKey: ApiKey, contactId: string) {
  const workspaceId = apiKey.workspaceId;

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
