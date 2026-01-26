/**
 * MTA HTTP Client
 *
 * Manages HTTP connections to the MTA for direct email injection.
 * Provides connection pooling, timeouts, and retry logic.
 */

import { queueLogger } from "@/lib/queue";
import type { MtaInjectionOptions } from "./types";

const logger = queueLogger.child({ module: "mta-client" });

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay = 1000): number {
  // Exponential backoff with jitter: baseDelay * 2^attempt + random jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * HTTP client for MTA injection
 */
export class MtaClient {
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly secretKey: string;

  constructor(options: MtaInjectionOptions) {
    this.url = options.url;
    this.timeoutMs = options.timeoutMs;
    this.retryAttempts = options.retryAttempts;
    this.secretKey = options.secretKey;
  }

  /**
   * Send a POST request to the MTA with retry logic
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.url}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kibamail-Injection-Key": this.secretKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();

          // Don't retry client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`MTA request failed: ${response.status} ${errorText}`);
          }

          // Retry server errors (5xx) and rate limits (429)
          throw new Error(`MTA request failed: ${response.status} ${errorText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's an abort error (timeout)
        if (lastError.name === "AbortError") {
          lastError = new Error(`MTA request timed out after ${this.timeoutMs}ms`);
        }

        // Log retry attempt
        if (attempt < this.retryAttempts) {
          const delay = getBackoffDelay(attempt);
          logger.warn(
            {
              attempt: attempt + 1,
              maxAttempts: this.retryAttempts + 1,
              error: lastError.message,
              nextRetryMs: delay,
            },
            "MTA request failed, retrying",
          );
          await sleep(delay);
        }
      }
    }

    logger.error(
      {
        url,
        attempts: this.retryAttempts + 1,
        error: lastError?.message,
      },
      "MTA request failed after all retries",
    );

    throw lastError;
  }

  /**
   * Check if the MTA is healthy and accepting connections
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.url}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.warn({ error }, "MTA health check failed");
      return false;
    }
  }
}

// Singleton client instance
let clientInstance: MtaClient | null = null;

/**
 * Get the MTA client instance
 */
export function getMtaClient(options: MtaInjectionOptions): MtaClient {
  if (!clientInstance) {
    clientInstance = new MtaClient(options);
  }
  return clientInstance;
}

/**
 * Reset the MTA client (useful for testing)
 */
export function resetMtaClient(): void {
  clientInstance = null;
}
