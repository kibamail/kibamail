import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateAndSendBroadcastBody =
  paths["/v1/broadcasts/create-and-send"]["post"]["requestBody"]["content"]["application/json"];
type ListBroadcastSendsQuery =
  paths["/v1/broadcasts/{broadcastId}/sends"]["get"]["parameters"]["query"];

/**
 * Broadcast Sends Sub-Resource
 *
 * Query individual email sends for a broadcast. Each send represents
 * a single email delivery attempt to a recipient.
 *
 * @example
 * ```ts
 * // List all sends for a broadcast
 * const sends = await kibamail.broadcasts.sends.list("bc_abc123");
 *
 * // List sends with pagination
 * const page = await kibamail.broadcasts.sends.list("bc_abc123", { limit: 50 });
 *
 * // Filter by status
 * const bounced = await kibamail.broadcasts.sends.list("bc_abc123", { status: "BOUNCED" });
 * ```
 */
export class BroadcastSends {
  constructor(protected client: HttpClient) {}

  /**
   * List individual email sends for a broadcast.
   *
   * Returns a paginated list of all email delivery attempts for a specific broadcast.
   * Each send includes delivery status, timestamps, and engagement metrics.
   *
   * **Use Cases:**
   * - Monitor delivery status for each recipient
   * - Debug delivery issues for specific recipients
   * - Export send data for reporting
   * - Track engagement at the recipient level
   *
   * **Response Data:**
   * Each send includes:
   * - Delivery status (QUEUED, SENDING, DELIVERED, BOUNCED, COMPLAINED, FAILED)
   * - Timestamps (queuedAt, sentAt, deliveredAt, firstOpenedAt, firstClickedAt, bouncedAt, complainedAt)
   * - Engagement metrics (openCount, clickCount, uniqueLinksClicked)
   * - Bounce details (bounceClassification, lastResponseCode, lastResponseMessage)
   *
   * **Filtering:**
   * Use the `status` parameter to filter by delivery status.
   *
   * **Data Retention:**
   * Individual send records are retained for 60 days. After that, only aggregate
   * statistics are available via `broadcasts.stats.get()`. If details have been
   * pruned, this endpoint returns a 400 error.
   *
   * **Required Scope:** `read:broadcasts`
   *
   * @param broadcastId - The unique identifier of the broadcast
   * @param params - Optional query parameters
   * @param params.status - Filter by status: QUEUED, SENDING, DELIVERED, BOUNCED, COMPLAINED, FAILED
   * @param params.limit - Number of sends to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination - ID of the last send from the previous page
   * @param params.before - Cursor for reverse pagination
   *
   * @returns Promise containing paginated list of sends
   *
   * @throws {NotFoundError} Broadcast not found or doesn't belong to your workspace
   * @throws {BadRequestError} Broadcast details have been pruned (older than 60 days)
   * @throws {UnauthorizedError} Invalid API key or missing read:broadcasts scope
   *
   * @example
   * ```ts
   * // Get first page of sends
   * const firstPage = await kibamail.broadcasts.sends.list("bc_abc123", { limit: 50 });
   * console.log(firstPage.data); // Array of sends
   * console.log(firstPage.hasMore); // true if more sends exist
   *
   * // Get next page using cursor
   * if (firstPage.hasMore) {
   *   const lastSend = firstPage.data[firstPage.data.length - 1];
   *   const nextPage = await kibamail.broadcasts.sends.list("bc_abc123", {
   *     limit: 50,
   *     after: lastSend.id
   *   });
   * }
   *
   * // Filter by delivery status
   * const bouncedSends = await kibamail.broadcasts.sends.list("bc_abc123", {
   *   status: "BOUNCED"
   * });
   *
   * // Check engagement for delivered emails
   * const deliveredSends = await kibamail.broadcasts.sends.list("bc_abc123", {
   *   status: "DELIVERED",
   *   limit: 100
   * });
   * for (const send of deliveredSends.data) {
   *   if (send.openCount > 0) {
   *     console.log(`${send.email} opened ${send.openCount} times`);
   *   }
   * }
   * ```
   */
  list(broadcastId: string, params?: ListBroadcastSendsQuery) {
    return this.client.GET("/v1/broadcasts/{broadcastId}/sends", {
      params: {
        path: { broadcastId },
        query: params,
      },
    });
  }
}

