/**
 * MTA Email Injector
 *
 * Injects email messages directly to the MTA via HTTP.
 * Replaces the NATS-based publishing for email delivery.
 */

import { queueLogger } from "@/lib/queue";
import { getMtaClient } from "./client";
import type {
  BatchInjectionResult,
  EmailMessage,
  InjectionResult,
  MtaInjectionOptions,
} from "./types";

const logger = queueLogger.child({ module: "mta-injector" });

/**
 * KumoMTA native injection format
 */
interface KumoMtaRecipient {
  email: string;
  name?: string;
}

interface KumoMtaContent {
  text_body?: string;
  html_body?: string;
  headers?: Record<string, string>;
}

interface KumoMtaRequest {
  envelope_sender: string;
  recipients: KumoMtaRecipient[];
  content: KumoMtaContent;
}

/**
 * KumoMTA injection response format
 */
interface KumoMtaInjectResponse {
  success_count: number;
  fail_count: number;
  failed_recipients: string[];
  errors: string[];
}

/**
 * Convert EmailMessage to KumoMTA native format
 *
 * Builds the native request format using content directly from the message.
 */
function convertToKumoMtaFormat(message: EmailMessage): KumoMtaRequest {
  // Build the From header
  const senderEmail = `${message.sender.email}@${message.sender.domain}`;
  const fromHeader = message.sender.name
    ? `${message.sender.name} <${senderEmail}>`
    : senderEmail;

  // Build the To header
  const toHeader = message.recipient.name
    ? `${message.recipient.name} <${message.recipient.email}>`
    : message.recipient.email;

  // Build headers object
  const headers: Record<string, string> = {
    Subject: message.subject,
    From: fromHeader,
    To: toHeader,
    "Reply-To": message.reply_to.email,
    "Message-ID": `<${message.metadata.message_id}>`,
    // Include custom headers (like List-Unsubscribe)
    ...message.headers,
  };

  // Add X-Kibamail tracking headers
  headers["X-Kibamail-Broadcast-Id"] = message.broadcast_id;
  headers["X-Kibamail-Contact-Id"] = message.contact_id;
  headers["X-Kibamail-Workspace-Id"] = message.tenant_id;
  headers["X-Kibamail-Email-Send-Id"] = message.id;

  return {
    envelope_sender: message.metadata.envelope_sender,
    recipients: [
      {
        email: message.recipient.email,
        name: message.recipient.name || undefined,
      },
    ],
    content: {
      html_body: message.html_body,
      text_body: message.text_body,
      headers,
    },
  };
}

/**
 * Inject a single email message to the MTA
 *
 * @param options - MTA injection configuration
 * @param message - The email message to inject
 * @returns The injection result
 */
export async function injectEmail(
  options: MtaInjectionOptions,
  message: EmailMessage,
): Promise<InjectionResult> {
  const client = getMtaClient(options);

  logger.debug(
    {
      messageId: message.id,
      recipient: message.recipient.email,
      broadcastId: message.broadcast_id,
    },
    "Injecting email to MTA",
  );

  try {
    // Convert to KumoMTA native format
    const kumoRequest = convertToKumoMtaFormat(message);

    // Send to MTA using native injection API
    const response = await client.post<KumoMtaInjectResponse>("/api/inject/v1", kumoRequest);

    // KumoMTA returns { success_count, fail_count, failed_recipients, errors }
    const success = response.success_count > 0 && response.fail_count === 0;
    const errorMsg = response.errors.length > 0 ? response.errors.join(", ") : undefined;

    const result: InjectionResult = {
      id: message.id,
      success,
      duplicate: false, // KumoMTA doesn't have duplicate detection
      error: errorMsg,
    };

    logger.debug(
      {
        messageId: message.id,
        success: result.success,
        successCount: response.success_count,
        failCount: response.fail_count,
      },
      "Email injected to MTA",
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { messageId: message.id, error: errorMessage },
      "Failed to inject email to MTA",
    );

    return {
      id: message.id,
      success: false,
      duplicate: false,
      error: errorMessage,
    };
  }
}

/**
 * Inject multiple email messages in a batch
 *
 * KumoMTA doesn't have a native batch endpoint, so we inject individually
 * with parallel processing for efficiency.
 *
 * @param options - MTA injection configuration
 * @param messages - Array of email messages to inject
 * @returns Batch injection result with individual results
 */
export async function injectEmailBatch(
  options: MtaInjectionOptions,
  messages: EmailMessage[],
): Promise<BatchInjectionResult> {
  if (messages.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      results: [],
    };
  }

  logger.info(
    { count: messages.length },
    "Injecting email batch to MTA",
  );

  // KumoMTA doesn't have a batch endpoint, inject individually with parallelism
  return injectEmailBatchIndividually(options, messages);
}

/**
 * Inject emails individually (fallback when batch endpoint is unavailable)
 */
async function injectEmailBatchIndividually(
  options: MtaInjectionOptions,
  messages: EmailMessage[],
): Promise<BatchInjectionResult> {
  const results: InjectionResult[] = [];

  // Process in parallel with concurrency limit
  const concurrency = 10;
  const chunks: EmailMessage[][] = [];

  for (let i = 0; i < messages.length; i += concurrency) {
    chunks.push(messages.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((message) => injectEmail(options, message)),
    );
    results.push(...chunkResults);
  }

  const successful = results.filter((r) => r.success).length;
  const duplicates = results.filter((r) => r.duplicate).length;
  const failed = results.filter((r) => !r.success).length;

  logger.info(
    {
      total: messages.length,
      successful,
      duplicates,
      failed,
    },
    "Email batch injected individually to MTA",
  );

  return {
    total: messages.length,
    successful,
    failed,
    duplicates,
    results,
  };
}

/**
 * Check if the MTA is ready for injection
 *
 * @param options - MTA injection configuration
 * @returns True if the MTA is healthy and accepting connections
 */
export async function isMtaReady(options: MtaInjectionOptions): Promise<boolean> {
  try {
    const client = getMtaClient(options);
    return await client.healthCheck();
  } catch (error) {
    logger.warn({ error }, "MTA readiness check failed");
    return false;
  }
}
