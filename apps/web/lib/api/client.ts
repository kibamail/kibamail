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

import { ZodError, type ZodType, z } from "zod";
import {
  type CreateApiKeyInput,
  type CreateApiKeyResponse,
  createApiKeyResponseSchema,
  createApiKeySchema,
  type DeleteApiKeyResponse,
  deleteApiKeyResponseSchema,
  type ListApiKeysResponse,
  listApiKeysResponseSchema,
} from "@/app/(main)/api/internal/v1/api-keys/schema";
import type { UploadBroadcastFilesResponse } from "@/app/(main)/api/internal/v1/broadcasts/[broadcastId]/files/schema";
import type { BroadcastReadinessResponse } from "@/app/(main)/api/internal/v1/broadcasts/[broadcastId]/readiness/route";
import type {
  ContactImportResponse,
  CreateContactImportResponse,
  UpdateContactImportRequest,
  UpdateContactImportResponse,
} from "@/app/(main)/api/internal/v1/contact-imports/schema";
import {
  type UpdateInvitationStatusInput,
  type UpdateInvitationStatusResponse,
  updateInvitationStatusResponseSchema,
  updateInvitationStatusSchema,
} from "@/app/(main)/api/internal/v1/invitations/[id]/status/schema";
import {
  type CreateWebhookDestinationInput,
  createWebhookDestinationSchema,
  emptyResponseSchema,
  type ListEventsResponse,
  listEventsResponseSchema,
  type UpdateWebhookDestinationInput,
  updateWebhookDestinationSchema,
  type WebhookDestinationResponse,
  type WebhookEventDeliveriesResponse,
  webhookDestinationResponseSchema,
  webhookEventDeliveriesResponseSchema,
} from "@/app/(main)/api/internal/v1/webhooks/schema";
import {
  type ActivateWorkspaceResponse,
  activateWorkspaceResponseSchema,
} from "@/app/(main)/api/internal/v1/workspaces/[id]/activate/schema";
import type { UpdateLogoResponse } from "@/app/(main)/api/internal/v1/workspaces/[id]/logo/schema";
import {
  type ChangeMemberRoleInput,
  type ChangeMemberRoleResponse,
  changeMemberRoleResponseSchema,
  changeMemberRoleSchema,
  type InviteMembersInput,
  type InviteMembersResponse,
  inviteMembersResponseSchema,
  inviteMembersSchema,
} from "@/app/(main)/api/internal/v1/workspaces/[id]/members/schema";
import {
  type UpdateWorkspaceInput,
  type UpdateWorkspaceResponse,
  updateWorkspaceResponseSchema,
  updateWorkspaceSchema,
} from "@/app/(main)/api/internal/v1/workspaces/[id]/schema";
import {
  type CreateWorkspaceInput,
  type CreateWorkspaceResponse,
  createWorkspaceResponseSchema,
  createWorkspaceSchema,
} from "@/app/(main)/api/internal/v1/workspaces/schema";
import {
  type AutomationListResponse,
  type AutomationResponse,
  automationListResponseSchema,
  automationResponseSchema,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "@/app/(main)/api/v1/automations/schema";
import {
  type BroadcastListResponse,
  type BroadcastResponse,
  broadcastListResponseSchema,
  broadcastResponseSchema,
  type CreateBroadcastRequest,
  type UpdateBroadcastRequest,
} from "@/app/(main)/api/v1/broadcasts/schema";
import {
  type ContactPropertyListResponse,
  type ContactPropertyResponse,
  type CreateContactPropertyRequest,
  contactPropertyListResponseSchema,
  contactPropertyResponseSchema,
  createContactPropertySchema,
} from "@/app/(main)/api/v1/contact-properties/schema";
import {
  type ContactDeleteResponse,
  type ContactResponse,
  type CreateContactRequest,
  contactDeleteResponseSchema,
  contactResponseSchema,
  createContactSchema,
  type UpdateContactRequest,
  updateContactSchema,
} from "@/app/(main)/api/v1/contacts/schema";
import {
  type CreateSendingDomainRequest,
  createSendingDomainSchema,
  type SendingDomainListResponse,
  type SendingDomainResponse,
  type SendingDomainVerifyResponse,
  sendingDomainListResponseSchema,
  sendingDomainResponseSchema,
  sendingDomainVerifyResponseSchema,
  type UpdateSendingDomainRequest,
} from "@/app/(main)/api/v1/domains/schema";
import {
  type CreateFormRequest,
  createFormSchema,
  type FormListResponse,
  type FormResponse,
  type FormSubmissionResponse,
  formListResponseSchema,
  formResponseSchema,
  formSubmissionResponseSchema,
} from "@/app/(main)/api/v1/forms/schema";

/**
 * Form update input type for the API client
 * Extends CreateFormRequest with additional update-only fields
 */
export interface UpdateFormClientInput extends Partial<CreateFormRequest> {
  doubleOptInEmailId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
  seoFaviconUrl?: string | null;
  slug?: string | null;
}

import {
  type UpdateEmailInput,
  updateEmailSchema,
} from "@/app/(main)/api/internal/v1/emails/schema";

/**
 * Create email input type for the API client
 * Simplified version that lets the server apply defaults
 */
export interface CreateEmailClientInput {
  name: string;
  subject?: string;
  previewText?: string;
  content?: unknown;
  styles?: unknown;
  senderIdentityId?: string;
  replyToIdentityId?: string;
  trackClicks?: boolean;
  trackOpens?: boolean;
  type?: "TRANSACTIONAL" | "AUTOMATION" | "NOTIFICATION";
}

import {
  type CreateSegmentRequest,
  createSegmentSchema,
  type SegmentListResponse,
  type SegmentResponse,
  segmentListResponseSchema,
  segmentResponseSchema,
} from "@/app/(main)/api/v1/segments/schema";
import {
  type CreateTopicRequest,
  createTopicSchema,
  type TopicListResponse,
  type TopicResponse,
  topicListResponseSchema,
  topicResponseSchema,
} from "@/app/(main)/api/v1/topics/schema";

type ApiErrorResponse = {
  error:
    | string
    | {
        type?: string;
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };
  fieldErrors?: Record<string, string[]>;
};

/**
 * Custom API error that preserves the full error response
 */
export class ApiClientError extends Error {
  public readonly response: ApiErrorResponse;
  public readonly status: number;

  constructor(message: string, status: number, response: ApiErrorResponse) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.response = response;
  }
}

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
    _requestSchema: ZodType<TRequest> | null,
    _responseSchema: ZodType<TResponse>,
    data?: TRequest,
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
            })),
        );

        const zodError = new ZodError(issues);
        throw zodError;
      }

      // Throw ApiClientError to preserve full error response
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Request failed";
      throw new ApiClientError(errorMessage, response.status, errorData);
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
    data: UpdateInvitationStatusInput,
  ): Promise<UpdateInvitationStatusResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/invitations/${invitationId}/status`,
      updateInvitationStatusSchema,
      updateInvitationStatusResponseSchema,
      data,
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
    await this.request(
      "DELETE",
      `/api/internal/v1/invitations/${invitationId}`,
      null,
      emptyResponseSchema,
    );
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
      data,
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
    data: ChangeMemberRoleInput,
  ): Promise<ChangeMemberRoleResponse> {
    return this.request(
      "PATCH",
      `/api/internal/v1/workspaces/${this.workspaceId}/members/${memberId}/role`,
      changeMemberRoleSchema,
      changeMemberRoleResponseSchema,
      data,
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
      data,
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
      activateWorkspaceResponseSchema,
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
    logoFile: File,
  ): Promise<UpdateLogoResponse> {
    const formData = new FormData();
    formData.append("logo", logoFile);

    const response = await fetch(
      `/api/internal/v1/workspaces/${workspaceId}/logo`,
      {
        method: "PATCH",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Logo upload failed";
      throw new ApiClientError(errorMessage, response.status, errorData);
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
    data: UpdateWorkspaceInput,
  ): Promise<UpdateWorkspaceResponse> {
    return this.request(
      "PATCH",
      `/api/internal/v1/workspaces/${workspaceId}`,
      updateWorkspaceSchema,
      updateWorkspaceResponseSchema,
      data,
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
  async create(
    data: CreateWebhookDestinationInput,
  ): Promise<WebhookDestinationResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/webhooks",
      createWebhookDestinationSchema,
      webhookDestinationResponseSchema,
      data,
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
    data: UpdateWebhookDestinationInput,
  ): Promise<WebhookDestinationResponse> {
    return this.request(
      "PATCH",
      `/api/internal/v1/webhooks/${webhookId}`,
      updateWebhookDestinationSchema,
      webhookDestinationResponseSchema,
      data,
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
    await this.request(
      "DELETE",
      `/api/internal/v1/webhooks/${webhookId}`,
      null,
      emptyResponseSchema,
    );
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
  async enable(webhookId: string): Promise<WebhookDestinationResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/webhooks/${webhookId}/enable`,
      null,
      webhookDestinationResponseSchema,
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
  async disable(webhookId: string): Promise<WebhookDestinationResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/webhooks/${webhookId}/disable`,
      null,
      webhookDestinationResponseSchema,
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
    },
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
    eventId: string,
  ): Promise<WebhookEventDeliveriesResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/webhooks/${webhookId}/events/${eventId}/deliveries`,
      null,
      webhookEventDeliveriesResponseSchema,
    );
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
      data,
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
      listApiKeysResponseSchema,
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
      deleteApiKeyResponseSchema,
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
      data,
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
      segmentListResponseSchema,
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
      segmentResponseSchema,
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
  async update(
    segmentId: string,
    data: Partial<CreateSegmentRequest>,
  ): Promise<SegmentResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/segments/${segmentId}`,
      null,
      segmentResponseSchema,
      data,
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
      segmentResponseSchema,
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
  async create(
    data: CreateContactPropertyRequest,
  ): Promise<ContactPropertyResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/contact-properties",
      createContactPropertySchema,
      contactPropertyResponseSchema,
      data,
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
      contactPropertyListResponseSchema,
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
    data: Partial<CreateContactPropertyRequest>,
  ): Promise<ContactPropertyResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/contact-properties/${propertyId}`,
      null,
      contactPropertyResponseSchema,
      data,
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
      contactPropertyResponseSchema,
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
      data,
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
      topicListResponseSchema,
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
      topicResponseSchema,
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
  async update(
    topicId: string,
    data: Partial<CreateTopicRequest>,
  ): Promise<TopicResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/topics/${topicId}`,
      null,
      topicResponseSchema,
      data,
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
      topicResponseSchema,
    );
  }
}

/**
 * Contacts API namespace
 */
class ContactsApi extends HttpClient {
  /**
   * Get a contact by ID
   *
   * @param contactId - ID of the contact to fetch
   * @returns Contact with topics
   *
   * @example
   * ```ts
   * const contact = await internalApi.contacts().get('contact_123')
   * ```
   */
  async get(contactId: string): Promise<ContactResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/contacts/${contactId}`,
      null,
      contactResponseSchema,
    );
  }

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
  async create(data: CreateContactRequest): Promise<ContactResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/contacts",
      createContactSchema,
      contactResponseSchema,
      data,
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
    data: UpdateContactRequest,
  ): Promise<ContactResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/contacts/${contactId}`,
      updateContactSchema,
      contactResponseSchema,
      data,
    );
  }

  /**
   * Delete a contact
   *
   * @param contactId - ID of the contact to delete
   * @returns Deleted contact info
   *
   * @example
   * ```ts
   * await internalApi.contacts().delete('contact_123')
   * ```
   */
  async delete(contactId: string): Promise<ContactDeleteResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/contacts/${contactId}`,
      null,
      contactDeleteResponseSchema,
    );
  }
}

