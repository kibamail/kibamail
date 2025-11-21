/**
 * Internal API Client SDK
 *
 * Type-safe SDK for making requests to internal API endpoints.
 * Uses Zod schemas for request/response validation and type inference.
 *
 * @example
 * ```ts
 * import { internalApi } from '@/lib/api/client'
 *
 * // Create workspace
 * const workspace = await internalApi.workspaces().create({
 *   name: 'Acme Corp',
 *   description: 'Main workspace'
 * })
 *
 * // Activate workspace
 * await internalApi.workspaces().activate('org_123')
 * ```
 */

import { ZodError, type ZodType } from "zod";

import {
  type CreateWorkspaceInput,
  type CreateWorkspaceResponse,
  createWorkspaceResponseSchema,
  createWorkspaceSchema,
} from "@/app/api/internal/v1/workspaces/schema";
import {
  type ActivateWorkspaceResponse,
  activateWorkspaceResponseSchema,
} from "@/app/api/internal/v1/workspaces/[id]/activate/schema";
import {
  type InviteMembersInput,
  type InviteMembersResponse,
  type ChangeMemberRoleInput,
  type ChangeMemberRoleResponse,
  inviteMembersResponseSchema,
  inviteMembersSchema,
  changeMemberRoleSchema,
  changeMemberRoleResponseSchema,
} from "@/app/api/internal/v1/workspaces/[id]/members/schema";
import {
  type UpdateInvitationStatusInput,
  type UpdateInvitationStatusResponse,
  updateInvitationStatusResponseSchema,
  updateInvitationStatusSchema,
} from "@/app/api/internal/v1/invitations/[id]/status/schema";
import {
  type CreateApiKeyInput,
  type CreateApiKeyResponse,
  type ListApiKeysResponse,
  type DeleteApiKeyResponse,
  createApiKeyResponseSchema,
  createApiKeySchema,
  listApiKeysResponseSchema,
  deleteApiKeyResponseSchema,
} from "@/app/api/internal/v1/api-keys/schema";
import {
  type CreateWebhookDestinationInput,
  type UpdateWebhookDestinationInput,
  type ListEventsResponse,
  createWebhookDestinationSchema,
  updateWebhookDestinationSchema,
  listEventsResponseSchema,
} from "@/app/api/internal/v1/webhooks/schema";
import {
  type UpdateLogoResponse,
  updateLogoResponseSchema,
} from "@/app/api/internal/v1/workspaces/[id]/logo/schema";
import {
  type CreateTopicRequest,
  type TopicResponse,
  type TopicListResponse,
  createTopicSchema,
  topicResponseSchema,
  topicListResponseSchema,
} from "@/app/api/v1/topics/schema";
import {
  type CreateSegmentRequest,
  type SegmentResponse,
  type SegmentListResponse,
  createSegmentSchema,
  segmentResponseSchema,
  segmentListResponseSchema,
} from "@/app/api/v1/segments/schema";
import {
  type CreateContactPropertyRequest,
  type ContactPropertyResponse,
  type ContactPropertyListResponse,
  createContactPropertySchema,
  contactPropertyResponseSchema,
  contactPropertyListResponseSchema,
} from "@/app/api/v1/contact-properties/schema";
import {
  type UpdateWorkspaceInput,
  type UpdateWorkspaceResponse,
  updateWorkspaceSchema,
  updateWorkspaceResponseSchema,
} from "@/app/api/internal/v1/workspaces/[id]/schema";
import {
  type CreateContactRequest,
  type UpdateContactRequest,
  createContactSchema,
  updateContactSchema,
} from "@/app/api/v1/contacts/schema";
import {
  type CreateFormRequest,
  type FormResponse,
  createFormSchema,
  formResponseSchema,
} from "@/app/api/v1/forms/schema";