/**
 * Broadcast Stats Sub-Resource
 *
 * Query aggregate statistics for a broadcast including recipient counts,
 * engagement metrics, and deliverability rates.
 *
 * @example
 * ```ts
 * const stats = await kibamail.broadcasts.stats.get("bc_abc123");
 * console.log(`Open rate: ${(stats.engagement.openRate * 100).toFixed(1)}%`);
 * console.log(`Click rate: ${(stats.engagement.clickRate * 100).toFixed(1)}%`);
 * ```
 */
export class BroadcastStats {
  constructor(protected client: HttpClient) {}

  /**
   * Get aggregate statistics for a broadcast.
   *
   * Returns comprehensive statistics including recipient counts, engagement metrics,
   * and deliverability rates for a specific broadcast.
   *
   * **Use Cases:**
   * - Monitor broadcast performance in real-time
   * - Generate campaign reports
   * - Track deliverability and engagement metrics
   * - Compare broadcast performance over time
   *
   * **Statistics Included:**
   *
   * **Recipients:**
   * - `total` - Total recipients queued for this broadcast
   * - `queued` - Recipients still waiting to be sent
   * - `sent` - Recipients where email was sent to MTA
   * - `delivered` - Successfully delivered emails
   * - `bounced` - Bounced emails (hard and soft)
   * - `complained` - Spam complaints received
   * - `failed` - Permanent delivery failures
   * - `unsubscribed` - Recipients who unsubscribed from this broadcast
   *
   * **Engagement Metrics:**
   * - `opened` - Total unique opens
   * - `clicked` - Total unique clicks
   * - `openRate` - Percentage of delivered emails that were opened (0-1)
   * - `clickRate` - Percentage of delivered emails that were clicked (0-1)
   * - `clickToOpenRate` - Percentage of opened emails that were clicked (0-1)
   *
   * **Deliverability Metrics:**
   * - `deliveryRate` - Percentage of sent emails that were delivered (0-1)
   * - `bounceRate` - Percentage of sent emails that bounced (0-1)
   * - `complaintRate` - Percentage of delivered emails that received complaints (0-1)
   *
   * **Data Availability:**
   * The `detailsPruned` flag indicates whether individual send records are still available:
   * - `false` - Full send details available via `broadcasts.sends.list()`
   * - `true` - Send details pruned (after 60 days), only aggregate stats remain
   *
   * **Required Scope:** `read:broadcasts`
   *
   * @param broadcastId - The unique identifier of the broadcast
   *
   * @returns Promise containing broadcast statistics
   *
   * @throws {NotFoundError} Broadcast not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:broadcasts scope
   *
   * @example
   * ```ts
   * const stats = await kibamail.broadcasts.stats.get("bc_abc123");
   *
   * // Check delivery performance
   * console.log(`Delivered: ${stats.recipients.delivered} of ${stats.recipients.total}`);
   * console.log(`Delivery rate: ${(stats.deliverability.deliveryRate * 100).toFixed(1)}%`);
   *
   * // Check engagement
   * console.log(`Opens: ${stats.engagement.opened}`);
   * console.log(`Open rate: ${(stats.engagement.openRate * 100).toFixed(1)}%`);
   * console.log(`Click rate: ${(stats.engagement.clickRate * 100).toFixed(1)}%`);
   * console.log(`Click-to-open rate: ${(stats.engagement.clickToOpenRate * 100).toFixed(1)}%`);
   *
   * // Monitor deliverability
   * if (stats.deliverability.bounceRate > 0.05) {
   *   console.warn("High bounce rate detected!");
   * }
   * if (stats.deliverability.complaintRate > 0.001) {
   *   console.warn("Complaint rate exceeds threshold!");
   * }
   *
   * // Check if detailed send data is still available
   * if (stats.detailsPruned) {
   *   console.log("Individual send records have been pruned (older than 60 days)");
   * }
   * ```
   */
  get(broadcastId: string) {
    return this.client.GET("/v1/broadcasts/{broadcastId}/stats", {
      params: {
        path: { broadcastId },
      },
    });
  }
}

