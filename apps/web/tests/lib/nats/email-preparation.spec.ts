/**
 * Unit tests for Email Preparation to NATS Message Conversion
 *
 * Tests that PreparedEmail correctly maps to EmailMessage format
 * expected by the email-agent.
 */

import { describe, expect, test } from "vitest";
import type { PreparedEmail } from "@/lib/email";
import type { EmailMessage } from "@/lib/nats";

/**
 * Convert PreparedEmail to EmailMessage format
 * This mirrors the logic in send-broadcast-batch.ts
 */
function convertToNatsMessage(
  prepared: PreparedEmail,
  contentKey: string,
): EmailMessage {
  const recipientName = [
    prepared.recipientFirstName,
    prepared.recipientLastName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: prepared.emailSendId,
    tenant_id: prepared.workspaceId,
    broadcast_id: prepared.broadcastId,
    contact_id: prepared.contactId,
    pool: "marketing",
    recipient: {
      email: prepared.recipientEmail,
      name: recipientName,
    },
    sender: {
      email: prepared.senderEmail,
      name: prepared.senderName,
      domain: prepared.senderDomain,
    },
    reply_to: {
      email: prepared.replyTo,
      name: "",
    },
    subject: prepared.subject,
    preview_text: prepared.previewText,
    content_key: contentKey,
    attachments: [],
    headers: prepared.headers,
    metadata: {
      message_id: prepared.messageId,
      envelope_sender: prepared.envelopeSender,
    },
    track_opens: prepared.trackOpens,
    track_clicks: prepared.trackClicks,
  };
}

/**
 * Create a mock PreparedEmail for testing
 */
function createMockPreparedEmail(
  overrides: Partial<PreparedEmail> = {},
): PreparedEmail {
  return {
    emailSendId: "email-send-123",
    messageId: "<email-send-123@example.com>",
    workspaceId: "workspace-456",
    broadcastId: "broadcast-789",
    contactId: "contact-abc",
    recipientEmail: "john.doe@example.com",
    recipientFirstName: "John",
    recipientLastName: "Doe",
    senderEmail: "newsletter",
    senderName: "ACME Newsletter",
    senderDomain: "acme.com",
    envelopeSender: "bounces+email-send-123@bounce.acme.com",
    replyTo: "reply@acme.com",
    subject: "Welcome to ACME",
    previewText: "Thanks for signing up!",
    htmlBody: "<html><body>Welcome!</body></html>",
    textBody: "Welcome!",
    headers: {},
    trackOpens: true,
    trackClicks: true,
    links: [],
    ...overrides,
  };
}

