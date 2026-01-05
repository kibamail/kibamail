"use client"

import * as React from "react"
import { Text, Badge, Button, Spinner } from "@kibamail/owly"
import {
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout"
import * as Tabs from "@kibamail/owly/tabs"

interface LogSummary {
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

interface LogsResponse {
  logs: LogSummary[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

type ServiceType = "tracking" | "workers" | "email-agent"

function getLevelColor(level: string): "gray" | "blue" | "yellow" | "red" | "purple" {
  switch (level) {
    case "debug":
    case "trace":
      return "gray"
    case "info":
      return "blue"
    case "warn":
      return "yellow"
    case "error":
    case "fatal":
      return "red"
    default:
      return "gray"
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = React.useState<ServiceType>("tracking")
  const [logs, setLogs] = React.useState<LogSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [offset, setOffset] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const limit = 50

  const fetchLogs = React.useCallback(async (service: ServiceType, newOffset: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("limit", limit.toString())
      params.set("offset", newOffset.toString())

      if (service === "tracking") {
        params.set("deployment", "kibamail-tracking")
      } else if (service === "workers") {
        params.set("deployment", "kibamail-workers")
      } else if (service === "email-agent") {
        params.set("service", "email-agent")
      }

      const response = await fetch(`/api/internal/v1/logs?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`)
      }

      const data: LogsResponse = await response.json()
      setLogs(data.logs)
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLogs(activeTab, offset)
  }, [activeTab, offset, fetchLogs])

  const handleTabChange = (value: string) => {
    setActiveTab(value as ServiceType)
    setOffset(0)
  }

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit))
    }
  }

  const handleNextPage = () => {
    if (hasMore) {
      setOffset(offset + limit)
    }
  }

  const handleRefresh = () => {
    fetchLogs(activeTab, offset)
  }

  return (
    <Tabs.Root variant="secondary" className="w-full!" value={activeTab} onValueChange={handleTabChange}>
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Logs">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Spinner size="md" /> : "Refresh"}
          </Button>
        </DashboardLayoutContentHeader>

        <Tabs.List>
          <Tabs.Trigger value="tracking">Tracking</Tabs.Trigger>
          <Tabs.Trigger value="workers">Workers</Tabs.Trigger>
          <Tabs.Trigger value="email-agent">Email Agent</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
      </DashboardLayoutStickyContentHeaderContainer>

      <Tabs.Content value={activeTab} className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-red-600">{error}</Text>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Text className="text-gray-500">No logs found</Text>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg font-mono text-sm"
                >
                  <div className="flex items-start gap-3">
                    <Badge color={getLevelColor(log.level)} className="uppercase text-xs">
                      {log.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{formatTimestamp(log.timestamp)}</span>
                        <span>•</span>
                        <span>{log.service}</span>
                        <span>•</span>
                        <span>{log.pod}</span>
                      </div>
                      <Text className="break-words">{log.message}</Text>
                      {Object.keys(log.attributes).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            Attributes ({Object.keys(log.attributes).length})
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.attributes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePreviousPage}
                disabled={offset === 0 || isLoading}
              >
                Previous
              </Button>
              <Text className="text-sm text-gray-500">
                Showing {offset + 1} - {offset + logs.length}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore || isLoading}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}
