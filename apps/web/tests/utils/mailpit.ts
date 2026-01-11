/**
 * Mailpit Test Helper
 *
 * Utility for interacting with Mailpit in integration tests.
 * Provides methods to fetch, search, and assert on delivered emails.
 *
 * Mailpit API docs: https://github.com/axllent/mailpit
 */

/**
 * Mailpit message summary (from list endpoint)
 */
export interface MailpitMessageSummary {
  ID: string;
  MessageID: string;
  Read: boolean;
  From: MailpitAddress;
  To: MailpitAddress[];
  Cc: MailpitAddress[];
  Bcc: MailpitAddress[];
  ReplyTo: MailpitAddress[];
  Subject: string;
  Created: string;
  Tags: string[];
  Size: number;
  Attachments: number;
  Snippet: string;
}

/**
 * Mailpit full message (from single message endpoint)
 */
export interface MailpitMessage {
  ID: string;
  MessageID: string;
  From: MailpitAddress;
  To: MailpitAddress[];
  Cc: MailpitAddress[];
  Bcc: MailpitAddress[];
  ReplyTo: MailpitAddress[];
  Subject: string;
  Date: string;
  Tags: string[];
  Text: string;
  HTML: string;
  Size: number;
  Inline: MailpitAttachment[];
  Attachments: MailpitAttachment[];
}

/**
 * Mailpit address format
 */
export interface MailpitAddress {
  Name: string;
  Address: string;
}

/**
 * Mailpit attachment info
 */
export interface MailpitAttachment {
  PartID: string;
  FileName: string;
  ContentType: string;
  ContentID: string;
  Size: number;
}

/**
 * Mailpit messages list response
 */
export interface MailpitMessagesResponse {
  total: number;
  unread: number;
  count: number;
  start: number;
  messages: MailpitMessageSummary[];
}

/**
 * Mailpit raw message headers
 */
export interface MailpitHeaders {
  [key: string]: string[];
}

/**
 * Mailpit test client configuration
 */
