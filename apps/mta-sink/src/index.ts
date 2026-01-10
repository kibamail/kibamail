import { Hono } from "hono";
import { logger } from "hono/logger";
import pino from "pino";

const log = pino({
  level: "info",
});

const app = new Hono();

app.use("*", logger());

interface KumoMtaRecipient {
  email: string;
  name?: string;
}

interface KumoMtaAttachment {
  data: string;
  base64?: boolean;
  content_type: string;
  file_name?: string;
  content_id?: string;
}

interface KumoMtaContent {
  text_body?: string;
  html_body?: string;
  preview_text?: string;
  headers?: Record<string, string>;
  attachments?: KumoMtaAttachment[];
  from?: { email: string; name?: string };
  subject?: string;
  reply_to?: { email: string; name?: string };
}

interface KumoMtaRequest {
  envelope_sender: string;
  content: KumoMtaContent;
  recipients: KumoMtaRecipient[];
}

interface InjectionResult {
  id: string;
  email: string;
  success: boolean;
  error?: string;
}

interface BatchInjectionResponse {
  total: number;
  successful: number;
  failed: number;
  results: InjectionResult[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateMessageId(domain: string): string {
  const id = generateId();
  const timestamp = Date.now().toString(36);
  return `${id}.${timestamp}@${domain}`;
}

app.post("/api/inject/v1", async (c) => {
  const requestId = generateId();
  const timestamp = new Date().toISOString();

  log.info({ requestId, timestamp }, "Received injection request");

  let body: KumoMtaRequest;
  try {
    body = await c.req.json();
  } catch (err) {
    log.error({ requestId, error: "Invalid JSON" }, "Failed to parse request body");
    return c.json(
      {
        error: "Invalid JSON",
      },
      400
    );
  }

  const { envelope_sender, content, recipients } = body;

  log.info(
    {
      requestId,
      envelope_sender,
      recipient_count: recipients?.length || 0,
      has_html_body: !!content?.html_body,
      has_text_body: !!content?.text_body,
      attachment_count: content?.attachments?.length || 0,
    },
    "Processing injection request"
  );

  log.info(
    {
      requestId,
      request_body: JSON.stringify(body, null, 2),
    },
    "Full request body"
  );

  if (!recipients || recipients.length === 0) {
    log.warn({ requestId }, "No recipients provided");
    return c.json(
      {
        error: "No recipients provided",
      },
      400
    );
  }

  const results: InjectionResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const messageId = generateMessageId("sink.kibamail.local");

    log.info(
      {
        requestId,
        message_id: messageId,
        recipient: recipient.email,
      },
      "Processing recipient"
    );

    successful++;
    results.push({
      id: messageId,
      email: recipient.email,
      success: true,
    });
  }

  const response: BatchInjectionResponse = {
    total: recipients.length,
    successful,
    failed,
    results,
  };

  log.info(
    {
      requestId,
      ...response,
    },
    "Injection request completed"
  );

  return c.json(response);
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

const PORT = process.env.PORT || "8000";

log.info({ port: PORT }, "Starting MTA sink server");

export default {
  port: PORT,
  fetch: app.fetch,
};
