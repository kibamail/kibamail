/**
 * NATS Email Publisher
 *
 * Publishes email messages to the EMAILS JetStream stream for processing
 * by email-agents on MTA nodes.
 */

import { StringCodec } from "nats";
import { queueLogger } from "@/lib/queue";
import { getJetStream } from "./client";
import type { EmailMessage, NatsConnectionOptions, PublishAck } from "./types";

const logger = queueLogger.child({ module: "nats-publisher" });
const sc = StringCodec();

/**
 * NATS subject patterns for email publishing
 *
 * Subject format: kibamail.emails.<tenant_id>.<broadcast_id>
 * This allows filtering by tenant and broadcast for observability.
 */
function buildEmailSubject(tenantId: string, broadcastId: string): string {
  return `kibamail.emails.${tenantId}.${broadcastId}`;
}

/**
 * Publish a single email message to NATS
 *
 * @param options - NATS connection options
 * @param message - The email message to publish
 * @returns The JetStream publish acknowledgment
 */
export async function publishEmail(
  options: NatsConnectionOptions,
  message: EmailMessage,
): Promise<PublishAck> {
  const js = await getJetStream(options);
  const subject = buildEmailSubject(message.tenant_id, message.broadcast_id);

  const data = sc.encode(JSON.stringify(message));

  const ack = await js.publish(subject, data, {
    msgID: message.id, // Deduplication ID
  });

  logger.debug(
    {
      messageId: message.id,
      subject,
      stream: ack.stream,
      seq: ack.seq,
      duplicate: ack.duplicate,
    },
    "Email published to NATS",
  );

  return {
    stream: ack.stream,
    seq: ack.seq,
    duplicate: ack.duplicate,
  };
}

/**
 * Publish multiple email messages in a batch
 *
 * Uses async publishing for better throughput.
 *
 * @param options - NATS connection options
 * @param messages - Array of email messages to publish
 * @returns Array of publish acknowledgments
 */
export async function publishEmailBatch(
  options: NatsConnectionOptions,
  messages: EmailMessage[],
): Promise<PublishAck[]> {
  if (messages.length === 0) {
    return [];
  }

  const js = await getJetStream(options);
  const acks: PublishAck[] = [];

  logger.info({ count: messages.length }, "Publishing email batch to NATS");

  // Publish all messages concurrently
  const publishPromises = messages.map(async (message) => {
    const subject = buildEmailSubject(message.tenant_id, message.broadcast_id);
    const data = sc.encode(JSON.stringify(message));

    try {
      const ack = await js.publish(subject, data, {
        msgID: message.id,
      });

      return {
        stream: ack.stream,
        seq: ack.seq,
        duplicate: ack.duplicate,
      };
    } catch (error) {
      logger.error({ messageId: message.id, error }, "Failed to publish email");
      throw error;
    }
  });

  const results = await Promise.all(publishPromises);
  acks.push(...results);

  logger.info(
    {
      count: messages.length,
      duplicates: acks.filter((a) => a.duplicate).length,
    },
    "Email batch published to NATS",
  );

  return acks;
}

/**
 * Check if the EMAILS stream is ready for publishing
 *
 * @param options - NATS connection options
 * @returns True if the stream exists and is ready
 */
export async function isStreamReady(
  options: NatsConnectionOptions,
): Promise<boolean> {
  try {
    const js = await getJetStream(options);
    const stream = await js.streams.get("EMAILS");
    const info = await stream.info();
    return info.state.messages >= 0;
  } catch (error) {
    logger.warn({ error }, "EMAILS stream not ready");
    return false;
  }
}
