"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import type { ContactStatus } from "@prisma/client";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import { CreateContactModal } from "@/app/(dashboard)/w/(audience)/contacts/_components/create-contact-modal";

interface ContactActionsDropdownProps {
  variant?: "icon" | "default";
  contact: {
    id: string;
    email: string;
    status: ContactStatus;
    topics: string[];
    properties: Record<string, unknown>;
  };
}

export function ContactActionsDropdown({
  variant = "icon",
  contact,
}: ContactActionsDropdownProps) {
  const { success: toast, error: errorToast } = useToast();
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const deleteDialogState = useToggleState();

  const deleteMutation = useMutation({
    async mutationFn() {
      return internalApi.contacts().delete(contact.id);
    },
    onSuccess() {
      toast("Contact deleted successfully.");
      deleteDialogState.onOpenChange?.(false);
      router.push("/w/contacts");
    },
    onError() {
      errorToast("Failed to delete contact. Please try again.");
    },
  });

  function onEdit() {
    setEditModalOpen(true);
  }

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
          <DropdownMenu.Item onClick={onEdit}>
            <EditPencil className="w-4 h-4" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="text-kb-content-error"
            onClick={onDelete}
          >
            <Trash className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <CreateContactModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        contact={contact}
        mode="edit"
      />

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete contact"
        description={`Are you sure you want to delete "${contact.email}"? This action cannot be undone and will remove all contact data including topic subscriptions and activity history.`}
        confirmText={contact.email}
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
