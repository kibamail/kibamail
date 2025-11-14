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
  searchContactsSchema,
} from "@/app/api/v1/contacts/schema";
import {
  createContactPropertySchema,
  updateContactPropertySchema,
  contactPropertyResponseSchema,
  contactPropertyListResponseSchema,
} from "@/app/api/v1/contact-properties/schema";
import {
  createTopicSchema,
  updateTopicSchema,
  topicResponseSchema,
  topicListResponseSchema,
} from "@/app/api/v1/topics/schema";
import {
  createSegmentSchema,
  updateSegmentSchema,
  segmentResponseSchema,
  segmentListResponseSchema,
} from "@/app/api/v1/segments/schema";

const standardErrorSchema = z.object({
  error: z.string(),
});

const validationErrorSchema = z.object({
  error: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Reusable pagination parameters for cursor-based pagination
 */
const paginationParameters = [
  {
    name: "limit",
    in: "query" as const,
    description: "Number of items to return (default: 20, max: 100)",
    required: false,
    schema: {
      type: "integer" as const,
      minimum: 1,
      maximum: 100,
      default: 20,
    },
  },
  {
    name: "after",
    in: "query" as const,
    description: "Cursor for pagination - ID of the last item from the previous page",
    required: false,
    schema: {
      type: "string" as const,
    },
  },
  {
    name: "before",
    in: "query" as const,
    description: "Cursor for reverse pagination - ID of the first item from the next page",
    required: false,
    schema: {
      type: "string" as const,
    },
  },
];

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
        parameters: paginationParameters,
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
    "/v1/topics": {
      get: {
        summary: "List Topics",
        description: "Retrieve a paginated list of topics using cursor-based pagination",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description: "List of topics",
            content: {
              "application/json": { schema: topicListResponseSchema },
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
        summary: "Create Topic",
        description: "Create a new topic in the workspace",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createTopicSchema },
          },
        },
        responses: {
          "201": {
            description: "Topic created successfully",
            content: {
              "application/json": { schema: topicResponseSchema },
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
            description: "Conflict - Topic with this slug already exists",
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
    "/v1/topics/{topicId}": {
      get: {
        summary: "Get Topic",
        description: "Retrieve a specific topic by ID",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "topicId",
            in: "path",
            description: "Topic ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Topic details",
            content: {
              "application/json": { schema: topicResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Topic does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Topic",
        description: "Update an existing topic",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "topicId",
            in: "path",
            description: "Topic ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateTopicSchema },
          },
        },
        responses: {
          "200": {
            description: "Topic updated successfully",
            content: {
              "application/json": { schema: topicResponseSchema },
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
            description: "Not Found - Topic does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "409": {
            description: "Conflict - Topic with this slug already exists",
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
        summary: "Delete Topic",
        description: "Delete a specific topic",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "topicId",
            in: "path",
            description: "Topic ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Topic deleted successfully",
            content: {
              "application/json": { schema: topicResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Topic does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/segments": {
      get: {
        summary: "List Segments",
        description: "Retrieve a paginated list of segments using cursor-based pagination",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description: "List of segments",
            content: {
              "application/json": { schema: segmentListResponseSchema },
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
        summary: "Create Segment",
        description: "Create a new segment in the workspace with MongoDB-style conditions",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createSegmentSchema },
          },
        },
        responses: {
          "201": {
            description: "Segment created successfully",
            content: {
              "application/json": { schema: segmentResponseSchema },
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
          "422": {
            description: "Validation Error - Invalid field values or conditions",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
    },
    "/v1/segments/{segmentId}": {
      get: {
        summary: "Get Segment",
        description: "Retrieve a specific segment by ID",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "segmentId",
            in: "path",
            description: "Segment ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Segment details",
            content: {
              "application/json": { schema: segmentResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Segment does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Segment",
        description: "Update an existing segment",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "segmentId",
            in: "path",
            description: "Segment ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateSegmentSchema },
          },
        },
        responses: {
          "200": {
            description: "Segment updated successfully",
            content: {
              "application/json": { schema: segmentResponseSchema },
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
            description: "Not Found - Segment does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "422": {
            description: "Validation Error - Invalid field values or conditions",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Segment",
        description: "Delete a specific segment",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "segmentId",
            in: "path",
            description: "Segment ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Segment deleted successfully",
            content: {
              "application/json": { schema: segmentResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Segment does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/contact-properties": {
      get: {
        summary: "List Contact Properties",
        description: "Retrieve a paginated list of contact properties using cursor-based pagination",
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description: "List of contact properties",
            content: {
              "application/json": { schema: contactPropertyListResponseSchema },
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
        summary: "Create Contact Property",
        description: "Create a new custom contact property",
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createContactPropertySchema },
          },
        },
        responses: {
          "201": {
            description: "Contact property created successfully",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid input or property limit reached",
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
            description: "Conflict - Property with this name already exists",
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
    "/v1/contact-properties/{contactPropertyId}": {
      get: {
        summary: "Get Contact Property",
        description: "Retrieve a specific contact property by ID",
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactPropertyId",
            in: "path",
            description: "Contact Property ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Contact property details",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Contact property does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Contact Property",
        description: "Update an existing contact property (name and default value only, type cannot be changed)",
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactPropertyId",
            in: "path",
            description: "Contact Property ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateContactPropertySchema },
          },
        },
        responses: {
          "200": {
            description: "Contact property updated successfully",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
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
            description: "Not Found - Contact property does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "409": {
            description: "Conflict - Property with this name already exists",
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
        summary: "Delete Contact Property",
        description: "Delete a specific contact property",
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "contactPropertyId",
            in: "path",
            description: "Contact Property ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Contact property deleted successfully",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key, or insufficient scopes",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
          "404": {
            description: "Not Found - Contact property does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/contacts/search": {
      post: {
        summary: "Search Contacts",
        description: "Search contacts using MongoDB-style conditions with cursor-based pagination",
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: searchContactsSchema },
          },
        },
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "400": {
            description: "Bad Request - Invalid search conditions",
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
          "422": {
            description: "Validation Error - Invalid condition fields",
            content: {
              "application/json": { schema: validationErrorSchema },
            },
          },
        },
      },
    },
    "/v1/segments/{segmentId}/contacts": {
      get: {
        summary: "Get Segment Contacts",
        description: "Retrieve all contacts that match a segment's conditions with cursor-based pagination",
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "segmentId",
            in: "path",
            description: "Segment ID",
            required: true,
            schema: {
              type: "string",
            },
          },
          ...paginationParameters,
        ],
        responses: {
          "200": {
            description: "Contacts matching segment conditions",
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
          "404": {
            description: "Not Found - Segment does not exist",
            content: {
              "application/json": { schema: standardErrorSchema },
            },
          },
        },
      },
    },
    "/v1/topics/{topicId}/contacts": {
      get: {
        summary: "Get Topic Contacts",
        description: "Retrieve all contacts subscribed to a topic with cursor-based pagination",
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "topicId",
            in: "path",
            description: "Topic ID",
            required: true,
            schema: {
              type: "string",
            },
          },
          ...paginationParameters,
        ],
        responses: {
          "200": {
            description: "Contacts subscribed to topic",
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
          "404": {
            description: "Not Found - Topic does not exist",
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
