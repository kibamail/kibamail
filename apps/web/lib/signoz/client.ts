/**
 * SigNoz Client
 *
 * A clean client for fetching logs from the SigNoz API.
 * Provides methods for querying logs with filtering and pagination.
 */

import type {
  SignozQueryRequest,
  SignozQueryResponse,
  LogEntry,
  LogSummary,
  LogsResponse,
  LogsFilterOptions,
} from "./types"

export interface SignozClientConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
}

export class SignozClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeout: number

  constructor(config: SignozClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.apiKey = config.apiKey
    this.timeout = config.timeout ?? 30000
  }

  /**
   * Executes a query against the SigNoz API
   */
  private async query(request: SignozQueryRequest): Promise<SignozQueryResponse> {
    const url = `${this.baseUrl}/api/v5/query_range`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "SIGNOZ-API-KEY": this.apiKey,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new SignozClientError(
          `SigNoz API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SignozClientError) {
        throw error
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new SignozClientError("SigNoz API request timeout", 408)
      }

      throw new SignozClientError(
        `Failed to fetch from SigNoz: ${error instanceof Error ? error.message : "Unknown error"}`,
        500
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Builds a logs query request
   */
  private buildLogsQuery(options: LogsFilterOptions): SignozQueryRequest {
    const now = Date.now()
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000

    const filterParts: string[] = []

    if (options.deployment) {
      filterParts.push(`k8s.deployment.name in ['${options.deployment}']`)
    }

    if (options.namespace) {
      filterParts.push(`k8s.namespace.name in ['${options.namespace}']`)
    }

    if (options.service) {
      filterParts.push(`service.name in ['${options.service}']`)
    }

    if (options.level) {
      filterParts.push(`severity_text in ['${options.level.toUpperCase()}']`)
    }

    if (options.search) {
      filterParts.push(`body ilike '%${options.search}%'`)
    }

    if (options.queue) {
      filterParts.push(`body ilike '%"queue":"${options.queue}"%'`)
    }

    const expression = filterParts.length > 0 ? filterParts.join(" AND ") : ""

    return {
      schemaVersion: "v1",
      start: options.startTime ?? threeDaysAgo,
      end: options.endTime ?? now,
      requestType: "raw",
      compositeQuery: {
        queries: [
          {
            type: "builder_query",
            spec: {
              name: "A",
              signal: "logs",
              filter: { expression },
              limit: options.limit ?? 100,
              offset: options.offset ?? 0,
              order: [{ key: { name: "timestamp" }, direction: "desc" }],
            },
          },
        ],
      },
    }
  }

  /**
   * Parses severity text to log level
   */
  private parseLevel(severityText: string): LogSummary["level"] {
    const level = severityText.toLowerCase()
    if (level === "debug" || level === "trace") return level as LogSummary["level"]
    if (level === "info") return "info"
    if (level === "warn" || level === "warning") return "warn"
    if (level === "error" || level === "err") return "error"
    if (level === "fatal" || level === "critical") return "fatal"
    return "info"
  }

  /**
   * Transforms a raw log entry to a simplified summary
   */
  private transformLogEntry(entry: LogEntry, isoTimestamp: string): LogSummary {
    const resources = entry.resources_string || {}
    const attributes = entry.attributes_string || {}

    // Parse the log body if it's JSON
    let parsedBody: Record<string, unknown> = {}
    let message = entry.body
    try {
      parsedBody = JSON.parse(entry.body)
      message = (parsedBody.msg as string) || (parsedBody.message as string) || entry.body
    } catch {
      // Body is not JSON, use as-is
    }

    // Get level from parsed body or severity_text
    const level = this.parseLevel(
      (parsedBody.level as string) || entry.severity_text || "info"
    )

    return {
      id: entry.id,
      timestamp: isoTimestamp,
      level,
      message,
      service: resources["service.name"] || (parsedBody.name as string) || "unknown",
      deployment: resources["k8s.deployment.name"] || "unknown",
      namespace: resources["k8s.namespace.name"] || "default",
      pod: resources["k8s.pod.name"] || "unknown",
      container: resources["k8s.container.name"] || "unknown",
      traceId: entry.trace_id || undefined,
      spanId: entry.span_id || undefined,
      attributes: {
        ...parsedBody,
        ...entry.attributes_string,
        ...entry.attributes_number,
        ...entry.attributes_bool,
      },
    }
  }

  /**
   * Fetches logs with optional filtering and pagination
   */
  async getLogs(options: LogsFilterOptions = {}): Promise<LogsResponse> {
    const request = this.buildLogsQuery(options)
    const response = await this.query(request)

    const logs: LogSummary[] = []

    if (response.data?.data?.results) {
      for (const result of response.data.data.results) {
        if (result.rows) {
          for (const row of result.rows) {
            logs.push(this.transformLogEntry(row.data, row.timestamp))
          }
        }
      }
    }

    const limit = options.limit ?? 100
    const offset = options.offset ?? 0

    return {
      logs,
      total: logs.length + offset,
      limit,
      offset,
      hasMore: logs.length === limit,
    }
  }

  /**
   * Fetches logs for kibamail-tracking deployment
   */
  async getTrackingLogs(options: Omit<LogsFilterOptions, "deployment"> = {}): Promise<LogsResponse> {
    return this.getLogs({
      ...options,
      deployment: "kibamail-tracking",
    })
  }

  /**
   * Fetches logs for kibamail-workers deployment
   */
  async getWorkerLogs(options: Omit<LogsFilterOptions, "deployment"> = {}): Promise<LogsResponse> {
    return this.getLogs({
      ...options,
      deployment: "kibamail-workers",
    })
  }

  /**
   * Fetches logs for email-agent service
   */
  async getEmailAgentLogs(options: Omit<LogsFilterOptions, "service"> = {}): Promise<LogsResponse> {
    return this.getLogs({
      ...options,
      service: "email-agent",
    })
  }
}

/**
 * Custom error class for SigNoz client errors
 */
export class SignozClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = "SignozClientError"
  }
}

/**
 * Singleton instance for the SigNoz client
 */
let clientInstance: SignozClient | null = null

export function getSignozClient(): SignozClient {
  if (!clientInstance) {
    const baseUrl = process.env.SIGNOZ_URL
    const apiKey = process.env.SIGNOZ_API_KEY

    if (!baseUrl) {
      throw new Error("SIGNOZ_URL environment variable is not set")
    }

    if (!apiKey) {
      throw new Error("SIGNOZ_API_KEY environment variable is not set")
    }

    clientInstance = new SignozClient({
      baseUrl,
      apiKey,
      timeout: 30000,
    })
  }

  return clientInstance
}