/**
 * Contact Imports API
 *
 * Internal API for contact import operations.
 */
class ContactImportsApi {
  /**
   * Create a new contact import by uploading a CSV file
   *
   * Uses XMLHttpRequest for upload progress tracking.
   *
   * @param file - CSV file to upload
   * @param onProgress - Optional callback for upload progress (0-100)
   * @returns Created contact import with ID
   *
   * @example
   * ```ts
   * const result = await internalApi.contactImports().create(
   *   csvFile,
   *   (progress) => console.log(`${progress}% uploaded`)
   * )
   * console.log('Import ID:', result.id)
   * ```
   */
  async create(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<CreateContactImportResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new Error("Failed to parse response"));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMessage =
              typeof errorData.error === "string"
                ? errorData.error
                : errorData.error?.message || "Upload failed";
            reject(new Error(errorMessage));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", "/api/internal/v1/contact-imports");
      xhr.send(formData);
    });
  }

  /**
   * Get a contact import by ID
   *
   * @param id - Contact import ID
   * @returns Contact import details
   *
   * @example
   * ```ts
   * const import = await internalApi.contactImports().get('import_123')
   * console.log('Status:', import.status)
   * ```
   */
  async get(id: string): Promise<ContactImportResponse> {
    const response = await fetch(`/api/internal/v1/contact-imports/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Failed to get contact import";
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Update a contact import with column mapping and settings
   *
   * @param id - Contact import ID
   * @param data - Update data (columnMapping, topicIds, autoSubscribe, updateExisting)
   * @returns Updated contact import
   *
   * @example
   * ```ts
   * const result = await internalApi.contactImports().update('import_123', {
   *   columnMapping: { email: 'Email Address', firstName: 'First Name' },
   *   topicIds: ['topic_1', 'topic_2'],
   *   autoSubscribe: true,
   *   updateExisting: false
   * })
   * ```
   */
  async update(
    id: string,
    data: UpdateContactImportRequest,
  ): Promise<UpdateContactImportResponse> {
    const response = await fetch(`/api/internal/v1/contact-imports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Failed to update contact import";
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

/**
 * Forms API
 *
 * Internal API for form management.
 */
class FormsApi extends HttpClient {
  /**
   * List all forms
   *
   * @returns List of forms with pagination info
   *
   * @example
   * ```ts
   * const { data: forms, hasMore } = await internalApi.forms().list()
   * ```
   */
  async list(): Promise<FormListResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/forms",
      null,
      formListResponseSchema,
    );
  }

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
      data,
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
    data: UpdateFormClientInput,
  ): Promise<FormResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/forms/${formId}`,
      null,
      formResponseSchema,
      data,
    );
  }

  /**
   * Publish a form
   *
   * @param formId - ID of the form to publish
   * @returns Published form
   *
   * @example
   * ```ts
   * const form = await internalApi.forms().publish('form_123')
   * ```
   */
  async publish(formId: string): Promise<FormResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/forms/${formId}/publish`,
      null,
      formResponseSchema,
    );
  }

  /**
   * Create a new version (draft) of a form
   *
   * @param formId - ID of the form to create a version from
   * @returns Created form version
   *
   * @example
   * ```ts
   * const newVersion = await internalApi.forms().createVersion('form_123')
   * ```
   */
  async createVersion(formId: string): Promise<FormResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/forms/${formId}/versions`,
      null,
      formResponseSchema,
      {},
    );
  }

  /**
   * Submit data to a public form (no authentication required)
   *
   * @param formId - ID of the root form to submit to
   * @param data - Form submission data
   * @returns Submission result with ID
   *
   * @example
   * ```ts
   * const result = await internalApi.forms().submitPublic('form_123', {
   *   email: 'user@example.com',
   *   firstName: 'John'
   * })
   * console.log(result.data.id) // Submission ID
   * ```
   */
  async submitPublic(
    formId: string,
    data: Record<string, unknown>,
  ): Promise<FormSubmissionResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/forms/${formId}/submissions`,
      null,
      formSubmissionResponseSchema,
      data,
    );
  }

  /**
   * Track a page view for a public form (no authentication required)
   *
   * @param formId - ID of the root form being viewed
   * @returns Page view result with ID
   *
   * @example
   * ```ts
   * await internalApi.forms().trackView('form_123')
   * ```
   */
  async trackView(formId: string): Promise<void> {
    await fetch(`/api/internal/v1/forms/${formId}/views`, {
      method: "POST",
    });
  }

  /**
   * Delete a form
   *
   * @param formId - ID of the form to delete
   * @returns Deleted form info
   *
   * @example
   * ```ts
   * await internalApi.forms().delete('form_123')
   * ```
   */
  async delete(formId: string): Promise<FormResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/forms/${formId}`,
      null,
      formResponseSchema,
    );
  }

  /**
   * Upload SEO asset (image or favicon) for a form
   *
   * @param formId - ID of the form
   * @param assetType - Type of asset ('seo-image' or 'favicon')
   * @param file - The file to upload
   * @returns Upload result with URL
   *
   * @example
   * ```ts
   * const result = await internalApi.forms().uploadSeoAsset('form_123', 'seo-image', file)
   * console.log(result.url) // URL of uploaded image
   * ```
   */
  async uploadSeoAsset(
    formId: string,
    assetType: "seo-image" | "favicon",
    file: File,
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
      `/api/internal/v1/forms/${formId}/${assetType}`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to upload ${assetType}`);
    }

    return response.json();
  }

  /**
   * Delete SEO asset (image or favicon) from a form
   *
   * @param formId - ID of the form
   * @param assetType - Type of asset ('seo-image' or 'favicon')
   *
   * @example
   * ```ts
   * await internalApi.forms().deleteSeoAsset('form_123', 'seo-image')
   * ```
   */
  async deleteSeoAsset(
    formId: string,
    assetType: "seo-image" | "favicon",
  ): Promise<void> {
    const response = await fetch(
      `/api/internal/v1/forms/${formId}/${assetType}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete ${assetType}`);
    }
  }

  /**
   * Upload a content image for use in form content blocks or success messages
   *
   * @param formId - ID of the form
   * @param file - The image file to upload
   * @returns Upload result with URL
   *
   * @example
   * ```ts
   * const result = await internalApi.forms().uploadContentImage('form_123', file)
   * console.log(result.url) // URL of uploaded image
   * ```
   */
  async uploadContentImage(
    formId: string,
    file: File,
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
      `/api/internal/v1/forms/${formId}/content-image`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload content image");
    }

    return response.json();
  }
}