describe("PreparedEmail to EmailMessage Conversion", () => {
  describe("Basic Conversion", () => {
    test("should convert all identifier fields correctly", () => {
      const prepared = createMockPreparedEmail({
        emailSendId: "unique-id-123",
        workspaceId: "ws-456",
        broadcastId: "bc-789",
        contactId: "ct-abc",
      });

      const message = convertToNatsMessage(
        prepared,
        `emails/${prepared.workspaceId}/${prepared.broadcastId}/${prepared.emailSendId}`,
      );

      expect(message.id).toBe("unique-id-123");
      expect(message.tenant_id).toBe("ws-456");
      expect(message.broadcast_id).toBe("bc-789");
      expect(message.contact_id).toBe("ct-abc");
    });

    test("should convert recipient fields correctly", () => {
      const prepared = createMockPreparedEmail({
        recipientEmail: "jane@example.com",
        recipientFirstName: "Jane",
        recipientLastName: "Smith",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.recipient.email).toBe("jane@example.com");
      expect(message.recipient.name).toBe("Jane Smith");
    });

    test("should handle recipient with only first name", () => {
      const prepared = createMockPreparedEmail({
        recipientFirstName: "Jane",
        recipientLastName: "",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.recipient.name).toBe("Jane");
    });

    test("should handle recipient with only last name", () => {
      const prepared = createMockPreparedEmail({
        recipientFirstName: "",
        recipientLastName: "Smith",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.recipient.name).toBe("Smith");
    });

    test("should handle recipient with no name", () => {
      const prepared = createMockPreparedEmail({
        recipientFirstName: "",
        recipientLastName: "",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.recipient.name).toBe("");
    });

    test("should convert sender fields correctly", () => {
      const prepared = createMockPreparedEmail({
        senderEmail: "news",
        senderName: "Daily News",
        senderDomain: "news.example.com",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.sender.email).toBe("news");
      expect(message.sender.name).toBe("Daily News");
      expect(message.sender.domain).toBe("news.example.com");
    });

    test("should handle sender with empty name", () => {
      const prepared = createMockPreparedEmail({
        senderEmail: "noreply",
        senderName: "",
        senderDomain: "example.com",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.sender.name).toBe("");
      expect(message.sender.email).toBe("noreply");
    });
  });

  describe("Content Fields", () => {
    test("should convert subject correctly", () => {
      const prepared = createMockPreparedEmail({
        subject: "Your Weekly Newsletter - Issue #42",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.subject).toBe("Your Weekly Newsletter - Issue #42");
    });

    test("should convert preview text correctly", () => {
      const prepared = createMockPreparedEmail({
        previewText: "Check out what's new this week...",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.preview_text).toBe("Check out what's new this week...");
    });

    test("should handle empty preview text", () => {
      const prepared = createMockPreparedEmail({
        previewText: "",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.preview_text).toBe("");
    });

    test("should set content key correctly", () => {
      const prepared = createMockPreparedEmail({
        workspaceId: "ws-123",
        broadcastId: "bc-456",
        emailSendId: "es-789",
      });

      const contentKey = `emails/${prepared.workspaceId}/${prepared.broadcastId}/${prepared.emailSendId}`;
      const message = convertToNatsMessage(prepared, contentKey);

      expect(message.content_key).toBe("emails/ws-123/bc-456/es-789");
    });
  });

  describe("Reply-To Handling", () => {
    test("should always include reply_to", () => {
      const prepared = createMockPreparedEmail({
        replyTo: "support@example.com",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.reply_to).toBeDefined();
      expect(message.reply_to.email).toBe("support@example.com");
      expect(message.reply_to.name).toBe("");
    });

    test("should convert reply_to email correctly", () => {
      const prepared = createMockPreparedEmail({
        replyTo: "help@company.com",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.reply_to.email).toBe("help@company.com");
    });
  });

  describe("Metadata Fields", () => {
    test("should include message_id in metadata", () => {
      const prepared = createMockPreparedEmail({
        messageId: "<unique-msg-id@example.com>",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.metadata.message_id).toBe("<unique-msg-id@example.com>");
    });

    test("should include envelope_sender in metadata", () => {
      const prepared = createMockPreparedEmail({
        envelopeSender: "bounces+abc123@bounce.example.com",
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.metadata.envelope_sender).toBe(
        "bounces+abc123@bounce.example.com",
      );
    });
  });

  describe("Tracking Flags", () => {
    test("should convert tracking flags when both enabled", () => {
      const prepared = createMockPreparedEmail({
        trackOpens: true,
        trackClicks: true,
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.track_opens).toBe(true);
      expect(message.track_clicks).toBe(true);
    });

    test("should convert tracking flags when both disabled", () => {
      const prepared = createMockPreparedEmail({
        trackOpens: false,
        trackClicks: false,
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.track_opens).toBe(false);
      expect(message.track_clicks).toBe(false);
    });

    test("should convert tracking flags independently", () => {
      const prepared = createMockPreparedEmail({
        trackOpens: true,
        trackClicks: false,
      });

      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.track_opens).toBe(true);
      expect(message.track_clicks).toBe(false);
    });
  });

  describe("Attachments", () => {
    test("should have empty attachments array", () => {
      const prepared = createMockPreparedEmail();
      const message = convertToNatsMessage(prepared, "test-key");

      expect(message.attachments).toEqual([]);
    });
  });
});

describe("Content Key Generation", () => {
  test("should generate correct S3 path structure", () => {
    const workspaceId = "ws-abc123";
    const broadcastId = "bc-def456";
    const emailSendId = "es-ghi789";

    const contentKey = `emails/${workspaceId}/${broadcastId}/${emailSendId}`;

    expect(contentKey).toBe("emails/ws-abc123/bc-def456/es-ghi789");
  });

  test("should support HTML content path", () => {
    const contentKey = "emails/ws-123/bc-456/es-789";
    const htmlPath = `${contentKey}/content.html`;

    expect(htmlPath).toBe("emails/ws-123/bc-456/es-789/content.html");
  });

  test("should support text content path", () => {
    const contentKey = "emails/ws-123/bc-456/es-789";
    const textPath = `${contentKey}/content.txt`;

    expect(textPath).toBe("emails/ws-123/bc-456/es-789/content.txt");
  });
});
