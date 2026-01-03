/**
 * NATS Event Consumer
 *
 * Consumes email events from the EVENTS JetStream stream.
 * Uses batching for high-throughput bulk insertion into the database.
 */

import {
  AckPolicy,
  type ConsumerMessages,
  DeliverPolicy,
  type JsMsg,
  RetentionPolicy,
  StorageType,
  StringCodec,
} from "nats";
import { queueLogger } from "@/lib/queue";
import { getJetStream, getJetStreamManager } from "./client";
import type {
  EmailEvent,
  EventBatch,
  EventConsumerConfig,
} from "./event-types";
import { DEFAULT_CONSUMER_CONFIG } from "./event-types";
import {
  type BatchTraceContext,
  calculateBatchStats,
  endBatchSpan,
  recordBatchDuration,
  recordBatchSize,
  recordEventsFailed,
  recordMessageAcked,
  recordMessageNacked,
  startBatchSpan,
  updateConsumerStats,
} from "./instrumentation";
import type { NatsConnectionOptions } from "./types";

const logger = queueLogger.child({ module: "nats-consumer" });
const sc = StringCodec();

/**
 * Event consumer state
 */
interface ConsumerState {
  isRunning: boolean;
  messageIterator: ConsumerMessages | null;
  pendingBatch: {
    events: EmailEvent[];
    messages: JsMsg[];
    timer: NodeJS.Timeout | null;
  };
}

/**
 * Create a durable consumer for the EVENTS stream
 */
async function ensureConsumer(
  options: NatsConnectionOptions,
  config: EventConsumerConfig,
): Promise<void> {
  const jsm = await getJetStreamManager(options);

  try {
    // Check if consumer exists
    await jsm.consumers.info("EVENTS", config.consumerName);
    logger.info({ consumer: config.consumerName }, "Using existing consumer");
  } catch {
    // Create consumer if it doesn't exist
    await jsm.consumers.add("EVENTS", {
      durable_name: config.consumerName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      filter_subject: "kibamail.events.>",
      max_ack_pending: 10000,
      ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
    });
    logger.info({ consumer: config.consumerName }, "Created new consumer");
  }
}

/**
 * Parse an event message from NATS
 */
function parseEventMessage(msg: JsMsg): EmailEvent | null {
  try {
    const data = sc.decode(msg.data);
    return JSON.parse(data) as EmailEvent;
  } catch (error) {
    logger.error(
      { error, subject: msg.subject },
      "Failed to parse event message",
    );
    return null;
  }
}

/**
 * Process a batch of events with full instrumentation
 */