/**
 * Automations API
 *
 * Internal API for automation management.
 */
class AutomationsApi extends HttpClient {
  /**
   * List all automations
   *
   * @param params - Query parameters (status, limit, after, before)
   * @returns List of automations with pagination info
   *
   * @example
   * ```ts
   * const { data: automations, hasMore } = await internalApi.automations().list()
   * ```
   */
  async list(params?: {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<AutomationListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set("status", params.status);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.after) queryParams.set("after", params.after);
    if (params?.before) queryParams.set("before", params.before);

    const queryString = queryParams.toString();
    const url = `/api/internal/v1/automations${queryString ? `?${queryString}` : ""}`;

    return this.request("GET", url, null, automationListResponseSchema);
  }

  /**
   * Get a specific automation by ID
   *
   * @param automationId - ID of the automation to retrieve
   * @returns Automation data
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().get('automation_123')
   * ```
   */
  async get(automationId: string): Promise<AutomationResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/automations/${automationId}`,
      null,
      automationResponseSchema,
    );
  }

  /**
   * Create a new automation
   *
   * @param data - Automation creation data (only name is required)
   * @returns Created automation
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().create({
   *   name: 'Welcome Email Sequence',
   *   description: 'Send welcome emails to new subscribers'
   * })
   * ```
   */
  async create(data: CreateAutomationInput): Promise<AutomationResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/automations",
      null,
      automationResponseSchema,
      data,
    );
  }

  /**
   * Update an existing automation
   *
   * @param automationId - ID of the automation to update
   * @param data - Automation update data
   * @returns Updated automation
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().update('automation_123', {
   *   name: 'Updated Automation Name',
   *   nodes: [...],
   *   edges: [...]
   * })
   * ```
   */
  async update(
    automationId: string,
    data: UpdateAutomationInput,
  ): Promise<AutomationResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/automations/${automationId}`,
      null,
      automationResponseSchema,
      data,
    );
  }

  /**
   * Delete an automation
   *
   * @param automationId - ID of the automation to delete
   * @returns Deleted automation info
   *
   * @example
   * ```ts
   * await internalApi.automations().delete('automation_123')
   * ```
   */
  async delete(automationId: string): Promise<AutomationResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/automations/${automationId}`,
      null,
      automationResponseSchema,
    );
  }

  /**
   * Publish an automation
   *
   * @param automationId - ID of the automation to publish
   * @returns Published automation
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().publish('automation_123')
   * ```
   */
  async publish(automationId: string): Promise<AutomationResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/automations/${automationId}/publish`,
      null,
      automationResponseSchema,
    );
  }

  /**
   * Archive an automation
   *
   * @param automationId - ID of the automation to archive
   * @returns Archived automation
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().archive('automation_123')
   * ```
   */
  async archive(automationId: string): Promise<AutomationResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/automations/${automationId}/archive`,
      null,
      automationResponseSchema,
    );
  }

  /**
   * List all versions of an automation
   *
   * @param automationId - ID of the automation
   * @returns List of automation versions
   *
   * @example
   * ```ts
   * const versions = await internalApi.automations().listVersions('automation_123')
   * ```
   */
  async listVersions(automationId: string): Promise<AutomationListResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/automations/${automationId}/versions`,
      null,
      automationListResponseSchema,
    );
  }

  /**
   * Create a new version of an automation
   *
   * @param automationId - ID of the automation to create a version from
   * @param data - Optional overrides for the new version
   * @returns Created automation version
   *
   * @example
   * ```ts
   * const newVersion = await internalApi.automations().createVersion('automation_123', {
   *   name: 'Updated Version'
   * })
   * ```
   */
  async createVersion(
    automationId: string,
    data?: { name?: string; description?: string },
  ): Promise<AutomationResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/automations/${automationId}/versions`,
      null,
      automationResponseSchema,
      data || {},
    );
  }

  /**
   * Rollback to an archived version of an automation
   *
   * @param automationId - ID of the archived automation version to rollback to
   * @returns Rolled back automation (now published)
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().rollback('automation_123')
   * ```
   */
  async rollback(automationId: string): Promise<AutomationResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/automations/${automationId}/rollback`,
      null,
      automationResponseSchema,
    );
  }
}

/**
 * Sender Identities API namespace
 */
class SenderIdentitiesApi extends HttpClient {
  /**
   * List all sender identities
   *
   * @returns List of sender identities
   *
   * @example
   * ```ts
   * const { data } = await internalApi.senderIdentities().list()
   * ```
   */
  async list(): Promise<{
    object: string;
    data: Array<{
      id: string;
      name: string;
      email: string;
      localPart: string;
      domain: string;
      domainId: string;
      replyToEmail: string | null;
      verified: boolean;
      createdAt: string;
    }>;
    hasMore: boolean;
  }> {
    const response = await fetch("/api/internal/v1/sender-identities", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiClientError(
        errorData.error?.message || "Failed to fetch sender identities",
        response.status,
        errorData,
      );
    }

    return response.json();
  }

  /**
   * Create a new sender identity
   *
   * @param data - The sender identity data
   * @returns Created sender identity
   *
   * @example
   * ```ts
   * const identity = await internalApi.senderIdentities().create({
   *   name: "Newsletter Team",
   *   email: "newsletter",
   *   sendingDomainId: "domain-id"
   * })
   * ```
   */
  async create(data: {
    name: string;
    email: string;
    sendingDomainId: string;
  }): Promise<{
    object: string;
    id: string;
    name: string;
    email: string;
    localPart: string;
    domain: string;
    domainId: string;
    replyToEmail: string | null;
    verified: boolean;
    createdAt: string;
  }> {
    const response = await fetch("/api/internal/v1/sender-identities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiClientError(
        errorData.error?.message || "Failed to create sender identity",
        response.status,
        errorData,
      );
    }

    return response.json();
  }

  /**
   * Update a sender identity
   *
   * @param id - The sender identity ID
   * @param data - The update data
   * @returns Updated sender identity
   *
   * @example
   * ```ts
   * const identity = await internalApi.senderIdentities().update("id", {
   *   name: "Updated Name",
   *   replyToEmail: "reply@example.com"
   * })
   * ```
   */
  async update(
    id: string,
    data: { name?: string; replyToEmail?: string | null },
  ): Promise<{
    object: string;
    id: string;
    name: string;
    email: string;
    localPart: string;
    domain: string;
    domainId: string;
    replyToEmail: string | null;
    verified: boolean;
    createdAt: string;
  }> {
    const response = await fetch(`/api/internal/v1/sender-identities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiClientError(
        errorData.error?.message || "Failed to update sender identity",
        response.status,
        errorData,
      );
    }

    return response.json();
  }

  /**
   * Delete a sender identity
   *
   * @param id - The sender identity ID
   * @returns Deletion confirmation
   *
   * @example
   * ```ts
   * await internalApi.senderIdentities().delete("id")
   * ```
   */
  async delete(id: string): Promise<{ object: string; deleted: boolean }> {
    const response = await fetch(`/api/internal/v1/sender-identities/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiClientError(
        errorData.error?.message || "Failed to delete sender identity",
        response.status,
        errorData,
      );
    }

    return response.json();
  }
}

/**
 * Broadcasts API namespace
 */
class BroadcastsApi extends HttpClient {
  /**
   * List all broadcasts
   *
   * @param params - Query parameters (limit, after, before)
   * @returns List of broadcasts with pagination info
   *
   * @example
   * ```ts
   * const { data: broadcasts, hasMore } = await internalApi.broadcasts().list()
   * ```
   */
  async list(params?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<BroadcastListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.after) queryParams.set("after", params.after);
    if (params?.before) queryParams.set("before", params.before);

    const queryString = queryParams.toString();
    const url = `/api/internal/v1/broadcasts${queryString ? `?${queryString}` : ""}`;

    return this.request("GET", url, null, broadcastListResponseSchema);
  }

  /**
   * Get a specific broadcast by ID
   *
   * @param broadcastId - ID of the broadcast to retrieve
   * @returns Broadcast data
   *
   * @example
   * ```ts
   * const broadcast = await internalApi.broadcasts().get('broadcast_123')
   * ```
   */
  async get(broadcastId: string): Promise<BroadcastResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/broadcasts/${broadcastId}`,
      null,
      broadcastResponseSchema,
    );
  }

  /**
   * Create a new broadcast
   *
   * @param data - Broadcast creation data
   * @returns Created broadcast
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const broadcast = await internalApi.broadcasts().create({
   *   name: 'Welcome Newsletter',
   *   from: 'news@example.com'
   * })
   * ```
   */
  async create(data: CreateBroadcastRequest): Promise<BroadcastResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/broadcasts",
      null,
      broadcastResponseSchema,
      data,
    );
  }

  /**
   * Update an existing broadcast
   *
   * @param broadcastId - ID of the broadcast to update
   * @param data - Broadcast update data
   * @returns Updated broadcast
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const broadcast = await internalApi.broadcasts().update('broadcast_123', {
   *   name: 'Updated Newsletter'
   * })
   * ```
   */
  async update(
    broadcastId: string,
    data: UpdateBroadcastRequest,
  ): Promise<BroadcastResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/broadcasts/${broadcastId}`,
      null,
      broadcastResponseSchema,
      data,
    );
  }

  /**
   * Delete a broadcast
   *
   * @param broadcastId - ID of the broadcast to delete
   * @returns Deleted broadcast info
   *
   * @example
   * ```ts
   * await internalApi.broadcasts().delete('broadcast_123')
   * ```
   */
  async delete(broadcastId: string): Promise<BroadcastResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/broadcasts/${broadcastId}`,
      null,
      broadcastResponseSchema,
    );
  }

  /**
   * Schedule a broadcast for sending
   *
   * Performs readiness checks and schedules the broadcast job
   * to run 5 minutes before the broadcast's sendAt time.
   *
   * @param broadcastId - ID of the broadcast to send
   * @returns Updated broadcast
   *
   * @example
   * ```ts
   * const broadcast = await internalApi.broadcasts().send('broadcast_123')
   * ```
   */
  async send(broadcastId: string): Promise<BroadcastResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/broadcasts/${broadcastId}/send`,
      null,
      broadcastResponseSchema,
    );
  }

  /**
   * Upload files for a broadcast
   *
   * @param broadcastId - ID of the broadcast
   * @param files - Array of files to upload
   * @returns Upload result with file URLs
   *
   * @example
   * ```ts
   * const input = document.querySelector('input[type="file"]');
   * const files = Array.from(input.files);
   * const result = await internalApi.broadcasts().uploadFiles('broadcast_123', files)
   * console.log(result.files) // Array of uploaded file info with URLs
   * ```
   */
  async uploadFiles(
    broadcastId: string,
    files: File[],
  ): Promise<UploadBroadcastFilesResponse> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(
      `/api/internal/v1/broadcasts/${broadcastId}/files`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "File upload failed";
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    return response.json();
  }

  async preview(
    broadcastId: string,
  ): Promise<{ html: string; hasContent: boolean }> {
    const response = await fetch(
      `/api/internal/v1/broadcasts/${broadcastId}/preview`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Preview generation failed";
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    return response.json();
  }

  async readiness(broadcastId: string): Promise<BroadcastReadinessResponse> {
    const response = await fetch(
      `/api/internal/v1/broadcasts/${broadcastId}/readiness`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Readiness check failed";
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    return response.json();
  }

  /**
   * Send test emails for a broadcast
   *
   * Sends the broadcast content to the provided email addresses
   * without scheduling or affecting the broadcast status.
   *
   * @param broadcastId - ID of the broadcast
   * @param emails - Array of email addresses to send to (max 10)
   * @returns Success response with email count
   *
   * @example
   * ```ts
   * await internalApi.broadcasts().sendTest('broadcast_123', ['test@example.com'])
   * ```
   */
  async sendTest(
    broadcastId: string,
    emails: string[],
  ): Promise<{ success: boolean; message: string; emailCount: number }> {
    const response = await fetch(
      `/api/internal/v1/broadcasts/${broadcastId}/send-test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      },
    );

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();
      const errorMessage =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || "Failed to send test emails";
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    return response.json();
  }

  /**
   * Duplicate a broadcast
   *
   * Creates a copy of the broadcast with all its settings and email content.
   *
   * @param broadcastId - ID of the broadcast to duplicate
   * @returns New broadcast ID
   *
   * @example
   * ```ts
   * const { id } = await internalApi.broadcasts().duplicate('broadcast_123')
   * ```
   */
  async duplicate(
    broadcastId: string,
  ): Promise<{ object: string; id: string }> {
    return this.request(
      "POST",
      `/api/internal/v1/broadcasts/${broadcastId}/duplicate`,
      null,
      z.object({ object: z.string(), id: z.string() }),
    );
  }
}

