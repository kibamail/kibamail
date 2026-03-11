/**
 * MTA Events Handler
 *
 * Processes email events received from the MTA via webhook.
 * Handles bulk insertion and side effects (bounces, complaints).
 *
 * KumoMTA sends individual log records with this structure:
 * {
 *   type: "Delivery" | "Bounce" | etc,
 *   id: "message-spool-id",
 *   recipient: "email@example.com",
 *   meta: { tenant: "workspace-id", ... },
 *   response: { code: 250, content: "OK", ... },
 *   bounce_classification: "...",
 *   nodeid: "...",
 *   ...
 * }
 *
 * We transform this to our internal EmailEvent format.
 */

import type { NextRequest } from "next/server";
import { queue, queueLogger } from "@/lib/queue";
import type { EmailEvent } from "@/lib/mta";
import { responseOk } from "@/lib/api/responses";

const logger = queueLogger.child({ module: "mta-events-webhook" });

/**
 * KumoMTA log record format (as received from webhook)
 */
export interface KumoLogRecord {
  type: string;
  id: string;
  recipient: string | string[];
  sender?: string;
  meta?: Record<string, string>;
  headers?: Record<string, string>;
  response?: {
    code: number;
    content: string;
    command?: string;
    enhanced_code?: {
      class: number;
      subject: number;
      detail: number;
    };
  };
  bounce_classification?: string;
  nodeid?: string;
  timestamp?: number;
  event_time?: string;
  queue?: string;
  site?: string;
  size?: number;
  num_attempts?: number;
  peer_address?: { name?: string; addr?: string };
  egress_pool?: string;
  egress_source?: string;
  delivery_protocol?: string;
  reception_protocol?: string;
}

/**
 * Transform a KumoMTA log record to our internal EmailEvent format
 *
 * KumoMTA provides data in two places:
 * 1. `headers` - raw headers extracted via log_parameters.headers
 * 2. `meta` - metadata from import_x_headers (snake_case names)
 *
 * IMPORTANT: We use X-Kibamail-Email-Send-Id as the sending_id, NOT KumoMTA's
 * internal spool ID (record.id). This allows us to correlate events with our
 * TransactionalEmail records.
 */
/**
 * Parse a string meta value to a boolean.
 * Returns true for "1"/"true", false for "0"/"false", null otherwise.
 */
