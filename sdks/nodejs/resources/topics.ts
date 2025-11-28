import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateTopicBody = paths["/v1/topics"]["post"]["requestBody"]["content"]["application/json"];
type UpdateTopicBody = paths["/v1/topics/{topicId}"]["put"]["requestBody"]["content"]["application/json"];
type ListTopicsQuery = paths["/v1/topics"]["get"]["parameters"]["query"];

/**
 * Topics Resource
 *
 * Manage topics for organizing and categorizing your email communications.
 * Topics allow contacts to subscribe to specific types of content they're interested in.
 *
 * **Key Features:**
 * - Create topics for different content categories (newsletters, updates, promotions)
 * - Control topic visibility and default opt-in behavior
 * - Manage contact subscriptions to topics
 * - Track subscriber counts per topic
 *
 * **Common Topic Types:**
 * - Newsletters (weekly, monthly updates)
 * - Product announcements and updates
 * - Marketing and promotional content
 * - Event notifications
 * - Transactional emails (order confirmations, receipts)
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a topic
 * const topic = await kibamail.topics.create({
 *   name: "Product Updates",
 *   description: "Latest features and improvements",
 *   visibility: "PUBLIC",
 *   defaultOptIn: false
 * });
 *
 * // List all topics
 * const topics = await kibamail.topics.list();
 * ```
 */
