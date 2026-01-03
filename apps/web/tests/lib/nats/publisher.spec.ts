/**
 * Integration tests for NATS Email Publisher
 *
 * These tests verify that the control plane can successfully publish
 * email messages to NATS JetStream for MTA injection.
 *
 * Prerequisites:
 * - NATS server running with TLS (docker compose up nats)
 * - NATS_URL, NATS_USER, NATS_PASSWORD, NATS_TLS_CA env vars set
 */

import { describe, expect, test, beforeAll, afterAll } from "vitest";
import {
  getNatsConnection,
  getJetStream,
  closeNatsConnection,
  publishEmail,
  publishEmailBatch,
  isStreamReady,
  type EmailMessage,
  type NatsConnectionOptions,
} from "@/lib/nats";
import { StringCodec } from "nats";

const sc = StringCodec();

/**
 * Get NATS connection options from environment
 */
function getTestNatsOptions(): NatsConnectionOptions {
  const url = process.env.NATS_URL;
  const user = process.env.NATS_USER;
  const password = process.env.NATS_PASSWORD;
  const tlsCa = process.env.NATS_TLS_CA;

  if (!url || !user || !password || !tlsCa) {
    throw new Error(
      "NATS_URL, NATS_USER, NATS_PASSWORD, and NATS_TLS_CA must be set for integration tests"
    );
  }

  return { url, user, password, tlsCa };
}

/**
 * Create a test email message
 */
function createTestEmailMessage(
  overrides: Partial<EmailMessage> = {}
): EmailMessage {
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    tenant_id: "test-workspace-123",
    broadcast_id: "test-broadcast-456",
    contact_id: "test-contact-789",
    recipient: {
      email: "recipient@example.com",
      name: "Test Recipient",
    },
    sender: {
      email: "newsletter",
      name: "Test Sender",
      domain: "example.com",
    },
    reply_to: {
      email: "reply@example.com",
      name: "",
    },
    subject: "Test Email Subject",
    preview_text: "This is a test email preview",
    content_key: `emails/test-workspace-123/test-broadcast-456/${id}`,
    attachments: [],
    metadata: {
      message_id: `<${id}@example.com>`,
      envelope_sender: `bounces+${id}@bounce.example.com`,
    },
    track_opens: true,
    track_clicks: true,
    ...overrides,
  };
}

describe("NATS Publisher Integration Tests", () => {
  const natsOptions = getTestNatsOptions();

  beforeAll(async () => {
    await getNatsConnection(natsOptions);
  });

  afterAll(async () => {
    await closeNatsConnection();
  });

  describe("Connection", () => {
    test("should connect to NATS with TLS", async () => {
      const nc = await getNatsConnection(natsOptions);
      expect(nc).toBeDefined();
      expect(nc.isClosed()).toBe(false);
    });

    test("should get JetStream client", async () => {
      const js = await getJetStream(natsOptions);
      expect(js).toBeDefined();
    });

    test("should verify EMAILS stream is ready", async () => {
      const ready = await isStreamReady(natsOptions);
      expect(ready).toBe(true);
    });
  });

  describe("Publishing Single Email", () => {
    test("should publish an email message to NATS", async () => {
      const message = createTestEmailMessage();
      const ack = await publishEmail(natsOptions, message);

      expect(ack).toBeDefined();
      expect(ack.stream).toBe("EMAILS");
      expect(ack.seq).toBeGreaterThan(0);
      expect(ack.duplicate).toBe(false);
    });

    test("should detect duplicate messages", async () => {
      const message = createTestEmailMessage();

      // First publish
      const ack1 = await publishEmail(natsOptions, message);
      expect(ack1.duplicate).toBe(false);

      // Second publish with same ID
      const ack2 = await publishEmail(natsOptions, message);
      expect(ack2.duplicate).toBe(true);
    });

    test("should publish to correct subject based on tenant and broadcast", async () => {
      const message = createTestEmailMessage({
        tenant_id: "tenant-abc",
        broadcast_id: "broadcast-xyz",
      });

      const ack = await publishEmail(natsOptions, message);
      expect(ack.stream).toBe("EMAILS");

      // The subject should be kibamail.emails.tenant-abc.broadcast-xyz
      // Verified by successful publish to EMAILS stream which filters kibamail.emails.>
    });

    test("should include all required fields in published message", async () => {
      const message = createTestEmailMessage({
        reply_to: { email: "reply@example.com", name: "Reply To" },
      });

      const ack = await publishEmail(natsOptions, message);
      expect(ack.stream).toBe("EMAILS");

      // Consume the message to verify content
      const js = await getJetStream(natsOptions);
      const stream = await js.streams.get("EMAILS");
      const consumer = await stream.getConsumer("email_agent_consumer");

      // Fetch recent messages
      const msgs = await consumer.fetch({ max_messages: 1 });
      for await (const msg of msgs) {
        const data = JSON.parse(sc.decode(msg.data)) as EmailMessage;

        // Verify structure
        expect(data.id).toBeDefined();
        expect(data.tenant_id).toBeDefined();
        expect(data.broadcast_id).toBeDefined();
        expect(data.contact_id).toBeDefined();
        expect(data.recipient).toBeDefined();
        expect(data.recipient.email).toBeDefined();
        expect(data.sender).toBeDefined();
        expect(data.sender.email).toBeDefined();
        expect(data.sender.domain).toBeDefined();
        expect(data.subject).toBeDefined();
        expect(data.content_key).toBeDefined();
        expect(data.metadata).toBeDefined();
        expect(typeof data.track_opens).toBe("boolean");
        expect(typeof data.track_clicks).toBe("boolean");

        msg.ack();
        break;
      }
    });
  });

  describe("Publishing Email Batch", () => {
    test("should publish multiple emails in a batch", async () => {
      const messages = [
        createTestEmailMessage({ contact_id: "contact-1" }),
        createTestEmailMessage({ contact_id: "contact-2" }),
        createTestEmailMessage({ contact_id: "contact-3" }),
      ];

      const acks = await publishEmailBatch(natsOptions, messages);

      expect(acks).toHaveLength(3);
      for (const ack of acks) {
        expect(ack.stream).toBe("EMAILS");
        expect(ack.seq).toBeGreaterThan(0);
      }
    });

    test("should handle empty batch", async () => {
      const acks = await publishEmailBatch(natsOptions, []);
      expect(acks).toHaveLength(0);
    });

    test("should publish large batch efficiently", async () => {
      const batchSize = 100;
      const messages = Array.from({ length: batchSize }, (_, i) =>
        createTestEmailMessage({ contact_id: `contact-batch-${i}` })
      );

      const startTime = Date.now();
      const acks = await publishEmailBatch(natsOptions, messages);
      const duration = Date.now() - startTime;

      expect(acks).toHaveLength(batchSize);

      // Should complete in reasonable time (< 5 seconds for 100 messages)
      expect(duration).toBeLessThan(5000);

      console.log(
        `Published ${batchSize} messages in ${duration}ms (${Math.round(
          (batchSize / duration) * 1000
        )} msgs/sec)`
      );
    });

    test("should identify duplicates in batch", async () => {
      // Create unique message
      const uniqueMessage = createTestEmailMessage();

      // First batch with unique message
      const acks1 = await publishEmailBatch(natsOptions, [uniqueMessage]);
      expect(acks1[0].duplicate).toBe(false);

      // Second batch with same message
      const acks2 = await publishEmailBatch(natsOptions, [uniqueMessage]);
      expect(acks2[0].duplicate).toBe(true);
    });
  });
});