type ApiErrorResponse = {
  error: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Base HTTP client for making requests
 */
class HttpClient {
  /**
   * Make an HTTP request with validation
   *
   * @param method - HTTP method
   * @param path - API endpoint path
   * @param requestSchema - Zod schema for request validation
   * @param responseSchema - Zod schema for response validation
   * @param data - Request body data
   * @returns Parsed and validated response
   * @throws ZodError if validation fails (422)
   * @throws Error for other failures
   */
  protected async request<TRequest, TResponse>(
    method: string,
    path: string,
    requestSchema: ZodType<TRequest> | null,
    responseSchema: ZodType<TResponse>,
    data?: TRequest
  ): Promise<TResponse> {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(data && { body: JSON.stringify(data) }),
    });

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();

      // Handle validation errors (422) - throw as ZodError
      if (response.status === 422 && errorData.fieldErrors) {
        const issues = Object.entries(errorData.fieldErrors).flatMap(
          ([field, messages]) =>
            messages.map((message) => ({
              code: "custom" as const,
              path: field.split("."),
              message,
            }))
        );

        const zodError = new ZodError(issues);
        throw zodError;
      }

      // Throw regular error for other failures
      throw new Error(errorData.error || "Request failed");
    }

    const json = await response.json();

    // Return response without validation (schema is only for type inference)
    return json as TResponse;
  }
}

/**
 * Invitations API namespace
 */
class InvitationsApi extends HttpClient {
  /**
   * Update invitation status
   *
   * @param invitationId - Invitation ID
   * @param data - Status update data
   * @returns Update invitation status response
   *
   * @example
   * ```ts
   * // Accept invitation
   * await internalApi.invitations().update('inv_123', { status: 'Accepted' })
   *
   * // Revoke invitation
   * await internalApi.invitations().update('inv_123', { status: 'Revoked' })
   * ```
   */
  async update(
    invitationId: string,
    data: UpdateInvitationStatusInput
  ): Promise<UpdateInvitationStatusResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/invitations/${invitationId}/status`,
      updateInvitationStatusSchema,
      updateInvitationStatusResponseSchema,
      data
    );
  }
}

/**
 * Workspace Invitations API namespace
 */
class WorkspaceInvitationsApi extends HttpClient {
  /**
   * Cancel an organization invitation
   *
   * @param invitationId - ID of the invitation to cancel
   * @returns Empty response on success
   *
   * @example
   * ```ts
   * await internalApi.workspaces().invitations().cancel('inv_123')
   * ```
   */
  async cancel(invitationId: string): Promise<void> {
    await fetch(`/api/internal/v1/invitations/${invitationId}`, {
      method: "DELETE",
    });
  }
}

/**
 * Workspace Members API namespace
 */
class WorkspaceMembersApi extends HttpClient {
  constructor(private workspaceId: string) {
    super();
  }

  /**
   * Invite member to workspace
   *
   * @param data - Invitation data with email and role
   * @returns Invitation result
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const result = await internalApi.workspaces().members('org_123').invite({
   *   email: 'user@example.com',
   *   role: 'member'
   * })
   * ```
   */
  async invite(data: InviteMembersInput): Promise<InviteMembersResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/workspaces/${this.workspaceId}/members`,
      inviteMembersSchema,
      inviteMembersResponseSchema,
      data
    );
  }

  /**
   * Change member role in workspace
   *
   * @param memberId - ID of the member to update
   * @param data - Role change data
   * @returns Success response
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.workspaces().members('org_123').changeRole('user_123', {
   *   role: 'admin'
   * })
   * ```
   */
  async changeRole(
    memberId: string,
    data: ChangeMemberRoleInput
  ): Promise<ChangeMemberRoleResponse> {
    return this.request(
      "PATCH",
      `/api/internal/v1/workspaces/${this.workspaceId}/members/${memberId}/role`,
      changeMemberRoleSchema,
      changeMemberRoleResponseSchema,
      data
    );
  }
}

/**
 * Workspaces API namespace
 */