/**
 * Broadcasts Resource
 *
 * Create and schedule email broadcasts to multiple recipients. Broadcasts are
 * marketing or bulk emails sent to segments, topics, or specific email addresses.
 *
 * **Key Features:**
 * - Schedule broadcasts for future delivery
 * - Target recipients by segment, topic, or email list
 * - Support for per-email custom variables
 * - Variable substitution in subject, body, and preview text
 * - Automatic contact upsert for email-based recipients
 * - Query individual sends and aggregate statistics
 *
 * **Sub-Resources:**
 * - `broadcasts.sends` - Query individual email sends for a broadcast
 * - `broadcasts.stats` - Get aggregate statistics for a broadcast
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create and schedule a broadcast
 * const result = await kibamail.broadcasts.createAndSend({
 *   name: "January Newsletter",
 *   from: "newsletter@yourdomain.com",
 *   emailContent: {
 *     subject: "Our January Newsletter",
 *     html: "<h1>Hello {{firstName}}!</h1><p>Welcome to our newsletter.</p>"
 *   },
 *   recipients: {
 *     emails: ["user1@example.com", "user2@example.com"]
 *   },
 *   sendAt: "2024-01-15T10:00:00Z"
 * });
 *
 * // Query sends for a broadcast
 * const sends = await kibamail.broadcasts.sends.list("bc_abc123");
 *
 * // Get broadcast statistics
 * const stats = await kibamail.broadcasts.stats.get("bc_abc123");
 * ```
 */
export class Broadcasts {
  /**
   * Sub-resource for querying individual email sends
   */
  public readonly sends: BroadcastSends;

  /**
   * Sub-resource for querying broadcast statistics
   */
  public readonly stats: BroadcastStats;

  constructor(protected client: HttpClient) {
    this.sends = new BroadcastSends(client);
    this.stats = new BroadcastStats(client);
  }

