"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import { MoreHoriz, Pause, Play, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import type { WebhookDestination } from "@/webhooks/client/types";

interface WebhookActionsDropdownProps {
  destination: WebhookDestination;
  variant?: "icon" | "default";
}

export function WebhookActionsDropdown({
  destination,
  variant = "icon",
}: WebhookActionsDropdownProps) {
  const router = useRouter();
  const toast = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDisabled = !!destination.disabled_at;

  const enableMutation = useMutation({
    async mutationFn(webhookId: string) {
      const t = toast.loading("Enabling webhook...");
      await internalApi.webhooks().enable(webhookId);
      toast.dismiss(t);
    },
    onSuccess: () => {
      toast.success("Webhook enabled successfully");
      router.refresh();
    },
  });

  const disableMutation = useMutation({
    async mutationFn(webhookId: string) {
      const t = toast.loading("Disabling webhook...");
      await internalApi.webhooks().disable(webhookId);
      toast.dismiss(t);
    },
    onSuccess: () => {
      toast.success("Webhook disabled successfully");
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    async mutationFn(webhookId: string) {
      const t = toast.loading("Deleting webhook...");
      await internalApi.webhooks().delete(webhookId);
      toast.dismiss(t);
    },
    onSuccess: () => {
      toast.success("Webhook deleted successfully");
      setDeleteDialogOpen(false);
      router.push("/w/settings/webhooks");
      router.refresh();
    },
  });

  function onEnableOrDisable() {
    const webhookId = destination.id as string;
    if (isDisabled) {
      return enableMutation.mutate(webhookId);
    }

    disableMutation.mutate(webhookId);
  }

  function onDelete() {
    setDeleteDialogOpen(true);
  }

  function onConfirmDelete() {
    if (destination.id) {
      deleteMutation.mutate(destination.id as string);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {variant === "icon" ? (
            <Button variant="secondary" size="sm">
              <MoreHoriz className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="secondary">
              <MoreHoriz className="w-4 h-4" />
            </Button>
          )}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item
            onClick={onEnableOrDisable}
            disabled={enableMutation.isPending || disableMutation.isPending}
          >
            {isDisabled ? (
              <>
                <Play className="w-4 h-4" />
                Enable
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Disable
              </>
            )}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="text-kb-content-negative"
            onClick={onDelete}
          >
            <Trash className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirm delete webhook"
        description="This action cannot be undone. This will permanently delete the webhook destination."
        confirmText="DELETE"
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: onConfirmDelete,
          loading: deleteMutation.isPending,
          disabled: deleteMutation.isPending,
        }}
        cancel={{
          variant: "secondary",
          children: "Cancel",
          disabled: deleteMutation.isPending,
        }}
      />
    </>
  );
}