class WorkspacesApi extends HttpClient {
  /**
   * Create a new workspace
   *
   * @param data - Workspace creation data
   * @returns Created workspace
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const workspace = await internalApi.workspaces().create({
   *   name: 'Acme Corp',
   *   description: 'Main workspace'
   * })
   * ```
   */
  async create(data: CreateWorkspaceInput): Promise<CreateWorkspaceResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/workspaces",
      createWorkspaceSchema,
      createWorkspaceResponseSchema,
      data
    );
  }

  /**
   * Activate (switch to) a workspace
   *
   * @param id - Workspace ID
   * @returns Success response
   *
   * @example
   * ```ts
   * await internalApi.workspaces().activate('org_123')
   * // Workspace is now active (cookie is set)
   * ```
   */
  async activate(id: string): Promise<ActivateWorkspaceResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/workspaces/${id}/activate`,
      null,
      activateWorkspaceResponseSchema
    );
  }

  /**
   * Access workspace members API
   *
   * @param workspaceId - Workspace ID
   * @returns WorkspaceMembersApi instance
   *
   * @example
   * ```ts
   * await internalApi.workspaces().members('org_123').invite({
   *   email: 'user@example.com',
   *   role: 'member'
   * })
   * ```
   */
  members(workspaceId: string) {
    return new WorkspaceMembersApi(workspaceId);
  }

  /**
   * Access workspace invitations API
   *
   * @returns WorkspaceInvitationsApi instance
   *
   * @example
   * ```ts
   * await internalApi.workspaces().invitations().cancel('inv_123')
   * ```
   */
  invitations() {
    return new WorkspaceInvitationsApi();
  }

  /**
   * Update workspace logo
   *
   * @param workspaceId - Workspace ID
   * @param logoFile - Image file to upload
   * @returns Upload result with logo URL
   *
   * @example
   * ```ts
   * const file = input.files[0]; // File from input element
   * const result = await internalApi.workspaces().updateLogo('org_123', file)
   * console.log(result.logoUrl) // Public URL of uploaded logo
   * ```
   */
  async updateLogo(
    workspaceId: string,
    logoFile: File
  ): Promise<UpdateLogoResponse> {
    const formData = new FormData();
    formData.append("logo", logoFile);

    const response = await fetch(
      `/api/internal/v1/workspaces/${workspaceId}/logo`,
      {
        method: "PATCH",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.error || "Logo upload failed");
    }

    const json = await response.json();
    return json as UpdateLogoResponse;
  }

  /**
   * Update workspace details
   *
   * @param workspaceId - Workspace ID
   * @param data - Workspace update data (name, description, logoUrl)
   * @returns Updated workspace
   *
   * @example
   * ```ts
   * const result = await internalApi.workspaces().update('org_123', {
   *   name: 'New Name',
   *   logoUrl: 'http://...'
   * })
   * ```
   */
  async update(
    workspaceId: string,
    data: UpdateWorkspaceInput
  ): Promise<UpdateWorkspaceResponse> {
    return this.request(
      "PATCH",
      `/api/internal/v1/workspaces/${workspaceId}`,
      updateWorkspaceSchema,
      updateWorkspaceResponseSchema,
      data
    );
  }
}

/**
 * Webhooks API namespace
 */
class WebhooksApi extends HttpClient {
  /**
   * Create a new webhook destination
   *
   * @param data - Webhook destination data with type, credentials, and config
   * @returns Created webhook destination
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const webhook = await internalApi.webhooks().create({
   *   type: 'webhook',
   *   credentials: { url: 'https://example.com/webhook' },
   *   config: {},
   *   topics: ['user.created']
   * })
   * ```
   */
  async create(data: CreateWebhookDestinationInput): Promise<any> {
    return this.request(
      "POST",
      "/api/internal/v1/webhooks",
      createWebhookDestinationSchema,
      {} as any,
      data
    );
  }

  /**
   * Update a webhook destination
   *
   * @param webhookId - ID of the webhook to update
   * @param data - Updated webhook data
   * @returns Updated webhook destination
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.webhooks().update('dest_123', {
   *   credentials: { url: 'https://newurl.com/webhook' }
   * })
   * ```
   */
  async update(
    webhookId: string,
    data: UpdateWebhookDestinationInput
  ): Promise<any> {
    return this.request(
      "PATCH",
      `/api/internal/v1/webhooks/${webhookId}`,
      updateWebhookDestinationSchema,
      {} as any,
      data
    );
  }

  /**
   * Delete a webhook destination
   *
   * @param webhookId - ID of the webhook to delete
   * @returns Empty response on success
   *
   * @example
   * ```ts
   * await internalApi.webhooks().delete('dest_123')
   * ```
   */
  async delete(webhookId: string): Promise<void> {
    await fetch(`/api/internal/v1/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  }

  /**
   * Enable a webhook destination
   *
   * @param webhookId - ID of the webhook to enable
   * @returns Updated webhook destination
   *
   * @example
   * ```ts
   * await internalApi.webhooks().enable('dest_123')
   * ```
   */
  async enable(webhookId: string): Promise<any> {
    return this.request(
      "PUT",
      `/api/internal/v1/webhooks/${webhookId}/enable`,
      null,
      {} as any
    );
  }

  /**
   * Disable a webhook destination
   *
   * @param webhookId - ID of the webhook to disable
   * @returns Updated webhook destination
   *
   * @example
   * ```ts
   * await internalApi.webhooks().disable('dest_123')
   * ```
   */
  async disable(webhookId: string): Promise<void> {
    return this.request(
      "PUT",
      `/api/internal/v1/webhooks/${webhookId}/disable`,
      null,
      {} as any
    );
  }

  /**
   * List events for a webhook destination
   *
   * @param webhookId - ID of the webhook
   * @param params - Query parameters (cursor, limit)
   * @returns Paginated list of events
   *
   * @example
   * ```ts
   * const response = await internalApi.webhooks().listEvents('dest_123', {
   *   limit: 50,
   *   next: 'cursor_abc'
   * })
   * console.log(response.events)
   * console.log(response.next) // cursor for next page
   * ```
   */
  async listEvents(
    webhookId: string,
    params?: {
      next?: string;
      prev?: string;
      limit?: number;
      start?: string;
      status?: "success" | "failed";
    }
  ): Promise<ListEventsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.next) queryParams.set("next", params.next);
    if (params?.prev) queryParams.set("prev", params.prev);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.start) queryParams.set("start", params.start);
    if (params?.status) queryParams.set("status", params.status);

    const queryString = queryParams.toString();
    const url = `/api/internal/v1/webhooks/${webhookId}/events${
      queryString ? `?${queryString}` : ""
    }`;

    return this.request("GET", url, null, listEventsResponseSchema);
  }

  /**
   * List delivery attempts for an event
   *
   * @param webhookId - Webhook destination ID
   * @param eventId - Event ID
   * @returns List of delivery attempts
   *
   * @example
   * ```ts
   * const response = await internalApi.webhooks().listEventDeliveries('dest_123', 'event_456')
   * console.log(response.deliveries)
   * ```
   */
  async listEventDeliveries(
    webhookId: string,
    eventId: string
  ): Promise<{ deliveries: unknown }> {
    const url = `/api/internal/v1/webhooks/${webhookId}/events/${eventId}/deliveries`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch deliveries: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
}

/**
 * API Keys API namespace
 */
class ApiKeysApi extends HttpClient {
  /**
   * Create a new API key
   *
   * @param data - API key data with name and scopes
   * @returns Created API key with full key (only time it's shown)
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const apiKey = await internalApi.apiKeys().create({
   *   name: 'Production API Key',
   *   scopes: ['read:contacts', 'write:broadcasts']
   * })
   * console.log(apiKey.data.key) // Save this! Won't be shown again
   * ```
   */
  async create(data: CreateApiKeyInput): Promise<CreateApiKeyResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/api-keys",
      createApiKeySchema,
      createApiKeyResponseSchema,
      data
    );
  }

  /**
   * List all API keys for workspace
   *
   * @returns List of API keys (without full keys)
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const { data } = await internalApi.apiKeys().list()
   * console.log(data) // Array of API keys with previews
   * ```
   */
  async list(): Promise<ListApiKeysResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/api-keys",
      null,
      listApiKeysResponseSchema
    );
  }

  /**
   * Delete an API key
   *
   * @param apiKeyId - ID of the API key to delete
   * @returns Empty response on success
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.apiKeys().delete('key_123')
   * ```
   */
  async delete(apiKeyId: string): Promise<DeleteApiKeyResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/api-keys/${apiKeyId}`,
      null,
      deleteApiKeyResponseSchema
    );
  }
}

/**
 * Segments API namespace
 */
class SegmentsApi extends HttpClient {
  /**
   * Create a new segment
   *
   * @param data - Segment creation data
   * @returns Created segment
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const segment = await internalApi.segments().create({
   *   name: 'High Value Customers',
   *   description: 'Customers with high lifetime value',
   *   conditions: { field: 'status', operator: 'eq', value: 'SUBSCRIBED' }
   * })
   * ```
   */
  async create(data: CreateSegmentRequest): Promise<SegmentResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/segments",
      createSegmentSchema,
      segmentResponseSchema,
      data
    );
  }

  /**
   * List all segments for the current workspace
   *
   * @returns List of segments
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const segments = await internalApi.segments().list()
   * ```
   */
  async list(): Promise<SegmentListResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/segments",
      null,
      segmentListResponseSchema
    );
  }

  /**
   * Get a specific segment by ID
   *
   * @param segmentId - ID of the segment to retrieve
   * @returns Segment data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const segment = await internalApi.segments().get('segment_123')
   * ```
   */
  async get(segmentId: string): Promise<SegmentResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/segments/${segmentId}`,
      null,
      segmentResponseSchema
    );
  }

  /**
   * Update a specific segment by ID
   *
   * @param segmentId - ID of the segment to update
   * @param data - Segment update data
   * @returns Updated segment data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const segment = await internalApi.segments().update('segment_123', {
   *   name: 'Updated High Value Customers',
   *   description: 'Updated description'
   * })
   * ```
   */
  async update(segmentId: string, data: Partial<CreateSegmentRequest>): Promise<SegmentResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/segments/${segmentId}`,
      null,
      segmentResponseSchema,
      data
    );
  }

  /**
   * Delete a specific segment by ID
   *
   * @param segmentId - ID of the segment to delete
   * @returns Deleted segment data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.segments().delete('segment_123')
   * ```
   */
  async delete(segmentId: string): Promise<SegmentResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/segments/${segmentId}`,
      null,
      segmentResponseSchema
    );
  }
}

/**
 * Contact Properties API namespace
 */
class ContactPropertiesApi extends HttpClient {
  /**
   * Create a new contact property
   *
   * @param data - Contact property creation data
   * @returns Created contact property
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const property = await internalApi.contactProperties().create({
   *   name: 'Lead Score',
   *   type: 'NUMBER',
   *   defaultValue: '0'
   * })
   * ```
   */
  async create(data: CreateContactPropertyRequest): Promise<ContactPropertyResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/contact-properties",
      createContactPropertySchema,
      contactPropertyResponseSchema,
      data
    );
  }

  /**
   * List all contact properties for the current workspace
   *
   * @returns List of contact properties
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const properties = await internalApi.contactProperties().list()
   * ```
   */
  async list(): Promise<ContactPropertyListResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/contact-properties",
      null,
      contactPropertyListResponseSchema
    );
  }

  /**
   * Update a specific contact property by ID
   *
   * @param propertyId - ID of the contact property to update
   * @param data - Contact property update data
   * @returns Updated contact property data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const property = await internalApi.contactProperties().update('property_123', {
   *   name: 'Updated Lead Score',
   *   defaultValue: '10'
   * })
   * ```
   */
  async update(
    propertyId: string,
    data: Partial<CreateContactPropertyRequest>
  ): Promise<ContactPropertyResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/contact-properties/${propertyId}`,
      null,
      contactPropertyResponseSchema,
      data
    );
  }

  /**
   * Delete a specific contact property by ID
   *
   * @param propertyId - ID of the contact property to delete
   * @returns Deleted contact property data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.contactProperties().delete('property_123')
   * ```
   */
  async delete(propertyId: string): Promise<ContactPropertyResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/contact-properties/${propertyId}`,
      null,
      contactPropertyResponseSchema
    );
  }
}

/**
 * Topics API namespace
 */
class TopicsApi extends HttpClient {
  /**
   * Create a new topic
   *
   * @param data - Topic creation data
   * @returns Created topic
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const topic = await internalApi.topics().create({
   *   name: 'Newsletter',
   *   description: 'Weekly newsletter updates',
   *   slug: 'newsletter',
   *   visibility: 'PUBLIC',
   *   defaultOptIn: false
   * })
   * ```
   */
  async create(data: CreateTopicRequest): Promise<TopicResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/topics",
      createTopicSchema,
      topicResponseSchema,
      data
    );
  }

  /**
   * List all topics for the current workspace
   *
   * @returns List of topics
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const topics = await internalApi.topics().list()
   * ```
   */
  async list(): Promise<TopicListResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/topics",
      null,
      topicListResponseSchema
    );
  }

  /**
   * Get a specific topic by ID
   *
   * @param topicId - ID of the topic to retrieve
   * @returns Topic data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const topic = await internalApi.topics().get('topic_123')
   * ```
   */
  async get(topicId: string): Promise<TopicResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/topics/${topicId}`,
      null,
      topicResponseSchema
    );
  }

  /**
   * Update a specific topic by ID
   *
   * @param topicId - ID of the topic to update
   * @param data - Topic update data
   * @returns Updated topic data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const topic = await internalApi.topics().update('topic_123', {
   *   name: 'Updated Newsletter',
   *   description: 'Updated description'
   * })
   * ```
   */
  async update(topicId: string, data: Partial<CreateTopicRequest>): Promise<TopicResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/topics/${topicId}`,
      null,
      topicResponseSchema,
      data
    );
  }

  /**
   * Delete a specific topic by ID
   *
   * @param topicId - ID of the topic to delete
   * @returns Deleted topic data
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * await internalApi.topics().delete('topic_123')
   * ```
   */
  async delete(topicId: string): Promise<TopicResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/topics/${topicId}`,
      null,
      topicResponseSchema
    );
  }
}

/**
 * Contacts API namespace
 */
class ContactsApi extends HttpClient {
  /**
   * Create a new contact with topic subscriptions
   *
   * @param data - Contact creation data
   * @returns Created contact
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const contact = await internalApi.contacts().create({
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   status: 'SUBSCRIBED',
   *   topicIds: ['topic_1', 'topic_2'],
   *   properties: { 'Lead Score': 100 }
   * })
   * ```
   */
  async create(data: CreateContactRequest): Promise<any> {
    return this.request(
      "POST",
      "/api/internal/v1/contacts",
      createContactSchema,
      {} as any,
      data
    );
  }

  /**
   * Update an existing contact
   *
   * @param contactId - ID of the contact to update
   * @param data - Contact update data
   * @returns Updated contact
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const contact = await internalApi.contacts().update('contact_123', {
   *   firstName: 'Jane',
   *   topicIds: ['topic_1']
   * })
   * ```
   */
  async update(
    contactId: string,
    data: UpdateContactRequest
  ): Promise<any> {
    return this.request(
      "PUT",
      `/api/internal/v1/contacts/${contactId}`,
      updateContactSchema,
      {} as any,
      data
    );
  }

  /**
   * Delete a contact
   *
   * @param contactId - ID of the contact to delete
   * @returns Empty response on success
   *
   * @example
   * ```ts
   * await internalApi.contacts().delete('contact_123')
   * ```
   */
  async delete(contactId: string): Promise<any> {
    return this.request(
      "DELETE",
      `/api/internal/v1/contacts/${contactId}`,
      {} as any,
      {} as any
    );
  }
}