/**
 * Email response type for API
 */
export interface EmailResponse {
  object: "email";
  id: string;
  name: string;
  subject?: string | null;
  previewText?: string | null;
  content?: unknown;
  styles?: unknown;
  senderIdentityId?: string | null;
  replyToIdentityId?: string | null;
  trackClicks: boolean;
  trackOpens: boolean;
  type: "TRANSACTIONAL" | "AUTOMATION" | "NOTIFICATION";
  createdAt: string;
  updatedAt: string;
}

/**
 * Email list response type for API
 */
export interface EmailListResponse {
  object: "email_list";
  data: EmailResponse[];
  hasMore: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/**
 * Emails API namespace
 */
class EmailsApi extends HttpClient {
  /**
   * Create a new email
   *
   * @param data - Email creation data
   * @returns Created email
   *
   * @example
   * ```ts
   * const email = await internalApi.emails().create({
   *   name: 'Double Opt-In Email',
   *   subject: 'Please confirm your subscription',
   *   type: 'TRANSACTIONAL'
   * })
   * ```
   */
  async create(data: CreateEmailClientInput): Promise<EmailResponse> {
    return this.request("POST", "/api/internal/v1/emails", null, z.any(), data);
  }

  /**
   * List all emails for the workspace
   *
   * @param params - Query parameters (type, limit, after, before)
   * @returns List of emails with pagination info
   *
   * @example
   * ```ts
   * const { data: emails, hasMore } = await internalApi.emails().list({ type: 'TRANSACTIONAL' })
   * ```
   */
  async list(params?: {
    type?: "TRANSACTIONAL" | "AUTOMATION" | "NOTIFICATION";
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<EmailListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set("type", params.type);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.after) queryParams.set("after", params.after);
    if (params?.before) queryParams.set("before", params.before);

    const queryString = queryParams.toString();
    const url = `/api/internal/v1/emails${queryString ? `?${queryString}` : ""}`;

    return this.request("GET", url, null, z.any());
  }

