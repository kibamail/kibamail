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
  broadcastSendResponseSchema,
  broadcastSendListResponseSchema,
  broadcastStatsResponseSchema,
  createBroadcastSchema,
  updateBroadcastSchema,
  broadcastResponseSchema,
  broadcastListResponseSchema,
} from "@/app/(main)/api/v1/broadcasts/schema";
import {
  createSendingDomainSchema,
  updateSendingDomainSchema,
  sendingDomainResponseSchema,
  sendingDomainListResponseSchema,
  sendingDomainVerifyResponseSchema,
} from "@/app/(main)/api/v1/domains/schema";
import {
  createAutomationSchema,
  updateAutomationSchema,
  automationResponseSchema,
  automationListResponseSchema,
} from "@/app/(main)/api/v1/automations/schema";
import { createEventSchema } from "@/app/(main)/api/v1/events/schema";
import {
  updateConversationSchema,
  sendReplySchema,
} from "@/app/(main)/api/v1/inbox/schema";

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
 * Transactional email list item (inline schema — no schema file exists)
 */
const transactionalEmailListItemSchema = z.object({
  id: z.string().describe("Unique email identifier"),
  sendingId: z.string().describe("Internal sending ID for event correlation"),
  from: z.object({
    email: z.string().describe("Sender email address"),
    name: z.string().nullable().describe("Sender display name"),
  }),
  to: z.string().describe("Recipient email address"),
  subject: z.string().describe("Email subject line"),
  status: z.string().describe("Delivery status (queued, sending, sent, delivered, bounced, complained, failed)"),
  openCount: z.number().describe("Total number of opens"),
  clickCount: z.number().describe("Total number of clicks"),
  createdAt: z.string().describe("ISO 8601 timestamp when the email was created"),
  sentAt: z.string().nullable().describe("ISO 8601 timestamp when the email was sent"),
  deliveredAt: z.string().nullable().describe("ISO 8601 timestamp when the email was delivered"),
  firstOpenedAt: z.string().nullable().describe("ISO 8601 timestamp of first open"),
  firstClickedAt: z.string().nullable().describe("ISO 8601 timestamp of first click"),
  bouncedAt: z.string().nullable().describe("ISO 8601 timestamp when the email bounced"),
});

/**
 * Transactional email list response
 */
const transactionalEmailListResponseSchema = z.object({
  object: z.literal("transactional_email_list"),
  hasMore: z.boolean(),
  data: z.array(transactionalEmailListItemSchema),
});

/**
 * Transactional email detail response
 */
const transactionalEmailDetailSchema = z.object({
  object: z.literal("transactional_email"),
  id: z.string().describe("Unique email identifier"),
  sendingId: z.string().describe("Internal sending ID for event correlation"),
  from: z.object({
    email: z.string().describe("Sender email address"),
    name: z.string().nullable().describe("Sender display name"),
  }),
  replyTo: z.object({
    email: z.string(),
    name: z.string().nullable(),
  }).nullable().describe("Reply-to address if set"),
  to: z.string().describe("Recipient email address"),
  subject: z.string().describe("Email subject line"),
  previewText: z.string().nullable().describe("Preview text shown in inbox"),
  status: z.string().describe("Delivery status"),
  lastResponseCode: z.number().nullable().describe("Last SMTP response code"),
  lastResponseMessage: z.string().nullable().describe("Last SMTP response message"),
  bounceClassification: z.string().nullable().describe("Bounce type classification if bounced"),
  openTrackingEnabled: z.boolean().describe("Whether open tracking is enabled"),
  clickTrackingEnabled: z.boolean().describe("Whether click tracking is enabled"),
  metadata: z.record(z.string(), z.unknown()).nullable().describe("Custom metadata attached to the email"),
  tags: z.array(z.string()).nullable().describe("Tags attached to the email"),
  openCount: z.number().describe("Total number of opens"),
  clickCount: z.number().describe("Total number of clicks"),
  uniqueLinksClicked: z.number().describe("Number of unique links clicked"),
  totalEvents: z.number().describe("Total number of events for this email"),
  createdAt: z.string().describe("ISO 8601 timestamp when the email was created"),
  sentAt: z.string().nullable().describe("ISO 8601 timestamp when the email was sent"),
  deliveredAt: z.string().nullable().describe("ISO 8601 timestamp when delivered"),
  firstOpenedAt: z.string().nullable().describe("ISO 8601 timestamp of first open"),
  firstClickedAt: z.string().nullable().describe("ISO 8601 timestamp of first click"),
  bouncedAt: z.string().nullable().describe("ISO 8601 timestamp when bounced"),
  complainedAt: z.string().nullable().describe("ISO 8601 timestamp when spam complaint received"),
});

/**
 * Transactional email event schema
 */
const transactionalEmailEventSchema = z.object({
  id: z.string().describe("Unique event identifier"),
  type: z.string().describe("Event type (e.g., SENT, DELIVERED, OPENED, CLICKED, BOUNCED, COMPLAINED)"),
  timestamp: z.string().describe("ISO 8601 timestamp of the event"),
  response: z.object({
    code: z.number().describe("SMTP response code"),
    content: z.string().nullable().describe("SMTP response content"),
    command: z.string().nullable().describe("SMTP command that triggered the response"),
  }).nullable().describe("SMTP response details if applicable"),
  bounceClassification: z.string().nullable().describe("Bounce classification if this is a bounce event"),
  origin: z.object({
    country: z.string().nullable().describe("Country of origin"),
    city: z.string().nullable().describe("City of origin"),
    device: z.string().nullable().describe("Device type"),
    browser: z.string().nullable().describe("Browser name"),
  }).nullable().describe("Geographic and device origin for open/click events"),
  server: z.string().nullable().describe("Receiving mail server name"),
});

/**
 * Transactional email events response
 */
const transactionalEmailEventsResponseSchema = z.object({
  object: z.literal("event_list"),
  emailId: z.string().describe("ID of the email these events belong to"),
  sendingId: z.string().describe("Sending ID for correlation"),
  events: z.array(transactionalEmailEventSchema),
});

/**
 * Transactional email content response
 */