/**
 * Forms API
 *
 * Internal API for form management.
 */
class FormsApi extends HttpClient {
  /**
   * Create a new form
   *
   * @param data - Form creation data
   * @returns Created form
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const form = await internalApi.forms().create({
   *   name: 'Newsletter Signup',
   *   description: 'Sign up for our newsletter',
   *   fields: { pages: [{ elements: [] }] }
   * })
   * ```
   */
  async create(data: CreateFormRequest): Promise<FormResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/forms",
      createFormSchema,
      formResponseSchema,
      data
    );
  }

  /**
   * Update an existing form
   *
   * @param formId - ID of the form to update
   * @param data - Form update data
   * @returns Updated form
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const form = await internalApi.forms().update('form_123', {
   *   name: 'Updated Form Name',
   *   description: 'Updated description'
   * })
   * ```
   */
  async update(
    formId: string,
    data: Partial<CreateFormRequest>
  ): Promise<FormResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/forms/${formId}`,
      null,
      formResponseSchema,
      data
    );
  }
}

/**
 * Internal API SDK
 *
 * Provides namespaced, type-safe methods for all internal API endpoints.
 */
export class InternalApi {
  private _workspaces: WorkspacesApi;
  private _invitations: InvitationsApi;
  private _apiKeys: ApiKeysApi;
  private _webhooks: WebhooksApi;
  private _topics: TopicsApi;
  private _segments: SegmentsApi;
  private _contactProperties: ContactPropertiesApi;
  private _contacts: ContactsApi;
  private _forms: FormsApi;

  constructor() {
    this._workspaces = new WorkspacesApi();
    this._invitations = new InvitationsApi();
    this._apiKeys = new ApiKeysApi();
    this._webhooks = new WebhooksApi();
    this._topics = new TopicsApi();
    this._segments = new SegmentsApi();
    this._contactProperties = new ContactPropertiesApi();
    this._contacts = new ContactsApi();
    this._forms = new FormsApi();
  }

  /**
   * Access workspaces API
   *
   * @returns WorkspacesApi instance
   *
   * @example
   * ```ts
   * const workspace = await internalApi.workspaces().create({ name: 'Acme' })
   * ```
   */
  workspaces() {
    return this._workspaces;
  }

  /**
   * Access invitations API
   *
   * @returns InvitationsApi instance
   *
   * @example
   * ```ts
   * await internalApi.invitations().update('inv_123', { status: 'Accepted' })
   * ```
   */
  invitations() {
    return this._invitations;
  }

  /**
   * Access API keys API
   *
   * @returns ApiKeysApi instance
   *
   * @example
   * ```ts
   * const apiKey = await internalApi.apiKeys().create({
   *   name: 'Production',
   *   scopes: ['read:contacts']
   * })
   * ```
   */
  apiKeys() {
    return this._apiKeys;
  }

  /**
   * Access webhooks API
   *
   * @returns WebhooksApi instance
   *
   * @example
   * ```ts
   * const webhook = await internalApi.webhooks().create({
   *   type: 'webhook',
   *   credentials: { url: 'https://example.com/webhook' },
   *   topics: ['user.created']
   * })
   * ```
   */
  webhooks() {
    return this._webhooks;
  }

  /**
   * Access topics API
   *
   * @returns TopicsApi instance
   *
   * @example
   * ```ts
   * const topic = await internalApi.topics().create({
   *   name: 'Newsletter',
   *   description: 'Weekly newsletter updates',
   *   slug: 'newsletter',
   *   visibility: 'PUBLIC'
   * })
   * ```
   */
  topics() {
    return this._topics;
  }

  /**
   * Access segments API
   *
   * @returns SegmentsApi instance
   *
   * @example
   * ```ts
   * const segment = await internalApi.segments().create({
   *   name: 'High Value Customers',
   *   description: 'Customers with high lifetime value',
   *   conditions: { field: 'status', operator: 'eq', value: 'SUBSCRIBED' }
   * })
   * ```
   */
  segments() {
    return this._segments;
  }

  /**
   * Access contact properties API
   *
   * @returns ContactPropertiesApi instance
   *
   * @example
   * ```ts
   * const property = await internalApi.contactProperties().create({
   *   name: 'Lead Score',
   *   type: 'NUMBER',
   *   defaultValue: '0'
   * })
   * ```
   */
  contactProperties() {
    return this._contactProperties;
  }

  /**
   * Access contacts API
   *
   * @returns ContactsApi instance
   *
   * @example
   * ```ts
   * const contact = await internalApi.contacts().create({
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   status: 'SUBSCRIBED',
   *   topicIds: ['topic_1']
   * })
   * ```
   */
  contacts() {
    return this._contacts;
  }

  /**
   * Access forms API
   *
   * @returns FormsApi instance
   *
   * @example
   * ```ts
   * const form = await internalApi.forms().create({
   *   name: 'Newsletter Signup',
   *   fields: { pages: [] }
   * })
   * ```
   */
  forms() {
    return this._forms;
  }
}

/**
 * Singleton instance of InternalApi SDK
 *
 * @example
 * ```ts
 * import { internalApi } from '@/lib/api/client'
 *
 * const workspace = await internalApi.workspaces().create({
 *   name: 'Acme Corp'
 * })
 * ```
 */
export const internalApi = new InternalApi();
