import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type SendEmailBody =
  paths["/v1/emails/send"]["post"]["requestBody"]["content"]["application/json"];

/**
 * Emails Resource
 *
 * Send transactional emails programmatically. Transactional emails are one-off emails
 * sent for specific purposes like order confirmations, password resets, or notifications.
 *
 * **Key Features:**
 * - Send HTML and plain text emails
 * - Support for attachments (up to 25 files, 25MB total)
 * - Custom reply-to addresses
 * - Metadata for tracking and analytics
 * - Asynchronous delivery with webhook notifications
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Send a simple transactional email
 * const result = await kibamail.emails.send({
 *   from: "noreply@yourdomain.com",
 *   to: "customer@example.com",
 *   subject: "Order Confirmation",
 *   html: "<h1>Thank you for your order!</h1><p>Your order #12345 has been confirmed.</p>"
 * });
 * ```
 */
export class Emails {
  constructor(protected client: HttpClient) {}

  /**
   * Send a transactional email to one or more recipients.
   *
   * Transactional emails are queued and sent asynchronously. The method returns
   * immediately with an email send ID that can be used for tracking delivery status.
   *
   * **Use Cases:**
   * - Order confirmation emails
   * - Password reset emails
   * - Account verification emails
   * - Payment receipts
   * - Shipping notifications
   * - Welcome emails
   * - Any one-off automated email
   *
   * **Behavior:**
   * - Email is queued and sent asynchronously
   * - Returns immediately with the email send ID
   * - Delivery status is tracked via webhooks
   * - Supports HTML and plain text content
   * - Plain text is auto-generated from HTML if not provided
   * - Supports attachments (up to 25 files, 25MB total)
   * - Custom metadata can be attached for tracking
   *
   * **Required Scope:** `smtp:send`
   *
   * **Rate Limits:**
   * - 100 emails per minute per API key
   * - Maximum 10MB HTML content
   * - Maximum 25 attachments (total 25MB)
   *
   * @param params - Email parameters
   * @param params.from - Sender email address (must be from a verified sending domain)
   * @param params.to - Recipient email address(es) - single email or array of emails
   * @param params.subject - Email subject line
   * @param params.html - HTML email body content
   * @param params.text - Plain text email body (auto-generated from HTML if not provided)
   * @param params.replyTo - Custom reply-to address (optional)
   * @param params.replyTo.email - Reply-to email address
   * @param params.replyTo.name - Reply-to display name (optional)
   * @param params.attachments - Array of file attachments (optional)
   * @param params.attachments[].filename - Original filename
   * @param params.attachments[].content - Base64-encoded file content
   * @param params.attachments[].contentType - MIME type of the file
   * @param params.metadata - Custom key-value metadata for tracking (optional)
   *
   * @returns Promise containing the email send ID
   *
   * @throws {BadRequestError} Invalid input data (e.g., invalid email format, unverified domain)
   * @throws {UnauthorizedError} Invalid API key or missing smtp:send scope
   *
   * @example
   * ```ts
   * // Simple email
   * const result = await kibamail.emails.send({
   *   from: "noreply@yourdomain.com",
   *   to: "customer@example.com",
   *   subject: "Welcome!",
   *   html: "<h1>Welcome to our platform!</h1>"
   * });
   *
   * // Email with multiple recipients
   * await kibamail.emails.send({
   *   from: "support@yourdomain.com",
   *   to: ["user1@example.com", "user2@example.com"],
   *   subject: "Important Update",
   *   html: "<p>We have an important update for you.</p>",
   *   text: "We have an important update for you."
   * });
   *
   * // Email with custom reply-to
   * await kibamail.emails.send({
   *   from: "noreply@yourdomain.com",
   *   to: "customer@example.com",
   *   subject: "Your Support Ticket",
   *   html: "<p>Thank you for contacting support.</p>",
   *   replyTo: {
   *     email: "support@yourdomain.com",
   *     name: "Support Team"
   *   }
   * });
   *
   * // Email with attachments
   * await kibamail.emails.send({
   *   from: "billing@yourdomain.com",
   *   to: "customer@example.com",
   *   subject: "Your Invoice",
   *   html: "<p>Please find your invoice attached.</p>",
   *   attachments: [
   *     {
   *       filename: "invoice.pdf",
   *       content: base64EncodedPdfContent,
   *       contentType: "application/pdf"
   *     }
   *   ]
   * });
   *
   * // Email with metadata for tracking
   * await kibamail.emails.send({
   *   from: "orders@yourdomain.com",
   *   to: "customer@example.com",
   *   subject: "Order Shipped",
   *   html: "<p>Your order has shipped!</p>",
   *   metadata: {
   *     orderId: "order_12345",
   *     customerId: "cust_67890",
   *     campaign: "shipping_notification"
   *   }
   * });
   * ```
   */
  send(params: SendEmailBody) {
    return this.client.POST("/v1/emails/send", {
      body: params,
    });
  }
}
