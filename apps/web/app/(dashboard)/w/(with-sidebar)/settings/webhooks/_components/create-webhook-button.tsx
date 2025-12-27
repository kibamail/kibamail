"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateWebhookDialog } from "./create-webhook-dialog";
import type { WebhookDestinationType } from "@/webhooks/client/types";

interface CreateWebhookButtonProps {
  destinationTypes: WebhookDestinationType[];
  topics: string[];
}

export function CreateWebhookButton({
  destinationTypes,
  topics,
}: CreateWebhookButtonProps) {
  const createWebhookState = useToggleState();

  return (
    <>
      <Button onClick={() => createWebhookState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create webhook
      </Button>

      <CreateWebhookDialog
        {...createWebhookState}
        destinationTypes={destinationTypes}
        topics={topics}
      />
    </>
  );
}