  /**
   * Get a specific email by ID
   *
   * @param emailId - ID of the email to retrieve
   * @returns Email data
   *
   * @example
   * ```ts
   * const email = await internalApi.emails().get('email_123')
   * ```
   */
  async get(emailId: string): Promise<EmailResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/emails/${emailId}`,
      null,
      z.any(),
    );
  }

  /**
   * Update an existing email
   *
   * @param emailId - ID of the email to update
   * @param data - Email update data
   * @returns Updated email
   *
   * @example
   * ```ts
   * const email = await internalApi.emails().update('email_123', {
   *   subject: 'Updated subject'
   * })
   * ```
   */
  async update(
    emailId: string,
    data: UpdateEmailInput,
  ): Promise<EmailResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/emails/${emailId}`,
      updateEmailSchema,
      z.any(),
      data,
    );
  }

  /**
   * Delete an email
   *
   * @param emailId - ID of the email to delete
   * @returns Deleted email info
   *
   * @example
   * ```ts
   * await internalApi.emails().delete('email_123')
   * ```
   */
  async delete(emailId: string): Promise<EmailResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/emails/${emailId}`,
      null,
      z.any(),
    );
  }

  /**
   * Get the HTML preview of an email
   *
   * @param emailId - ID of the email to preview
   * @returns Preview HTML and content status
   *
   * @example
   * ```ts
   * const { html, hasContent } = await internalApi.emails().preview('email_123')
   * ```
   */
  async preview(
    emailId: string,
  ): Promise<{ html: string; hasContent: boolean }> {
    return this.request(
      "GET",
      `/api/internal/v1/emails/${emailId}/preview`,
      null,
      z.any(),
    );
  }
}

/**
 * Sending Domains API namespace
 */
class DomainsApi extends HttpClient {
  /**
   * List all sending domains
   *
   * @returns List of sending domains with pagination info
   *
   * @example
   * ```ts
   * const { data: domains, hasMore } = await internalApi.domains().list()
   * ```
   */
  async list(): Promise<SendingDomainListResponse> {
    return this.request(
      "GET",
      "/api/internal/v1/domains",
      null,
      sendingDomainListResponseSchema,
    );
  }

  /**
   * Get a specific sending domain by ID
   *
   * @param domainId - ID of the domain to retrieve
   * @returns Sending domain data
   *
   * @example
   * ```ts
   * const domain = await internalApi.domains().get('domain_123')
   * ```
   */
  async get(domainId: string): Promise<SendingDomainResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/domains/${domainId}`,
      null,
      sendingDomainResponseSchema,
    );
  }

  /**
   * Create a new sending domain
   *
   * @param data - Domain creation data (only name is required)
   * @returns Created domain with DNS records
   * @throws ZodError if validation fails
   *
   * @example
   * ```ts
   * const domain = await internalApi.domains().create({
   *   name: 'example.com'
   * })
   * ```
   */
  async create(
    data: CreateSendingDomainRequest,
  ): Promise<SendingDomainResponse> {
    return this.request(
      "POST",
      "/api/internal/v1/domains",
      createSendingDomainSchema,
      sendingDomainResponseSchema,
      data,
    );
  }

  /**
   * Delete a sending domain
   *
   * @param domainId - ID of the domain to delete
   * @returns Deleted domain info
   *
   * @example
   * ```ts
   * await internalApi.domains().delete('domain_123')
   * ```
   */
  async delete(domainId: string): Promise<SendingDomainResponse> {
    return this.request(
      "DELETE",
      `/api/internal/v1/domains/${domainId}`,
      null,
      sendingDomainResponseSchema,
    );
  }

  /**
   * Update a sending domain
   *
   * @param domainId - ID of the domain to update
   * @param data - Update data (openTrackingEnabled, clickTrackingEnabled)
   * @returns Updated domain
   *
   * @example
   * ```ts
   * const domain = await internalApi.domains().update('domain_123', {
   *   openTrackingEnabled: true,
   *   clickTrackingEnabled: false
   * })
   * ```
   */
  async update(
    domainId: string,
    data: UpdateSendingDomainRequest,
  ): Promise<SendingDomainResponse> {
    return this.request(
      "PUT",
      `/api/internal/v1/domains/${domainId}`,
      null,
      sendingDomainResponseSchema,
      data,
    );
  }

  /**
   * Verify DNS configuration for a sending domain
   *
   * @param domainId - ID of the domain to verify
   * @returns Domain data with verification results
   *
   * @example
   * ```ts
   * const result = await internalApi.domains().verify('domain_123')
   * console.log(result.verification.allVerified) // true/false
   * ```
   */
  async verify(domainId: string): Promise<SendingDomainVerifyResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/domains/${domainId}/verify`,
      null,
      sendingDomainVerifyResponseSchema,
    );
  }

  /**
   * Retry SSL certificate issuance for a sending domain
   *
   * @param domainId - ID of the domain to retry SSL for
   * @returns Updated domain with new SSL status
   *
   * @example
   * ```ts
   * const domain = await internalApi.domains().retrySsl('domain_123')
   * console.log(domain.sslStatus) // "pending"
   * ```
   */
  async retrySsl(domainId: string): Promise<SendingDomainResponse> {
    return this.request(
      "POST",
      `/api/internal/v1/domains/${domainId}/retry-ssl`,
      null,
      sendingDomainResponseSchema,
    );
  }
}

/**
 * Email template response type for API
 */
export interface EmailTemplateResponse {
  object: "email_template";
  id: string;
  name: string;
  description?: string | null;
  uniqueSlug?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  emailContentId?: string | null;
  emailContent?: {
    subject?: string | null;
    previewText?: string | null;
    contentJson?: unknown;
    styles?: unknown;
    contentHtml?: string | null;
    contentText?: string | null;
  } | null;
  senderIdentityId?: string | null;
  senderIdentity?: {
    id: string;
    name: string;
    email: string;
  } | null;
  replyToIdentityId?: string | null;
  replyToIdentity?: {
    id: string;
    name: string;
    email: string;
  } | null;
  trackClicks: boolean;
  trackOpens: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template list response type for API
 */
export interface EmailTemplateListResponse {
  object: "email_template_list";
  data: Array<{
    id: string;
    name: string;
    description?: string | null;
    uniqueSlug?: string | null;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    version: number;
    createdAt: string;
    updatedAt: string;
  }>;
  hasMore: boolean;
}

/**
 * Email Templates API namespace
 */
class EmailTemplatesApi extends HttpClient {
  /**
   * Create a new email template
   *
   * @param data - Template creation data (only name is required)
   * @returns Created template
   *
   * @example
   * ```ts
   * const template = await internalApi.emailTemplates().create({
   *   name: 'Welcome Email Template'
   * })
   * ```
   */
  async create(data: {
    name: string;
    description?: string;
    uniqueSlug?: string;
    trackClicks?: boolean;
    trackOpens?: boolean;
  }): Promise<{ object: "email_template"; id: string }> {
    return this.request(
      "POST",
      "/api/internal/v1/email-templates",
      null,
      z.any(),
      data,
    );
  }

  /**
   * List all email templates for the workspace
   *
   * @param params - Query parameters (limit, after, before)
   * @returns List of templates with pagination info
   *
   * @example
   * ```ts
   * const { data: templates, hasMore } = await internalApi.emailTemplates().list()
   * ```
   */
  async list(params?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<EmailTemplateListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.after) queryParams.set("after", params.after);
    if (params?.before) queryParams.set("before", params.before);

    const queryString = queryParams.toString();
    const url = `/api/internal/v1/email-templates${queryString ? `?${queryString}` : ""}`;

    return this.request("GET", url, null, z.any());
  }

  /**
   * Get a specific email template by ID
   *
   * @param templateId - ID of the template to retrieve
   * @returns Template data with full content
   *
   * @example
   * ```ts
   * const template = await internalApi.emailTemplates().get('template_123')
   * ```
   */
  async get(templateId: string): Promise<EmailTemplateResponse> {
    return this.request(
      "GET",
      `/api/internal/v1/email-templates/${templateId}`,
      null,
      z.any(),
    );
  }

  /**
   * Update an existing email template
   *
   * @param templateId - ID of the template to update
   * @param data - Template update data
   * @returns Updated template
   *
   * @example
   * ```ts
   * const template = await internalApi.emailTemplates().update('template_123', {
   *   name: 'Updated Template Name',
   *   senderIdentityId: 'sender_123',
   *   emailContent: { subject: 'Welcome', contentJson: {...} }
   * })
   * ```
   */
  async update(
    templateId: string,
    data: {
      name?: string;
      description?: string | null;
      uniqueSlug?: string | null;
      senderIdentityId?: string | null;
      replyToIdentityId?: string | null;
      trackClicks?: boolean;
      trackOpens?: boolean;
      emailContent?: {
        subject?: string | null;
        previewText?: string | null;
        contentJson?: unknown;
        styles?: unknown;
        variables?: Array<{ id: string; name: string; type: "text" | "number" }>;
      };
    },
  ): Promise<{ object: "email_template"; id: string }> {
    return this.request(
      "PUT",
      `/api/internal/v1/email-templates/${templateId}`,
      null,
      z.any(),
      data,
    );
  }

  /**
   * Get the HTML preview of an email template
   *
   * @param templateId - ID of the template to preview
   * @returns Preview HTML and content status
   *
   * @example
   * ```ts
   * const { html, hasContent } = await internalApi.emailTemplates().preview('template_123')
   * ```
   */
  async preview(
    templateId: string,
  ): Promise<{ html: string; hasContent: boolean }> {
    return this.request(
      "GET",
      `/api/internal/v1/email-templates/${templateId}/preview`,
      null,
      z.any(),
    );
  }

  /**
   * Delete an email template
   *
   * @param templateId - ID of the template to delete
   * @returns Deleted template info
   *
   * @example
   * ```ts
   * await internalApi.emailTemplates().delete('template_123')
   * ```
   */
  async delete(
    templateId: string,
  ): Promise<{ object: "email_template"; id: string }> {
    return this.request(
      "DELETE",
      `/api/internal/v1/email-templates/${templateId}`,
      null,
      z.any(),
    );
  }

  /**
   * Publish an email template
   *
   * @param templateId - ID of the template to publish
   * @returns Published template info
   *
   * @example
   * ```ts
   * await internalApi.emailTemplates().publish('template_123')
   * ```
   */
  async publish(
    templateId: string,
  ): Promise<{ object: "email_template"; id: string }> {
    return this.request(
      "POST",
      `/api/internal/v1/email-templates/${templateId}/publish`,
      null,
      z.any(),
    );
  }

  /**
   * Create a new version of an email template
   *
   * @param templateId - ID of the template to create a version from
   * @returns New version info
   *
   * @example
   * ```ts
   * const newVersion = await internalApi.emailTemplates().createVersion('template_123')
   * ```
   */
  async createVersion(
    templateId: string,
  ): Promise<{ object: "email_template"; id: string }> {
    return this.request(
      "POST",
      `/api/internal/v1/email-templates/${templateId}/versions`,
      null,
      z.any(),
      {},
    );
  }

  /**
   * List all versions of an email template
   *
   * @param templateId - ID of the template to list versions for
   * @returns List of versions with metadata
   *
   * @example
   * ```ts
   * const versions = await internalApi.emailTemplates().listVersions('template_123')
   * ```
   */
  async listVersions(templateId: string): Promise<{
    object: "email_template_versions";
    data: Array<{
      id: string;
      name: string;
      version: number;
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      isLive: boolean;
      publishedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    rootTemplateId: string;
    publishedVersionId: string | null;
  }> {
    return this.request(
      "GET",
      `/api/internal/v1/email-templates/${templateId}/versions`,
      null,
      z.any(),
    );
  }
}

/**
 * Internal API SDK
 *
 * Provides namespaced, type-safe methods for all internal API endpoints.
 */
class InternalApi {
  private _workspaces: WorkspacesApi;
  private _invitations: InvitationsApi;
  private _apiKeys: ApiKeysApi;
  private _webhooks: WebhooksApi;
  private _topics: TopicsApi;
  private _segments: SegmentsApi;
  private _contactProperties: ContactPropertiesApi;
  private _contacts: ContactsApi;
  private _contactImports: ContactImportsApi;
  private _forms: FormsApi;
  private _automations: AutomationsApi;
  private _domains: DomainsApi;
  private _broadcasts: BroadcastsApi;
  private _senderIdentities: SenderIdentitiesApi;
  private _emails: EmailsApi;
  private _emailTemplates: EmailTemplatesApi;

  constructor() {
    this._workspaces = new WorkspacesApi();
    this._invitations = new InvitationsApi();
    this._apiKeys = new ApiKeysApi();
    this._webhooks = new WebhooksApi();
    this._topics = new TopicsApi();
    this._segments = new SegmentsApi();
    this._contactProperties = new ContactPropertiesApi();
    this._contacts = new ContactsApi();
    this._contactImports = new ContactImportsApi();
    this._forms = new FormsApi();
    this._automations = new AutomationsApi();
    this._domains = new DomainsApi();
    this._broadcasts = new BroadcastsApi();
    this._senderIdentities = new SenderIdentitiesApi();
    this._emails = new EmailsApi();
    this._emailTemplates = new EmailTemplatesApi();
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
   * Access contact imports API
   *
   * @returns ContactImportsApi instance
   *
   * @example
   * ```ts
   * const result = await internalApi.contactImports().uploadCsv(file, (progress) => {
   *   console.log(`${progress}% uploaded`)
   * })
   * ```
   */
  contactImports() {
    return this._contactImports;
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

  /**
   * Access automations API
   *
   * @returns AutomationsApi instance
   *
   * @example
   * ```ts
   * const automation = await internalApi.automations().create({
   *   name: 'Welcome Sequence'
   * })
   * ```
   */
  automations() {
    return this._automations;
  }

  /**
   * Access sending domains API
   *
   * @returns DomainsApi instance
   *
   * @example
   * ```ts
   * const domain = await internalApi.domains().create({
   *   name: 'example.com'
   * })
   * ```
   */
  domains() {
    return this._domains;
  }

  /**
   * Access broadcasts API
   *
   * @returns BroadcastsApi instance
   *
   * @example
   * ```ts
   * const broadcast = await internalApi.broadcasts().create({
   *   name: 'Welcome Newsletter'
   * })
   * ```
   */
  broadcasts() {
    return this._broadcasts;
  }

  /**
   * Access sender identities API
   *
   * @returns SenderIdentitiesApi instance
   *
   * @example
   * ```ts
   * const { data } = await internalApi.senderIdentities().list()
   * ```
   */
  senderIdentities() {
    return this._senderIdentities;
  }

  /**
   * Access emails API
   *
   * @returns EmailsApi instance
   *
   * @example
   * ```ts
   * const email = await internalApi.emails().create({
   *   name: 'Double Opt-In Email',
   *   type: 'TRANSACTIONAL'
   * })
   * ```
   */
  emails() {
    return this._emails;
  }

  /**
   * Access email templates API
   *
   * @returns EmailTemplatesApi instance
   *
   * @example
   * ```ts
   * const template = await internalApi.emailTemplates().create({
   *   name: 'Welcome Email Template'
   * })
   * ```
   */
  emailTemplates() {
    return this._emailTemplates;
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
