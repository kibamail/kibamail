"use client";

import { useState } from "react";
import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import { Skeleton } from "@kibamail/owly/skeleton";
import * as Table from "@kibamail/owly/table";
import dayjs from "dayjs";
import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import type { WebhookEvent } from "@/webhooks/client/types";
import { EventDetailsModal } from "./event-details-modal";

interface WebhookEventsTableProps {
  events: WebhookEvent[];
  pagination?: {
    count: number;
    next: string | null;
    prev: string | null;
  };
  onNextPage?: () => void;
  onPrevPage?: () => void;
  destinationId: string;
  isLoading?: boolean;
}

export function WebhookEventsTable({
  events,
  pagination,
  onNextPage,
  onPrevPage,
  destinationId,
  isLoading = false,
}: WebhookEventsTableProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mt-4">
        <Table.Container>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>ID</Table.Head>
                <Table.Head>Topic</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Time</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Array.from({ length: 10 }).map((_, idx) => (
                <Table.Row key={`skeleton-${idx}`}>
                  <Table.Cell>
                    <Skeleton width={100} height={12} />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton width={80} height={20} />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton width={70} height={20} />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton width={150} height={12} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Container>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mt-8">
        <EmptyCard.Root>
          <EmptyCard.Title>No events yet</EmptyCard.Title>
          <EmptyCard.Description>
            Events will appear here once they are triggered for this webhook
            destination.
          </EmptyCard.Description>
        </EmptyCard.Root>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Table.Container>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>ID</Table.Head>
              <Table.Head>Topic</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Time</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {events.map((event) => {
              const status = event.status || "pending";

              return (
                <Table.Row key={event.id}>
                  <Table.Cell>
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(event.id || null)}
                      className="font-mono text-xs text-kb-content-secondary underline hover:text-kb-content-primary cursor-pointer"
                    >
                      {event.id}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="neutral" size="sm">
                      {event.topic || "—"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {status === "success" && (
                      <Badge variant="success" size="sm">
                        Success
                      </Badge>
                    )}
                    {status === "failed" && (
                      <Badge variant="error" size="sm">
                        Failed
                      </Badge>
                    )}
                    {status === "pending" && (
                      <Badge variant="neutral" size="sm">
                        Pending
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-kb-content-tertiary">
                      {event.time
                        ? dayjs(event.time).format("MMM D, YYYY h:mm A")
                        : "—"}
                    </span>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.Container>

      {/* Event count and pagination controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-kb-content-secondary">
          Showing {events.length} of {pagination?.count || events.length} events
        </div>
        {pagination && (pagination.next || pagination.prev) && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onPrevPage}
              disabled={!pagination.prev}
            >
              <NavArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNextPage}
              disabled={!pagination.next}
            >
              <NavArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <EventDetailsModal
        eventId={selectedEventId}
        destinationId={destinationId}
        onClose={() => setSelectedEventId(null)}
      />
    </div>
  );
}
