"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@kibamail/owly/dialog";
import * as Accordion from "@kibamail/owly/accordion";
import { Badge } from "@kibamail/owly/badge";
import dayjs from "dayjs";
import { internalApi } from "@/lib/api/client";
import type { DeliveryAttempt } from "@/webhooks/client/types";
import { Button } from "@kibamail/owly";

interface EventDetailsModalProps {
  eventId: string | null;
  destinationId: string;
  onClose: () => void;
}

export function EventDetailsModal({
  eventId,
  destinationId,
  onClose,
}: EventDetailsModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["event-deliveries", eventId, destinationId],
    queryFn: async () => {
      if (!eventId) return null;

      const result = await internalApi
        .webhooks()
        .listEventDeliveries(destinationId, eventId);

      return result;
    },
    enabled: !!eventId,
  });

  const deliveries = (data?.deliveries || []) as DeliveryAttempt[];

  return (
    <Dialog.Root open={!!eventId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Event Details</Dialog.Title>
          <Dialog.Description>
            Viewing delivery attempts for event {eventId}
          </Dialog.Description>
        </Dialog.Header>

        <div className="py-4 px-6">
          {isLoading ? (
            <div className="text-center text-sm text-kb-content-secondary">
              Loading delivery attempts...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center text-sm text-kb-content-secondary">
              No delivery attempts found for this event.
            </div>
          ) : (
            <Accordion.Root
              type="single"
              collapsible
              size="sm"
              defaultValue={
                deliveries.length === 1 ? deliveries?.[0]?.id : undefined
              }
            >
              {deliveries.map((delivery, idx) => {
                const status = delivery.status || "pending";
                const timestamp = delivery.delivered_at
                  ? dayjs(delivery.delivered_at).format("MMM D, h:mm A")
                  : "—";

                return (
                  <Accordion.Item key={delivery.id} value={delivery.id}>
                    <Accordion.Trigger>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Attempt #{idx + 1}</span>
                        <span className="text-kb-content-tertiary text-sm">
                          {timestamp}
                        </span>
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
                        {delivery.response_data?.status && (
                          <span className="text-xs text-kb-content-tertiary">
                            {delivery.response_data?.status}
                          </span>
                        )}
                      </div>
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <div className="space-y-4 pt-2">
                        {delivery.response_status_code && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Response Status
                            </h4>
                            <p className="text-sm text-kb-content-secondary">
                              {delivery.response_status_code}
                            </p>
                          </div>
                        )}
                        {delivery.response_headers && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Response Headers
                            </h4>
                            <pre className="p-4 bg-kb-surface-secondary rounded text-xs overflow-auto max-h-64">
                              {JSON.stringify(
                                delivery.response_headers,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                        {delivery.response_data?.body && (
                          <pre className="p-4 bg-kb-bg-secondary border-kb-border-tertiary border rounded-md text-xs overflow-auto max-h-64">
                            {JSON.stringify(
                              delivery.response_data?.body,
                              null,
                              2
                            )}
                          </pre>
                        )}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          )}
        </div>

        <Dialog.Footer>
          <div className="flex items-center justify-between">
            <Button variant="secondary">Retry</Button>
            <Dialog.Close asChild>
              <Button variant="secondary">Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