  /**
   * Create a broadcast with HTML content and schedule it for delivery.
   *
   * Creates a new broadcast in QUEUED_FOR_SENDING status and schedules it
   * for delivery at the specified time. Recipients can be specified via
   * contact IDs, email addresses, segments, or topics.
   *
   * **Use Cases:**
   * - Send marketing newsletters to a segment of contacts
   * - Announce product launches to specific topics
   * - Send promotional emails to a list of email addresses
   * - Trigger one-time campaigns with personalized variables per recipient
   *
   * **Recipient Modes:**
   * Recipients can be specified in multiple ways (at least one is required):
   * - `contacts`: Array of contact IDs from your workspace
   * - `emails`: Array of email addresses (will upsert contacts automatically)
   * - `segment`: Segment ID to send to all contacts matching segment conditions
   * - `topic`: Topic ID to send to all subscribed contacts
   *
   * **Per-Email Variables:**
   * The `emails` field supports two formats:
   *
   * 1. Simple format (backward compatible): `["user1@example.com", "user2@example.com"]`
   * 2. With variables: `[{ email: "user@example.com", variables: { orderNumber: "12345" } }]`
   *
   * Variables can be used in email content with `{{variableName}}` syntax.
   * Transient variables override contact properties but are NOT saved to the contact record.
   *
   * **Variable Priority (highest to lowest):**
   * 1. Transient variables (per-email, from API request)
   * 2. Contact properties (from database)
   * 3. Built-in variables (email, firstName, lastName, URLs)
   *
   * **Behavior:**
   * - Creates a new broadcast in QUEUED_FOR_SENDING status
   * - Email content is validated and stored
   * - Broadcast is scheduled for delivery at the specified sendAt time
   * - Recipients are resolved at send time (not at creation time)
   * - For `emails` mode, contacts are upserted (created if not existing)
   * - Sending domain must be verified before the broadcast can be sent
   *
   * **Required Scope:** `broadcasts:write`
   *
   * **Rate Limits:**
   * - 100 broadcasts per hour per workspace
   * - Maximum 100,000 recipients per broadcast
   *
   * @param params - Broadcast creation parameters
   * @param params.name - Broadcast name for identification
   * @param params.from - Sender email address (must be from a verified sending domain)
   * @param params.replyTo - Custom reply-to email address (optional)
   * @param params.emailContent - Email content configuration
   * @param params.emailContent.subject - Email subject line (supports {{variables}})
   * @param params.emailContent.html - HTML email body (supports {{variables}})
   * @param params.emailContent.text - Plain text body (auto-generated from HTML if not provided)
   * @param params.emailContent.previewText - Preview text shown in inbox (optional)
   * @param params.recipients - Recipient specification (at least one mode required)
   * @param params.recipients.contacts - Array of contact IDs
   * @param params.recipients.emails - Array of emails or email objects with variables
   * @param params.recipients.segment - Segment ID
   * @param params.recipients.topic - Topic ID
   * @param params.sendAt - ISO 8601 datetime for scheduled delivery (must be in the future)
   *
   * @returns Promise containing the created broadcast object
   *
   * @throws {BadRequestError} Invalid input data (e.g., missing fields, invalid format)
   * @throws {UnauthorizedError} Invalid API key or missing broadcasts:write scope
   * @throws {ValidationError} No valid recipients found or segment/topic does not exist
   *
   * @example
   * ```ts
   * // Simple broadcast to email addresses
   * const result = await kibamail.broadcasts.createAndSend({
   *   name: "January Newsletter",
   *   from: "newsletter@yourdomain.com",
   *   emailContent: {
   *     subject: "Our January Newsletter",
   *     html: "<h1>Hello {{firstName}}!</h1><p>Welcome to our newsletter.</p>",
   *     previewText: "Check out what's new this month..."
   *   },
   *   recipients: {
   *     emails: ["user1@example.com", "user2@example.com"]
   *   },
   *   sendAt: "2024-01-15T10:00:00Z"
   * });
   *
   * // Broadcast with per-email variables
   * await kibamail.broadcasts.createAndSend({
   *   name: "Order Confirmation Campaign",
   *   from: "orders@yourdomain.com",
   *   emailContent: {
   *     subject: "Your Order #{{orderNumber}} is confirmed!",
   *     html: "<h1>Thank you!</h1><p>Your order #{{orderNumber}} totaling ${{orderTotal}} has been confirmed.</p>"
   *   },
   *   recipients: {
   *     emails: [
   *       { email: "customer1@example.com", variables: { orderNumber: "ORD-12345", orderTotal: 99.99 } },
   *       { email: "customer2@example.com", variables: { orderNumber: "ORD-12346", orderTotal: 149.50 } }
   *     ]
   *   },
   *   sendAt: "2024-01-15T14:00:00Z"
   * });
   *
   * // Broadcast to a segment
   * await kibamail.broadcasts.createAndSend({
   *   name: "VIP Customer Promotion",
   *   from: "promotions@yourdomain.com",
   *   emailContent: {
   *     subject: "Exclusive VIP Offer for {{firstName}}",
   *     html: "<h1>Hi {{firstName}}!</h1><p>As a VIP customer, you get 25% off!</p>"
   *   },
   *   recipients: {
   *     segment: "seg_vip_customers_abc123"
   *   },
   *   sendAt: "2024-01-20T09:00:00Z"
   * });
   *
   * // Broadcast to topic subscribers
   * await kibamail.broadcasts.createAndSend({
   *   name: "Product Updates",
   *   from: "updates@yourdomain.com",
   *   emailContent: {
   *     subject: "New Features Released!",
   *     html: "<h1>Hey {{firstName}}!</h1><p>Check out our latest features...</p>"
   *   },
   *   recipients: {
   *     topic: "top_product_updates_xyz789"
   *   },
   *   sendAt: "2024-01-25T15:00:00Z"
   * });
   * ```
   */
  createAndSend(params: CreateAndSendBroadcastBody) {
    return this.client.POST("/v1/broadcasts/create-and-send", {
      body: params,
    });
  }
}