function parseBooleanMeta(value: string | undefined | null): boolean | null {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

export function transformKumoLogRecord(record: KumoLogRecord): EmailEvent {
  const recipient = Array.isArray(record.recipient)
    ? record.recipient[0]
    : record.recipient;

  // Extract our Email-Send-Id from headers or meta
  // This is the ID we generate and pass to KumoMTA, NOT their internal spool ID
  // import_x_headers converts X-Kibamail-Email-Send-Id to x_kibamail_email_send_id
  const sendingId =
    record.headers?.["X-Kibamail-Email-Send-Id"] ||
    record.meta?.x_kibamail_email_send_id ||
    record.meta?.kibamail_email_send_id ||
    record.id; // Fallback to KumoMTA's ID if our ID isn't found

  // Extract workspace/tenant ID from headers or meta
  // import_x_headers converts X-Kibamail-Workspace-Id to x_kibamail_workspace_id
  const tenantId =
    record.headers?.["X-Kibamail-Workspace-Id"] ||
    record.meta?.x_kibamail_workspace_id ||
    record.meta?.kibamail_workspace_id ||
    record.meta?.tenant ||
    "";

  const broadcastId =
    record.headers?.["X-Kibamail-Broadcast-Id"] ||
    record.meta?.x_kibamail_broadcast_id ||
    record.meta?.kibamail_broadcast_id ||
    "";

  const contactId =
    record.headers?.["X-Kibamail-Contact-Id"] ||
    record.meta?.x_kibamail_contact_id ||
    record.meta?.kibamail_contact_id ||
    "";

  return {
    type: record.type as EmailEvent["type"],
    sending_id: sendingId,
    recipient: recipient || "",
    tenant_id: tenantId,
    broadcast_id: broadcastId,
    contact_id: contactId,
    response: {
      code: record.response?.code || 0,
      content: record.response?.content || "",
      command: record.response?.command || null,
      enhanced_code: record.response?.enhanced_code || null,
    },
    bounce_classification: record.bounce_classification || "",
    timestamp: record.event_time || new Date(record.timestamp ? record.timestamp * 1000 : Date.now()).toISOString(),
    node_id: record.nodeid || "",

    // KumoMTA standard fields (sent automatically in every webhook)
    queue: record.queue || "",
    site_name: record.site || "",
    size: record.size ?? null,
    num_attempts: record.num_attempts ?? null,
    peer_address_name: record.peer_address?.name || "",
    peer_address_addr: record.peer_address?.addr || "",
    egress_pool: record.egress_pool || "",
    egress_source: record.egress_source || "",
    delivery_protocol: record.delivery_protocol || "",
    reception_protocol: record.reception_protocol || "",

    // Application metadata (from X-Kibamail-* headers → meta)
    sending_domain_id:
      record.headers?.["X-Kibamail-Sending-Domain-Id"] ||
      record.meta?.x_kibamail_sending_domain_id || "",
    sender_identity_id:
      record.headers?.["X-Kibamail-Sender-Identity-Id"] ||
      record.meta?.x_kibamail_sender_identity_id || "",
    click_tracking_enabled: parseBooleanMeta(
      record.headers?.["X-Kibamail-Click-Tracking"] ||
      record.meta?.x_kibamail_click_tracking
    ),
    open_tracking_enabled: parseBooleanMeta(
      record.headers?.["X-Kibamail-Open-Tracking"] ||
      record.meta?.x_kibamail_open_tracking
    ),
    from_email: record.meta?.x_kibamail_from_email || "",
    subject: record.meta?.x_kibamail_subject || "",
  };
}

/**
 * Process a batch of MTA events
 *
 * Receives events from the MTA webhook and processes them:
 * - Bulk inserts events into the database
 * - Creates suppression entries for bounces and complaints
 * - Logs delivery statistics
 */
export async function processMtaEvents(request: NextRequest) {
  const startTime = Date.now();

  // Parse request body - trusted internal system, no validation needed
  const body = await request.json();

  // Log raw payload for debugging
  logger.info(
    { payload: JSON.stringify(body).slice(0, 2000) },
    "Raw webhook payload received",
  );

  // Handle both formats:
  // 1. KumoMTA sends individual log records (body is the record itself)
  // 2. Legacy format with events array (body.events)
  let events: EmailEvent[];

  if (body.events && Array.isArray(body.events)) {
    // Legacy format: { events: [...] }
    logger.debug("Using legacy events array format");
    events = body.events;
  } else if (body.type && body.id) {
    // KumoMTA format: single log record
    logger.debug(
      { type: body.type, id: body.id, hasHeaders: !!body.headers, hasMeta: !!body.meta },
      "Using KumoMTA single record format",
    );
    events = [transformKumoLogRecord(body as KumoLogRecord)];
  } else {
    // Unknown format
    logger.warn({ body: JSON.stringify(body).slice(0, 500) }, "Unknown webhook payload format");
    return responseOk({
      processed: 0,
      message: "Unknown payload format",
    });
  }

  if (events.length === 0) {
    return responseOk({
      processed: 0,
      message: "No events to process",
    });
  }

  logger.info(
    { count: events.length },
    "Received MTA events webhook",
  );

  // Group events by type for logging
  const eventsByType = new Map<string, number>();
  for (const event of events) {
    eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);
  }

  logger.debug(
    { eventsByType: Object.fromEntries(eventsByType) },
    "Event types breakdown",
  );

  // Queue events for processing via BullMQ
  // This allows for retry logic if TransactionalEmail records don't exist yet
  // (race condition where webhook arrives before the send job completes)
  await queue("mta").push("process-events", { events });

  const duration = Date.now() - startTime;

  logger.info(
    {
      count: events.length,
      durationMs: duration,
    },
    "MTA events queued for processing",
  );

  return responseOk({
    queued: events.length,
    durationMs: duration,
  });
}
