/**
 * NATS Consumer Instrumentation
 *
 * OpenTelemetry metrics and tracing for the event ingestor.
 */

import {
  metrics,
  Counter,
  Histogram,
  ObservableGauge,
  Attributes,
} from "@opentelemetry/api";
import { trace, Span, SpanStatusCode, context } from "@opentelemetry/api";

const meter = metrics.getMeter("event-ingestor", "1.0.0");
const tracer = trace.getTracer("event-ingestor", "1.0.0");

// ============================================================
// Counters
// ============================================================

/** Total events processed successfully */
const eventsProcessedCounter = meter.createCounter("event_ingestor.events.processed", {
  description: "Total number of events processed successfully",
  unit: "events",
});

/** Total events that failed processing */
const eventsFailedCounter = meter.createCounter("event_ingestor.events.failed", {
  description: "Total number of events that failed processing",
  unit: "events",
});

/** Total suppressions created */
const suppressionsCreatedCounter = meter.createCounter("event_ingestor.suppressions.created", {
  description: "Total number of suppression list entries created",
  unit: "entries",
});

/** Total NATS messages acknowledged */
const messagesAckedCounter = meter.createCounter("event_ingestor.nats.messages.acked", {
  description: "Total number of NATS messages acknowledged",
  unit: "messages",
});

/** Total NATS message acknowledgment failures */
const messagesNackCounter = meter.createCounter("event_ingestor.nats.messages.nacked", {
  description: "Total number of NATS messages negatively acknowledged",
  unit: "messages",
});

// ============================================================
// Histograms
// ============================================================

/** Batch size distribution */
const batchSizeHistogram = meter.createHistogram("event_ingestor.batch.size", {
  description: "Distribution of batch sizes",
  unit: "events",
});

/** Batch processing duration */
const batchDurationHistogram = meter.createHistogram("event_ingestor.batch.duration", {
  description: "Time to process a batch of events",
  unit: "ms",
});

/** Database insert duration */
const dbInsertDurationHistogram = meter.createHistogram("event_ingestor.db.insert_duration", {
  description: "Time to bulk insert events into database",
  unit: "ms",
});

/** Suppression processing duration */
const suppressionDurationHistogram = meter.createHistogram("event_ingestor.suppressions.duration", {
  description: "Time to process suppressions",
  unit: "ms",
});

// ============================================================
// Gauges (observable - set via callbacks)
// ============================================================

let pendingMessages = 0;
let ackPending = 0;
let consumerLag = 0;

meter.createObservableGauge("event_ingestor.nats.pending_messages", {
  description: "Number of messages pending in the stream",
  unit: "messages",
}).addCallback((gauge) => {
  gauge.observe(pendingMessages);
});

meter.createObservableGauge("event_ingestor.nats.ack_pending", {
  description: "Number of messages pending acknowledgment",
  unit: "messages",
}).addCallback((gauge) => {
  gauge.observe(ackPending);
});

meter.createObservableGauge("event_ingestor.consumer.lag", {
  description: "Consumer lag (pending - ack_pending)",
  unit: "messages",
}).addCallback((gauge) => {
  gauge.observe(consumerLag);
});

// ============================================================
// Metric Recording Functions
// ============================================================

export function recordEventsProcessed(count: number, eventType: string, workspaceId: string): void {
  eventsProcessedCounter.add(count, {
    event_type: eventType,
    workspace_id: workspaceId,
  });
}

export function recordEventsFailed(count: number, eventType: string, errorType: string): void {
  eventsFailedCounter.add(count, {
    event_type: eventType,
    error_type: errorType,
  });
}

export function recordSuppressionCreated(reason: "bounced" | "complained", count: number = 1): void {
  suppressionsCreatedCounter.add(count, { reason });
}

export function recordMessageAcked(count: number = 1): void {
  messagesAckedCounter.add(count);
}

export function recordMessageNacked(count: number = 1): void {
  messagesNackCounter.add(count);
}