const transactionalEmailContentResponseSchema = z.object({
  object: z.literal("email_content"),
  html: z.string().nullable().describe("HTML content of the email"),
  text: z.string().nullable().describe("Plain text content of the email"),
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
    {
      name: "Sending Domains",
      description: "Add, verify, and manage sending domains for email delivery",
    },
    {
      name: "Automations",
      description: "Create and manage automated email workflows triggered by contact behavior",
    },
    {
      name: "Events",
      description: "Fire custom events to trigger automations",
    },
    {
      name: "Inbox",
      description: "Manage conversations, replies, and inbox statistics",
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
        description: `Create a new form for lead capture and contact collection.

**Behavior:**
- Form is created in DRAFT status (not yet public)
- Content (HTML) is uploaded separately via the deploy endpoint
- Form must be deployed and published to accept submissions

**Required Scope:** \`write:forms\`

**Request Body:**
- **name:** Internal form name for identification
- **fieldMapping:** Maps form input field names to contact properties
- **description:** Form purpose/instructions (optional)
- **settings:** Behavioral settings like success action, double opt-in (optional)

**Form Lifecycle:**
1. Create form with name + fieldMapping (DRAFT status)
2. Deploy site bundle via POST /v1/forms/{formId}/deploy (HTML + CSS + JS + assets)
3. Publish form (PUBLISHED status)
4. Form is live at /p/forms/{formId}
5. Create versions for updates, deploy new content, publish

**Note:** Forms in DRAFT status cannot receive public submissions. Deploy content and publish to make the form live.`,
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
              "Bad Request - Invalid spec, fieldMapping, or malformed input",
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
              "Validation Error - Invalid field values, missing required fields, or invalid form configuration",
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
- Includes complete form configuration
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
- Update fieldMapping (contact property mappings)
- Update the fieldMapping (contact property mappings)
- Update form name, description, or settings
- Configure SEO metadata

**Behavior:**
- Only DRAFT forms can be updated
- PUBLISHED and ARCHIVED forms are immutable
- To update published forms, create a new version first
- All fields are optional (partial updates supported)
- If fieldMapping changes and form has deployed HTML, cross-validation runs automatically

**Required Scope:** \`write:forms\`

**Updatable Fields (DRAFT only):**
- name (internal identifier)
- description (form purpose)
- fieldMapping (field name to contact property mapping)
- settings (success action, double opt-in)
- SEO fields (seoTitle, seoDescription, seoImageUrl, seoFaviconUrl, slug)

**Update Workflow for Published Forms:**
1. Create new version: POST /v1/forms/{formId}/versions
2. Update the new DRAFT version: PUT /v1/forms/{newVersionId}
3. Publish the updated version: POST /v1/forms/{newVersionId}/publish
4. Previous published version automatically becomes ARCHIVED

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
              "Validation Error - Invalid form configuration or field values",
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
              "Validation Error - Invalid field values or form configuration",
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
    "/v1/broadcasts/{broadcastId}/sends": {
      get: {
        summary: "List Broadcast Sends",
        description: `Retrieve a paginated list of individual email sends for a specific broadcast.

**Use Cases:**
- Monitor delivery status for each recipient
- Debug delivery issues for specific recipients
- Export send data for reporting
- Track engagement at the recipient level

**Response Data:**
Each send includes:
- Delivery status (QUEUED, SENDING, DELIVERED, BOUNCED, COMPLAINED, FAILED)
- Timestamps (queuedAt, sentAt, deliveredAt, firstOpenedAt, firstClickedAt, bouncedAt, complainedAt)
- Engagement metrics (openCount, clickCount, uniqueLinksClicked)
- Bounce details (bounceClassification, lastResponseCode, lastResponseMessage)

**Filtering:**
Use the \`status\` query parameter to filter by delivery status:
- \`QUEUED\` - Waiting to be sent
- \`SENDING\` - Currently being sent
- \`DELIVERED\` - Successfully delivered
- \`BOUNCED\` - Delivery failed (hard or soft bounce)
- \`COMPLAINED\` - Recipient marked as spam
- \`FAILED\` - Permanent delivery failure

**Data Retention:**
Send details are retained for 60 days after broadcast completion. After this period, individual send records are pruned but aggregate statistics remain available via the /stats endpoint.

**Required Scope:** \`read:broadcasts\``,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Unique identifier for the broadcast",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "status",
            in: "query",
            description: "Filter sends by delivery status",
            required: false,
            schema: {
              type: "string",
              enum: ["QUEUED", "SENDING", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"],
            },
          },
          ...paginationParameters,
        ],
        responses: {
          "200": {
            description: "List of broadcast sends retrieved successfully",
            content: {
              "application/json": {
                schema: broadcastSendListResponseSchema,
                example: {
                  object: "broadcast_send_list",
                  data: [
                    {
                      id: "bs_abc123",
                      email: "user@example.com",
                      contactId: "ct_xyz789",
                      status: "DELIVERED",
                      queuedAt: "2024-01-15T10:00:00Z",
                      sentAt: "2024-01-15T10:00:05Z",
                      deliveredAt: "2024-01-15T10:00:10Z",
                      firstOpenedAt: "2024-01-15T11:30:00Z",
                      firstClickedAt: "2024-01-15T11:35:00Z",
                      bouncedAt: null,
                      complainedAt: null,
                      openCount: 3,
                      clickCount: 2,
                      uniqueLinksClicked: 1,
                      bounceClassification: null,
                      lastResponseCode: 250,
                      lastResponseMessage: "OK",
                    },
                  ],
                  hasMore: true,
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Broadcast details have been pruned (older than 60 days). Use /stats endpoint for aggregate data.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description: "Not Found - Broadcast does not exist or does not belong to this workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/broadcasts/{broadcastId}/stats": {
      get: {
        summary: "Get Broadcast Statistics",
        description: `Retrieve aggregate statistics and performance metrics for a specific broadcast.

**Use Cases:**
- Monitor broadcast performance in real-time
- Generate campaign reports
- Track deliverability and engagement metrics
- Compare broadcast performance over time

**Statistics Included:**

**Recipients:**
- \`total\` - Total recipients queued for this broadcast
- \`queued\` - Recipients still waiting to be sent
- \`sent\` - Recipients where email was sent to MTA
- \`delivered\` - Successfully delivered emails
- \`bounced\` - Bounced emails (hard and soft)
- \`complained\` - Spam complaints received
- \`failed\` - Permanent delivery failures
- \`unsubscribed\` - Recipients who unsubscribed from this broadcast

**Engagement Metrics:**
- \`opened\` - Total unique opens
- \`clicked\` - Total unique clicks
- \`openRate\` - Percentage of delivered emails that were opened (0-1)
- \`clickRate\` - Percentage of delivered emails that were clicked (0-1)
- \`clickToOpenRate\` - Percentage of opened emails that were clicked (0-1)

**Deliverability Metrics:**
- \`deliveryRate\` - Percentage of sent emails that were delivered (0-1)
- \`bounceRate\` - Percentage of sent emails that bounced (0-1)
- \`complaintRate\` - Percentage of delivered emails that received complaints (0-1)

**Data Availability:**
The \`detailsPruned\` flag indicates whether individual send records are still available:
- \`false\` - Full send details available via /sends endpoint
- \`true\` - Send details pruned (after 60 days), only aggregate stats remain

**Required Scope:** \`read:broadcasts\``,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Unique identifier for the broadcast",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Broadcast statistics retrieved successfully",
            content: {
              "application/json": {
                schema: broadcastStatsResponseSchema,
                example: {
                  object: "broadcast_stats",
                  broadcastId: "brd_abc123xyz789",
                  recipients: {
                    total: 10000,
                    queued: 0,
                    sent: 10000,
                    delivered: 9500,
                    bounced: 300,
                    complained: 50,
                    failed: 150,
                    unsubscribed: 25,
                  },
                  engagement: {
                    opened: 4000,
                    clicked: 1200,
                    openRate: 0.4211,
                    clickRate: 0.1263,
                    clickToOpenRate: 0.3,
                  },
                  deliverability: {
                    deliveryRate: 0.95,
                    bounceRate: 0.03,
                    complaintRate: 0.0053,
                  },
                  detailsPruned: false,
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description: "Not Found - Broadcast does not exist or does not belong to this workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/domains": {
      get: {
        summary: "List Sending Domains",
        description: `Retrieve a paginated list of all sending domains in your workspace.

**Use Cases:**
- View all configured sending domains
- Check verification status for each domain
- Monitor DNS configuration and SSL status
- Audit domain settings before launching campaigns
- Sync domain configuration with your infrastructure

**Behavior:**
- Returns all sending domains for the workspace
- Includes DNS records needed for configuration
- Shows verification status for DKIM, return path, and tracking
- Includes SSL issuance status
- Uses cursor-based pagination

**Required Scope:** \`read:domains\`

**Response Includes:**
- Domain name and ID
- DKIM, return path, and tracking verification status
- Open and click tracking settings
- Required DNS records for setup
- SSL status and any errors
- Creation timestamp`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of sending domains with DNS records and verification status",
            content: {
              "application/json": {
                schema: sendingDomainListResponseSchema,
                example: {
                  object: "sending_domain_list",
                  hasMore: false,
                  data: [
                    {
                      id: "dom_abc123xyz789",
                      name: "mail.example.com",
                      dkimVerified: true,
                      returnPathVerified: true,
                      trackingVerified: false,
                      openTrackingEnabled: true,
                      clickTrackingEnabled: true,
                      dnsRecords: {
                        dkim: {
                          type: "TXT",
                          hostname: "kiba._domainkey.mail.example.com",
                          value: "v=DKIM1; k=rsa; p=MIGfMA0...",
                        },
                        returnPath: {
                          type: "CNAME",
                          hostname: "kb.mail.example.com",
                          value: "rp.kibamail.com",
                        },
                        tracking: {
                          type: "CNAME",
                          hostname: "track.mail.example.com",
                          value: "t.kibamail.com",
                        },
                      },
                      createdAt: "2024-01-15T10:30:00Z",
                      sslStatus: "completed",
                      sslError: null,
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Add Sending Domain",
        description: `Add a new sending domain to your workspace.

**Use Cases:**
- Configure a custom sending domain for branded emails
- Add multiple domains for different business units
- Set up a domain for transactional email delivery
- Register a domain before DNS verification

**Behavior:**
- Domain name is validated for correct format
- DNS records are generated automatically for setup
- Domain is created in unverified state
- DKIM key pair is generated for the domain
- You must configure DNS records before the domain can be used
- Returns the domain with required DNS records to configure

**Required Scope:** \`write:domains\`

**After Creation:**
1. Add the returned DNS records to your domain's DNS configuration
2. Call POST /v1/domains/{domainId}/verify to check DNS propagation
3. Once verified, the domain can be used for sending emails

**DNS Records Required:**
- **DKIM:** TXT record for email authentication
- **Return Path:** CNAME record for bounce handling
- **Tracking:** CNAME record for open/click tracking

**Note:** DNS propagation can take up to 48 hours. Use the verify endpoint to check status.`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createSendingDomainSchema,
              example: {
                name: "mail.example.com",
                dmarcEnabled: false,
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Sending domain created successfully. Returns the domain with DNS records to configure.",
            content: {
              "application/json": {
                schema: sendingDomainResponseSchema,
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid domain name format or missing required fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - A sending domain with this name already exists in the workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Domain name validation failed (invalid format, too long, etc.)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/domains/{domainId}": {
      get: {
        summary: "Get Sending Domain",
        description: `Retrieve a specific sending domain by ID with full details.

**Use Cases:**
- Check verification status and DNS records for a domain
- View tracking and SSL configuration
- Retrieve DNS records needed for setup
- Verify domain readiness before sending

**Behavior:**
- Returns complete domain object with DNS records
- Includes verification status for all DNS records
- Shows SSL issuance status
- Domain must belong to your workspace

**Required Scope:** \`read:domains\`

**Response Includes:**
- Domain name and ID
- Verification status for DKIM, return path, and tracking
- Tracking settings (open and click tracking)
- Required DNS records with hostnames and values
- SSL status and error details`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "domainId",
            in: "path",
            description: "Sending domain ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved sending domain with DNS records and verification status",
            content: {
              "application/json": { schema: sendingDomainResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Sending domain with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Sending Domain",
        description: `Update settings for an existing sending domain.

**Use Cases:**
- Enable or disable open tracking
- Enable or disable click tracking
- Toggle DMARC enforcement
- Adjust tracking settings after initial setup

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Domain name cannot be changed (create a new domain instead)
- DNS records are not affected by updates
- Returns the complete updated domain object

**Required Scope:** \`update:domains\`

**Updatable Fields:**
- **openTrackingEnabled:** Track email opens via invisible pixel
- **clickTrackingEnabled:** Track link clicks via redirect URLs
- **dmarcEnabled:** Enable DMARC alignment for the domain

**Note:** Changing tracking settings takes effect for new emails only. Existing sent emails are not affected.`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "domainId",
            in: "path",
            description: "Sending domain ID",
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
              schema: updateSendingDomainSchema,
              example: {
                openTrackingEnabled: true,
                clickTrackingEnabled: true,
                dmarcEnabled: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Sending domain updated successfully with refreshed settings",
            content: {
              "application/json": { schema: sendingDomainResponseSchema },
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
              "Unauthorized - Invalid or missing API key, or API key lacks 'update:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Sending domain with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Sending Domain",
        description: `Delete a sending domain permanently.

**Use Cases:**
- Remove unused or deprecated sending domains
- Clean up domains after migration
- Delete misconfigured domains
- Remove domains no longer in use

**Behavior:**
- Domain is permanently deleted from the workspace
- DNS records become orphaned (clean them up manually)
- Cannot be undone - domain must be re-added if needed
- Emails already sent from this domain are not affected
- Active broadcasts using this domain may fail

**Required Scope:** \`delete:domains\`

**Data Impact:**
- Domain configuration is permanently removed
- DKIM key pair is deleted
- DNS records in your DNS provider are NOT removed (clean up manually)
- Historical email data referencing this domain is preserved

**Important:**
- Ensure no active broadcasts or automations use this domain
- Remove DNS records from your DNS provider after deletion
- Email delivery for in-flight messages may be affected`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "domainId",
            in: "path",
            description: "Sending domain ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Sending domain deleted successfully. Returns the deleted domain's ID for confirmation.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("sending_domain"),
                  id: z.string(),
                }),
                example: {
                  object: "sending_domain",
                  id: "dom_abc123xyz789",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'delete:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Sending domain with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/domains/{domainId}/verify": {
      post: {
        summary: "Verify Sending Domain",
        description: `Verify DNS configuration for a sending domain.

**Use Cases:**
- Check if DNS records have been configured correctly
- Verify domain readiness after DNS propagation
- Diagnose DNS configuration issues
- Re-verify after making DNS changes
- Confirm domain is ready for email sending

**Behavior:**
- Performs live DNS lookups for all required records
- Checks DKIM, return path, tracking, and optionally DMARC records
- Updates domain verification status based on results
- Returns detailed verification results for each record
- Triggers SSL certificate issuance when tracking is verified
- Can be called multiple times (idempotent)

**Required Scope:** \`update:domains\`

**Verification Checks:**
- **DKIM:** Verifies TXT record for email authentication
- **Return Path:** Verifies CNAME record for bounce handling
- **Tracking:** Verifies CNAME record for open/click tracking
- **DMARC:** Verifies DMARC policy record (if enabled)
- **MX:** Optionally checks MX records

**Response Includes:**
- Updated domain details with current verification status
- Per-record verification results (configured, expected value, found values)
- Overall allVerified flag

**Note:** DNS propagation can take up to 48 hours. If verification fails, wait and retry.`,
        tags: ["Sending Domains"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "domainId",
            in: "path",
            description: "Sending domain ID to verify",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Verification completed. Returns domain details with per-record verification results.",
            content: {
              "application/json": {
                schema: sendingDomainVerifyResponseSchema,
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'update:domains' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Sending domain with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/broadcasts": {
      get: {
        summary: "List Broadcasts",
        description: `Retrieve a paginated list of all broadcasts in your workspace.

**Use Cases:**
- View all broadcasts and their statuses
- Monitor campaign progress
- Build broadcast management dashboards
- Audit past broadcast campaigns
- Track scheduled broadcasts

**Behavior:**
- Returns broadcasts in reverse chronological order (newest first)
- Uses cursor-based pagination for efficient retrieval
- Includes broadcast metadata, status, and email content summary
- Maximum 100 broadcasts per request
- Includes all statuses (DRAFT, QUEUED_FOR_SENDING, SENDING, SENT, etc.)

**Required Scope:** \`read:broadcasts\`

**Response Includes:**
- Broadcast ID, name, and status
- Sender address and reply-to
- Email content (subject, preview text, HTML, text)
- Topic and segment associations
- Scheduled send time
- Creation timestamp`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of broadcasts with metadata and content",
            content: {
              "application/json": {
                schema: broadcastListResponseSchema,
                example: {
                  object: "broadcast_list",
                  hasMore: false,
                  data: [
                    {
                      id: "brd_abc123xyz789",
                      name: "January Newsletter",
                      status: "SENT",
                      from: "newsletter@yourdomain.com",
                      emailContent: {
                        subject: "Our January Newsletter",
                        text: "Hello! Welcome to our January newsletter.",
                        html: "<h1>Hello!</h1><p>Welcome to our January newsletter.</p>",
                        previewText: "Check out what's new this month...",
                        json: null,
                        styles: null,
                      },
                      replyTo: "support@yourdomain.com",
                      topicId: null,
                      segmentId: "seg_vip_abc123",
                      sendAt: "2024-01-15T10:00:00Z",
                      createdAt: "2024-01-10T08:30:00Z",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Broadcast",
        description: `Create a new broadcast draft in your workspace.

**Use Cases:**
- Create a broadcast for later editing and scheduling
- Set up a campaign with initial settings
- Prepare a broadcast before adding email content
- Create broadcasts programmatically for workflows

**Behavior:**
- Creates a broadcast in DRAFT status
- Email content fields are optional at creation
- From address is validated if provided
- Topic and segment associations are optional
- Returns the complete broadcast object with generated ID
- Broadcast can be edited and scheduled later

**Required Scope:** \`write:broadcasts\`

**Fields:**
- **name** (required): Broadcast name for identification
- **from:** Sender email address (must be from verified domain)
- **emailContent:** Subject, HTML, text, preview text, and editor content
- **replyTo:** Reply-to email address
- **topicId:** Associate with a topic for subscription management
- **segmentId:** Target a specific segment of contacts

**Next Steps After Creation:**
1. Update broadcast with email content via PUT /v1/broadcasts/{broadcastId}
2. Schedule send time via PUT /v1/broadcasts/{broadcastId}
3. Send the broadcast via POST /v1/broadcasts/{broadcastId}/send`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createBroadcastSchema,
              example: {
                name: "February Newsletter",
                from: "newsletter@yourdomain.com",
                replyTo: "support@yourdomain.com",
                emailContent: {
                  subject: "Our February Newsletter",
                  html: "<h1>Hello {{firstName}}!</h1><p>Welcome to our February newsletter.</p>",
                  previewText: "See what's new this month...",
                },
                topicId: "top_newsletter_abc123",
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Broadcast created successfully in DRAFT status. Returns the complete broadcast object.",
            content: {
              "application/json": { schema: broadcastResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as invalid email format or missing required fields",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as name too long or invalid email format",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/broadcasts/{broadcastId}": {
      get: {
        summary: "Get Broadcast",
        description: `Retrieve a specific broadcast by ID with full details.

**Use Cases:**
- View broadcast configuration before sending
- Check broadcast status and content
- Retrieve broadcast details for display in your application
- Verify broadcast settings before triggering send

**Behavior:**
- Returns complete broadcast object with all fields
- Includes email content (subject, HTML, text, preview text)
- Shows current status and send schedule
- Broadcast must belong to your workspace

**Required Scope:** \`read:broadcasts\`

**Response Includes:**
- Broadcast ID, name, and current status
- Sender address and reply-to
- Full email content
- Topic and segment associations
- Scheduled send time
- Creation timestamp`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Broadcast ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved broadcast with full details and email content",
            content: {
              "application/json": { schema: broadcastResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Broadcast with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Broadcast",
        description: `Update an existing broadcast's settings and email content.

**Use Cases:**
- Add or modify email content (subject, HTML, text)
- Change sender address or reply-to
- Update topic or segment targeting
- Schedule or reschedule send time
- Toggle open and click tracking

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Only DRAFT or QUEUED broadcasts can be updated
- Email content can be set or cleared
- Send time can be set or removed
- Returns the complete updated broadcast object

**Required Scope:** \`write:broadcasts\`

**Updatable Fields:**
- **name:** Broadcast display name
- **from:** Sender email address
- **emailContent:** Subject, HTML, text, preview text, editor content
- **replyTo:** Reply-to email address
- **topicId:** Topic association (set to null to remove)
- **segmentId:** Segment targeting (set to null to remove)
- **sendAt:** Scheduled send time (ISO 8601)
- **trackClicks:** Enable/disable click tracking
- **trackOpens:** Enable/disable open tracking

**Note:** Cannot update broadcasts that have already been sent or are currently sending.`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Broadcast ID",
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
              schema: updateBroadcastSchema,
              example: {
                emailContent: {
                  subject: "Updated Subject Line",
                  html: "<h1>Hello {{firstName}}!</h1><p>Updated content.</p>",
                  previewText: "Updated preview text...",
                },
                sendAt: "2024-02-15T10:00:00Z",
                trackOpens: true,
                trackClicks: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Broadcast updated successfully with refreshed settings",
            content: {
              "application/json": { schema: broadcastResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Cannot update broadcast in current status (only DRAFT or QUEUED broadcasts can be updated)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Broadcast with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as invalid email format or name too long",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Broadcast",
        description: `Delete a broadcast permanently.

**Use Cases:**
- Remove draft broadcasts that are no longer needed
- Delete queued broadcasts before they are sent
- Clean up test broadcasts
- Remove accidentally created broadcasts

**Behavior:**
- Only DRAFT or QUEUED broadcasts can be deleted
- Broadcast is permanently removed from the workspace
- Cannot delete broadcasts that have been sent or are sending
- Returns the deleted broadcast's ID for confirmation

**Required Scope:** \`write:broadcasts\`

**Restrictions:**
- Cannot delete broadcasts in SENDING status
- Cannot delete broadcasts in SENT status
- Cannot delete broadcasts in COMPLETED status

**Important:**
- Deletion is permanent and cannot be undone
- If you need to cancel a queued broadcast, delete it before the scheduled send time`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Broadcast ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Broadcast deleted successfully. Returns the deleted broadcast's ID for confirmation.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("broadcast"),
                  id: z.string(),
                }),
                example: {
                  object: "broadcast",
                  id: "brd_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Cannot delete broadcast in current status (only DRAFT or QUEUED broadcasts can be deleted)",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Broadcast with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/broadcasts/{broadcastId}/send": {
      post: {
        summary: "Send Broadcast",
        description: `Schedule an existing broadcast for sending.

**Use Cases:**
- Send a fully prepared broadcast
- Trigger delivery of a queued broadcast
- Initiate campaign delivery after review

**Behavior:**
- Performs readiness checks before scheduling
- Verifies email content is complete (subject, HTML)
- Verifies sending domain is configured and verified
- Checks that send time is set
- Queues the broadcast for delivery at the scheduled time
- Broadcast status transitions to QUEUED_FOR_SENDING
- Triggers a broadcast.scheduled webhook event

**Required Scope:** \`write:broadcasts\`

**Prerequisites:**
- Broadcast must be in DRAFT status
- Email content must include subject and HTML
- Sending domain must be verified
- Send time (sendAt) must be set on the broadcast

**Readiness Checks:**
The endpoint validates the following before scheduling:
1. Email subject is present
2. HTML content is present
3. From address is set and domain is verified
4. Send time is configured

If any check fails, a 400 error is returned with details about what is missing.

**Note:** The broadcast is processed approximately 5 minutes before the scheduled send time to allow for recipient resolution and batching.`,
        tags: ["Broadcasts"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "broadcastId",
            in: "path",
            description: "Broadcast ID to send",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Broadcast scheduled for sending successfully. Returns the updated broadcast with QUEUED_FOR_SENDING status.",
            content: {
              "application/json": { schema: broadcastResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Broadcast is not ready to send. Missing required fields (subject, HTML, from address, send time) or sending domain is not verified.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:broadcasts' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Broadcast with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/emails": {
      get: {
        summary: "List Transactional Emails",
        description: `Retrieve a paginated list of transactional emails sent from your workspace.

**Use Cases:**
- Monitor transactional email delivery status
- Search for specific emails by recipient or subject
- Filter emails by status or date range
- Build email activity dashboards
- Debug delivery issues for specific recipients

**Behavior:**
- Returns emails in reverse chronological order (newest first)
- Uses cursor-based pagination for efficient retrieval
- Supports filtering by status, recipient, subject, and date range
- Maximum 100 emails per request
- Includes delivery tracking metadata (opens, clicks, bounces)

**Required Scope:** \`smtp:send\`

**Filtering:**
- **status:** Filter by delivery status (queued, sending, sent, delivered, bounced, complained, failed)
- **to:** Search by recipient email (case-insensitive partial match)
- **subject:** Search by subject line (case-insensitive partial match)
- **from_date:** Filter emails created on or after this date (ISO 8601)
- **to_date:** Filter emails created on or before this date (ISO 8601)

**Response Includes:**
- Email ID and sending ID
- Sender and recipient information
- Subject and delivery status
- Open and click counts
- Delivery lifecycle timestamps`,
        tags: ["Transactional Emails"],
        security: [{ BearerAuth: [] }],
        parameters: [
          ...paginationParameters,
          {
            name: "status",
            in: "query" as const,
            description: "Filter by delivery status (e.g., delivered, bounced, complained)",
            required: false,
            schema: {
              type: "string" as const,
              enum: ["QUEUED", "SENDING", "SENT", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"],
            },
          },
          {
            name: "to",
            in: "query" as const,
            description: "Filter by recipient email address (case-insensitive partial match)",
            required: false,
            schema: {
              type: "string" as const,
            },
          },
          {
            name: "subject",
            in: "query" as const,
            description: "Filter by subject line (case-insensitive partial match)",
            required: false,
            schema: {
              type: "string" as const,
            },
          },
          {
            name: "from_date",
            in: "query" as const,
            description: "Filter emails created on or after this date (ISO 8601 format)",
            required: false,
            schema: {
              type: "string" as const,
              format: "date-time",
            },
          },
          {
            name: "to_date",
            in: "query" as const,
            description: "Filter emails created on or before this date (ISO 8601 format)",
            required: false,
            schema: {
              type: "string" as const,
              format: "date-time",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of transactional emails with delivery metadata",
            content: {
              "application/json": {
                schema: transactionalEmailListResponseSchema,
                example: {
                  object: "transactional_email_list",
                  hasMore: true,
                  data: [
                    {
                      id: "email_abc123xyz789",
                      sendingId: "snd_def456uvw012",
                      from: {
                        email: "noreply@yourdomain.com",
                        name: "Your App",
                      },
                      to: "customer@example.com",
                      subject: "Your order has been confirmed",
                      status: "delivered",
                      openCount: 2,
                      clickCount: 1,
                      createdAt: "2024-01-15T10:30:00Z",
                      sentAt: "2024-01-15T10:30:05Z",
                      deliveredAt: "2024-01-15T10:30:08Z",
                      firstOpenedAt: "2024-01-15T11:00:00Z",
                      firstClickedAt: "2024-01-15T11:05:00Z",
                      bouncedAt: null,
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'smtp:send' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/emails/{emailId}": {
      get: {
        summary: "Get Transactional Email",
        description: `Retrieve a specific transactional email by ID with full details.

**Use Cases:**
- View complete email metadata and tracking data
- Debug delivery issues for a specific email
- Check open/click tracking configuration
- Retrieve custom metadata and tags attached to the email
- Monitor email lifecycle (sent, delivered, opened, clicked, bounced)

**Behavior:**
- Returns complete email object with all metadata
- Includes reply-to, preview text, and tracking configuration
- Shows SMTP response details (last response code and message)
- Includes custom metadata and tags if attached
- Shows bounce classification if email bounced
- Email must belong to your workspace

**Required Scope:** \`smtp:send\`

**Response Includes:**
- Full sender and recipient details (from, to, replyTo)
- Email content metadata (subject, preview text)
- Delivery status and SMTP response details
- Tracking configuration (open and click tracking)
- Engagement metrics (open count, click count, unique links clicked)
- Complete delivery lifecycle timestamps
- Custom metadata and tags`,
        tags: ["Transactional Emails"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "emailId",
            in: "path",
            description: "Transactional email ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved transactional email with full details and tracking data",
            content: {
              "application/json": { schema: transactionalEmailDetailSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'smtp:send' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Email with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/emails/{emailId}/events": {
      get: {
        summary: "Get Transactional Email Events",
        description: `Retrieve the event timeline for a specific transactional email.

**Use Cases:**
- View the complete delivery lifecycle of an email
- Debug delivery issues by examining SMTP responses
- Track engagement events (opens, clicks) with geographic data
- Investigate bounce reasons and classifications
- Build detailed email activity logs

**Behavior:**
- Returns all events in chronological order (oldest first)
- Events include SMTP response details where applicable
- Open and click events include geographic and device information
- Bounce events include classification details
- Email must belong to your workspace

**Required Scope:** \`smtp:send\`

**Event Types:**
- **SENT:** Email accepted by the sending server
- **DELIVERED:** Email accepted by the recipient's mail server
- **OPENED:** Recipient opened the email (open tracking required)
- **CLICKED:** Recipient clicked a link (click tracking required)
- **BOUNCED:** Email was rejected or bounced
- **COMPLAINED:** Recipient marked email as spam

**Response Includes:**
- Event ID, type, and timestamp
- SMTP response details (code, content, command)
- Bounce classification for bounce events
- Geographic origin (country, city) for open/click events
- Device and browser information for open/click events
- Receiving mail server name`,
        tags: ["Transactional Emails"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "emailId",
            in: "path",
            description: "Transactional email ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved event timeline for the transactional email",
            content: {
              "application/json": {
                schema: transactionalEmailEventsResponseSchema,
                example: {
                  object: "event_list",
                  emailId: "email_abc123xyz789",
                  sendingId: "snd_def456uvw012",
                  events: [
                    {
                      id: "evt_001",
                      type: "SENT",
                      timestamp: "2024-01-15T10:30:05Z",
                      response: {
                        code: 250,
                        content: "OK",
                        command: "DATA",
                      },
                      bounceClassification: null,
                      origin: null,
                      server: "mx.example.com",
                    },
                    {
                      id: "evt_002",
                      type: "DELIVERED",
                      timestamp: "2024-01-15T10:30:08Z",
                      response: {
                        code: 250,
                        content: "Message accepted",
                        command: null,
                      },
                      bounceClassification: null,
                      origin: null,
                      server: "mx.example.com",
                    },
                    {
                      id: "evt_003",
                      type: "OPENED",
                      timestamp: "2024-01-15T11:00:00Z",
                      response: null,
                      bounceClassification: null,
                      origin: {
                        country: "US",
                        city: "San Francisco",
                        device: "Desktop",
                        browser: "Chrome",
                      },
                      server: null,
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'smtp:send' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Email with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/emails/{emailId}/content": {
      get: {
        summary: "Get Transactional Email Content",
        description: `Retrieve the HTML and plain text content of a specific transactional email.

**Use Cases:**
- View the actual email content that was sent
- Debug rendering issues by examining HTML
- Retrieve email content for audit or compliance purposes
- Display sent email content in your application

**Behavior:**
- Returns the HTML and plain text versions of the email
- Content is retrieved from storage (S3)
- Returns 404 if email content is no longer available
- Content may be unavailable for very old emails (storage retention policy)
- Email must belong to your workspace

**Required Scope:** \`smtp:send\`

**Response Includes:**
- **html:** Full HTML content of the email (nullable if not available)
- **text:** Plain text version of the email (nullable if not provided)

**Content Availability:**
- Content is stored when the email is created
- Content may be purged after the retention period
- If both html and text are unavailable, a 404 is returned`,
        tags: ["Transactional Emails"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "emailId",
            in: "path",
            description: "Transactional email ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved email content (HTML and/or plain text)",
            content: {
              "application/json": {
                schema: transactionalEmailContentResponseSchema,
                example: {
                  object: "email_content",
                  html: "<html><body><h1>Hello John!</h1><p>Your order has been confirmed.</p></body></html>",
                  text: "Hello John!\n\nYour order has been confirmed.",
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'smtp:send' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Email with this ID does not exist or email content is no longer available",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations": {
      get: {
        summary: "List Automations",
        description: `Retrieve a paginated list of all automations in your workspace.

**Use Cases:**
- View all automation workflows and their statuses
- Monitor active automations
- Build automation management dashboards
- Audit automation configurations
- Track automation versions

**Behavior:**
- Returns automations in reverse chronological order (newest first)
- Uses cursor-based pagination for efficient retrieval
- Includes automation metadata, trigger configuration, and status
- Shows only root automations (not version variants)
- Maximum 100 automations per request

**Required Scope:** \`read:automations\`

**Response Includes:**
- Automation ID, name, and description
- Current status (DRAFT, PUBLISHED, ARCHIVED)
- Trigger type and configuration
- Workflow nodes and edges
- Version number and parent ID
- Statistics and timestamps`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: paginationParameters,
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of automations with metadata and trigger configuration",
            content: {
              "application/json": {
                schema: automationListResponseSchema,
                example: {
                  object: "automation_list",
                  hasMore: false,
                  data: [
                    {
                      id: "aut_abc123xyz789",
                      name: "Welcome Series",
                      description: "Sends a 3-part welcome email series to new subscribers",
                      status: "PUBLISHED",
                      version: 1,
                      parentId: null,
                      trigger: {
                        type: "contact.subscribed",
                        config: {},
                      },
                      nodes: [],
                      edges: [],
                      stats: null,
                      publishedAt: "2024-01-15T10:00:00Z",
                      createdAt: "2024-01-10T08:30:00Z",
                      updatedAt: "2024-01-15T10:00:00Z",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Automation",
        description: `Create a new automation workflow in your workspace.

**Use Cases:**
- Build automated email sequences triggered by contact behavior
- Create welcome series for new subscribers
- Set up re-engagement campaigns
- Build event-driven workflows
- Create drip campaigns based on contact activity

**Behavior:**
- Creates an automation in DRAFT status
- Trigger, nodes, and edges are optional at creation
- Validates that all edges reference existing nodes (if provided)
- Schema validation is lenient at creation — strict validation happens at publish time
- Returns the complete automation object with generated ID

**Required Scope:** \`write:automations\`

**Trigger Types:**
- **contact.subscribed:** Fires when a contact subscribes
- **contact.unsubscribed:** Fires when a contact unsubscribes
- **contact.created:** Fires when a new contact is created
- **contact.updated:** Fires when a contact is updated
- **event.fired:** Fires when a custom event is triggered
- **form.submitted:** Fires when a form is submitted
- **segment.entered:** Fires when a contact enters a segment
- **email.opened:** Fires when an email is opened
- **email.clicked:** Fires when a link is clicked
- **email.bounced:** Fires when an email bounces
- **email.complained:** Fires when a spam complaint is received

**Next Steps After Creation:**
1. Add nodes and edges to define the workflow
2. Configure trigger settings
3. Publish the automation via POST /v1/automations/{automationId}/publish`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createAutomationSchema,
              example: {
                name: "Welcome Series",
                description: "Sends a 3-part welcome email series to new subscribers",
                trigger: {
                  type: "contact.subscribed",
                  config: {},
                },
                nodes: [],
                edges: [],
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Automation created successfully in DRAFT status. Returns the complete automation object.",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data, such as edges referencing non-existent nodes",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as name too long or invalid trigger type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}": {
      get: {
        summary: "Get Automation",
        description: `Retrieve a specific automation by ID with full details.

**Use Cases:**
- View automation configuration and workflow definition
- Check automation status before publishing
- Retrieve trigger configuration and node details
- Display automation details in your application
- Review automation before making changes

**Behavior:**
- Returns complete automation object with all fields
- Includes trigger configuration, nodes, and edges
- Shows current status and version information
- Includes statistics if the automation has been published
- Automation must belong to your workspace

**Required Scope:** \`read:automations\`

**Response Includes:**
- Automation ID, name, description, and status
- Trigger type and configuration
- Workflow nodes (actions, conditions, delays)
- Workflow edges (connections between nodes)
- Version number and parent ID
- Statistics (if available)
- Publication and creation timestamps`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved automation with full workflow definition",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Automation",
        description: `Update an existing automation's configuration and workflow.

**Use Cases:**
- Modify automation trigger settings
- Add, remove, or update workflow nodes
- Change workflow connections (edges)
- Update automation name or description
- Iterate on draft automations before publishing

**Behavior:**
- Only provided fields are updated (partial updates supported)
- Only DRAFT automations can be updated
- Validates that all edges reference existing nodes (if both are provided)
- Schema validation is lenient — strict validation happens at publish time
- Returns the complete updated automation object

**Required Scope:** \`write:automations\`

**Updatable Fields:**
- **name:** Automation display name (1-100 characters)
- **description:** Automation description (max 500 characters)
- **trigger:** Trigger type and configuration
- **nodes:** Array of workflow nodes
- **edges:** Array of connections between nodes

**Note:** To update a published automation, create a new version and publish it. Published automations cannot be directly modified.`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID",
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
              schema: updateAutomationSchema,
              example: {
                name: "Updated Welcome Series",
                description: "Updated description for the welcome series",
                trigger: {
                  type: "contact.subscribed",
                  config: {},
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Automation updated successfully with refreshed configuration",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Cannot update published automation, or edges reference non-existent nodes",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid field values, such as name too long or invalid trigger type",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      delete: {
        summary: "Delete Automation",
        description: `Delete an automation permanently.

**Use Cases:**
- Remove unused draft automations
- Clean up deprecated automations
- Delete test automations
- Remove automations after migration

**Behavior:**
- Only DRAFT or ARCHIVED automations can be deleted
- Published automations must be archived first
- Automation is permanently removed from the workspace
- Cannot be undone — automation is permanently deleted
- Returns the deleted automation's ID for confirmation

**Required Scope:** \`write:automations\`

**Restrictions:**
- Cannot delete PUBLISHED automations (archive first)
- Deletion is permanent and cannot be undone

**Important:**
- Archive published automations before deleting
- Contacts currently in the automation flow may be affected
- Historical automation data is removed`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Automation deleted successfully. Returns the deleted automation's ID for confirmation.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("automation"),
                  id: z.string(),
                }),
                example: {
                  object: "automation",
                  id: "aut_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Cannot delete published automation. Archive it first.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}/publish": {
      post: {
        summary: "Publish Automation",
        description: `Publish an automation to make it active and start processing triggers.

**Use Cases:**
- Activate a draft automation after configuration
- Go live with a new email workflow
- Re-publish an updated automation version

**Behavior:**
- Performs strict validation of the automation workflow
- Validates trigger configuration, node data, and flow structure
- Sets automation status to PUBLISHED
- Records publishedAt timestamp
- Automation begins processing matching triggers immediately
- Creates a new version if publishing an update to an existing automation

**Required Scope:** \`write:automations\`

**Validation at Publish Time:**
The following are validated strictly (unlike save, which is lenient):
- Trigger type is valid and configured
- All nodes have valid type and required data
- Flow structure is valid (connected graph, no orphan nodes)
- Email nodes have subject and content
- Delay nodes have valid durations
- Condition nodes have valid rules

**Prerequisites:**
- Automation must be in DRAFT status
- Must have a valid trigger configured
- Must pass all validation checks

**Note:** Publishing is immediate. The automation will start processing events as soon as it is published.`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to publish",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Automation published successfully. It is now active and processing triggers.",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Automation failed validation. Check trigger configuration, node data, and flow structure.",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}/archive": {
      post: {
        summary: "Archive Automation",
        description: `Archive a published automation to stop it from processing triggers.

**Use Cases:**
- Temporarily disable an automation without deleting it
- Stop a published automation that is no longer needed
- Prepare an automation for deletion (published automations must be archived first)
- Pause an automation for review or updates

**Behavior:**
- Sets automation status to ARCHIVED
- Stops processing new triggers immediately
- Contacts currently in the automation flow may still complete their current step
- Archived automations can be viewed but not edited
- Create a new version to re-activate

**Required Scope:** \`write:automations\`

**Prerequisites:**
- Automation must be in PUBLISHED status
- Only published automations can be archived

**After Archiving:**
- Automation stops accepting new trigger events
- In-flight contacts may complete their current step
- Create a new version and publish to reactivate
- Archived automations can be deleted`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to archive",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Automation archived successfully. It is no longer processing new triggers.",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Automation is not in PUBLISHED status and cannot be archived",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}/trigger": {
      post: {
        summary: "Manually Trigger Automation",
        description: `Manually trigger an automation for testing or one-off execution.

**Use Cases:**
- Test an automation workflow with a specific contact
- Manually enroll a contact into an automation
- Trigger an automation outside of its normal trigger conditions
- Debug automation behavior with test contacts

**Behavior:**
- Enqueues the automation to run for the specified trigger event
- Automation must be in PUBLISHED status
- The trigger is processed asynchronously
- Returns immediately with confirmation
- Automation steps execute according to the workflow definition

**Required Scope:** \`write:automations\`

**Prerequisites:**
- Automation must be PUBLISHED
- Trigger data must match the automation's expected trigger type

**Note:** This endpoint is useful for testing and manual enrollment. For production use, automations are triggered automatically by the configured trigger events.`,
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to trigger",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Automation triggered successfully. The workflow will execute asynchronously.",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Automation is not in PUBLISHED status or trigger data is invalid",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}/simulate": {
      post: {
        summary: "Simulate Automation",
        description:
          "Dry-run simulation showing the path a contact would take. No side effects.",
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to simulate",
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
              schema: z.object({
                contactId: z.string().optional().describe("Existing contact ID to simulate with"),
                contact: z
                  .object({
                    email: z.string().describe("Contact email address"),
                    firstName: z.string().optional().describe("Contact first name"),
                    lastName: z.string().optional().describe("Contact last name"),
                    phone: z.string().optional().describe("Contact phone number"),
                    country: z.string().optional().describe("Contact country"),
                    timezone: z.string().optional().describe("Contact timezone"),
                    city: z.string().optional().describe("Contact city"),
                    status: z
                      .enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"])
                      .default("SUBSCRIBED")
                      .describe("Contact subscription status"),
                    properties: z
                      .record(z.string(), z.unknown())
                      .optional()
                      .describe("Custom contact properties"),
                    topics: z
                      .array(z.string())
                      .optional()
                      .describe("Topic IDs the contact is subscribed to"),
                  })
                  .optional()
                  .describe("Inline contact data for simulation"),
                seed: z.number().int().optional().describe("Random seed for deterministic simulation"),
              }),
            },
          },
        },
        responses: {
          "200": {
            description:
              "Simulation completed successfully. Returns the simulated path.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("automation_simulation"),
                  automationId: z.string().describe("ID of the simulated automation"),
                  automationName: z.string().describe("Name of the simulated automation"),
                  contactId: z.string().describe("ID of the contact used in simulation"),
                  contactEmail: z.string().describe("Email of the contact used in simulation"),
                  status: z
                    .enum(["completed", "error"])
                    .describe("Simulation outcome status"),
                  totalSteps: z.number().describe("Total number of steps in the simulated path"),
                  steps: z.array(
                    z.object({
                      step: z.number().describe("Step number in sequence"),
                      nodeId: z.string().describe("Node ID in the automation workflow"),
                      nodeType: z.string().describe("Type of node (e.g., email, delay, condition)"),
                      nodeName: z.string().describe("Display name of the node"),
                      action: z.string().describe("Action taken at this step"),
                      detail: z.string().describe("Human-readable detail of what happened"),
                      branch: z.string().optional().describe("Branch taken if this is a condition node"),
                    })
                  ),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid simulation parameters or automation not in valid state",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/automations/{automationId}/versions": {
      get: {
        summary: "List Automation Versions",
        description:
          "Retrieve all versions of a specific automation.",
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to list versions for",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved list of all automation versions.",
            content: {
              "application/json": { schema: automationListResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      post: {
        summary: "Create Automation Version",
        description:
          "Create a new draft version of an existing automation.",
        tags: ["Automations"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "automationId",
            in: "path",
            description: "Automation ID to create a version for",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateAutomationSchema },
          },
        },
        responses: {
          "201": {
            description:
              "Automation version created successfully in DRAFT status.",
            content: {
              "application/json": { schema: automationResponseSchema },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid input data or automation not in valid state for versioning",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:automations' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Automation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "409": {
            description:
              "Conflict - A draft version already exists for this automation",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/forms/{formId}/deploy": {
      post: {
        summary: "Deploy Form Site Bundle",
        description:
          "Upload HTML and assets for a form. Validates HTML structure and field mapping.",
        tags: ["Forms"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "formId",
            in: "path",
            description: "Form ID to deploy assets for",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                    description: "HTML and asset files to deploy",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Form site bundle deployed successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  deployId: z.string().describe("Unique deploy identifier"),
                  files: z.array(
                    z.object({
                      name: z.string().describe("Deployed file name"),
                      url: z.string().describe("Public URL of the deployed file"),
                    })
                  ),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid file format or missing required files",
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
              "Validation Error - HTML structure invalid or field mapping mismatch",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/events": {
      post: {
        summary: "Fire Custom Event",
        description: `Fire a custom event to trigger automations and track contact activity.

**Use Cases:**
- Trigger automations based on custom application events
- Track user actions like purchases, page views, or feature usage
- Send behavioral data to trigger personalized email workflows
- Integrate your application events with email automation

**Behavior:**
- Event is fired for the specified contact
- Matching automations with event.fired trigger type are activated
- Event properties are available in automation conditions and email templates
- Events are processed asynchronously
- Returns immediately with confirmation

**Required Scope:** \`write:contacts\`

**Event Properties:**
- **eventName** (required): Unique event identifier (alphanumeric, underscores, hyphens, dots only)
- **contactId** (required): ID of the contact this event is for
- **properties** (optional): Key-value pairs of event data

**Event Name Conventions:**
Use dot notation for organizing events:
- \`purchase.completed\`
- \`page.viewed\`
- \`feature.activated\`
- \`subscription.upgraded\`

**Properties Usage:**
Properties can be used in automation conditions and email templates:
\`\`\`json
{
  "eventName": "purchase.completed",
  "contactId": "con_abc123",
  "properties": {
    "orderId": "ORD-12345",
    "amount": 99.99,
    "product": "Premium Plan"
  }
}
\`\`\`

**Note:** Event names are case-sensitive. Use consistent naming conventions across your application.`,
        tags: ["Events"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createEventSchema,
              example: {
                eventName: "purchase.completed",
                contactId: "con_abc123xyz789",
                properties: {
                  orderId: "ORD-12345",
                  amount: 99.99,
                  product: "Premium Plan",
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Event fired successfully. Matching automations will be triggered asynchronously.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("event"),
                  eventName: z.string().describe("Name of the event that was fired"),
                  contactId: z.string().describe("ID of the contact the event was fired for"),
                }),
                example: {
                  object: "event",
                  eventName: "purchase.completed",
                  contactId: "con_abc123xyz789",
                },
              },
            },
          },
          "400": {
            description:
              "Bad Request - Invalid event name format or missing required fields",
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
              "Not Found - Contact with the specified ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "422": {
            description:
              "Validation Error - Invalid event name characters or contactId format",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/inbox/conversations": {
      get: {
        summary: "List Inbox Conversations",
        description:
          "Retrieve a paginated list of inbox conversations.",
        tags: ["Inbox"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of conversations to return (default: 20, max: 100)",
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
            description: "Cursor for pagination - ID of the last item from the previous page",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "status",
            in: "query",
            description: "Filter conversations by status",
            required: false,
            schema: {
              type: "string",
              enum: ["OPEN", "CLOSED", "ARCHIVED"],
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved paginated list of inbox conversations.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("conversation_list"),
                  hasMore: z.boolean().describe("Whether more results are available"),
                  data: z.array(
                    z.object({
                      id: z.string().describe("Unique conversation identifier"),
                      subject: z.string().describe("Conversation subject line"),
                      status: z.string().describe("Conversation status (OPEN, CLOSED, ARCHIVED)"),
                      originType: z.string().describe("Origin type of the conversation"),
                      originId: z.string().describe("Origin identifier"),
                      messageCount: z.number().describe("Total number of messages"),
                      unreadCount: z.number().describe("Number of unread messages"),
                      lastMessageAt: z.string().describe("ISO 8601 timestamp of the last message"),
                      createdAt: z.string().describe("ISO 8601 timestamp when the conversation was created"),
                      contact: z
                        .object({
                          id: z.string().describe("Contact ID"),
                          email: z.string().describe("Contact email"),
                          firstName: z.string().describe("Contact first name"),
                          lastName: z.string().describe("Contact last name"),
                        })
                        .nullable()
                        .describe("Associated contact, if any"),
                      senderIdentity: z
                        .object({
                          id: z.string().describe("Sender identity ID"),
                          email: z.string().describe("Sender email address"),
                          name: z.string().describe("Sender display name"),
                        })
                        .nullable()
                        .describe("Sender identity used for the conversation"),
                    })
                  ),
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:inbox' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/inbox/conversations/{conversationId}": {
      get: {
        summary: "Get Conversation",
        description:
          "Retrieve a specific conversation with its messages.",
        tags: ["Inbox"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "conversationId",
            in: "path",
            description: "Conversation ID",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Successfully retrieved conversation with messages.",
            content: {
              "application/json": {
                schema: z.object({
                  object: z.literal("conversation"),
                  id: z.string().describe("Unique conversation identifier"),
                  subject: z.string().describe("Conversation subject line"),
                  status: z.string().describe("Conversation status (OPEN, CLOSED, ARCHIVED)"),
                  originType: z.string().describe("Origin type of the conversation"),
                  originId: z.string().describe("Origin identifier"),
                  messageCount: z.number().describe("Total number of messages"),
                  unreadCount: z.number().describe("Number of unread messages"),
                  lastMessageAt: z.string().describe("ISO 8601 timestamp of the last message"),
                  createdAt: z.string().describe("ISO 8601 timestamp when the conversation was created"),
                  contact: z
                    .object({
                      id: z.string().describe("Contact ID"),
                      email: z.string().describe("Contact email"),
                      firstName: z.string().describe("Contact first name"),
                      lastName: z.string().describe("Contact last name"),
                    })
                    .nullable()
                    .describe("Associated contact, if any"),
                  senderIdentity: z
                    .object({
                      id: z.string().describe("Sender identity ID"),
                      email: z.string().describe("Sender email address"),
                      name: z.string().describe("Sender display name"),
                    })
                    .nullable()
                    .describe("Sender identity used for the conversation"),
                  messages: z.array(
                    z.object({
                      id: z.string().describe("Unique message identifier"),
                      direction: z.string().describe("Message direction (inbound or outbound)"),
                      from: z.string().describe("Sender email address"),
                      to: z.string().describe("Recipient email address"),
                      subject: z.string().describe("Message subject line"),
                      bodyHtml: z.string().nullable().describe("HTML body content"),
                      bodyText: z.string().nullable().describe("Plain text body content"),
                      createdAt: z.string().describe("ISO 8601 timestamp when the message was created"),
                    })
                  ),
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:inbox' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Conversation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
      put: {
        summary: "Update Conversation",
        description:
          "Update a conversation's status.",
        tags: ["Inbox"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "conversationId",
            in: "path",
            description: "Conversation ID to update",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: updateConversationSchema },
          },
        },
        responses: {
          "200": {
            description:
              "Conversation updated successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  id: z.string().describe("Conversation identifier"),
                  status: z.string().describe("Updated conversation status"),
                  updatedAt: z.string().describe("ISO 8601 timestamp of the update"),
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:inbox' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Conversation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/inbox/conversations/{conversationId}/replies": {
      post: {
        summary: "Reply to Conversation",
        description:
          "Send a reply to an existing conversation.",
        tags: ["Inbox"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "conversationId",
            in: "path",
            description: "Conversation ID to reply to",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: sendReplySchema },
          },
        },
        responses: {
          "201": {
            description:
              "Reply queued successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.literal("queued"),
                  conversationId: z.string().describe("Conversation the reply was sent to"),
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'write:inbox' scope",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
          "404": {
            description:
              "Not Found - Conversation with this ID does not exist in your workspace",
            content: {
              "application/json": { schema: errorResponseSchema },
            },
          },
        },
      },
    },
    "/v1/inbox/stats": {
      get: {
        summary: "Get Inbox Statistics",
        description:
          "Retrieve aggregate inbox statistics for your workspace.",
        tags: ["Inbox"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Successfully retrieved inbox statistics.",
            content: {
              "application/json": {
                schema: z.object({
                  totalConversations: z.number().describe("Total number of conversations"),
                  unreadConversations: z.number().describe("Number of conversations with unread messages"),
                  openConversations: z.number().describe("Number of open conversations"),
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized - Invalid or missing API key, or API key lacks 'read:inbox' scope",
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
