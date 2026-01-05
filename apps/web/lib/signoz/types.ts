/**
 * SigNoz API Types
 *
 * Type definitions for the SigNoz query API responses and requests.
 */

// Query request types
export interface SignozQueryRequest {
  schemaVersion: "v1"
  start: number // Unix timestamp in milliseconds
  end: number // Unix timestamp in milliseconds
  requestType: "raw" | "aggregate"
  compositeQuery: CompositeQuery
}

export interface CompositeQuery {
  queries: BuilderQuery[]
}

export interface BuilderQuery {
  type: "builder_query"
  spec: BuilderQuerySpec
}

export interface BuilderQuerySpec {
  name: string
  signal: "logs" | "traces" | "metrics"
  filter: QueryFilter
  limit: number
  offset: number
  order: QueryOrder[]
}

export interface QueryFilter {
  expression: string
}

export interface QueryOrder {
  key: { name: string }
  direction: "asc" | "desc"
}

// Response types
export interface SignozQueryResponse {
  status: "success" | "error"
  data: SignozResponseData
}

export interface SignozResponseData {
  type: string
  meta: {
    rowsScanned: number
    bytesScanned: number
    durationMs: number
  }
  data: {
    results: SignozResultItem[]
  }
}

export interface SignozResultItem {
  queryName: string
  nextCursor: string
  rows: LogRow[] | null
}

export interface LogRow {
  data: LogEntry
  timestamp: string // ISO timestamp
}

export interface LogEntry {
  id: string
  timestamp: number // Unix nanoseconds
  body: string
  severity_text: string
  severity_number: number
  trace_id: string
  span_id: string
  trace_flags: number
  resources_string: Record<string, string>
  attributes_string: Record<string, string>
  attributes_number: Record<string, number>
  attributes_bool: Record<string, boolean>
  scope_name: string
  scope_string: Record<string, string>
  scope_version: string
}

// Simplified log entry for dashboard display
export interface LogSummary {
  id: string
  timestamp: string
  level: "debug" | "info" | "warn" | "error" | "fatal" | "trace"
  message: string
  service: string
  deployment: string
  namespace: string
  pod: string
  container: string
  traceId?: string
  spanId?: string
  attributes: Record<string, unknown>
}

// Pagination
export interface LogsResponse {
  logs: LogSummary[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Filter options
export interface LogsFilterOptions {
  deployment?: string
  namespace?: string
  service?: string
  level?: string
  search?: string
  queue?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
}