export interface MailpitClientOptions {
  /** Mailpit API base URL (default: http://localhost:8025) */
  baseUrl?: string;
  /** Request timeout in ms (default: 5000) */
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<MailpitClientOptions> = {
  baseUrl: "http://localhost:8025",
  timeoutMs: 5000,
};

/**
 * Mailpit Test Client
 *
 * Provides methods to interact with Mailpit for test assertions.
 */
export class MailpitClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: MailpitClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_OPTIONS.baseUrl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs;
  }

  /**
   * Make a request to the Mailpit API
   */
  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Mailpit request failed: ${response.status} ${await response.text()}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Mailpit request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Make a raw request to the Mailpit API (returns text)
   */
  private async requestText(endpoint: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mailpit request failed: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Mailpit request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Check if Mailpit is running and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/v1/info`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get all messages in Mailpit
   *
   * @param limit - Maximum number of messages to return (default: 50)
   */
  async getMessages(limit = 50): Promise<MailpitMessageSummary[]> {
    const response = await this.request<MailpitMessagesResponse>(
      "GET",
      `/messages?limit=${limit}`,
    );
    return response.messages;
  }

  /**
   * Get a specific message by ID
   *
   * @param id - Mailpit message ID
   */
  async getMessage(id: string): Promise<MailpitMessage> {
    return this.request<MailpitMessage>("GET", `/message/${id}`);
  }

  /**
   * Get the raw source of a message (RFC 5322 format)
   *
   * This is useful for inspecting headers like DKIM-Signature
   *
   * @param id - Mailpit message ID
   */
  async getRawMessage(id: string): Promise<string> {
    return this.requestText(`/message/${id}/source`);
  }

  /**
   * Get headers of a specific message
   *
   * @param id - Mailpit message ID
   */
  async getHeaders(id: string): Promise<MailpitHeaders> {
    return this.request<MailpitHeaders>("GET", `/message/${id}/headers`);
  }

  /**
   * Get attachment content from a message
   *
   * @param messageId - Mailpit message ID
   * @param partId - Attachment part ID
   * @returns Base64 encoded attachment content
   */
  async getAttachment(messageId: string, partId: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/message/${messageId}/part/${partId}`,
        {
          method: "GET",
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mailpit request failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Mailpit request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Search for messages
   *
   * @param query - Search query (e.g., "to:user@example.com" or "subject:Newsletter")
   * @param limit - Maximum number of results (default: 50)
   */
  async searchMessages(
    query: string,
    limit = 50,
  ): Promise<MailpitMessageSummary[]> {
    const response = await this.request<MailpitMessagesResponse>(
      "GET",
      `/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    );
    return response.messages;
  }

  /**
   * Find messages by recipient email
   *
   * @param email - Recipient email address
   */
  async findByRecipient(email: string): Promise<MailpitMessageSummary[]> {
    return this.searchMessages(`to:${email}`);
  }

  /**
   * Find messages by sender email
   *
   * @param email - Sender email address
   */
  async findBySender(email: string): Promise<MailpitMessageSummary[]> {
    return this.searchMessages(`from:${email}`);
  }

  /**
   * Find messages by subject
   *
   * @param subject - Subject to search for
   */
  async findBySubject(subject: string): Promise<MailpitMessageSummary[]> {
    return this.searchMessages(`subject:${subject}`);
  }

  /**
   * Wait for a message to arrive for a specific recipient
   *
   * @param email - Recipient email address
   * @param options - Wait options
   * @returns The first matching message, or null if timeout
   */
  async waitForMessage(
    email: string,
    options: { timeoutMs?: number; pollIntervalMs?: number } = {},
  ): Promise<MailpitMessage | null> {
    const timeout = options.timeoutMs ?? 30000;
    const pollInterval = options.pollIntervalMs ?? 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const messages = await this.findByRecipient(email);
      if (messages.length > 0) {
        return this.getMessage(messages[0].ID);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return null;
  }

  /**
   * Wait for multiple messages to arrive
   *
   * @param count - Expected number of messages
   * @param options - Wait options
   * @returns Array of message summaries, or empty if timeout
   */
  async waitForMessages(
    count: number,
    options: { timeoutMs?: number; pollIntervalMs?: number } = {},
  ): Promise<MailpitMessageSummary[]> {
    const timeout = options.timeoutMs ?? 30000;
    const pollInterval = options.pollIntervalMs ?? 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages(count);
      if (messages.length >= count) {
        return messages.slice(0, count);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Return whatever we have
    return this.getMessages(count);
  }
}

/**
 * Email assertion helpers
 */
export const emailAssertions = {
  /**
   * Check if a raw email has a DKIM signature
   *
   * @param rawEmail - Raw RFC 5322 email content
   * @param domain - Optional domain to check for
   */
  hasDkimSignature(rawEmail: string, domain?: string): boolean {
    const dkimPattern = domain
      ? new RegExp(`DKIM-Signature:[^]*?d=${domain.replace(".", "\\.")}`, "i")
      : /DKIM-Signature:/i;
    return dkimPattern.test(rawEmail);
  },

  /**
   * Extract DKIM signatures from raw email
   *
   * @param rawEmail - Raw RFC 5322 email content
   * @returns Array of DKIM signature objects with domain info
   */
  extractDkimSignatures(
    rawEmail: string,
  ): Array<{ domain: string; selector: string }> {
    const signatures: Array<{ domain: string; selector: string }> = [];
    const dkimRegex = /DKIM-Signature:[\s\S]*?d=([^\s;]+)[\s\S]*?s=([^\s;]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = dkimRegex.exec(rawEmail)) !== null) {
      signatures.push({
        domain: match[1],
        selector: match[2],
      });
    }

    return signatures;
  },

  /**
   * Check if email has required headers
   *
   * @param headers - Mailpit headers object
   * @param required - Array of required header names
   */
  hasRequiredHeaders(headers: MailpitHeaders, required: string[]): boolean {
    return required.every((header) => {
      const key = Object.keys(headers).find(
        (k) => k.toLowerCase() === header.toLowerCase(),
      );
      return key !== undefined && headers[key].length > 0;
    });
  },

  /**
   * Get header value (case-insensitive)
   *
   * @param headers - Mailpit headers object
   * @param name - Header name
   */
  getHeader(headers: MailpitHeaders, name: string): string | undefined {
    const key = Object.keys(headers).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    return key ? headers[key][0] : undefined;
  },

  /**
   * Check if HTML content contains expected elements
   *
   * @param html - HTML content
   * @param patterns - Array of regex patterns or strings to find
   */
  htmlContains(html: string, patterns: (string | RegExp)[]): boolean {
    return patterns.every((pattern) => {
      if (typeof pattern === "string") {
        return html.includes(pattern);
      }
      return pattern.test(html);
    });
  },

  /**
   * Check if email has tracking pixel
   *
   * @param html - HTML content
   */
  hasOpenTrackingPixel(html: string): boolean {
    // Look for tracking pixel patterns (1x1 img with tracking URL)
    return /<img[^>]+src=["'][^"']*\/t\/[^"']*["'][^>]*>/i.test(html);
  },

  /**
   * Check if links are rewritten for click tracking
   *
   * @param html - HTML content
   */
  hasClickTracking(html: string): boolean {
    // Look for rewritten links with tracking path
    return /href=["'][^"']*\/c\/[^"']*["']/i.test(html);
  },

  /**
   * Extract unsubscribe URL from email
   *
   * @param html - HTML content
   */
  extractUnsubscribeUrl(html: string): string | null {
    const match = html.match(/href=["']([^"']*unsubscribe[^"']*)["']/i);
    return match ? match[1] : null;
  },
};

/**
 * Create a Mailpit client with default settings for MTA testing
 */
export function createMailpitClient(
  options?: MailpitClientOptions,
): MailpitClient {
  return new MailpitClient({
    baseUrl: process.env.MAILPIT_URL ?? "http://localhost:8025",
    ...options,
  });
}

/**
 * Skip test if Mailpit is not available
 *
 * Use in beforeAll to conditionally skip MTA integration tests
 */
export async function skipIfMailpitUnavailable(): Promise<boolean> {
  const client = createMailpitClient();
  const available = await client.isHealthy();
  if (!available) {
    console.log("Mailpit not available, skipping MTA integration tests");
  }
  return !available;
}
