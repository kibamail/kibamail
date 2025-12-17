"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@kibamail/owly/button";
import * as Popover from "@kibamail/owly/popover";
import { Text } from "@kibamail/owly/text";
import { useToast } from "@kibamail/owly/toast";
import { Check, NavArrowRight, Xmark } from "iconoir-react";
import type { BroadcastReadinessResponse } from "@/app/api/internal/v1/broadcasts/[broadcastId]/readiness/route";
import { internalApi } from "@/lib/api/client";

interface SendBroadcastButtonProps {
  broadcastId: string;
  onSaveDraft: () => Promise<void>;
  isSavingDraft: boolean;
}

export function SendBroadcastButton({
  broadcastId,
  onSaveDraft,
  isSavingDraft,
}: SendBroadcastButtonProps) {
  const [open, setOpen] = useState(false);
  const { success: toast, error: toastError } = useToast();

  const {
    data: readiness,
    isLoading,
    refetch,
  } = useQuery<BroadcastReadinessResponse>({
    queryKey: ["broadcast-readiness", broadcastId],
    queryFn: () => internalApi.broadcasts().readiness(broadcastId),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!readiness?.ready) {
        throw new Error("Broadcast is not ready to send");
      }

      return internalApi.broadcasts().send(broadcastId, {
        sendAt: new Date(),
      });
    },
    onSuccess: () => {
      toast("Broadcast scheduled for sending");
      setOpen(false);
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to send broadcast"
      );
    },
  });

  async function onOpenChange(newOpen: boolean) {
    if (newOpen) {
      await onSaveDraft();
      refetch();
    }
    setOpen(newOpen);
  }

  function onSend() {
    sendMutation.mutate();
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <Button loading={isSavingDraft}>Send broadcast</Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        className="w-80 bg-kb-bg-primary border border-kb-stroke-secondary rounded-lg shadow-lg p-4! overflow-hidden"
      >
        <div className=" flex flex-col">
          <Text className="text-kb-content-primary font-semibold">
            Ready to send?
          </Text>
        </div>

        <div className="my-4">
          {isLoading ? (
            <div className="py-4 text-center">
              <Text size="sm" className="text-kb-content-secondary">
                Checking readiness...
              </Text>
            </div>
          ) : readiness ? (
            <div className="space-y-4">
              {readiness.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-md"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      item.completed
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.completed ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Xmark className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <Text
                      className={`font-medium ${
                        item.completed
                          ? "text-kb-content-primary"
                          : "text-kb-content-secondary"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {!item.completed && item.reason && (
                      <Text
                        size="sm"
                        className="text-kb-content-tertiary mt-0.5"
                      >
                        {item.reason}
                      </Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {readiness && (
          <Button
            onClick={onSend}
            width="full"
            disabled={!readiness.ready || sendMutation.isPending}
          >
            {sendMutation.isPending ? "Sending..." : "Send Now"}
            <NavArrowRight className="w-4 h-4" />
          </Button>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
