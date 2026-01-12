import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateAndSendBroadcastBody =
  paths["/v1/broadcasts/create-and-send"]["post"]["requestBody"]["content"]["application/json"];

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
 * ```
 */
export class Broadcasts {
  constructor(protected client: HttpClient) {}

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
