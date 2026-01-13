import * as z from "zod/v4";

import {
  createDocument,
  type ZodOpenApiSchemaObject,
  oas31,
} from "zod-openapi";
import { writeFile } from "node:fs/promises";

type SchemaObject = oas31.SchemaObject;
type ReferenceObject = oas31.ReferenceObject;
import {
  createApiKeyResponseSchema,
  createApiKeySchema,
  apiKeyDeleteResponseSchema,
} from "@/app/(main)/api/v1/api-keys/schema";
import {
  createContactSchema,
  updateContactSchema,
  contactResponseSchema,
  contactListResponseSchema,
  contactDeleteResponseSchema,
  searchContactsSchema,
} from "@/app/(main)/api/v1/contacts/schema";
import {
  createContactPropertySchema,
  updateContactPropertySchema,
  contactPropertyResponseSchema,
  contactPropertyListResponseSchema,
  contactPropertyDeleteResponseSchema,
} from "@/app/(main)/api/v1/contact-properties/schema";
import {
  createTopicSchema,
  updateTopicSchema,
  topicResponseSchema,
  topicListResponseSchema,
  topicDeleteResponseSchema,
} from "@/app/(main)/api/v1/topics/schema";
import {
  createSegmentSchema,
  updateSegmentSchema,
  segmentResponseSchema,
  segmentListResponseSchema,
  segmentDeleteResponseSchema,
} from "@/app/(main)/api/v1/segments/schema";
import {
  createFormSchema,
  updateFormSchema,
  formResponseSchema,
  formListResponseSchema,
  formVersionListResponseSchema,
  formDeleteResponseSchema,
} from "@/app/(main)/api/v1/forms/schema";
import {
  sendTransactionalEmailSchema,
  sendTransactionalEmailResponseSchema,
} from "@/app/(main)/api/v1/emails/send/schema";
import {
  createAndSendBroadcastSchema,
  createAndSendBroadcastResponseSchema,
} from "@/app/(main)/api/v1/broadcasts/schema";

/**
 * Validation error detail structure
 */
const validationErrorDetailSchema = z.object({
  field: z.string().describe("Field name that failed validation"),
  code: z
    .string()
    .describe("Error code for this field (e.g., INVALID_FIELD_VALUE)"),
  message: z.string().describe("Human-readable error message for this field"),
});

/**
 * Standard error response structure
 * All API errors follow this consistent format
 */
const errorResponseSchema = z.object({
  error: z.object({
    type: z
      .enum([
        "authentication_error",
        "invalid_request_error",
        "validation_error",
        "rate_limit_error",
        "api_error",
      ])
      .describe("Error type category"),
    code: z
      .string()
      .describe(
        "Specific error code (CAPITAL_CASE, e.g., FORM_NOT_FOUND, INVALID_API_KEY)"
      ),
    message: z.string().describe("Human-readable error message"),
    requestId: z
      .string()
      .describe("Unique request identifier for tracing (starts with req_)"),
    validationErrors: z
      .array(validationErrorDetailSchema)
      .optional()
      .describe(
        "Field-level validation errors (only present for validation_error type)"
      ),
    details: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional error context (optional)"),
  }),
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
    description:
      "Cursor for pagination - ID of the last item from the previous page",
    required: false,
    schema: {
      type: "string" as const,
    },
  },
  {
    name: "before",
    in: "query" as const,
    description:
      "Cursor for reverse pagination - ID of the first item from the next page",
    required: false,
    schema: {
      type: "string" as const,
    },
  },
];

/**
 * Explicit OpenAPI schemas for segment conditions
 * These replace the recursive z.lazy() schemas to ensure compatibility with all OpenAPI generators
 */

// Field condition - individual field comparison
const fieldConditionOpenAPISchema: SchemaObject = {
  type: "object",
  required: ["field", "operator", "value"],
  properties: {
    field: {
      type: "string",
      description:
        "Contact property field name (e.g., 'email', 'firstName', custom property name)",
      minLength: 1,
    },
    operator: {
      type: "string",
      enum: [
        "eq",
        "ne",
        "gt",
        "gte",
        "lt",
        "lte",
        "in",
        "nin",
        "contains",
        "startsWith",
        "endsWith",
        "exists",
      ],
      description:
        "Comparison operator: eq (equals), ne (not equals), gt (greater than), gte (>=), lt (less than), lte (<=), in (in array), nin (not in array), contains (string contains), startsWith, endsWith, exists (field exists)",
    },
    value: {
      oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
        {
          type: "array",
          items: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
        },
      ],
      description:
        "Value to compare against. Type depends on field and operator. Null only valid with 'exists' operator.",
    },
  },
  example: {
    field: "country",
    operator: "eq",
    value: "US",
  },
};

// Topic condition - subscription status
const topicConditionOpenAPISchema: SchemaObject = {
  type: "object",
  properties: {
    subscribedToTopic: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description:
        "Array of topic IDs the contact must be subscribed to (OR logic - any match)",
    },
    notSubscribedToTopic: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description:
        "Array of topic IDs the contact must NOT be subscribed to (OR logic - any match)",
    },
  },
  description:
    "Check if contact is subscribed or not subscribed to specific topics",
  example: {
    subscribedToTopic: ["topic_123", "topic_456"],
  },
};

// Logical operator condition - supports recursion
const logicalOperatorConditionOpenAPISchema: SchemaObject = {
  type: "object",
  properties: {
    $and: {
      type: "array",
      items: { $ref: "#/components/schemas/Condition" },
      minItems: 1,
      description: "Array of conditions that must ALL be true (AND logic)",
    },
    $or: {
      type: "array",
      items: { $ref: "#/components/schemas/Condition" },
      minItems: 1,
      description:
        "Array of conditions where at least ONE must be true (OR logic)",
    },
    $not: {
      $ref: "#/components/schemas/Condition",
      description: "Condition that must be false (NOT logic)",
    },
  },
  description:
    "Logical operators for combining conditions. At least one operator ($and, $or, or $not) is required.",
  example: {
    $and: [
      { field: "country", operator: "eq", value: "US" },
      { field: "age", operator: "gte", value: 18 },
    ],
  },
};