export class Topics {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new topic in your workspace.
   *
   * Topics help organize your email communications and give contacts control over
   * what types of emails they want to receive.
   *
   * **Use Cases:**
   * - Create category for newsletter subscriptions
   * - Set up different communication channels (marketing, product, support)
   * - Organize emails by frequency (daily, weekly, monthly)
   * - Separate transactional from promotional content
   *
   * **Behavior:**
   * - Topic name must be unique within the workspace
   * - Visibility controls whether contacts can see and manage this topic in preferences
   * - defaultOptIn determines if new contacts are automatically subscribed
   * - Topics can be modified after creation
   *
   * **Required Scope:** `write:topics`
   *
   * @param params - Topic creation parameters
   * @param params.name - Topic name (required, must be unique in workspace)
   * @param params.description - Description of what this topic is for
   * @param params.visibility - "PUBLIC" (visible to contacts) or "PRIVATE" (internal use only)
   * @param params.defaultOptIn - Whether new contacts are automatically subscribed (default: false)
   *
   * @returns Promise containing the created topic ID
   *
   * @throws {BadRequestError} Invalid input data or duplicate topic name
   * @throws {UnauthorizedError} Invalid API key or missing write:topics scope
   *
   * @example
   * ```ts
   * // Create a public newsletter topic
   * const newsletter = await kibamail.topics.create({
   *   name: "Weekly Newsletter",
   *   description: "Our weekly roundup of the latest news and updates",
   *   visibility: "PUBLIC",
   *   defaultOptIn: true // Auto-subscribe new contacts
   * });
   *
   * // Create a private transactional topic
   * const transactional = await kibamail.topics.create({
   *   name: "Order Confirmations",
   *   description: "Transactional emails for order processing",
   *   visibility: "PRIVATE", // Not shown in preference center
   *   defaultOptIn: true // All contacts should receive these
   * });
   *
   * // Create an opt-in promotional topic
   * const promotions = await kibamail.topics.create({
   *   name: "Special Offers",
   *   description: "Exclusive deals and promotions",
   *   visibility: "PUBLIC",
   *   defaultOptIn: false // Contacts must explicitly opt in
   * });
   * ```
   */
  create(params: CreateTopicBody) {
    return this.client.POST("/v1/topics", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all topics in your workspace.
   *
   * Returns topics in reverse chronological order (newest first) with cursor-based pagination.
   *
   * **Use Cases:**
   * - Display available topics in preference management UI
   * - Export topic configuration for backup
   * - Audit topic settings across workspace
   * - Build custom topic management dashboards
   *
   * **Behavior:**
   * - Returns topics in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Includes all topic properties and settings
   * - Maximum 100 topics per request
   *
   * **Required Scope:** `read:topics`
   *
   * @param params - Pagination parameters
   * @param params.limit - Number of topics to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination - ID of the last topic from the previous page
   * @param params.before - Cursor for pagination - ID of the first topic from the next page
   *
   * @returns Promise containing paginated topic list
   *
   * @throws {UnauthorizedError} Invalid API key or missing read:topics scope
   *
   * @example
   * ```ts
   * // Get all topics
   * const topics = await kibamail.topics.list({ limit: 100 });
   *
   * // Paginate through topics
   * let cursor = undefined;
   * let allTopics = [];
   * do {
   *   const page = await kibamail.topics.list({ limit: 50, after: cursor });
   *   allTopics.push(...page.data);
   *   cursor = page.hasMore ? page.data[page.data.length - 1].id : undefined;
   * } while (cursor);
   * ```
   */
  list(params?: ListTopicsQuery) {
    return this.client.GET("/v1/topics", {
      params: {
        query: params,
      },
    });
  }

  /**
   * Retrieve a specific topic by ID.
   *
   * Returns the full topic record including name, description, visibility, and settings.
   *
   * **Use Cases:**
   * - Fetch topic details for display
   * - Verify topic configuration
   * - Get topic information for analytics
   *
   * **Behavior:**
   * - Returns topic only if it belongs to the authenticated workspace
   * - Returns 404 if topic doesn't exist or belongs to different workspace
   *
   * **Required Scope:** `read:topics`
   *
   * @param topicId - The unique identifier of the topic
   *
   * @returns Promise containing the topic details
   *
   * @throws {NotFoundError} Topic not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:topics scope
   *
   * @example
   * ```ts
   * const topic = await kibamail.topics.get("topic_abc123");
   * console.log(topic.data.name); // "Weekly Newsletter"
   * console.log(topic.data.visibility); // "PUBLIC"
   * console.log(topic.data.defaultOptIn); // true
   * ```
   */
  get(topicId: string) {
    return this.client.GET("/v1/topics/{topicId}", {
      params: {
        path: { topicId },
      },
    });
  }

  /**
   * Update an existing topic by ID.
   *
   * Updates topic information including name, description, visibility, and default opt-in settings.
   * Only provided fields are updated; omitted fields remain unchanged.
   *
   * **Use Cases:**
   * - Rename topics for clarity
   * - Update topic descriptions
   * - Change visibility or default opt-in settings
   * - Adjust topic configuration based on usage
   *
   * **Behavior:**
   * - Only updates fields that are provided in the request
   * - Omitted fields remain unchanged
   * - Name must still be unique if changed
   * - Changing defaultOptIn doesn't affect existing contacts
   *
   * **Required Scope:** `write:topics`
   *
   * @param topicId - The unique identifier of the topic to update
   * @param params - Topic update parameters (all optional, only provided fields are updated)
   * @param params.name - New topic name (must be unique)
   * @param params.description - Updated description
   * @param params.visibility - Updated visibility setting
   * @param params.defaultOptIn - Updated default opt-in setting
   *
   * @returns Promise containing the updated topic ID
   *
   * @throws {NotFoundError} Topic not found or doesn't belong to your workspace
   * @throws {BadRequestError} Invalid input data or duplicate topic name
   * @throws {UnauthorizedError} Invalid API key or missing write:topics scope
   *
   * @example
   * ```ts
   * // Update topic name and description
   * await kibamail.topics.update("topic_abc123", {
   *   name: "Monthly Newsletter",
   *   description: "Monthly digest of our latest content"
   * });
   *
   * // Change topic to opt-in only
   * await kibamail.topics.update("topic_abc123", {
   *   defaultOptIn: false
   * });
   *
   * // Make topic private (hide from preference center)
   * await kibamail.topics.update("topic_abc123", {
   *   visibility: "PRIVATE"
   * });
   * ```
   */
  update(topicId: string, params: UpdateTopicBody) {
    return this.client.PUT("/v1/topics/{topicId}", {
      params: {
        path: { topicId },
      },
      body: params,
    });
  }

  /**
   * Delete a topic by ID.
   *
   * Permanently removes a topic from your workspace. This action cannot be undone.
   *
   * **Use Cases:**
   * - Remove unused or deprecated topics
   * - Clean up test topics
   * - Reorganize topic structure
   *
   * **Behavior:**
   * - Permanently deletes the topic record
   * - Also removes all contact subscriptions to this topic
   * - Cannot be undone - topic data is permanently lost
   * - Returns 404 if topic doesn't exist
   *
   * **Required Scope:** `write:topics`
   *
   * **Warning:** Deleting a topic will unsubscribe all contacts from it. Make sure
   * this is intentional before proceeding.
   *
   * @param topicId - The unique identifier of the topic to delete
   *
   * @returns Promise containing the deleted topic ID
   *
   * @throws {NotFoundError} Topic not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing write:topics scope
   *
   * @example
   * ```ts
   * // Delete a topic
   * await kibamail.topics.delete("topic_abc123");
   *
   * // Delete with error handling
   * try {
   *   await kibamail.topics.delete("topic_abc123");
   *   console.log("Topic deleted successfully");
   * } catch (error) {
   *   if (error.code === "TOPIC_NOT_FOUND") {
   *     console.log("Topic was already deleted");
   *   }
   * }
   * ```
   */
  delete(topicId: string) {
    return this.client.DELETE("/v1/topics/{topicId}", {
      params: {
        path: { topicId },
      },
    });
  }
}
