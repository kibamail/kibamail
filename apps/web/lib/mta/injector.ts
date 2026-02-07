/**
 * MTA Email Injector
 *
 * Injects email messages directly to the MTA via HTTP.
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

interface KumoMtaEmailAddress {
  email: string;
  name?: string;
}

interface KumoMtaContent {
  text_body?: string;
  html_body?: string;
  // Native KumoMTA fields for standard headers
  from?: KumoMtaEmailAddress;
  subject?: string;
  reply_to?: KumoMtaEmailAddress;
  // Only for custom/additional headers (X-*, List-Unsubscribe, Message-ID, etc.)
  headers?: Record<string, string>;
  attachments?: Array<{
    data: string;
    base64: boolean;
    content_type: string;
    file_name?: string;
    content_id?: string;
  }>;
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
 * Uses KumoMTA's native schema fields for standard headers (from, subject, reply_to)
 * to avoid duplicate headers. Only custom headers go in the headers object.
 *
 * KumoMTA auto-generates:
 * - To: from the recipients array
 * - From: from content.from
 * - Subject: from content.subject
 * - Reply-To: from content.reply_to
 */
function convertToKumoMtaFormat(message: EmailMessage): KumoMtaRequest {
  const senderEmail = `${message.sender.email}@${message.sender.domain}`;

  // Only custom headers go here - standard headers use native KumoMTA fields
  const headers: Record<string, string> = {
    "Message-ID": message.metadata.message_id,
    ...message.headers, // List-Unsubscribe headers from prepare.ts
  };

  // Only set tracking headers if they have valid values
  // Empty/undefined values would cause issues in webhook processing
  if (message.broadcast_id) {
    headers["X-Kibamail-Broadcast-Id"] = message.broadcast_id;
  }
  if (message.contact_id) {
    headers["X-Kibamail-Contact-Id"] = message.contact_id;
  }
  if (message.tenant_id) {
    headers["X-Kibamail-Workspace-Id"] = message.tenant_id;
  }
  if (message.id) {
    headers["X-Kibamail-Email-Send-Id"] = message.id;
  }
  if (message.pool) {
    headers["X-Kibamail-Pool"] = message.pool;
  }
  if (message.sending_domain_id) {
    headers["X-Kibamail-Sending-Domain-Id"] = message.sending_domain_id;
  }
  if (message.sender_identity_id) {
    headers["X-Kibamail-Sender-Identity-Id"] = message.sender_identity_id;
  }
  headers["X-Kibamail-Click-Tracking"] = message.track_clicks ? "1" : "0";
  headers["X-Kibamail-Open-Tracking"] = message.track_opens ? "1" : "0";

  const attachments = message.attachments?.map((att) => ({
    data: att.data || "",
    base64: att.base64 ?? true,
    content_type: att.content_type,
    file_name: att.file_name,
    content_id: att.content_id,
  }));

  return {
    envelope_sender: message.metadata.envelope_sender,
    recipients: [
      {
        email: message.recipient.email,
        name: message.recipient.name || undefined,
      },
    ],
    content: {
      // Use native KumoMTA fields for standard headers
      from: {
        email: senderEmail,
        name: message.sender.name || undefined,
      },
      subject: message.subject,
      reply_to: {
        email: message.reply_to.email,
        name: message.reply_to.name || undefined,
      },
      // Content
      html_body: message.html_body,
      text_body: message.text_body,
      // Only custom/tracking headers
      headers,
      attachments: attachments?.length ? attachments : undefined,
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
    const response = await client.post<KumoMtaInjectResponse>(
      "/api/inject/v1",
      kumoRequest,
    );

    // KumoMTA returns { success_count, fail_count, failed_recipients, errors }
    const success = response.success_count > 0 && response.fail_count === 0;
    const errorMsg =
      response.errors.length > 0 ? response.errors.join(", ") : undefined;

    const result: InjectionResult = {
      id: message.id,
      success,
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
      results: [],
    };
  }

  logger.info({ count: messages.length }, "Injecting email batch to MTA");

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
  const failed = results.filter((r) => !r.success).length;

  logger.info(
    {
      total: messages.length,
      successful,
      failed,
    },
    "Email batch injected individually to MTA",
  );

  return {
    total: messages.length,
    successful,
    failed,
    results,
  };
}

/**
 * Check if the MTA is ready for injection
 *
 * @param options - MTA injection configuration
 * @returns True if the MTA is healthy and accepting connections
 */
export async function isMtaReady(
  options: MtaInjectionOptions,
): Promise<boolean> {
  try {
    const client = getMtaClient(options);
    return await client.healthCheck();
  } catch (error) {
    logger.warn({ error }, "MTA readiness check failed");
    return false;
  }
}