const document = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Kibamail API",
    version: "1.0.0",
    description: `# Kibamail API

The Kibamail API provides a comprehensive set of endpoints for managing your email marketing operations programmatically.

## Key Features

- **Contacts Management**: Create, update, and segment your contact lists with custom properties
- **Topics & Subscriptions**: Manage email topics and subscriber preferences
- **Forms**: Create and publish embeddable forms for lead capture
- **Segments**: Build dynamic audience segments using flexible filtering conditions
- **Automations**: Set up automated email workflows triggered by contact behavior
- **API Keys**: Secure, scoped API key management for workspace access

## Authentication

All API requests require authentication using an API key. Include your API key in the Authorization header:

\`\`\`
Authorization: Bearer kb_your_api_key_here
\`\`\`

API keys are scoped to specific permissions (read/write for each resource type). Generate keys from your workspace settings.

## Rate Limiting

- **Rate Limit**: 1000 requests per minute per API key
- **Burst Limit**: 100 requests per second
- Rate limit headers are included in all responses

## Pagination

List endpoints use cursor-based pagination for optimal performance:
- \`limit\`: Number of items (1-100, default 20)
- \`after\`: Cursor for next page (ID of last item)
- \`before\`: Cursor for previous page (ID of first item)

Responses include \`hasMore\` and \`hasPrevious\` flags for navigation.

## Error Handling

All errors follow a consistent format with:
- \`type\`: Error category (authentication_error, validation_error, etc.)
- \`code\`: Specific error code (FORM_NOT_FOUND, INSUFFICIENT_SCOPE, etc.)
- \`message\`: Human-readable description
- \`requestId\`: Unique identifier for debugging
- \`validationErrors\`: Field-level errors (for validation failures)

## Webhooks

Configure webhooks to receive real-time notifications for:
- Contact created/updated/unsubscribed
- Form submissions
- Automation triggers
- Topic subscriptions/unsubscriptions

## SDKs

Official SDKs available for:
- Node.js/TypeScript
- Python
- PHP
- Ruby

For detailed guides and tutorials, visit our documentation.`,
  },
  servers: [
    {
      url: "https://api.kibamail.com",
      description: "Production server - Use this for live applications",
    },
  ],
  tags: [
    {
      name: "Contacts",
      description: "Manage contact records, subscriptions, and custom properties",
    },
    {
      name: "Topics",
      description: "Organize email communications by topic and manage subscriptions",
    },
    {
      name: "Segments",
      description: "Create dynamic contact groups using flexible filtering conditions",
    },
    {
      name: "Contact Properties",
      description: "Define custom fields to store additional contact data",
    },
    {
      name: "Forms",
      description: "Build and manage embeddable signup forms for lead capture",
    },
    {
      name: "API Keys",
      description: "Manage API keys for secure programmatic access to your workspace",
    },
    {
      name: "Transactional Emails",
      description: "Send one-off transactional emails like order confirmations and password resets",
    },
    {
      name: "Broadcasts",
      description: "Create and schedule email broadcasts to segments, topics, or email lists with per-recipient personalization",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: `API key authentication using Bearer token format.

**How to authenticate:**
1. Generate an API key from your workspace settings
2. Include it in the Authorization header: \`Authorization: Bearer kb_xxxxx\`
3. Ensure your API key has the required scopes for the endpoint

**Scopes:**
- \`read:contacts\` - Read contact data
- \`write:contacts\` - Create and update contacts
- \`read:forms\` - View forms
- \`write:forms\` - Create and publish forms
- \`read:topics\` - View topics
- \`write:topics\` - Manage topics
- \`read:segments\` - View segments
- \`write:segments\` - Create and update segments
- \`read:automations\` - View automations
- \`write:automations\` - Manage automations

**Security best practices:**
- Store API keys securely (use environment variables)
- Use separate keys for development and production
- Rotate keys periodically
- Use minimal required scopes for each key`,
      },
    },
    schemas: {
      // Condition schemas for segments and contact search
      FieldCondition: fieldConditionOpenAPISchema,
      TopicCondition: topicConditionOpenAPISchema,
      LogicalOperatorCondition: logicalOperatorConditionOpenAPISchema,
      Condition: {
        oneOf: [
          { $ref: "#/components/schemas/FieldCondition" },
          { $ref: "#/components/schemas/TopicCondition" },
          { $ref: "#/components/schemas/LogicalOperatorCondition" },
        ],
        description:
          "A filter condition for segments and contact search. Can be a field comparison, topic subscription check, or logical operator combining multiple conditions.",
        example: {
          $and: [
            { field: "country", operator: "eq", value: "US" },
            { field: "lifetime_value", operator: "gte", value: 100 },
          ],
        },
      },
      // Segment schemas using explicit Condition schema
      CreateSegmentRequest: {
        type: "object",
        required: ["name", "conditions"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "Segment name (1-100 characters)",
          },
          description: {
            type: ["string", "null"],
            maxLength: 500,
            description: "Optional description (max 500 characters)",
          },
          conditions: {
            $ref: "#/components/schemas/Condition",
            description: "Filter conditions defining segment membership",
          },
        },
      } satisfies SchemaObject,
      UpdateSegmentRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "Segment name (1-100 characters)",
          },
          description: {
            type: ["string", "null"],
            maxLength: 500,
            description: "Optional description (max 500 characters)",
          },
          conditions: {
            $ref: "#/components/schemas/Condition",
            description: "Filter conditions defining segment membership",
          },
        },
      } satisfies SchemaObject,
      SegmentResponse: {
        type: "object",
        required: ["object", "id", "name", "conditions"],
        properties: {
          object: {
            type: "string",
            enum: ["segment"],
            description: "Object type identifier",
          },
          id: {
            type: "string",
            description: "Unique segment identifier",
          },
          name: {
            type: "string",
            description: "Segment name",
          },
          description: {
            type: ["string", "null"],
            description: "Segment description",
          },
          conditions: {
            $ref: "#/components/schemas/Condition",
            description: "Filter conditions defining segment membership",
          },
        },
      } satisfies SchemaObject,
      SegmentListItem: {
        type: "object",
        required: ["id", "name", "conditions"],
        properties: {
          id: {
            type: "string",
            description: "Unique segment identifier",
          },
          name: {
            type: "string",
            description: "Segment name",
          },
          description: {
            type: ["string", "null"],
            description: "Segment description",
          },
          conditions: {
            $ref: "#/components/schemas/Condition",
            description: "Filter conditions defining segment membership",
          },
        },
      } satisfies SchemaObject,
      SegmentListResponse: {
        type: "object",
        required: ["object", "hasMore", "data"],
        properties: {
          object: {
            type: "string",
            enum: ["segment_list"],
            description: "Object type identifier",
          },
          hasMore: {
            type: "boolean",
            description: "Whether more results are available",
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/SegmentListItem" },
            description: "Array of segments",
          },
        },
      } satisfies SchemaObject,
      // Contact search schemas
      SearchContactsRequest: {
        type: "object",
        required: ["conditions"],
        properties: {
          conditions: {
            $ref: "#/components/schemas/Condition",
            description: "Filter conditions for contact search",
          },
        },
      } satisfies SchemaObject,
    },
  },
  paths: {
    "/v1/api-keys": {
      get: {
        summary: "List API Keys",
        description: `Retrieve a paginated list of all API keys in your workspace.

**Use Cases:**
- View all active API keys
- Audit API key usage
- Manage workspace integrations
- Identify keys for rotation or deletion

**Behavior:**
- Returns all API keys for the workspace
- Keys are returned in reverse chronological order (newest first)
- Actual key values are NOT included (only metadata)
- Includes key name, scopes, and creation date
- Uses cursor-based pagination

**Required Scope:** Requires API key authentication

**Security Note:**
- Full key values are never returned (they're hashed)
- Only the key prefix and metadata are shown
- Use this to audit and manage your keys`,
        tags: ["API Keys"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved list of API keys with metadata (key values not included)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    object: { type: "string", example: "api_key_list" },
                    hasMore: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          scopes: { type: "array", items: { type: "string" } },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key authentication",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create API Key",
        description: `Generate a new API key for programmatic workspace access.

**Use Cases:**
- Set up server-side integrations with your application
- Create separate keys for different environments (dev, staging, production)
- Generate keys with specific scopes for third-party integrations
- Replace compromised or leaked API keys

**Behavior:**
- Returns the full API key ONLY on creation (starts with 'kb_')
- Key is securely hashed before storage - cannot be retrieved again
- Keys are scoped to specific permissions you define
- Each key can have a custom name for identification
- Keys remain active until explicitly revoked
- No limit on number of active keys per workspace

**Required Scope:** This endpoint requires session authentication (not API key)

**Security Best Practices:**
- Store the returned key securely immediately
- Never commit keys to version control
- Use environment variables for key storage
- Rotate keys periodically (recommended: every 90 days)
- Use minimum required scopes for each key
- Revoke unused keys immediately

**Note:** You cannot view the full key value after creation. If lost, generate a new key and update your integrations.`,
        tags: ["API Keys"],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createApiKeySchema },
          },
        },
        responses: {
          "200": {
            description:
              "API key created successfully. The full key value is included in the response and cannot be retrieved again.",
            content: {
              "application/json": {
                schema: createApiKeyResponseSchema,
                example: {
                  object: "api_key",
                  id: "api_key_abc123xyz789",
                  key: "kb_live_1234567890abcdefghijklmnopqrstuvwxyz",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as invalid scopes or missing required fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing session authentication. This endpoint requires user login, not API key authentication.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/api-keys/{keyId}": {
      delete: {
        summary: "Delete API Key",
        description: `Delete an API key permanently.

**Use Cases:**
- Revoke compromised or leaked API keys
- Remove unused API keys
- Clean up keys after decommissioning integrations
- Rotate API keys for security

**Behavior:**
- API key is permanently deleted
- Key can no longer be used for authentication
- Cannot delete the currently authenticated API key
- Operation is immediate and cannot be undone

**Required Scope:** Requires API key authentication

**Important:**
- You cannot delete the API key you're currently using
- Deleted keys cannot be recovered
- Any integrations using the deleted key will stop working immediately
- Update all services using the key before deletion`,
        tags: ["API Keys"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "keyId",
            in: "path",
            description: "API Key ID to delete",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "API key deleted successfully. Returns the deleted key's ID for confirmation.",
            content: {
              "application/json": {
                schema: apiKeyDeleteResponseSchema,
                example: {
                  object: "api_key",
                  id: "api_key_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Attempting to delete the currently authenticated API key or key not found",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key authentication",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/contacts": {
      get: {
        summary: "List Contacts",
        description: `Retrieve a paginated list of all contacts in your workspace.

**Use Cases:**
- Export your entire contact database
- Build custom contact management dashboards
- Sync contacts with external CRM systems
- Generate contact reports and analytics
- Display contact lists in your application

**Behavior:**
- Returns contacts in reverse chronological order (newest first)
- Uses cursor-based pagination for efficient data retrieval
- Includes all contact properties (default and custom)
- Includes subscription status and topic memberships
- Maximum 100 contacts per request (use 'limit' parameter)
- Deleted contacts are not included in results

**Required Scope:** \`read:contacts\`

**Pagination:**
- Use 'after' cursor to fetch the next page
- Use 'before' cursor to fetch the previous page
- Response includes 'hasMore' and 'hasPrevious' flags
- Cursors are based on contact IDs for stable pagination

**Performance Tips:**
- Use the maximum limit (100) for bulk exports
- Cache results when possible to reduce API calls
- For filtered results, use the /v1/contacts/search endpoint instead`,
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of contacts with their properties, subscriptions, and metadata",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Contact",
        description: `Create a new contact in your workspace.

**Use Cases:**
- Add subscribers from your website forms
- Import contacts from external systems
- Programmatically build your contact list
- Create contacts from API integrations
- Add leads captured through your application

**Behavior:**
- Email addresses are automatically normalized (lowercased, trimmed)
- Duplicate emails return a 409 Conflict error
- Custom properties must be pre-defined in your workspace
- Property values are validated against their defined types (STRING, NUMBER, DATE, BOOLEAN)
- Maximum 100 custom property slots per contact
- Contact is created with 'subscribed' status by default
- Timestamps (createdAt, updatedAt) are automatically set
- Returns the complete contact object including generated ID

**Required Scope:** \`write:contacts\`

**Property Validation:**
- STRING: Any text value, max 5000 characters
- NUMBER: Valid numeric values (integers or decimals)
- DATE: ISO 8601 format (YYYY-MM-DD or full timestamp)
- BOOLEAN: true or false

**Email Validation:**
- Must be a valid email format
- Cannot exceed 320 characters
- Automatically converted to lowercase
- Leading/trailing whitespace is trimmed

**Note:** For bulk imports (>1000 contacts), consider using the batch import endpoint (coming soon) for better performance.`,
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
            description:
              "Contact created successfully. Returns the complete contact object with generated ID and timestamps.",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as malformed email or exceeding property limits",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - A contact with this email address already exists in the workspace. Use PUT /v1/contacts/{contactId} to update existing contacts.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Property values don't match their defined types (e.g., text in a NUMBER field, invalid date format, undefined property names)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/contacts/{contactId}": {
      get: {
        summary: "Get Contact",
        description: `Retrieve a specific contact by ID.

**Use Cases:**
- Fetch contact details for display in your application
- Verify contact information before updates
- Check subscription status and topic memberships
- Retrieve contact properties for personalization
- Audit contact data and history

**Behavior:**
- Returns complete contact object including all properties
- Includes subscription status (subscribed/unsubscribed)
- Shows all topic memberships and their statuses
- Includes metadata (createdAt, updatedAt timestamps)
- Contact must belong to your workspace

**Required Scope:** \`read:contacts\`

**Response Includes:**
- Basic info: id, email, firstName, lastName
- All custom property values
- Subscription status and unsubscribe reason (if applicable)
- Topic memberships with individual subscription statuses
- Timestamps for creation and last update`,
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
            description:
              "Successfully retrieved contact with all properties, subscription status, topic memberships, and metadata",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact with this ID does not exist in your workspace or has been deleted",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Contact",
        description: `Update an existing contact's information and properties.

**Use Cases:**
- Update contact details when information changes
- Modify custom property values
- Change subscription preferences
- Update contact names or profile information
- Sync changes from external systems

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Email address can be updated (must still be unique)
- Custom property values are validated against their types
- Cannot update readonly fields (id, createdAt)
- UpdatedAt timestamp is automatically refreshed
- Returns the complete updated contact object
- Email normalization applies (lowercase, trimmed)

**Required Scope:** \`write:contacts\`

**Updatable Fields:**
- email (must remain unique in workspace)
- firstName, lastName
- All custom property values
- Individual topic subscription statuses

**Protected Fields:**
- id (cannot be changed)
- createdAt (immutable)
- workspaceId (immutable)

**Property Updates:**
- Only include properties you want to change
- Omitted properties retain their current values
- Set property to null to clear its value
- Type validation still applies to new values`,
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
            description:
              "Contact updated successfully. Returns the complete updated contact object with refreshed updatedAt timestamp.",
            content: {
              "application/json": { schema: contactResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as malformed email or attempting to update protected fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Property values don't match their defined types, or new email already exists for another contact",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Contact",
        description: `Permanently delete a contact from your workspace.

**Use Cases:**
- Remove contacts who requested data deletion (GDPR compliance)
- Clean up invalid or test contacts
- Remove bounced or spam complaint contacts
- Comply with data retention policies
- Delete duplicates after merging

**Behavior:**
- Contact is permanently deleted and cannot be recovered
- All associated data is removed (properties, subscriptions)
- Contact is removed from all topics and segments
- Historical email stats are preserved but anonymized
- Form submissions from this contact remain in analytics
- Operation is idempotent (no error if already deleted)

**Required Scope:** \`write:contacts\`

**Data Deletion:**
- Contact record and all properties deleted
- Topic subscriptions removed
- Segment memberships recalculated
- Email engagement history anonymized
- Cannot be undone - ensure this is intentional

**Important:**
- This is a hard delete, not an archive
- Consider unsubscribing instead if you need to retain history
- For GDPR "right to be forgotten" requests
- Automation triggers may reference deleted contacts in logs

**Note:** If you need to preserve historical data, consider marking contacts as unsubscribed instead of deleting them.`,
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
            description:
              "Contact permanently deleted successfully. Returns the deleted contact's ID for confirmation.",
            content: {
              "application/json": {
                schema: contactDeleteResponseSchema,
                example: {
                  object: "contact",
                  id: "contact_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact with this ID does not exist (may have already been deleted)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/topics": {
      get: {
        summary: "List Topics",
        description: `Retrieve a paginated list of all topics in your workspace.

**Use Cases:**
- Display topic subscription preferences to contacts
- Build subscription management pages
- Export topic configuration
- Sync topics with external systems
- Generate topic analytics and reports

**Behavior:**
- Returns all topics in alphabetical order by name
- Uses cursor-based pagination for efficient retrieval
- Includes topic metadata (name, description, slug)
- Shows subscriber counts for each topic
- Maximum 100 topics per request
- Includes both active and archived topics

**Required Scope:** \`read:topics\`

**Response Includes:**
- Topic ID and slug (URL-safe identifier)
- Name and description
- Subscriber count (active subscriptions)
- Creation and update timestamps
- Visibility settings (public/private)

**Use Topics For:**
- Newsletter categories (e.g., "Product Updates", "Marketing Tips")
- Interest-based segmentation
- Preference center organization
- Compliance with subscription preferences
- Multi-channel communication preferences`,
        tags: ["Topics"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of topics with metadata and subscriber counts",
            content: {
              "application/json": { schema: topicListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:topics' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Topic",
        description: `Create a new topic for organizing contact subscriptions.

**Use Cases:**
- Set up newsletter categories for your content
- Create interest-based subscription options
- Organize email types (transactional, marketing, updates)
- Build preference center options
- Segment communications by content type

**Behavior:**
- Slug is auto-generated from name if not provided (URL-safe, lowercase)
- Slug must be unique across workspace
- Topics are created in active state by default
- Initial subscriber count is zero
- Name and description can be updated later
- Topic can be made public or private

**Required Scope:** \`write:topics\`

**Topic Properties:**
- **name**: Display name (e.g., "Product Updates")
- **description**: Explains what contacts will receive
- **slug**: URL-safe identifier (auto-generated if not provided)
- **isPublic**: Whether topic appears in public preference centers

**Best Practices:**
- Use descriptive names that contacts will understand
- Write clear descriptions about email frequency and content
- Keep slug short and memorable
- Consider compliance requirements (GDPR, CAN-SPAM)
- Plan topic hierarchy before creating many topics`,
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
            description:
              "Topic created successfully with generated ID, slug (if not provided), and timestamps",
            content: {
              "application/json": { schema: topicResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as invalid slug format or missing required fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:topics' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - A topic with this slug already exists in the workspace. Slugs must be unique.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as name too long or invalid slug characters",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/topics/{topicId}": {
      get: {
        summary: "Get Topic",
        description: `Retrieve a specific topic by ID with full details.

**Use Cases:**
- Fetch topic details for display in preference centers
- Verify topic configuration before updates
- Check subscriber count for a topic
- Retrieve topic metadata for analytics
- Display topic information in your application

**Behavior:**
- Returns complete topic object with all metadata
- Includes current subscriber count (active subscriptions)
- Shows creation and last update timestamps
- Topic must belong to your workspace
- Works for both active and archived topics

**Required Scope:** \`read:topics\`

**Response Includes:**
- Topic identification (id, slug, name)
- Description and visibility settings
- Subscriber count (number of active subscriptions)
- Timestamps (createdAt, updatedAt)
- Workspace association`,
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
            description:
              "Successfully retrieved topic with full details, metadata, and subscriber count",
            content: {
              "application/json": { schema: topicResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:topics' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Topic with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Topic",
        description: `Update an existing topic's name, description, or settings.

**Use Cases:**
- Rename topics for better clarity
- Update topic descriptions as content strategy changes
- Change visibility settings (public/private)
- Refine topic slugs for better URLs
- Update topic metadata

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Slug can be updated but must remain unique
- Cannot change if it would create slug conflict
- UpdatedAt timestamp is automatically refreshed
- Subscriber count is not affected by updates
- Returns the complete updated topic object

**Required Scope:** \`write:topics\`

**Updatable Fields:**
- name (display name)
- description (what subscribers will receive)
- slug (URL-safe identifier, must be unique)
- isPublic (visibility in preference centers)

**Note:** Changing the slug will affect URLs in preference centers and unsubscribe pages. Update your integrations accordingly.`,
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
            description:
              "Topic updated successfully with refreshed updatedAt timestamp",
            content: {
              "application/json": { schema: topicResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data or attempting to update protected fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:topics' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Topic with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - Another topic with the new slug already exists. Slugs must be unique within the workspace.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as invalid slug format or name too long",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Topic",
        description: `Delete a topic and all associated subscriptions.

**Use Cases:**
- Remove deprecated or unused topics
- Clean up topics after restructuring
- Consolidate duplicate topics
- Archive old newsletter categories
- Maintain a clean topic list

**Behavior:**
- Topic and all contact subscriptions are deleted
- Contacts are NOT deleted (only their topic subscriptions)
- Historical email stats for this topic are preserved
- Cannot be undone - topic is permanently removed
- Segments referencing this topic may need updates
- Automations using this topic may break

**Required Scope:** \`write:topics\`

**Data Impact:**
- Topic record is permanently deleted
- All contact subscriptions to this topic are removed
- Contacts remain in workspace with other subscriptions
- Email performance data remains (but topic reference is removed)
- Preference center links to this topic will break

**Important:**
- Verify no active campaigns are using this topic
- Update automations that reference this topic
- Consider archiving instead of deleting for audit trails
- Warn contacts if you're removing a topic they're subscribed to

**Note:** This is a destructive operation. Consider creating a new topic and migrating subscribers before deleting the old one.`,
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
            description:
              "Topic deleted successfully. Returns the deleted topic's ID for confirmation.",
            content: {
              "application/json": {
                schema: topicDeleteResponseSchema,
                example: {
                  object: "topic",
                  id: "topic_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:topics' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Topic with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/segments": {
      get: {
        summary: "List Segments",
        description: `Retrieve a paginated list of all segments in your workspace.

**Use Cases:**
- Display available segments in your application
- Export segment configurations for backup
- Build segment analytics dashboards
- List targeting options for campaigns
- Audit segment usage and definitions

**Behavior:**
- Returns all segments in reverse chronological order (newest first)
- Uses cursor-based pagination for efficient retrieval
- Includes segment conditions (MongoDB-style filters)
- Shows estimated contact counts for each segment
- Maximum 100 segments per request
- Segments are evaluated dynamically (contact membership updates automatically)

**Required Scope:** \`read:segments\`

**Response Includes:**
- Segment ID, name, and description
- Filter conditions (MongoDB query format)
- Estimated member count (cached, updates periodically)
- Creation and update timestamps
- Segment type (dynamic/static)

**Segment Use Cases:**
- Target high-value customers (e.g., \`lifetime_value > 1000\`)
- Engaged subscribers (e.g., \`opened_last_30_days = true\`)
- Geographic targeting (e.g., \`country = 'US'\`)
- Behavioral triggers (e.g., \`last_purchase_date < 30_days_ago\`)`,
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of segments with conditions and estimated member counts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SegmentListResponse" },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:segments' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Segment",
        description: `Create a new dynamic segment using MongoDB-style filter conditions.

**Use Cases:**
- Build audience segments for targeted campaigns
- Create customer cohorts based on behavior
- Segment by demographics or properties
- Identify high-value or at-risk contacts
- Automate audience targeting rules

**Behavior:**
- Segments are dynamic - membership updates automatically as contact data changes
- Conditions use MongoDB query syntax for flexible filtering
- Contact count is calculated and cached (updates periodically)
- Supports complex nested conditions with $and, $or, $not
- Can filter on any contact property (default or custom)
- Conditions are validated against property schemas

**Required Scope:** \`write:segments\`

**Condition Operators:**
- **Comparison:** \`$eq\`, \`$ne\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\`
- **Arrays:** \`$in\`, \`$nin\`
- **Logical:** \`$and\`, \`$or\`, \`$not\`
- **Existence:** \`$exists\`
- **Text:** \`$regex\` (for pattern matching)

**Example Conditions:**
\`\`\`json
{
  "$and": [
    { "country": { "$eq": "US" } },
    { "lifetime_value": { "$gte": 100 } },
    { "last_purchase_date": { "$gte": "2024-01-01" } }
  ]
}
\`\`\`

**Best Practices:**
- Test conditions with /v1/contacts/search first
- Keep conditions simple for better performance
- Use indexed properties when possible
- Document segment purpose in description`,
        tags: ["Segments"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSegmentRequest" },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Segment created successfully with generated ID, initial member count, and timestamps",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SegmentResponse" },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid MongoDB query syntax or malformed conditions",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:segments' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, conditions reference non-existent properties, or unsupported operators",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/segments/{segmentId}": {
      get: {
        summary: "Get Segment",
        description: `Retrieve a specific segment by ID with its conditions and member count.

**Use Cases:**
- Fetch segment details for campaign targeting
- Verify segment configuration
- Check current member count before sending
- Display segment information in UI
- Audit segment definitions

**Behavior:**
- Returns complete segment object with all conditions
- Includes current estimated member count (cached)
- Shows creation and last update timestamps
- Segment must belong to your workspace
- Member count updates periodically (may not be real-time)

**Required Scope:** \`read:segments\`

**Response Includes:**
- Segment identification (id, name, description)
- Complete filter conditions (MongoDB query format)
- Estimated member count (contacts matching conditions)
- Timestamps (createdAt, updatedAt)
- Segment metadata

**Note:** For real-time member count, use GET /v1/segments/{segmentId}/contacts to fetch actual matching contacts.`,
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
            description:
              "Successfully retrieved segment with conditions, member count, and metadata",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SegmentResponse" },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:segments' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Segment with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Segment",
        description: `Update an existing segment's name, description, or filter conditions.

**Use Cases:**
- Refine segment targeting criteria
- Update segment names for clarity
- Add or modify filter conditions
- Adjust segment definitions as strategy evolves
- Fix incorrect segment logic

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Changing conditions triggers member count recalculation
- Members are re-evaluated against new conditions automatically
- UpdatedAt timestamp is automatically refreshed
- Returns the complete updated segment object
- Condition changes may affect active campaigns using this segment

**Required Scope:** \`write:segments\`

**Updatable Fields:**
- name (display name)
- description (segment purpose)
- conditions (MongoDB query - full replacement, not merge)

**Important:**
- Updating conditions replaces ALL existing conditions
- Member count may change significantly with condition updates
- Active campaigns using this segment will use new conditions
- Test new conditions with /v1/contacts/search before updating

**Note:** Condition updates are applied immediately and affect all uses of this segment across your workspace.`,
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
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateSegmentRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Segment updated successfully with refreshed member count and updatedAt timestamp",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SegmentResponse" },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid MongoDB query syntax or malformed conditions",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:segments' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Segment with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid conditions, references to non-existent properties, or unsupported operators",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Segment",
        description: `Delete a segment from your workspace.

**Use Cases:**
- Remove unused or obsolete segments
- Clean up after campaign completion
- Consolidate duplicate segments
- Archive old targeting definitions
- Simplify segment management

**Behavior:**
- Segment definition is permanently deleted
- Does NOT delete contacts (only the segment definition)
- Active campaigns using this segment may break
- Automations referencing this segment need updates
- Cannot be undone - segment is permanently removed
- Historical campaign data referencing segment is preserved

**Required Scope:** \`write:segments\`

**Data Impact:**
- Segment record and conditions are deleted
- Contacts remain in workspace (unaffected)
- Campaign references to this segment become invalid
- Automation triggers using this segment may fail
- Analytics data for campaigns using this segment preserved

**Important:**
- Verify no active campaigns are using this segment
- Update or pause automations referencing this segment
- Consider exporting segment definition before deleting
- Cannot recover segment definition after deletion

**Note:** This only deletes the segment definition, not the contacts within it. Contacts remain in your workspace.`,
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
            description:
              "Segment deleted successfully. Returns the deleted segment's ID for confirmation.",
            content: {
              "application/json": {
                schema: segmentDeleteResponseSchema,
                example: {
                  object: "segment",
                  id: "segment_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:segments' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Segment with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/contact-properties": {
      get: {
        summary: "List Contact Properties",
        description: `Retrieve a paginated list of all custom contact properties in your workspace.

**Use Cases:**
- Display available properties in your application UI
- Build dynamic form fields based on properties
- Export property schema for documentation
- Validate data before contact creation/update
- Audit custom property usage

**Behavior:**
- Returns all custom properties (default properties excluded)
- Properties are returned in creation order
- Uses cursor-based pagination for efficiency
- Includes property type, default values, and metadata
- Maximum 100 properties per request
- Shows whether properties are required or optional

**Required Scope:** \`read:contacts\` (contact properties are part of contacts scope)

**Response Includes:**
- Property ID and name (internal key)
- Display label for UI
- Data type (STRING, NUMBER, DATE, BOOLEAN)
- Default value (if defined)
- Required flag
- Creation and update timestamps

**Property Types:**
- **STRING:** Text data (max 5000 characters)
- **NUMBER:** Numeric values (integers or decimals)
- **DATE:** Date/timestamp values (ISO 8601 format)
- **BOOLEAN:** true/false values

**Default Properties (not in response):**
- email, firstName, lastName (always available, not listed here)`,
        tags: ["Contact Properties"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of custom contact properties with types and metadata",
            content: {
              "application/json": { schema: contactPropertyListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Contact Property",
        description: `Define a new custom property for storing additional contact data.

**Use Cases:**
- Store custom contact attributes (industry, company size, role)
- Track behavioral data (lifetime value, last purchase date)
- Capture form-specific fields
- Store integration data from external systems
- Build flexible contact profiles

**Behavior:**
- Property name must be unique within workspace
- Name becomes the key used in contact objects
- Type cannot be changed after creation
- Default value is applied to new contacts (if specified)
- Properties can be marked as required for validation
- Maximum 100 custom properties per workspace
- Name is automatically converted to snake_case

**Required Scope:** \`write:contacts\`

**Property Configuration:**
- **name:** Internal key (e.g., "company_size", "last_login")
- **label:** Display name for UI (e.g., "Company Size")
- **type:** Data type (STRING, NUMBER, DATE, BOOLEAN)
- **defaultValue:** Applied to new contacts (optional)
- **required:** Whether property must have a value (optional)

**Type Definitions:**
- **STRING:** Text up to 5000 characters
- **NUMBER:** Integer or decimal values
- **DATE:** ISO 8601 dates/timestamps
- **BOOLEAN:** true/false only

**Naming Best Practices:**
- Use snake_case (auto-converted)
- Keep names short but descriptive
- Avoid special characters
- Use consistent naming conventions
- Document property purpose in label

**Limits:**
- Maximum 100 custom properties per workspace
- Property names cannot be changed after creation
- Cannot delete properties used in segments or automations`,
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
            description:
              "Contact property created successfully with generated ID and timestamps. The property is now available for use on all contacts.",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Maximum property limit (100) reached, or invalid default value for specified type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - A property with this name already exists in the workspace. Property names must be unique.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid property type, name format, or default value doesn't match type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/contact-properties/{contactPropertyId}": {
      get: {
        summary: "Get Contact Property",
        description: `Retrieve a specific custom contact property by ID.

**Use Cases:**
- Fetch property metadata for validation
- Display property configuration in UI
- Verify property type before data operations
- Check default values for forms
- Audit property definitions

**Behavior:**
- Returns complete property definition
- Includes type, default value, and validation rules
- Shows whether property is required
- Property must belong to your workspace
- Includes creation and update timestamps

**Required Scope:** \`read:contacts\`

**Response Includes:**
- Property identification (id, name)
- Display label for UI
- Data type (STRING, NUMBER, DATE, BOOLEAN)
- Default value (if defined)
- Required flag
- Usage count (number of contacts with this property set)
- Timestamps (createdAt, updatedAt)`,
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
            description:
              "Successfully retrieved contact property with full definition and metadata",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact property with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Contact Property",
        description: `Update an existing contact property's label or default value.

**Use Cases:**
- Update display labels for better clarity
- Change default values for new contacts
- Modify property descriptions
- Update required flag
- Refine property metadata

**Behavior:**
- Only label and defaultValue can be updated
- Property name and type are immutable (cannot be changed)
- Changing defaultValue affects only future contacts
- Existing contact data is NOT modified
- UpdatedAt timestamp is automatically refreshed
- Returns the complete updated property object

**Required Scope:** \`write:contacts\`

**Updatable Fields:**
- **label:** Display name in UI
- **defaultValue:** Applied to new contacts only
- **required:** Whether property must have a value

**Immutable Fields:**
- **name:** Property key (cannot be changed)
- **type:** Data type (cannot be changed)
- **id:** Property identifier (cannot be changed)

**Important:**
- Type cannot be changed after creation
- Name cannot be modified (delete and recreate if needed)
- Default value changes don't affect existing contacts
- Changing required flag doesn't validate existing data

**Note:** To change property type or name, create a new property and migrate data, then delete the old one.`,
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
            description:
              "Contact property updated successfully with refreshed updatedAt timestamp",
            content: {
              "application/json": { schema: contactPropertyResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Attempting to update immutable fields (name, type) or invalid default value for type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact property with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - Cannot update property name (this field is immutable)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid default value doesn't match property type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Contact Property",
        description: `Delete a custom contact property from your workspace.

**Use Cases:**
- Remove unused or deprecated properties
- Clean up properties after data migration
- Simplify contact schema
- Remove test or temporary properties
- Comply with data minimization policies

**Behavior:**
- Property definition is permanently deleted
- Property values are removed from ALL contacts
- Segments using this property may break
- Automations referencing this property need updates
- Cannot be undone - data is permanently removed
- Cannot delete if property is required by active segments

**Required Scope:** \`write:contacts\`

**Data Impact:**
- Property definition is deleted
- All contact values for this property are removed
- Segment conditions referencing this property become invalid
- Automation triggers using this property may fail
- Form fields using this property need updates
- Historical data is lost (cannot be recovered)

**Important:**
- Verify no active segments or automations use this property
- Export contact data if you need to preserve values
- Consider marking as deprecated before deletion
- Update forms and integrations that reference this property
- Cannot delete default properties (email, firstName, lastName)

**Blocked Deletion:**
- Cannot delete if used in active segment conditions
- Cannot delete if required by running automations
- Cannot delete default system properties

**Note:** This is a destructive operation. All contact data for this property will be permanently lost.`,
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
            description:
              "Contact property deleted successfully. Returns the deleted property's ID for confirmation. All contact data for this property is permanently removed.",
            content: {
              "application/json": {
                schema: contactPropertyDeleteResponseSchema,
                example: {
                  object: "contact_property",
                  id: "contact_property_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Contact property with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/contacts/search": {
      post: {
        summary: "Search Contacts",
        description: `Search for contacts using flexible MongoDB-style filter conditions.

**Use Cases:**
- Find contacts matching specific criteria
- Build custom contact reports
- Test segment conditions before creating segments
- Filter contacts for targeted operations
- Query contacts by custom property values

**Behavior:**
- Uses MongoDB query syntax for powerful filtering
- Returns paginated results with cursor-based pagination
- Supports complex nested conditions ($and, $or, $not)
- Can filter on any contact property (default or custom)
- Maximum 100 contacts per request
- Results are sorted by createdAt (newest first)

**Required Scope:** \`read:contacts\`

**Supported Operators:**
- **Comparison:** \`$eq\`, \`$ne\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\`
- **Arrays:** \`$in\`, \`$nin\`
- **Logical:** \`$and\`, \`$or\`, \`$not\`
- **Existence:** \`$exists\` (check if property is set)
- **Text:** \`$regex\` (pattern matching)

**Example Queries:**

Find US contacts with high value:
\`\`\`json
{
  "$and": [
    { "country": { "$eq": "US" } },
    { "lifetime_value": { "$gte": 1000 } }
  ]
}
\`\`\`

Find engaged subscribers:
\`\`\`json
{
  "$and": [
    { "subscribed": { "$eq": true } },
    { "last_opened_at": { "$gte": "2024-01-01" } }
  ]
}
\`\`\`

Find contacts missing a property:
\`\`\`json
{
  "company": { "$exists": false }
}
\`\`\`

**Best Practices:**
- Test complex conditions here before creating segments
- Use indexed properties for better performance
- Keep conditions simple when possible
- Combine with pagination for large result sets`,
        tags: ["Contacts"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SearchContactsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Successfully retrieved contacts matching the search conditions with pagination metadata",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid MongoDB query syntax or malformed conditions",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:contacts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Conditions reference non-existent properties or use unsupported operators",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/segments/{segmentId}/contacts": {
      get: {
        summary: "Get Segment Contacts",
        description: `Retrieve all contacts that match a segment's filter conditions.

**Use Cases:**
- Export contacts from a specific segment
- Verify segment membership before campaigns
- Build segment-based reports
- Preview segment membership
- Test segment conditions with real data

**Behavior:**
- Returns contacts matching segment's conditions in real-time
- Uses cursor-based pagination for efficient retrieval
- Results are evaluated dynamically (always current)
- Maximum 100 contacts per request
- Includes all contact properties and metadata
- Sorted by contact creation date (newest first)

**Required Scope:** \`read:contacts\` and \`read:segments\`

**Response Includes:**
- Complete contact objects with all properties
- Subscription statuses and topic memberships
- Contact metadata (createdAt, updatedAt)
- Pagination cursors for navigation

**Use Cases:**
- Send targeted campaigns to segment members
- Export segment data for analysis
- Verify segment conditions are working correctly
- Build custom reports on segment members

**Note:** This endpoint evaluates conditions in real-time, so membership reflects current contact data, not cached counts.`,
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
            description:
              "Successfully retrieved contacts matching the segment's conditions with complete contact data and metadata",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks required scopes (read:contacts, read:segments)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Segment with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/topics/{topicId}/contacts": {
      get: {
        summary: "Get Topic Contacts",
        description: `Retrieve all contacts subscribed to a specific topic.

**Use Cases:**
- Export subscribers for a specific newsletter topic
- Send targeted communications to topic subscribers
- Analyze subscriber demographics by topic
- Build topic-specific reports
- Verify subscription lists before campaigns

**Behavior:**
- Returns only actively subscribed contacts (not unsubscribed)
- Uses cursor-based pagination for efficiency
- Includes complete contact data and properties
- Maximum 100 contacts per request
- Sorted by subscription date (newest first)
- Contact must have active subscription to this topic

**Required Scope:** \`read:contacts\` and \`read:topics\`

**Response Includes:**
- Complete contact objects with all properties
- Contact's subscription status for this topic
- All other topic subscriptions for each contact
- Contact metadata (createdAt, updatedAt)
- Pagination cursors

**Subscription Status:**
- Only includes contacts with active subscriptions
- Unsubscribed contacts are excluded
- Globally unsubscribed contacts are excluded
- Pending/double-opt-in contacts may be included (check status)

**Note:** This returns the current snapshot. Subscriptions may change between paginated requests.`,
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
            description:
              "Successfully retrieved actively subscribed contacts for this topic with complete contact data",
            content: {
              "application/json": { schema: contactListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks required scopes (read:contacts, read:topics)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Topic with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/forms": {
      get: {
        summary: "List Forms",
        description: `Retrieve a paginated list of all root forms in your workspace.

**Use Cases:**
- Display all forms in your application dashboard
- Build form selection dropdowns
- Export form metadata
- Monitor form deployment status
- Sync forms with external systems

**Behavior:**
- Returns only root forms (parentId is null)
- Does not include form versions - use GET /v1/forms/{formId}/versions for versions
- Results are paginated using cursor-based pagination
- Forms are sorted by ID in descending order (newest first)
- Returns forms in all statuses (DRAFT, PUBLISHED, ARCHIVED)
- Form must belong to your workspace

**Cursor-Based Pagination:**
- Use \`limit\` to specify page size (default: 20, max: 100)
- Use \`after\` cursor to fetch next page
- Use \`before\` cursor to fetch previous page
- \`hasMore\` indicates if more results are available

**Required Scope:** \`read:forms\`

**Response Fields:**
- **id:** Unique form identifier
- **name:** Form name
- **description:** Form description (optional)
- **status:** DRAFT, PUBLISHED, or ARCHIVED

**Pagination Example:**
1. First request: GET /v1/forms?limit=20
2. Get last item ID from response
3. Next page: GET /v1/forms?limit=20&after=<last_id>
4. Check hasMore to see if more pages exist`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of forms per page (max 100)",
            required: false,
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: "after",
            in: "query",
            description: "Cursor for fetching the next page",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "before",
            in: "query",
            description: "Cursor for fetching the previous page",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved list of root forms with pagination metadata",
            content: {
              "application/json": { schema: formListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Form",
        description: `Create a new embeddable form for lead capture and contact collection.

**Use Cases:**
- Build newsletter signup forms for your website
- Create lead generation forms
- Capture event registrations
- Collect customer feedback
- Build preference center forms

**Behavior:**
- Form is created in DRAFT status (not yet public)
- Uses form builder JSON schema for flexibility
- Form gets a unique ID and slug for embedding
- Initial version is created automatically
- Form must be published to make it publicly accessible
- Submissions are tracked and stored

**Required Scope:** \`write:forms\`

**Form Configuration:**
- **name:** Internal form name for identification
- **title:** Display title shown to users
- **description:** Form purpose/instructions (optional)
- **fields:** Form builder JSON schema defining fields
- **redirectUrl:** Where to send users after submission (optional)
- **submitText:** Custom submit button text (optional)

**Form Builder Features:**
- Supports all standard field types (text, email, number, phone, etc.)
- Flexible field validation and conditional logic
- Multi-page and multi-section forms
- Custom styling and appearance options

**Form Lifecycle:**
1. Create form (DRAFT status)
2. Configure fields and settings
3. Test form submission
4. Publish form (PUBLISHED status)
5. Embed on website
6. Create versions for updates
7. Publish new versions (previous auto-archived)

**Note:** Forms in DRAFT status cannot receive public submissions. Publish the form to make it live.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: createFormSchema },
          },
        },
        responses: {
          "201": {
            description:
              "Form created successfully. Returns the generated form ID.",
            content: {
              "application/json": {
                schema: formResponseSchema,
                example: {
                  object: "form",
                  id: "form_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid form builder JSON configuration or malformed input",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, missing required fields, or invalid form builder schema",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/forms/{formId}": {
      get: {
        summary: "Get Form",
        description: `Retrieve a specific form by ID with full configuration.

**Use Cases:**
- Fetch form details for rendering
- Check form status before editing
- Retrieve form configuration for frontend
- Verify form settings
- Get embed code parameters

**Behavior:**
- Returns forms in any status (DRAFT, PUBLISHED, ARCHIVED)
- Includes complete form builder configuration
- Shows form version information
- Published forms include publishedAt timestamp
- Includes submission statistics
- Form must belong to your workspace

**Required Scope:** \`read:forms\`

**Response Includes:**
- Form identification (id, name, slug)
- Display information (title, description)
- Status (DRAFT, PUBLISHED, ARCHIVED)
- Form builder configuration (fields)
- Settings (redirectUrl, submitText)
- Version information (rootFormId, publishedVersionId)
- Statistics (submission count)
- Timestamps (createdAt, updatedAt, publishedAt)

**Form Status:**
- **DRAFT:** Editable, not publicly accessible
- **PUBLISHED:** Live and accepting submissions, immutable
- **ARCHIVED:** Previous version, read-only

**Note:** Use the slug or ID to embed forms on your website.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved form with complete configuration, version info, and submission statistics",
            content: {
              "application/json": {
                schema: formResponseSchema,
                example: {
                  object: "form",
                  id: "form_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Form with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Form",
        description: `Update an existing form's configuration (DRAFT forms only).

**Use Cases:**
- Modify form fields and layout
- Update form title or description
- Change redirect URL after submission
- Customize submit button text
- Refine form builder configuration

**Behavior:**
- Only DRAFT forms can be updated
- PUBLISHED and ARCHIVED forms are immutable
- To update published forms, create a new version first
- All fields are optional (partial updates supported)
- UpdatedAt timestamp is automatically refreshed
- Returns the complete updated form object

**Required Scope:** \`write:forms\`

**Updatable Fields (DRAFT only):**
- name (internal identifier)
- title (displayed to users)
- description (form instructions)
- fields (form builder configuration)
- redirectUrl (post-submission redirect)
- submitText (button text)

**Update Workflow for Published Forms:**
1. Create new version: POST /v1/forms/{formId}/versions
2. Update the new DRAFT version: PUT /v1/forms/{newVersionId}
3. Publish the updated version: POST /v1/forms/{newVersionId}/publish
4. Previous published version automatically becomes ARCHIVED

**Important:**
- Cannot update PUBLISHED or ARCHIVED forms
- Changes to DRAFT don't affect live form until published
- Test changes before publishing
- Form builder configuration must be valid JSON

**Note:** For published forms, create a new version instead of updating directly.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateFormSchema },
          },
        },
        responses: {
          "200": {
            description:
              "Form updated successfully with refreshed updatedAt timestamp. Form remains in DRAFT status.",
            content: {
              "application/json": { schema: formResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Form is PUBLISHED or ARCHIVED and cannot be modified. Create a new version to make changes.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Form with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid form builder configuration or field values",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Form",
        description: `Delete a form and all its versions permanently.

**Use Cases:**
- Remove test or deprecated forms
- Clean up unused forms
- Delete forms after migration
- Comply with data retention policies
- Remove accidentally created forms

**Behavior:**
- Deletes the specified form permanently
- If deleting root form, ALL versions are deleted
- If deleting a version, only that version is deleted
- Form submissions are retained (anonymized)
- Embedded forms will stop working immediately
- Cannot be undone - deletion is permanent

**Required Scope:** \`write:forms\`

**Deletion Scope:**
- **Root Form:** Deletes all versions (DRAFT, PUBLISHED, ARCHIVED)
- **Specific Version:** Deletes only that version

**Data Impact:**
- Form configuration is permanently deleted
- All versions deleted (if root form)
- Form submissions preserved but form reference removed
- Embedded forms break immediately
- Analytics data for form retained

**Important:**
- Remove form embeds from your website first
- Export form data if needed before deletion
- Cannot recover deleted forms
- Submissions are retained but disconnected from form
- Consider archiving instead of deleting for audit trails

**Warning:**
- Embedded forms will immediately stop working
- No confirmation step - deletion is instant
- All versions lost if deleting root form

**Note:** Form submissions are preserved for analytics but form definition is permanently removed.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Form deleted successfully. Returns the deleted form's ID for confirmation. If root form, all versions are permanently removed.",
            content: {
              "application/json": {
                schema: formDeleteResponseSchema,
                example: {
                  object: "form",
                  id: "form_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Form with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/forms/{formId}/versions": {
      get: {
        summary: "List Form Versions",
        description: `Retrieve all versions of a specific form.

**Use Cases:**
- View version history of a form
- List all versions for rollback selection
- Audit form changes over time
- Display version information in admin dashboard
- Compare versions before rollback

**Behavior:**
- Returns all versions for the specified root form
- Includes the root form itself (version 1)
- Versions are ordered by version number (ascending)
- Only works with root form IDs (parentId must be null)
- Returns error if formId is a version (not root form)
- Returns all statuses (DRAFT, PUBLISHED, ARCHIVED)

**Required Scope:** \`read:forms\`

**Response Fields:**
- **id:** Unique version identifier
- **name:** Form name
- **description:** Form description (optional)
- **status:** DRAFT, PUBLISHED, or ARCHIVED
- **version:** Version number (1, 2, 3, etc.)

**Version Status:**
- **DRAFT:** Can be edited, not published yet
- **PUBLISHED:** Currently live version
- **ARCHIVED:** Previous published version

**Note:** To get a specific form/version with full details including fields, use GET /v1/forms/{formId}`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Root form ID (must be a root form, not a version)",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved list of all form versions ordered by version number",
            content: {
              "application/json": { schema: formVersionListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Form with this ID does not exist, not a root form, or doesn't belong to your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Form Version",
        description: `Create a new version of an existing form for updates.

**Use Cases:**
- Update a published form without breaking the live version
- Test changes before deploying to production
- Create A/B test variants
- Roll back to previous versions
- Maintain form version history

**Behavior:**
- New version inherits all fields from parent if not provided
- Created in DRAFT status (can be edited)
- Parent can be root form or any existing version
- Only one DRAFT version allowed per root form
- All fields are optional (defaults to parent values)
- New version gets unique ID but shares root form lineage

**Required Scope:** \`write:forms\`

**Version Inheritance:**
- If no fields provided, copies all from parent
- Specify only fields you want to change
- Omitted fields default to parent values
- Creates independent copy (changes don't affect parent)

**Versioning Workflow:**
1. Published form is live on website
2. Create new version (inherits configuration)
3. Modify new DRAFT version as needed
4. Test new version
5. Publish new version
6. Previous published version becomes ARCHIVED
7. Form URL remains constant across versions

**Important:**
- Cannot create version if DRAFT already exists for this root form
- Only one DRAFT version per form family
- Publish or delete existing DRAFT before creating new version
- Versions share the same root form ID

**Note:** This enables zero-downtime form updates - edit in draft, test, then publish when ready.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID (can be root form or any version)",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateFormSchema },
          },
        },
        responses: {
          "201": {
            description:
              "Form version created successfully in DRAFT status. Returns new version with unique ID inheriting parent configuration.",
            content: {
              "application/json": { schema: formResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - A DRAFT version already exists for this form's root. Publish or delete the existing DRAFT before creating a new version.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Parent form with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values or form builder configuration",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/forms/{formId}/publish": {
      post: {
        summary: "Publish Form",
        description: `Publish a form to make it available for public use.

**Use Cases:**
- Make a draft form live on your website
- Deploy form updates to production
- Roll back to a previous version by publishing an archived version
- Release tested changes to users
- Activate new form configuration

**Behavior:**
- **First Publish:** Root form status changes to PUBLISHED
- **Subsequent Publishes:** Previous published version becomes ARCHIVED
- **Rollback:** Publish an archived version to revert changes
- Published forms are immutable - cannot be edited
- Form URL remains constant across versions
- Embedded forms automatically use newly published version
- PublishedAt timestamp is set
- Root form's publishedVersionId points to this version

**Required Scope:** \`write:forms\`

**Publishing Flow:**
1. Create form (DRAFT status)
2. Configure and test form
3. Publish form (becomes PUBLISHED)
4. **To Update:** Create new version → Edit → Publish
5. Previous version automatically becomes ARCHIVED
6. Form URL stays the same (version transparent to users)

**Version Management:**
- Only one PUBLISHED version exists at a time
- Publishing archives the current PUBLISHED version
- Can publish any version (DRAFT or ARCHIVED)
- Publishing ARCHIVED version = rollback
- Root form always tracks current PUBLISHED version

**Important:**
- Cannot publish already PUBLISHED forms (no-op)
- Previous published version auto-archived
- Embedded forms switch instantly to new version
- Test thoroughly before publishing
- Form becomes immutable after publishing

**Rollback Scenario:**
1. Form V1 is PUBLISHED
2. Create V2, publish it (V1 → ARCHIVED)
3. Issue found in V2
4. Publish V1 again (V2 → ARCHIVED, V1 → PUBLISHED)

**Note:** Publishing is instant and affects all embedded instances immediately.`,
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID to publish",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Form published successfully. Status changed to PUBLISHED, publishedAt timestamp set. Previous published version (if any) is now ARCHIVED. Form is now live and immutable.",
            content: {
              "application/json": { schema: formResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Form is already in PUBLISHED status. No action taken. To update, create a new version first.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:forms' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Form with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/emails/send": {
      post: {
        summary: "Send Transactional Email",
        description: `Send a transactional email to one or more recipients.

**Use Cases:**
- Order confirmation emails
- Password reset emails
- Account verification emails
- Payment receipts
- Shipping notifications
- Welcome emails
- Any one-off automated email

**Content Modes:**
You can send emails in two ways:

1. **Raw HTML Mode:** Provide \`html\` (required) and optionally \`text\` content directly
2. **Template Mode:** Reference a published template by its \`uniqueSlug\` identifier

These modes are mutually exclusive - provide either \`template\` or \`html\`, not both.

**Template-Based Sending:**
\`\`\`json
{
  "from": "noreply@yourdomain.com",
  "to": "customer@example.com",
  "template": {
    "id": "order_confirmation",
    "variables": {
      "firstName": "John",
      "orderNumber": "12345",
      "total": 99.99
    }
  }
}
\`\`\`

When using templates:
- The template must be published (have a \`publishedVersionId\`)
- Variables are substituted using \`{{variableName}}\` syntax
- Missing variables are replaced with empty strings
- Subject and previewText can be overridden by providing them in the request
- The \`text\` field cannot be used with templates (it comes from the template)

**Behavior:**
- Email is queued and sent asynchronously
- Returns immediately with the email send ID
- Delivery status is tracked via webhooks
- Supports HTML and plain text content
- Plain text is auto-generated from HTML if not provided
- Supports attachments (up to 25 files, 25MB total)
- Custom metadata can be attached for tracking

**Required Scope:** \`smtp:send\`

**Rate Limits:**
- 100 emails per minute per API key
- Maximum 10MB HTML content
- Maximum 25 attachments (total 25MB)

**Delivery Tracking:**
- Use the returned email ID to track delivery status
- Configure webhooks to receive delivery notifications
- Events: delivered, bounced, complained, opened, clicked

**Best Practices:**
- Always include a plain text version for accessibility
- Keep HTML under 100KB for best deliverability
- Use verified sending domains only
- Include unsubscribe links for marketing content`,
        tags: ["Transactional Emails"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: sendTransactionalEmailSchema,
              examples: {
                rawHtml: {
                  summary: "Raw HTML content",
                  description: "Send email with inline HTML content",
                  value: {
                    from: "noreply@yourdomain.com",
                    to: "customer@example.com",
                    subject: "Order Confirmation #12345",
                    html: "<h1>Thank you for your order!</h1><p>Your order #12345 has been confirmed.</p>",
                    text: "Thank you for your order! Your order #12345 has been confirmed.",
                    metadata: {
                      orderId: "12345",
                      customerId: "cust_abc123",
                    },
                  },
                },
                templateBased: {
                  summary: "Template-based content",
                  description: "Send email using a published template with variable substitution",
                  value: {
                    from: "noreply@yourdomain.com",
                    to: "customer@example.com",
                    template: {
                      id: "order_confirmation",
                      variables: {
                        firstName: "John",
                        orderNumber: "12345",
                        total: 99.99,
                      },
                    },
                    metadata: {
                      orderId: "12345",
                      customerId: "cust_abc123",
                    },
                  },
                },
                templateWithOverrides: {
                  summary: "Template with subject override",
                  description: "Send email using a template but override the subject line",
                  value: {
                    from: "noreply@yourdomain.com",
                    to: "customer@example.com",
                    subject: "Custom Subject Override",
                    previewText: "Custom preview text",
                    template: {
                      id: "welcome_email",
                      variables: {
                        firstName: "Jane",
                        companyName: "Acme Inc",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Email queued successfully. The email will be sent asynchronously. Use the returned ID to track delivery status via webhooks.",
            content: {
              "application/json": {
                schema: sendTransactionalEmailResponseSchema,
                example: {
                  object: "email",
                  id: "es_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as malformed email addresses, missing required fields, attachment size exceeded, template not published, or both template and html provided",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'smtp:send' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "403": {
            description:
              "Forbidden - Sending domain not verified, or sending limits exceeded",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Template with the specified identifier not found, or sending domain not found for the from address",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Email content validation failed (e.g., HTML too large, too many attachments)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "429": {
            description:
              "Rate Limit Exceeded - Too many emails sent. Wait before sending more.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/broadcasts/create-and-send": {
      post: {
        summary: "Create and Schedule Broadcast",
        description: `Create a broadcast with HTML content and schedule it for delivery to specified recipients.

**Use Cases:**
- Send marketing newsletters to a segment of contacts
- Announce product launches to specific topics
- Send promotional emails to a list of email addresses
- Trigger one-time campaigns with personalized variables per recipient

**Recipient Modes:**
Recipients can be specified in multiple ways (at least one is required):
- \`contacts\`: Array of contact IDs from your workspace
- \`emails\`: Array of email addresses (will upsert contacts automatically)
- \`segment\`: Segment ID to send to all contacts matching segment conditions
- \`topic\`: Topic ID to send to all subscribed contacts

**Per-Email Variables:**
The \`emails\` field supports two formats:

1. **Simple format (backward compatible):**
\`\`\`json
{
  "emails": ["user1@example.com", "user2@example.com"]
}
\`\`\`

2. **With variables:**
\`\`\`json
{
  "emails": [
    { "email": "user1@example.com", "variables": { "orderNumber": "12345", "discount": 20 } },
    { "email": "user2@example.com", "variables": { "orderNumber": "67890", "discount": 15 } }
  ]
}
\`\`\`

Variables can be used in email content with \`{{variableName}}\` syntax:
- \`{{orderNumber}}\` - Direct variable reference
- \`{{contact.orderNumber}}\` - Prefixed with contact (both work the same)

**Variable Priority (highest to lowest):**
1. Transient variables (per-email, from API request)
2. Contact properties (from database)
3. Built-in variables (email, firstName, lastName, URLs)

Transient variables override contact properties with the same name but are NOT saved to the contact record.

**Behavior:**
- Creates a new broadcast in QUEUED_FOR_SENDING status
- Email content is validated and stored
- Broadcast is scheduled for delivery at the specified sendAt time
- Recipients are resolved at send time (not at creation time)
- For \`emails\` mode, contacts are upserted (created if not existing)
- Sending domain must be verified before the broadcast can be sent

**Required Scope:** \`broadcasts:write\`

**Rate Limits:**
- 100 broadcasts per hour per workspace
- Maximum 100,000 recipients per broadcast

**Email Content:**
- Subject and HTML are required
- Plain text is auto-generated from HTML if not provided
- Preview text is optional but recommended for inbox preview
- Use {{variableName}} for personalization (first name, custom properties, etc.)

**Scheduling:**
- sendAt must be a future ISO 8601 datetime
- Broadcast will be processed at the scheduled time
- Cannot be modified after creation (create a new broadcast instead)

**Sandbox/Test Mode:**
For testing without sending real emails, use \`@kibamail.dev\` test addresses. These addresses simulate different delivery outcomes:

| Address | Simulated Outcome |
|---------|-------------------|
| \`delivered@kibamail.dev\` | Successful delivery |
| \`bounced@kibamail.dev\` | Hard bounce |
| \`softbounce@kibamail.dev\` | Soft bounce (transient failure) |
| \`complained@kibamail.dev\` | Spam complaint |
| \`failed@kibamail.dev\` | Permanent delivery failure |
| \`delayed@kibamail.dev\` | Delayed delivery (retries then succeeds) |
| \`opened@kibamail.dev\` | Delivered + opened |
| \`clicked@kibamail.dev\` | Delivered + opened + clicked |

**Sandbox features:**
- Add \`+label\` for tracking: \`delivered+campaign1@kibamail.dev\`
- Events are generated instantly (no actual email sent)
- \`sendAt\` can be any time (processed immediately)
- Cannot mix sandbox and real email addresses in the same broadcast
- Per-email variables work with sandbox addresses

**Best Practices:**
- Always test with a small segment first
- Use preview text for better inbox engagement
- Include unsubscribe links for compliance
- Verify sending domain before scheduling`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createAndSendBroadcastSchema,
              examples: {
                "simple-emails": {
                  summary: "Send to email addresses",
                  description: "Basic broadcast to a list of email addresses",
                  value: {
                    name: "January Newsletter",
                    from: "newsletter@yourdomain.com",
                    replyTo: "support@yourdomain.com",
                    emailContent: {
                      subject: "Our January Newsletter",
                      html: "<h1>Hello {{firstName}}!</h1><p>Welcome to our January newsletter.</p>",
                      previewText: "Check out what's new this month...",
                    },
                    recipients: {
                      emails: [
                        "user1@example.com",
                        "user2@example.com",
                        "user3@example.com",
                      ],
                    },
                    sendAt: "2024-01-15T10:00:00Z",
                  },
                },
                "with-variables": {
                  summary: "Send with per-email variables",
                  description: "Broadcast with custom variables for each recipient",
                  value: {
                    name: "Order Confirmation Campaign",
                    from: "orders@yourdomain.com",
                    emailContent: {
                      subject: "Your Order #{{orderNumber}} is confirmed!",
                      html: "<h1>Thank you, {{firstName}}!</h1><p>Your order #{{orderNumber}} totaling ${{orderTotal}} has been confirmed.</p><p>Expected delivery: {{deliveryDate}}</p>",
                      previewText: "Your order has been confirmed",
                    },
                    recipients: {
                      emails: [
                        {
                          email: "customer1@example.com",
                          variables: {
                            orderNumber: "ORD-12345",
                            orderTotal: 99.99,
                            deliveryDate: "January 20, 2024",
                          },
                        },
                        {
                          email: "customer2@example.com",
                          variables: {
                            orderNumber: "ORD-12346",
                            orderTotal: 149.50,
                            deliveryDate: "January 22, 2024",
                          },
                        },
                      ],
                    },
                    sendAt: "2024-01-15T14:00:00Z",
                  },
                },
                "to-segment": {
                  summary: "Send to a segment",
                  description: "Broadcast to all contacts in a segment",
                  value: {
                    name: "VIP Customer Promotion",
                    from: "promotions@yourdomain.com",
                    emailContent: {
                      subject: "Exclusive VIP Offer for {{firstName}}",
                      html: "<h1>Hi {{firstName}}!</h1><p>As a valued VIP customer, you get 25% off your next purchase!</p>",
                      previewText: "Your exclusive VIP discount awaits...",
                    },
                    recipients: {
                      segment: "seg_vip_customers_abc123",
                    },
                    sendAt: "2024-01-20T09:00:00Z",
                  },
                },
                "to-topic": {
                  summary: "Send to topic subscribers",
                  description: "Broadcast to all contacts subscribed to a topic",
                  value: {
                    name: "Product Updates",
                    from: "updates@yourdomain.com",
                    emailContent: {
                      subject: "New Features Released!",
                      html: "<h1>Hey {{firstName}}!</h1><p>Check out our latest features...</p>",
                      previewText: "See what's new in our product",
                    },
                    recipients: {
                      topic: "top_product_updates_xyz789",
                    },
                    sendAt: "2024-01-25T15:00:00Z",
                  },
                },
                "sandbox-testing": {
                  summary: "Test with sandbox addresses",
                  description:
                    "Use @kibamail.dev addresses to test different delivery outcomes without sending real emails",
                  value: {
                    name: "Test Broadcast - Multiple Outcomes",
                    from: "newsletter@yourdomain.com",
                    emailContent: {
                      subject: "Test Email for {{firstName}}",
                      html: "<h1>Hello {{firstName}}!</h1><p>This is a test broadcast to verify {{outcome}} behavior.</p>",
                      previewText: "Testing email delivery outcomes",
                    },
                    recipients: {
                      emails: [
                        {
                          email: "delivered@kibamail.dev",
                          variables: { firstName: "Delivered User", outcome: "successful delivery" },
                        },
                        {
                          email: "bounced+test1@kibamail.dev",
                          variables: { firstName: "Bounced User", outcome: "hard bounce" },
                        },
                        {
                          email: "opened@kibamail.dev",
                          variables: { firstName: "Engaged User", outcome: "open tracking" },
                        },
                        {
                          email: "clicked+cta@kibamail.dev",
                          variables: { firstName: "Clicking User", outcome: "click tracking" },
                        },
                        {
                          email: "complained@kibamail.dev",
                          variables: { firstName: "Complainant", outcome: "spam complaint" },
                        },
                      ],
                    },
                    sendAt: "2024-01-15T10:00:00Z",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Broadcast created and scheduled successfully. The broadcast will be sent at the specified sendAt time.",
            content: {
              "application/json": {
                schema: createAndSendBroadcastResponseSchema,
                example: {
                  object: "broadcast",
                  id: "brd_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as missing required fields, invalid email format, or sendAt in the past",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'broadcasts:write' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "403": {
            description:
              "Forbidden - Sending domain not verified, or broadcast limits exceeded",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Email content validation failed, no valid recipients found, or segment/topic does not exist",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "429": {
            description:
              "Rate Limit Exceeded - Too many broadcasts created. Wait before creating more.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
  },
});

writeFile("public/openapi.v1.json", JSON.stringify(document, null, 2));
