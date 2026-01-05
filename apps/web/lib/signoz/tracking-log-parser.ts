/**
 * Tracking Log Parser
 *
 * Parses tracking service logs from SigNoz and extracts structured data
 * for display in the logs table.
 */

import type { LogSummary } from "./types"

export interface ParsedTrackingLog {
  id: string
  timestamp: string
  level: "debug" | "info" | "warn" | "error" | "fatal" | "trace"
  message: string

  // Route information
  route?: "open" | "click" | "unsubscribe" | "confirm" | "image" | "acme-challenge"

  // Entity IDs
  emailSendId?: string
  contactId?: string
  broadcastId?: string
  formId?: string

  // Request info
  userAgent?: string
  ip?: string
  host?: string

  // Click tracking
  url?: string

  // Unsubscribe
  source?: "link" | "list-unsubscribe"

  // Image proxy
  originalHost?: string
  contentType?: string
  size?: number

  // ACME challenge
  domain?: string
  token?: string

  // Duration
  durationMs?: number

  // Status
  status?: "success" | "warning" | "error" | "info" | "pending"

  // Raw attributes for detail panel
  rawAttributes: Record<string, unknown>

  // K8s info
  pod?: string
  container?: string
}

/**
 * Parse a SigNoz log entry into a structured tracking log
 */
export function parseTrackingLog(log: LogSummary): ParsedTrackingLog {
  const attrs = log.attributes || {}

  // Determine route from attributes
  const route = attrs.route as ParsedTrackingLog["route"]

  // Determine status based on level and message
  let status: ParsedTrackingLog["status"] = "info"
  if (log.level === "error") status = "error"
  else if (log.level === "warn") status = "warning"
  else if (log.message.toLowerCase().includes("tracked") || log.message.toLowerCase().includes("served")) status = "success"
  else if (log.message.toLowerCase().includes("invalid") || log.message.toLowerCase().includes("failed")) status = "error"

  const parsed: ParsedTrackingLog = {
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    message: log.message,
    route,
    status,
    rawAttributes: attrs,
    pod: log.pod,
    container: log.container,
  }

  // Extract entity IDs
  if (attrs.emailSendId) parsed.emailSendId = attrs.emailSendId as string
  if (attrs.contactId) parsed.contactId = attrs.contactId as string
  if (attrs.broadcastId) parsed.broadcastId = attrs.broadcastId as string
  if (attrs.formId) parsed.formId = attrs.formId as string

  // Request info
  if (attrs.userAgent) parsed.userAgent = attrs.userAgent as string
  if (attrs.ip) parsed.ip = attrs.ip as string
  if (attrs.host) parsed.host = attrs.host as string

  // Click tracking
  if (attrs.url) parsed.url = attrs.url as string

  // Unsubscribe
  if (attrs.source) parsed.source = attrs.source as "link" | "list-unsubscribe"

  // Image proxy
  if (attrs.originalHost) parsed.originalHost = attrs.originalHost as string
  if (attrs.contentType) parsed.contentType = attrs.contentType as string
  if (attrs.size) parsed.size = attrs.size as number

  // ACME challenge
  if (attrs.domain) parsed.domain = attrs.domain as string
  if (attrs.token) parsed.token = attrs.token as string

  // Duration
  if (attrs.duration) parsed.durationMs = attrs.duration as number
  if (attrs.durationMs) parsed.durationMs = attrs.durationMs as number

  return parsed
}

/**
 * Get a human-readable route label
 */
export function getRouteLabel(route?: string): string {
  if (!route) return "Unknown"

  const labels: Record<string, string> = {
    "open": "Open Tracking",
    "click": "Click Tracking",
    "unsubscribe": "Unsubscribe",
    "confirm": "Confirmation",
    "image": "Image Proxy",
    "acme-challenge": "ACME Challenge",
  }
  return labels[route] || route
}

/**
 * Get status variant for styling
 */
export function getStatusVariant(status?: string): "success" | "error" | "warning" | "default" {
  if (!status) return "default"

  switch (status.toString().toLowerCase()) {
    case "success":
      return "success"
    case "error":
      return "error"
    case "warning":
    case "pending":
      return "warning"
    default:
      return "default"
  }
}

/**
 * Format duration in milliseconds to a readable string
 */
export function formatDuration(durationMs?: number): string {
  if (durationMs === undefined) return "-"

  if (durationMs < 1) {
    return `${(durationMs * 1000).toFixed(0)}μs`
  }

  if (durationMs < 1000) {
    return `${durationMs.toFixed(1)}ms`
  }

  return `${(durationMs / 1000).toFixed(2)}s`
}
