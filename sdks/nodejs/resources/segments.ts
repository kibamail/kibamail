import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateSegmentBody = paths["/v1/segments"]["post"]["requestBody"]["content"]["application/json"];
type UpdateSegmentBody = paths["/v1/segments/{segmentId}"]["put"]["requestBody"]["content"]["application/json"];
type ListSegmentsQuery = paths["/v1/segments"]["get"]["parameters"]["query"];
type ListSegmentContactsQuery = paths["/v1/segments/{segmentId}/contacts"]["get"]["parameters"]["query"];

/**
 * Segments Resource
 *
 * Manage dynamic contact segments for targeted communication.
 * Segments are dynamic groups of contacts that match specific criteria and update automatically.
 *
 * **Key Features:**
 * - Create segments with complex filtering conditions
 * - Segments update automatically as contacts change
 * - Use MongoDB-style query syntax for powerful filtering
 * - Track segment sizes and membership
 * - Retrieve contacts that belong to specific segments
 *
 * **Segment vs Topic:**
 * - Segments are dynamic and auto-updating based on conditions
 * - Topics are manual subscriptions controlled by contacts
 * - Use segments for automated targeting (e.g., "Active Enterprise users")
 * - Use topics for preference-based communication (e.g., "Weekly Newsletter")
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a segment for enterprise customers
 * const segment = await kibamail.segments.create({
 *   name: "Enterprise Customers",
 *   description: "All contacts on Enterprise plan",
 *   conditions: {
 *     AND: [
 *       { field: "Plan", operator: "equals", value: "Enterprise" },
 *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
 *     ]
 *   }
 * });
 *
 * // Get contacts in segment
 * const contacts = await kibamail.segments.listContacts(segment.data.id);
 * ```
 */
