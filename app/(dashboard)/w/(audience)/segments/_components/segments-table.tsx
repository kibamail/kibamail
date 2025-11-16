"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import * as Tooltip from "@kibamail/owly/tooltip";
import type { Segment } from "@prisma/client";
import { EditPencil, HelpCircle, MoreHoriz, Play, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import { CreateSegmentModal } from "./create-segment-modal";

interface SegmentsTableProps {
  segments: (Pick<Segment, "id" | "name" | "description" | "conditions"> & {
    contactCount: number | null;
  })[];
}

function SegmentActionsDropdown({
  segment,
}: {
  segment: SegmentsTableProps["segments"][0];
}) {
  const { success: toast, error: errorToast } = useToast();
  const router = useRouter();
  const deleteDialogState = useToggleState();
  const editModalState = useToggleState();

  const deleteMutation = useMutation({
    async mutationFn() {
      return internalApi.segments().delete(segment.id);
    },
    onSuccess() {
      toast("Segment deleted successfully.");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError() {
      errorToast("Failed to delete segment. Please try again.");
    },
  });

  function onDelete() {
    deleteDialogState.onOpenChange?.(true);
  }

  function onEdit() {
    editModalState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item onClick={onEdit}>
            <EditPencil className="w-4 h-4" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <Play className="w-4 h-4" />
            Refresh
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

      <CreateSegmentModal {...editModalState} segment={segment} mode="edit" />

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete segment"
        description={`Are you sure you want to delete "${segment.name}"? This action cannot be undone.`}
        confirmText={segment.name.toUpperCase()}
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

export function SegmentsTable({ segments }: SegmentsTableProps) {
  if (segments.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No segments yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first segment to organize your audience.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Name</Table.Head>
            <Table.Head className="w-[120px]">Contacts</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {segments.map((segment) => (
            <Table.Row key={segment.id}>
              <Table.Cell className="font-medium">{segment.name}</Table.Cell>
              <Table.Cell>
                {segment.contactCount !== null ? (
                  <span className="text-sm font-medium text-kb-content-primary">
                    {segment.contactCount.toLocaleString()}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-kb-content-secondary">
                      —
                    </span>
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-kb-content-tertiary" />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <p className="text-xs">
                            Contacts count is being computed in the background.
                            <br />
                            It will be available shortly.
                          </p>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>
                )}
              </Table.Cell>
              <Table.Cell>
                <SegmentActionsDropdown segment={segment} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
