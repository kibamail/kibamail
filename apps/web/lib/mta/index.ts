/**
 * MTA Direct Injection Library
 *
 * Provides direct HTTP injection to the MTA
 *
 * Usage:
 * ```typescript
 * import { getMtaOptions, injectEmail, injectEmailBatch } from "@/lib/mta";
 *
 * const options = getMtaOptions();
 * await injectEmail(options, message);
 * await injectEmailBatch(options, messages);
 * ```
 */

import { env } from "@/env/schema";
import type { MtaInjectionOptions } from "./types";

// Re-export injection types
export type {
  EmailMessage,
  EmailRecipient,
  EmailSender,
  EmailAddress,
  EmailAttachment,
  InjectionResult,
  BatchInjectionResult,
  MtaInjectionOptions,
} from "./types";

// Re-export event types
export type {
  EmailEvent,
  EmailEventType,
  EventResponse,
  EventBatch,
} from "./event-types";

// Re-export event type helpers
export { mapEventType } from "./event-types";

// Re-export client
export { getMtaClient, resetMtaClient, MtaClient } from "./client";

// Re-export injector functions
export { injectEmail, injectEmailBatch, isMtaReady } from "./injector";

// Re-export event processor functions
export {
  bulkInsertEvents,
  processEventsWithSideEffects,
} from "./event-processor";

/**
 * Get MTA injection options from environment variables
 *
 * @returns MTA injection configuration
 */
export function getMtaOptions(): MtaInjectionOptions {
  return {
    url: env.MTA_INJECTION_URL,
    timeoutMs: env.MTA_INJECTION_TIMEOUT_MS,
    retryAttempts: env.MTA_INJECTION_RETRY_ATTEMPTS,
    batchSize: env.MTA_INJECTION_BATCH_SIZE,
  };
}