export function recordBatchSize(size: number): void {
  batchSizeHistogram.record(size);
}

export function recordBatchDuration(durationMs: number, success: boolean): void {
  batchDurationHistogram.record(durationMs, { success: String(success) });
}

export function recordDbInsertDuration(durationMs: number, eventCount: number): void {
  dbInsertDurationHistogram.record(durationMs, { event_count: String(eventCount) });
}

export function recordSuppressionDuration(durationMs: number, reason: string): void {
  suppressionDurationHistogram.record(durationMs, { reason });
}

export function updateConsumerStats(pending: number, ackPend: number): void {
  pendingMessages = pending;
  ackPending = ackPend;
  consumerLag = pending - ackPend;
}

// ============================================================
// Tracing Functions
// ============================================================

export interface BatchTraceContext {
  span: Span;
  startTime: number;
}

/**
 * Start a trace span for batch processing
 */
export function startBatchSpan(batchSize: number, consumerName: string): BatchTraceContext {
  const span = tracer.startSpan("event_ingestor.process_batch", {
    attributes: {
      "batch.size": batchSize,
      "consumer.name": consumerName,
    },
  });

  return {
    span,
    startTime: Date.now(),
  };
}

/**
 * End a batch processing span
 */
export function endBatchSpan(ctx: BatchTraceContext, success: boolean, error?: Error): void {
  const duration = Date.now() - ctx.startTime;

  ctx.span.setAttribute("batch.duration_ms", duration);
  ctx.span.setAttribute("batch.success", success);

  if (error) {
    ctx.span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    ctx.span.recordException(error);
  } else {
    ctx.span.setStatus({ code: SpanStatusCode.OK });
  }

  ctx.span.end();
}

/**
 * Create a child span for database operations
 */
export function withDbSpan<T>(
  parentSpan: Span,
  operation: string,
  eventCount: number,
  fn: () => Promise<T>
): Promise<T> {
  const ctx = trace.setSpan(context.active(), parentSpan);

  return tracer.startActiveSpan(
    `event_ingestor.db.${operation}`,
    { attributes: { "db.event_count": eventCount } },
    ctx,
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.setAttribute("db.duration_ms", Date.now() - startTime);
        span.end();
      }
    }
  );
}

/**
 * Create a child span for suppression processing
 */
export function withSuppressionSpan<T>(
  parentSpan: Span,
  reason: string,
  count: number,
  fn: () => Promise<T>
): Promise<T> {
  const ctx = trace.setSpan(context.active(), parentSpan);

  return tracer.startActiveSpan(
    `event_ingestor.process_suppressions`,
    { attributes: { "suppression.reason": reason, "suppression.count": count } },
    ctx,
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.setAttribute("suppression.duration_ms", Date.now() - startTime);
        span.end();
      }
    }
  );
}

// ============================================================
// Batch Statistics
// ============================================================

export interface BatchStats {
  eventsByType: Record<string, number>;
  eventsByWorkspace: Record<string, number>;
  totalEvents: number;
}

/**
 * Calculate statistics for a batch of events
 */
export function calculateBatchStats(events: Array<{ type: string; tenant_id: string }>): BatchStats {
  const eventsByType: Record<string, number> = {};
  const eventsByWorkspace: Record<string, number> = {};

  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsByWorkspace[event.tenant_id] = (eventsByWorkspace[event.tenant_id] || 0) + 1;
  }

  return {
    eventsByType,
    eventsByWorkspace,
    totalEvents: events.length,
  };
}

/**
 * Record metrics for a processed batch
 */
export function recordBatchStats(stats: BatchStats): void {
  for (const [eventType, count] of Object.entries(stats.eventsByType)) {
    for (const [workspaceId, wsCount] of Object.entries(stats.eventsByWorkspace)) {
      // Only record if this workspace had this event type
      // This is an approximation - for exact counts we'd need per-event tracking
      if (wsCount > 0) {
        recordEventsProcessed(count, eventType, workspaceId);
      }
    }
  }
}