async function processBatch(
  batch: EventBatch,
  processor: (
    events: EmailEvent[],
    traceContext?: BatchTraceContext,
  ) => Promise<void>,
  consumerName: string,
): Promise<void> {
  const startTime = Date.now();
  const batchSize = batch.events.length;

  // Record batch size metric
  recordBatchSize(batchSize);

  // Calculate batch statistics for logging
  const stats = calculateBatchStats(batch.events);

  // Start trace span
  const traceContext = startBatchSpan(batchSize, consumerName);
  traceContext.span.setAttribute(
    "batch.event_types",
    JSON.stringify(stats.eventsByType),
  );
  traceContext.span.setAttribute(
    "batch.workspace_count",
    Object.keys(stats.eventsByWorkspace).length,
  );

  try {
    await processor(batch.events, traceContext);
    await batch.ackFn();

    const duration = Date.now() - startTime;

    // Record success metrics
    recordBatchDuration(duration, true);
    recordMessageAcked(batchSize);

    // End trace span
    endBatchSpan(traceContext, true);

    logger.info(
      {
        count: batchSize,
        durationMs: duration,
        eventsPerSecond: Math.round((batchSize / duration) * 1000),
        eventTypes: stats.eventsByType,
        workspaceCount: Object.keys(stats.eventsByWorkspace).length,
      },
      "Batch processed successfully",
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failure metrics
    recordBatchDuration(duration, false);
    recordEventsFailed(batchSize, "mixed", (error as Error).name || "unknown");

    // End trace span with error
    endBatchSpan(traceContext, false, error as Error);

    logger.error(
      { error, count: batchSize, eventTypes: stats.eventsByType },
      "Failed to process batch",
    );
    throw error;
  }
}

/**
 * Create and start an event consumer
 */
export async function startEventConsumer(
  options: NatsConnectionOptions,
  processor: (
    events: EmailEvent[],
    traceContext?: BatchTraceContext,
  ) => Promise<void>,
  config: EventConsumerConfig = DEFAULT_CONSUMER_CONFIG,
): Promise<{
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStats: () => Promise<{ pending: number; ackPending: number }>;
}> {
  const state: ConsumerState = {
    isRunning: false,
    messageIterator: null,
    pendingBatch: {
      events: [],
      messages: [],
      timer: null,
    },
  };

  // Ensure consumer exists
  await ensureConsumer(options, config);

  // Get JetStream client
  const js = await getJetStream(options);

  // Get the consumer
  const consumer = await js.consumers.get("EVENTS", config.consumerName);

  /**
   * Flush the current batch
   */
  async function flushBatch(): Promise<void> {
    if (state.pendingBatch.timer) {
      clearTimeout(state.pendingBatch.timer);
      state.pendingBatch.timer = null;
    }

    if (state.pendingBatch.events.length === 0) {
      return;
    }

    const events = [...state.pendingBatch.events];
    const messages = [...state.pendingBatch.messages];

    state.pendingBatch.events = [];
    state.pendingBatch.messages = [];

    const batch: EventBatch = {
      events,
      ackFn: async () => {
        // Acknowledge all messages in the batch
        for (const msg of messages) {
          msg.ack();
        }
      },
    };

    await processBatch(batch, processor, config.consumerName);
  }

  /**
   * Add an event to the pending batch
   */
  async function addToBatch(event: EmailEvent, msg: JsMsg): Promise<void> {
    state.pendingBatch.events.push(event);
    state.pendingBatch.messages.push(msg);

    // Start timer if this is the first message in the batch
    if (state.pendingBatch.timer === null) {
      state.pendingBatch.timer = setTimeout(async () => {
        try {
          await flushBatch();
        } catch (error) {
          logger.error({ error }, "Error flushing batch on timeout");
        }
      }, config.batchTimeoutMs);
    }

    // Flush if batch is full
    if (state.pendingBatch.events.length >= config.batchSize) {
      await flushBatch();
    }
  }

  /**
   * Main consumption loop
   */
  async function consumeMessages(): Promise<void> {
    state.isRunning = true;

    logger.info({ config }, "Starting event consumer");

    try {
      // Use consume() for continuous message consumption
      state.messageIterator = await consumer.consume({
        max_messages: config.batchSize * config.concurrency,
        expires: 30000, // 30 second expiry
      });

      for await (const msg of state.messageIterator) {
        if (!state.isRunning) {
          break;
        }

        const event = parseEventMessage(msg);

        if (event) {
          try {
            await addToBatch(event, msg);
          } catch (error) {
            logger.error({ error, event }, "Error adding event to batch");
            // NAK the message so it can be redelivered
            msg.nak();
            recordMessageNacked(1);
          }
        } else {
          // Invalid message - acknowledge to prevent redelivery
          msg.ack();
          recordMessageAcked(1);
        }
      }
    } catch (error) {
      if (state.isRunning) {
        logger.error({ error }, "Consumer error");
        throw error;
      }
    } finally {
      // Flush any remaining messages
      if (state.pendingBatch.events.length > 0) {
        try {
          await flushBatch();
        } catch (error) {
          logger.error({ error }, "Error flushing final batch");
        }
      }
    }
  }

  /**
   * Stop the consumer
   */
  async function stop(): Promise<void> {
    logger.info("Stopping event consumer");
    state.isRunning = false;

    if (state.pendingBatch.timer) {
      clearTimeout(state.pendingBatch.timer);
      state.pendingBatch.timer = null;
    }

    if (state.messageIterator) {
      state.messageIterator.stop();
    }

    // Flush any remaining messages
    if (state.pendingBatch.events.length > 0) {
      try {
        await flushBatch();
      } catch (error) {
        logger.error({ error }, "Error flushing batch during shutdown");
      }
    }

    logger.info("Event consumer stopped");
  }

  /**
   * Get consumer statistics (pending messages, ack pending)
   */
  async function getStats(): Promise<{ pending: number; ackPending: number }> {
    try {
      const info = await consumer.info();
      const pending = info.num_pending || 0;
      const ackPending = info.num_ack_pending || 0;

      // Update observable gauges
      updateConsumerStats(pending, ackPending);

      return { pending, ackPending };
    } catch (error) {
      logger.error({ error }, "Failed to get consumer stats");
      return { pending: 0, ackPending: 0 };
    }
  }

  // Start consuming in the background
  consumeMessages().catch((error) => {
    logger.error({ error }, "Consumer loop exited with error");
  });

  // Start periodic stats collection
  const statsInterval = setInterval(async () => {
    if (state.isRunning) {
      await getStats();
    }
  }, 10000); // Every 10 seconds

  return {
    stop: async () => {
      clearInterval(statsInterval);
      await stop();
    },
    isRunning: () => state.isRunning,
    getStats,
  };
}

/**
 * Create the EVENTS stream if it doesn't exist
 *
 * This is typically done by the email-agent, but we can ensure it exists
 * for development/testing scenarios.
 */
export async function ensureEventsStream(
  options: NatsConnectionOptions,
): Promise<void> {
  const jsm = await getJetStreamManager(options);

  try {
    await jsm.streams.info("EVENTS");
    logger.info("EVENTS stream exists");
  } catch {
    await jsm.streams.add({
      name: "EVENTS",
      subjects: ["kibamail.events.>"],
      retention: RetentionPolicy.Workqueue,
      max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
      storage: StorageType.File,
    });
    logger.info("Created EVENTS stream");
  }
}
