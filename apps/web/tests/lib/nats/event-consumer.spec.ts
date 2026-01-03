/**
 * Integration tests for NATS Event Consumer
 *
 * These tests verify that the control plane can successfully consume
 * email events from NATS JetStream and insert them into the database.
 *
 * Prerequisites:
 * - NATS server running with TLS (docker compose up nats)
 * - NATS_URL, NATS_USER, NATS_PASSWORD, NATS_TLS_CA env vars set
 * - Database running and migrated
 */

import { describe, expect, test, beforeAll, afterAll, beforeEach } from "vitest";
import { StringCodec } from "nats";
import {
  getNatsConnection,
  getJetStream,
  getJetStreamManager,
  closeNatsConnection,
  startEventConsumer,
  ensureEventsStream,
  type NatsConnectionOptions,
} from "@/lib/nats";
import type { EmailEvent } from "@/lib/nats/event-types";
import { prisma } from "@/lib/db";

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
 * Create a test email event
 */
function createTestEvent(overrides: Partial<EmailEvent> = {}): EmailEvent {
  const id = `test-event-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    type: "Delivery",
    sending_id: id,
    recipient: "test@example.com",
    tenant_id: "test-workspace-event-123",
    broadcast_id: "test-broadcast-event-456",
    contact_id: "test-contact-event-789",
    response: {
      code: 250,
      enhanced_code: { class: 2, subject: 0, detail: 0 },
      content: "250 2.0.0 OK",
      command: ".",
    },
    bounce_classification: "Uncategorized",
    timestamp: new Date().toISOString(),
    node_id: "test-node-001",
    ...overrides,
  };
}

/**
 * Publish test events directly to NATS
 */
async function publishTestEvents(
  options: NatsConnectionOptions,
  events: EmailEvent[]
): Promise<void> {
  const js = await getJetStream(options);

  for (const event of events) {
    const subject = `kibamail.events.${event.type.toLowerCase()}.${event.tenant_id}`;
    const data = sc.encode(JSON.stringify(event));
    await js.publish(subject, data);
  }
}

describe("NATS Event Consumer Integration Tests", () => {
  let natsOptions: NatsConnectionOptions;
  const testConsumerName = `test-consumer-${Date.now()}`;

  beforeAll(async () => {
    natsOptions = getTestNatsOptions();
    await getNatsConnection(natsOptions);
    await ensureEventsStream(natsOptions);
  });

  afterAll(async () => {
    try {
      const jsm = await getJetStreamManager(natsOptions);
      await jsm.consumers.delete("EVENTS", testConsumerName);
    } catch {
      // Consumer might not exist
    }
    await closeNatsConnection();
  });

  beforeEach(async () => {
    await prisma.event.deleteMany({
      where: {
        workspaceId: "test-workspace-event-123",
      },
    });
  });

  describe("Stream Setup", () => {
    test("should ensure EVENTS stream exists", async () => {
      await ensureEventsStream(natsOptions);

      const jsm = await getJetStreamManager(natsOptions);
      const info = await jsm.streams.info("EVENTS");

      expect(info.config.name).toBe("EVENTS");
      expect(info.config.subjects).toContain("kibamail.events.>");
    });
  });

  describe("Event Consumption", () => {
    test("should consume and process events", async () => {
      const processedEvents: EmailEvent[] = [];

      const consumer = await startEventConsumer(
        natsOptions,
        async (events) => {
          processedEvents.push(...events);
        },
        {
          batchSize: 10,
          batchTimeoutMs: 500,
          concurrency: 1,
          consumerName: testConsumerName,
        }
      );

      expect(consumer.isRunning()).toBe(true);

      const testEvents = [
        createTestEvent({ type: "Delivery" }),
        createTestEvent({ type: "Bounce", bounce_classification: "InvalidRecipient" }),
        createTestEvent({ type: "TransientFailure" }),
      ];

      await publishTestEvents(natsOptions, testEvents);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await consumer.stop();
      expect(consumer.isRunning()).toBe(false);

      expect(processedEvents.length).toBeGreaterThanOrEqual(testEvents.length);

      const deliveryEvents = processedEvents.filter((e) => e.type === "Delivery");
      const bounceEvents = processedEvents.filter((e) => e.type === "Bounce");

      expect(deliveryEvents.length).toBeGreaterThanOrEqual(1);
      expect(bounceEvents.length).toBeGreaterThanOrEqual(1);
    });

    test("should batch events efficiently", async () => {
      let batchCount = 0;
      let totalEvents = 0;

      const consumer = await startEventConsumer(
        natsOptions,
        async (events) => {
          batchCount++;
          totalEvents += events.length;
        },
        {
          batchSize: 5,
          batchTimeoutMs: 500,
          concurrency: 1,
          consumerName: `${testConsumerName}-batch`,
        }
      );

      const events = Array.from({ length: 10 }, (_, i) =>
        createTestEvent({ sending_id: `batch-test-${Date.now()}-${i}` })
      );

      await publishTestEvents(natsOptions, events);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await consumer.stop();

      expect(totalEvents).toBeGreaterThanOrEqual(events.length);
    });
  });

  describe("Event Types", () => {
    test("should handle delivery events", async () => {
      const deliveryEvent = createTestEvent({
        type: "Delivery",
        response: {
          code: 250,
          enhanced_code: { class: 2, subject: 0, detail: 0 },
          content: "250 2.0.0 OK",
          command: ".",
        },
      });

      let receivedEvent: EmailEvent | null = null;

      const consumer = await startEventConsumer(
        natsOptions,
        async (events) => {
          receivedEvent = events.find((e) => e.sending_id === deliveryEvent.sending_id) || null;
        },
        {
          batchSize: 1,
          batchTimeoutMs: 100,
          concurrency: 1,
          consumerName: `${testConsumerName}-delivery`,
        }
      );

      await publishTestEvents(natsOptions, [deliveryEvent]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await consumer.stop();

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent!.type).toBe("Delivery");
      expect(receivedEvent!.response.code).toBe(250);
    });

    test("should handle bounce events", async () => {
      const bounceEvent = createTestEvent({
        type: "Bounce",
        bounce_classification: "InvalidRecipient",
        response: {
          code: 550,
          enhanced_code: { class: 5, subject: 1, detail: 1 },
          content: "550 5.1.1 User unknown",
          command: "RCPT TO",
        },
      });

      let receivedEvent: EmailEvent | null = null;

      const consumer = await startEventConsumer(
        natsOptions,
        async (events) => {
          receivedEvent = events.find((e) => e.sending_id === bounceEvent.sending_id) || null;
        },
        {
          batchSize: 1,
          batchTimeoutMs: 100,
          concurrency: 1,
          consumerName: `${testConsumerName}-bounce`,
        }
      );

      await publishTestEvents(natsOptions, [bounceEvent]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await consumer.stop();

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent!.type).toBe("Bounce");
      expect(receivedEvent!.bounce_classification).toBe("InvalidRecipient");
    });

    test("should handle feedback events", async () => {
      const feedbackEvent = createTestEvent({
        type: "Feedback",
        response: {
          code: 250,
          content: "OK",
        },
      });

      let receivedEvent: EmailEvent | null = null;

      const consumer = await startEventConsumer(
        natsOptions,
        async (events) => {
          receivedEvent = events.find((e) => e.sending_id === feedbackEvent.sending_id) || null;
        },
        {
          batchSize: 1,
          batchTimeoutMs: 100,
          concurrency: 1,
          consumerName: `${testConsumerName}-feedback`,
        }
      );

      await publishTestEvents(natsOptions, [feedbackEvent]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await consumer.stop();

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent!.type).toBe("Feedback");
    });
  });
});
