"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import type { Broadcast, BroadcastStatus, EmailContent } from "@prisma/client";
import Link from "next/link";
import {
  MoreHoriz,
  EditPencil,
  Trash,
  Copy,
  Eye,
  Clock,
  Check,
  SendDiagonal,
  WarningTriangle,
  Archive,
} from "iconoir-react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import { Text } from "@kibamail/owly";

type BroadcastWithEmailContent = Broadcast & {
  emailContent: Pick<EmailContent, "subject"> | null;
};

function getStatusBadge(status: BroadcastStatus) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="neutral" size="sm">
          <EditPencil className="w-3 h-3" />
          Draft
        </Badge>
      );
    case "QUEUED_FOR_SENDING":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "SENDING":
      return (
        <Badge variant="info" size="sm">
          <SendDiagonal className="w-3 h-3" />
          Sending
        </Badge>
      );
    case "SENT":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Sent
        </Badge>
      );
    case "SENDING_FAILED":
      return (
        <Badge variant="error" size="sm">
          <WarningTriangle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case "DRAFT_ARCHIVED":
    case "ARCHIVED":
      return (
        <Badge variant="neutral" size="sm">
          <Archive className="w-3 h-3" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          {status}
        </Badge>
      );
  }
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BroadcastActionsDropdown({
  broadcast,
}: {
  broadcast: BroadcastWithEmailContent;
}) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return internalApi.broadcasts().delete(broadcast.id);
    },
    onSuccess: () => {
      toast("Broadcast deleted successfully");
      setDeleteDialogOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete broadcast");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return internalApi.broadcasts().duplicate(broadcast.id);
    },
    onSuccess: (result) => {
      toast("Broadcast duplicated successfully");
      router.push(`/broadcasts/${result.id}`);
    },
    onError: (error) => {
      toastError(error.message || "Failed to duplicate broadcast");
    },
  });

  function onDelete() {
    setDeleteDialogOpen(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  function onDuplicate() {
    duplicateMutation.mutate();
  }

  const canDelete = ["DRAFT", "QUEUED_FOR_SENDING"].includes(broadcast.status);
  const broadcastName =
    broadcast.emailContent?.subject || broadcast.name || "Untitled";

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item asChild>
            <Link href={`/broadcasts/${broadcast.id}`}>
              <Eye className="w-4 h-4" />
              View Details
            </Link>
          </DropdownMenu.Item>
          {broadcast.status === "DRAFT" && (
            <DropdownMenu.Item asChild>
              <Link href={`/broadcasts/${broadcast.id}`}>
                <EditPencil className="w-4 h-4" />
                Edit
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onClick={onDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="w-4 h-4" />
            {duplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="text-kb-content-error"
            onClick={onDelete}
            disabled={!canDelete}
          >
            <Trash className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete broadcast"
        description={`Are you sure you want to delete "${broadcastName}"? This action cannot be undone.`}
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

interface BroadcastsTableProps {
  broadcasts: BroadcastWithEmailContent[];
}

export function BroadcastsTable({ broadcasts }: BroadcastsTableProps) {
  if (broadcasts.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No broadcasts yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first broadcast to start sending emails to your audience.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Subject</Table.Head>
            <Table.Head className="w-[120px]">Status</Table.Head>
            <Table.Head className="w-[180px]">Send On</Table.Head>
            <Table.Head className="w-[80px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {broadcasts.map((broadcast) => (
            <Table.Row key={broadcast.id}>
              <Table.Cell className="font-medium">
                <Link
                  href={`/broadcasts/${broadcast.id}`}
                  className="hover:text-kb-content-brand transition-colors underline"
                >
                  {broadcast.name || "Untitled"}
                </Link>

                <Text className="ml-1!" variant="tertiary" size="sm">
                  {broadcast.emailContent?.subject || "No subject yet"}
                </Text>
              </Table.Cell>
              <Table.Cell>{getStatusBadge(broadcast.status)}</Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {formatDate(broadcast.sendAt)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <BroadcastActionsDropdown broadcast={broadcast} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
