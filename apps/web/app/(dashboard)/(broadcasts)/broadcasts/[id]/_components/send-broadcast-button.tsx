"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@kibamail/owly/button";
import * as Popover from "@kibamail/owly/popover";
import { Text } from "@kibamail/owly/text";
import { useToast } from "@kibamail/owly/toast";
import { Check, NavArrowLeft, NavArrowRight, Xmark } from "iconoir-react";
import type { BroadcastReadinessResponse } from "@/app/api/internal/v1/broadcasts/[broadcastId]/readiness/route";
import { internalApi } from "@/lib/api/client";

type Panel = "checklist" | "links";

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
  const [panel, setPanel] = useState<Panel>("checklist");
  const router = useRouter();
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

      return internalApi.broadcasts().send(broadcastId);
    },
    onSuccess: () => {
      toast("Broadcast scheduled for sending");
      setOpen(false);
      router.push("/w/broadcasts");
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
    } else {
      setPanel("checklist");
    }
    setOpen(newOpen);
  }

  function onSend() {
    sendMutation.mutate();
  }

  function onViewLinks() {
    setPanel("links");
  }

  function onBackToChecklist() {
    setPanel("checklist");
  }

  const linksValidation = readiness?.linksValidation;

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <Button loading={isSavingDraft}>Send broadcast</Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        className="w-80 bg-kb-bg-primary border border-kb-stroke-secondary rounded-lg shadow-lg p-4! overflow-hidden"
      >
        <div className="relative">
          {/* Checklist Panel */}
          <div
            className={`transition-all duration-200 ease-in-out ${
              panel === "checklist"
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
            }`}
          >
            <ChecklistPanel
              readiness={readiness}
              isLoading={isLoading}
              onViewLinks={onViewLinks}
              onSend={onSend}
              isSending={sendMutation.isPending}
            />
          </div>

          {/* Links Panel */}
          <div
            className={`transition-all duration-200 ease-in-out ${
              panel === "links"
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
            }`}
          >
            {linksValidation && (
              <LinksPanel
                linksValidation={linksValidation}
                onBack={onBackToChecklist}
              />
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function ChecklistPanel({
  readiness,
  isLoading,
  onViewLinks,
  onSend,
  isSending,
}: {
  readiness: BroadcastReadinessResponse | undefined;
  isLoading: boolean;
  onViewLinks: () => void;
  onSend: () => void;
  isSending: boolean;
}) {
  const linksValidation = readiness?.linksValidation;
  const totalLinks = linksValidation?.links.length ?? 0;
  const validLinks = linksValidation?.validCount ?? 0;
  const allLinksValid = linksValidation?.allValid ?? true;

  return (
    <>
      <div className="flex flex-col">
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
            {readiness.checklist
              .filter((item) => item.id !== "links")
              .map((item) => (
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

            {/* Links validation item - always at the bottom with chevron */}
            {totalLinks > 0 && (
              <button
                type="button"
                onClick={onViewLinks}
                className="flex cursor-pointer items-start gap-3 rounded-md w-full text-left hover:bg-kb-bg-secondary -mx-2 px-2 py-1 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    allLinksValid
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {allLinksValid ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Xmark className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Text
                    className={`font-medium ${
                      allLinksValid
                        ? "text-kb-content-primary"
                        : "text-kb-content-secondary"
                    }`}
                  >
                    {validLinks}/{totalLinks} links valid
                  </Text>
                </div>
                <NavArrowRight className="w-4 h-4 text-kb-content-tertiary shrink-0 mt-0.5" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {readiness && (
        <Button
          onClick={onSend}
          width="full"
          disabled={!readiness.ready || isSending}
        >
          Schedule broadcast
          <NavArrowRight className="w-4 h-4" />
        </Button>
      )}
    </>
  );
}

function LinksPanel({
  linksValidation,
  onBack,
}: {
  linksValidation: NonNullable<BroadcastReadinessResponse["linksValidation"]>;
  onBack: () => void;
}) {
  const { links } = linksValidation;

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer w-full rounded-lg p-2 -mx-2 hover:bg-kb-bg-secondary items-center gap-2 text-kb-content-secondary hover:text-kb-content-primary transition-colors mb-3"
      >
        <NavArrowLeft className="w-4 h-4" />
        <Text className="font-medium">Back</Text>
      </button>

      <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
        {links.map((link) => (
          <div
            key={link.url}
            className={`flex ${
              link.status === "valid" ? "items-center" : "item-start"
            } gap-3`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                link.status === "valid"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {link.status === "valid" ? (
                <Check className="w-3 h-3" />
              ) : (
                <Xmark className="w-3 h-3" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <Text
                size="sm"
                className={`break-all ${
                  link.status === "valid"
                    ? "text-kb-content-primary"
                    : "text-kb-content-secondary"
                }`}
              >
                {link.url}
              </Text>
              {link.status === "invalid" && link.reason && (
                <Text size="xs" className="text-kb-content-tertiary mt-0.5">
                  {link.reason}
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
