import { NextResponse } from "next/server"
import { getSignozClient } from "@/lib/signoz"
import type { LogsFilterOptions } from "@/lib/signoz"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const options: LogsFilterOptions = {}

    const deployment = searchParams.get("deployment")
    if (deployment) options.deployment = deployment

    const namespace = searchParams.get("namespace")
    if (namespace) options.namespace = namespace

    const service = searchParams.get("service")
    if (service) options.service = service

    const level = searchParams.get("level")
    if (level) options.level = level

    const search = searchParams.get("search")
    if (search) options.search = search

    const queue = searchParams.get("queue")
    if (queue) options.queue = queue

    const startTime = searchParams.get("startTime")
    if (startTime) options.startTime = parseInt(startTime, 10)

    const endTime = searchParams.get("endTime")
    if (endTime) options.endTime = parseInt(endTime, 10)

    const limit = searchParams.get("limit")
    options.limit = limit ? parseInt(limit, 10) : 100

    const offset = searchParams.get("offset")
    options.offset = offset ? parseInt(offset, 10) : 0

    const client = getSignozClient()
    const logs = await client.getLogs(options)

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Failed to fetch logs:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
