"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import { MoreHoriz, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface DomainActionsDropdownProps {
  domainId: string;
  domainName: string;
}

export function DomainActionsDropdown({
  domainId,
  domainName,
}: DomainActionsDropdownProps) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const deleteDialogState = useToggleState();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().delete(domainId);
    },
    onSuccess: () => {
      toast("Domain deleted successfully");

      posthog.capture("domain_deleted", {
        domain_id: domainId,
        domain_name: domainName,
      });

      deleteDialogState.onOpenChange?.(false);
      router.push("/w/domains");
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete domain");
    },
  });

  function onDelete() {
    deleteDialogState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item
            className="text-kb-content-error"
            onClick={onDelete}
          >
            <Trash className="w-4 h-4" />
            Delete Domain
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete sending domain"
        description={`Are you sure you want to delete "${domainName}"? This action cannot be undone and will remove all DNS configuration for this domain.`}
        confirmText={domainName}
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: onConfirmDelete,
          loading: deleteMutation.isPending,
          disabled: deleteMutation.isPending,
        }}
      />
    </>
  );
}
