"use client";

import { Badge } from "@kibamail/owly/badge";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as HoverCard from "@kibamail/owly/hover-card";
import * as Table from "@kibamail/owly/table";
import Link from "next/link";
import type { WebhookDestination } from "@/webhooks/client/types";
import { WebhookActionsDropdown } from "./webhook-actions-dropdown";

interface WebhooksTableProps {
  destinations: WebhookDestination[];
}

export function WebhooksTable({ destinations }: WebhooksTableProps) {
  if (destinations.length === 0) {
    return (
      <div className="mt-8">
        <EmptyCard.Root>
          <EmptyCard.Title>No webhooks yet</EmptyCard.Title>
          <EmptyCard.Description>
            Create your first webhook destination to start receiving events.
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
              <Table.Head>Destination</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Topics</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Created</Table.Head>
              <Table.Head minWidth={100}>Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {destinations.map((destination) => {
              const isDisabled = !!destination.disabled_at;
              const destinationUrl =
                destination.type === "webhook"
                  ? (destination.config as { url?: string })?.url
                  : destination.type === "aws_sqs"
                  ? (destination.config as { queue_url?: string })?.queue_url
                  : null;

              return (
                <Table.Row key={destination.id}>
                  <Table.Cell>
                    <Link
                      href={`/w/settings/webhooks/${destination.id}`}
                      className="text-sm text-kb-content-secondary underline underline-offset-4 hover:text-kb-content-primary truncate max-w-xs block transition-colors"
                    >
                      {destinationUrl || "—"}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium capitalize">
                      {destination.type?.replace(/_/g, " ")}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {destination.topics &&
                      Array.isArray(destination.topics) &&
                      destination.topics.length > 0 ? (
                        destination.topics.slice(0, 3).map((topic: string) => (
                          <Badge key={topic} variant="neutral" size="sm">
                            {topic}
                          </Badge>
                        ))
                      ) : destination.topics === "*" ? (
                        <Badge variant="neutral" size="sm">
                          All topics
                        </Badge>
                      ) : (
                        <span className="text-sm text-kb-content-tertiary">
                          —
                        </span>
                      )}
                      {Array.isArray(destination.topics) &&
                        destination.topics.length > 3 && (
                          <HoverCard.Root openDelay={150}>
                            <HoverCard.Trigger asChild>
                              <span className="text-xs text-kb-text-secondary cursor-help">
                                +{destination.topics.length - 3} more
                              </span>
                            </HoverCard.Trigger>
                            <HoverCard.Portal>
                              <HoverCard.Content
                                side="bottom"
                                align="start"
                                className="z-50 w-36! min-w-0! max-h-48 overflow-y-auto"
                              >
                                <div className="flex flex-col gap-1">
                                  {destination.topics.map((topic: string) => (
                                    <Badge
                                      key={topic}
                                      variant="neutral"
                                      size="sm"
                                    >
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </HoverCard.Content>
                            </HoverCard.Portal>
                          </HoverCard.Root>
                        )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={isDisabled ? "error" : "success"} size="sm">
                      {isDisabled ? "Disabled" : "Active"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-kb-content-tertiary">
                      {destination.created_at
                        ? new Date(destination.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <WebhookActionsDropdown
                      destination={destination}
                      variant="icon"
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.Container>
    </div>
  );
}
