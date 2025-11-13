import * as z from "zod/v4";

import { createDocument } from "zod-openapi";
import { writeFile } from "node:fs/promises";
import {
  createApiKeyResponseSchema,
  createApiKeySchema,
} from "@/app/api/v1/api-keys/schema";
import {
  createContactSchema,
  updateContactSchema,
  contactResponseSchema,
  contactListResponseSchema,
} from "@/app/api/v1/contacts/schema";
import {
  createTagSchema,
  updateTagSchema,
  tagResponseSchema,
  tagListResponseSchema,
} from "@/app/api/v1/tags/schema";

const standardErrorSchema = z.object({
  error: z.string(),
});

const validationErrorSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

const document = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Kibamail API",
    version: "1.0.0",
    description: "API for managing contacts, campaigns, and email marketing operations",
  },
  servers: [
    {
      url: "https://api.kibamail.com",
      description: "Production server",
    },
    {
      url: "http://localhost:3000/api",
      description: "Local development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "API key authentication. Use format: Bearer sk_xxxxx",
      },
    },
  },
  paths: {
    "/v1/api-keys/": {
      post: {
        summary: "Create API Key",
        description: "Create a new API key for workspace authentication",
        tags: ["API Keys"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createApiKeySchema },
          },
        },
        responses: {
          "200": {
            description: "API key created successfully",
            content: {
              "application/json": { schema: createApiKeyResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing authentication",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/contacts": {
      get: {
        summary: "List Contacts",
        description: "Retrieve a paginated list of contacts using cursor-based pagination",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of contacts to return (default: 20, max: 100)",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "after",
            in: "query",
            description: "Cursor for pagination - ID of the last contact from the previous page",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "before",
            in: "query",
            description: "Cursor for reverse pagination - ID of the first contact from the next page",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "List of contacts",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Contact",
        description: "Create a new contact in the workspace",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createContactSchema },
          },
        },
        responses: {
          "201": {
            description: "Contact created successfully",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "409": {
            description: "Conflict - Contact with this email already exists",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "422": {
            description: "Validation Error - Invalid field values",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
    },
    "/v1/contacts/{contactId}": {
      get: {
        summary: "Get Contact",
        description: "Retrieve a specific contact by ID",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactId",
            in: "path",
            description: "Contact ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Contact details",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Contact does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Contact",
        description: "Update an existing contact",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactId",
            in: "path",
            description: "Contact ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateContactSchema },
          },
        },
        responses: {
          "200": {
            description: "Contact updated successfully",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Contact does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "422": {
            description: "Validation Error - Invalid field values",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Contact",
        description: "Delete a specific contact",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactId",
            in: "path",
            description: "Contact ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "204": {
            description: "Contact deleted successfully",
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Contact does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/tags": {
      get: {
        summary: "List Tags",
        description: "Retrieve a paginated list of tags using cursor-based pagination",
        tags: ["Tags"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of tags to return (default: 20, max: 100)",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "after",
            in: "query",
            description: "Cursor for pagination - ID of the last tag from the previous page",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "before",
            in: "query",
            description: "Cursor for reverse pagination - ID of the first tag from the next page",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "List of tags",
            content: {
              "application/json": { schema: tagListResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Tag",
        description: "Create a new tag in the workspace",
        tags: ["Tags"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createTagSchema },
          },
        },
        responses: {
          "201": {
            description: "Tag created successfully",
            content: {
              "application/json": { schema: tagResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "409": {
            description: "Conflict - Tag with this name already exists",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "422": {
            description: "Validation Error - Invalid field values",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
    },
    "/v1/tags/{tagId}": {
      get: {
        summary: "Get Tag",
        description: "Retrieve a specific tag by ID",
        tags: ["Tags"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "tagId",
            in: "path",
            description: "Tag ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Tag details",
            content: {
              "application/json": { schema: tagResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Tag does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Tag",
        description: "Update an existing tag",
        tags: ["Tags"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "tagId",
            in: "path",
            description: "Tag ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateTagSchema },
          },
        },
        responses: {
          "200": {
            description: "Tag updated successfully",
            content: {
              "application/json": { schema: tagResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Tag does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "409": {
            description: "Conflict - Tag with this name already exists",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "422": {
            description: "Validation Error - Invalid field values",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Tag",
        description: "Delete a specific tag",
        tags: ["Tags"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "tagId",
            in: "path",
            description: "Tag ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Tag deleted successfully",
            content: {
              "application/json": { schema: tagResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Tag does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
  },
});

writeFile("public/openapi.v1.json", JSON.stringify(document, null, 2));