export class Segments {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new segment in your workspace.
   *
   * Segments automatically include contacts that match the specified conditions.
   * As contacts are created or updated, segment membership is recalculated automatically.
   *
   * **Use Cases:**
   * - Target specific customer groups (e.g., "Trial users who haven't upgraded")
   * - Create behavioral segments (e.g., "Active in last 30 days")
   * - Build demographic segments (e.g., "Enterprise customers in US")
   * - Segment by engagement (e.g., "Opened email in last week")
   *
   * **Behavior:**
   * - Segment name must be unique within workspace
   * - Conditions use MongoDB-style query syntax
   * - All fields in conditions must be valid contact fields or custom properties
   * - Segments update automatically as contacts change
   * - Condition validation happens at creation time
   *
   * **Required Scope:** `write:segments`
   *
   * **Supported Operators:**
   * - `equals`, `not_equals`: Exact match
   * - `contains`, `not_contains`: String contains (case-insensitive)
   * - `greater_than`, `less_than`: Numeric/date comparison
   * - `greater_than_or_equal`, `less_than_or_equal`: Numeric/date comparison
   * - `in`, `not_in`: Value in array
   *
   * @param params - Segment creation parameters
   * @param params.name - Segment name (required, must be unique)
   * @param params.description - Description of what this segment represents
   * @param params.conditions - Filter conditions using AND/OR logic
   *
   * @returns Promise containing the created segment ID
   *
   * @throws {BadRequestError} Invalid conditions or unknown field names
   * @throws {UnauthorizedError} Invalid API key or missing write:segments scope
   *
   * @example
   * ```ts
   * // Create segment for active enterprise customers
   * const enterpriseActive = await kibamail.segments.create({
   *   name: "Active Enterprise Customers",
   *   description: "Enterprise plan customers who logged in recently",
   *   conditions: {
   *     AND: [
   *       { field: "Plan", operator: "equals", value: "Enterprise" },
   *       { field: "Last Login", operator: "greater_than", value: Date.now() - 30 * 24 * 60 * 60 * 1000 },
   *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
   *     ]
   *   }
   * });
   *
   * // Create segment with OR conditions
   * const premiumUsers = await kibamail.segments.create({
   *   name: "Premium Users",
   *   description: "All users on paid plans",
   *   conditions: {
   *     AND: [
   *       {
   *         OR: [
   *           { field: "Plan", operator: "equals", value: "Pro" },
   *           { field: "Plan", operator: "equals", value: "Enterprise" }
   *         ]
   *       },
   *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
   *     ]
   *   }
   * });
   *
   * // Create segment for at-risk users
   * const atRisk = await kibamail.segments.create({
   *   name: "At-Risk Users",
   *   description: "Users who haven't logged in for 60 days",
   *   conditions: {
   *     AND: [
   *       { field: "Last Login", operator: "less_than", value: Date.now() - 60 * 24 * 60 * 60 * 1000 },
   *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
   *     ]
   *   }
   * });
   * ```
   */
  create(params: CreateSegmentBody) {
    return this.client.POST("/v1/segments", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all segments in your workspace.
   *
   * Returns segments in reverse chronological order (newest first) with cursor-based pagination.
   *
   * **Use Cases:**
   * - Display available segments in campaign targeting UI
   * - Export segment configurations for backup
   * - Audit segment definitions across workspace
   * - Build custom segment management dashboards
   *
   * **Behavior:**
   * - Returns segments in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Includes segment name, description, and conditions
   * - Maximum 100 segments per request
   *
   * **Required Scope:** `read:segments`
   *
   * @param params - Pagination parameters
   * @param params.limit - Number of segments to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination
   * @param params.before - Cursor for pagination
   *
   * @returns Promise containing paginated segment list
   *
   * @throws {UnauthorizedError} Invalid API key or missing read:segments scope
   *
   * @example
   * ```ts
   * // Get all segments
   * const segments = await kibamail.segments.list({ limit: 100 });
   *
   * // Paginate through segments
   * let cursor = undefined;
   * let allSegments = [];
   * do {
   *   const page = await kibamail.segments.list({ limit: 50, after: cursor });
   *   allSegments.push(...page.data);
   *   cursor = page.hasMore ? page.data[page.data.length - 1].id : undefined;
   * } while (cursor);
   * ```
   */
  list(params?: ListSegmentsQuery) {
    return this.client.GET("/v1/segments", {
      params: {
        query: params,
      },
    });
  }

  /**
   * Retrieve a specific segment by ID.
   *
   * Returns the full segment record including name, description, and conditions.
   *
   * **Use Cases:**
   * - Fetch segment details for display
   * - Verify segment conditions
   * - Get segment configuration for analytics
   *
   * **Behavior:**
   * - Returns segment only if it belongs to the authenticated workspace
   * - Returns 404 if segment doesn't exist or belongs to different workspace
   *
   * **Required Scope:** `read:segments`
   *
   * @param segmentId - The unique identifier of the segment
   *
   * @returns Promise containing the segment details
   *
   * @throws {NotFoundError} Segment not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:segments scope
   *
   * @example
   * ```ts
   * const segment = await kibamail.segments.get("segment_abc123");
   * console.log(segment.data.name); // "Active Enterprise Customers"
   * console.log(segment.data.conditions); // { AND: [...] }
   * ```
   */
  get(segmentId: string) {
    return this.client.GET("/v1/segments/{segmentId}", {
      params: {
        path: { segmentId },
      },
    });
  }

  /**
   * Update an existing segment by ID.
   *
   * Updates segment information including name, description, and conditions.
   * Only provided fields are updated; omitted fields remain unchanged.
   *
   * **Use Cases:**
   * - Refine segment conditions
   * - Rename segments for clarity
   * - Update segment descriptions
   * - Adjust targeting criteria
   *
   * **Behavior:**
   * - Only updates fields that are provided in the request
   * - Omitted fields remain unchanged
   * - Name must still be unique if changed
   * - Updating conditions triggers recalculation of segment membership
   * - Condition validation happens at update time
   *
   * **Required Scope:** `write:segments`
   *
   * @param segmentId - The unique identifier of the segment to update
   * @param params - Segment update parameters (all optional, only provided fields are updated)
   * @param params.name - New segment name (must be unique)
   * @param params.description - Updated description
   * @param params.conditions - Updated filter conditions
   *
   * @returns Promise containing the updated segment ID
   *
   * @throws {NotFoundError} Segment not found or doesn't belong to your workspace
   * @throws {BadRequestError} Invalid conditions or duplicate segment name
   * @throws {UnauthorizedError} Invalid API key or missing write:segments scope
   *
   * @example
   * ```ts
   * // Update segment conditions
   * await kibamail.segments.update("segment_abc123", {
   *   conditions: {
   *     AND: [
   *       { field: "Plan", operator: "equals", value: "Enterprise" },
   *       { field: "Last Login", operator: "greater_than", value: Date.now() - 14 * 24 * 60 * 60 * 1000 }
   *     ]
   *   }
   * });
   *
   * // Update segment name
   * await kibamail.segments.update("segment_abc123", {
   *   name: "Recently Active Enterprise Customers"
   * });
   * ```
   */
  update(segmentId: string, params: UpdateSegmentBody) {
    return this.client.PUT("/v1/segments/{segmentId}", {
      params: {
        path: { segmentId },
      },
      body: params,
    });
  }

  /**
   * Delete a segment by ID.
   *
   * Permanently removes a segment from your workspace. This action cannot be undone.
   *
   * **Use Cases:**
   * - Remove unused or deprecated segments
   * - Clean up test segments
   * - Reorganize segment structure
   *
   * **Behavior:**
   * - Permanently deletes the segment definition
   * - Does NOT delete contacts that were in the segment
   * - Cannot be undone - segment configuration is permanently lost
   * - Returns 404 if segment doesn't exist
   *
   * **Required Scope:** `write:segments`
   *
   * @param segmentId - The unique identifier of the segment to delete
   *
   * @returns Promise containing the deleted segment ID
   *
   * @throws {NotFoundError} Segment not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing write:segments scope
   *
   * @example
   * ```ts
   * // Delete a segment
   * await kibamail.segments.delete("segment_abc123");
   * ```
   */
  delete(segmentId: string) {
    return this.client.DELETE("/v1/segments/{segmentId}", {
      params: {
        path: { segmentId },
      },
    });
  }

  /**
   * Retrieve a paginated list of contacts that belong to a specific segment.
   *
   * Returns all contacts that currently match the segment's conditions.
   * This list updates automatically as contacts change.
   *
   * **Use Cases:**
   * - Preview contacts that will receive a campaign
   * - Export contacts from a specific segment
   * - Verify segment conditions are working correctly
   * - Count segment membership
   *
   * **Behavior:**
   * - Returns contacts in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Includes all contact properties (default and custom)
   * - Maximum 100 contacts per request
   * - Segment membership is computed dynamically
   *
   * **Required Scope:** `read:segments`, `read:contacts`
   *
   * @param segmentId - The unique identifier of the segment
   * @param params - Pagination parameters
   * @param params.limit - Number of contacts to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination
   * @param params.before - Cursor for pagination
   *
   * @returns Promise containing paginated list of contacts in the segment
   *
   * @throws {NotFoundError} Segment not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing required scopes
   *
   * @example
   * ```ts
   * // Get contacts in a segment
   * const contacts = await kibamail.segments.listContacts("segment_abc123", {
   *   limit: 100
   * });
   *
   * // Count contacts in segment
   * let totalContacts = 0;
   * let cursor = undefined;
   * do {
   *   const page = await kibamail.segments.listContacts("segment_abc123", {
   *     limit: 100,
   *     after: cursor
   *   });
   *   totalContacts += page.data.length;
   *   cursor = page.hasMore ? page.data[page.data.length - 1].id : undefined;
   * } while (cursor);
   * console.log(`Segment has ${totalContacts} contacts`);
   * ```
   */
  listContacts(segmentId: string, params?: ListSegmentContactsQuery) {
    return this.client.GET("/v1/segments/{segmentId}/contacts", {
      params: {
        path: { segmentId },
        query: params,
      },
    });
  }
}
