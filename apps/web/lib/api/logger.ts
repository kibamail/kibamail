/**
 * Centralized API Logger
 *
 * Provides structured logging for API endpoints with automatic context inclusion.
 * Uses pino for high-performance JSON logging.
 */

import pino from "pino";

/**
 * Base logger instance for API operations
 */
const baseLogger = pino({
  name: "api",
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/**
 * Context that can be attached to log entries
 */
export interface LogContext {
  /** Workspace/tenant ID */
  workspaceId?: string;
  /** Domain name being operated on */
  domain?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context fields */
  [key: string]: unknown;
}

/**
 * API Logger with automatic context inclusion
 */
export class ApiLogger {
  private logger: pino.Logger;
  private context: LogContext;

  constructor(endpoint: string, context: LogContext = {}) {
    this.context = context;
    this.logger = baseLogger.child({
      endpoint,
      ...context,
    });
  }

  /**
   * Add additional context to the logger
   */
  withContext(additionalContext: LogContext): ApiLogger {
    return new ApiLogger(this.context.endpoint as string, {
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log at info level
   */
  info(message: string, data?: Record<string, unknown>) {
    this.logger.info(data, message);
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: Record<string, unknown>) {
    this.logger.debug(data, message);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: Record<string, unknown>) {
    this.logger.warn(data, message);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    if (error instanceof Error) {
      this.logger.error({ err: error, ...data }, message);
    } else if (error) {
      this.logger.error({ error, ...data }, message);
    } else {
      this.logger.error(data, message);
    }
  }
}

/**
 * Create a logger for an API endpoint
 *
 * @example
 * ```ts
 * const log = createApiLogger("internal/tenants/by-domain", { domain: domainName });
 * log.info("Searching for domain");
 * log.info("Domain found", { hasDkimKey: true, isDkimVerified: true });
 * ```
 */
export function createApiLogger(endpoint: string, context?: LogContext): ApiLogger {
  return new ApiLogger(endpoint, context);
}

/**
 * Pre-configured loggers for common internal API endpoints
 */
export const internalApi = {
  /**
   * Logger for DKIM/domain lookup operations
   */
  dkim(domain: string, workspaceId?: string) {
    return createApiLogger("internal/dkim", { domain, workspaceId });
  },

  /**
   * Logger for tenant operations
   */
  tenant(workspaceId: string) {
    return createApiLogger("internal/tenant", { workspaceId });
  },

  /**
   * Logger for bounce domain validation
   */
  bounceDomain(domain: string) {
    return createApiLogger("internal/bounce-domain", { domain });
  },

  /**
   * Logger for API key validation
   */
  apiKeyValidation(workspaceId?: string) {
    return createApiLogger("internal/api-key-validation", { workspaceId });
  },
};
