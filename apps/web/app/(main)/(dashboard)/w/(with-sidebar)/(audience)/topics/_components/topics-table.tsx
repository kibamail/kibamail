"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Switch from "@kibamail/owly/switch";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import type { Topic } from "@prisma/client";
import { EditPencil, Globe, Lock, MoreHoriz, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import { CreateTopicModal } from "./create-topic-modal";

interface TopicsTableProps {
  topics: (Topic & {
    subscriberCount: number;
  })[];
}

function DefaultOptInSwitch({
  topic,
}: {
  topic: TopicsTableProps["topics"][0];
}) {
  const { success: toast, error: errorToast } = useToast();
  const router = useRouter();

  const updateMutation = useMutation({
    async mutationFn(defaultOptIn: boolean) {
      return internalApi.topics().update(topic.id, {
        defaultOptIn,
      });
    },
    onSuccess() {
      toast("Topic updated successfully.");
      router.refresh();
    },
    onError() {
      errorToast("Failed to update topic. Please try again.");
    },
  });

  function onChange(checked: boolean) {
    updateMutation.mutate(checked);
  }

  return (
    <Switch.Root
      checked={topic.defaultOptIn}
      onCheckedChange={onChange}
      disabled={updateMutation.isPending}
      size="sm"
    />
  );
}

function TopicActionsDropdown({
  topic,
}: {
  topic: TopicsTableProps["topics"][0];
}) {
  const { success: toast, error: errorToast } = useToast();
  const router = useRouter();
  const deleteDialogState = useToggleState();
  const editModalState = useToggleState();

  const deleteMutation = useMutation({
    async mutationFn() {
      return internalApi.topics().delete(topic.id);
    },
    onSuccess() {
      toast("Topic deleted successfully.");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError() {
      errorToast("Failed to delete topic. Please try again.");
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

      <CreateTopicModal {...editModalState} topic={topic} mode="edit" />

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete topic"
        description={`Are you sure you want to delete "${topic.name}"? This action cannot be undone and will remove all subscriber relationships for this topic.`}
        confirmText={topic.name.toUpperCase()}
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

export function TopicsTable({ topics }: TopicsTableProps) {
  if (topics.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No topics yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first topic to organize your email communications.
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
            <Table.Head className="w-[120px]">Visibility</Table.Head>
            <Table.Head className="w-[180px]">Default Opt-in</Table.Head>
            <Table.Head className="w-[120px]">Subscribers</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {topics.map((topic) => (
            <Table.Row key={topic.id}>
              <Table.Cell className="font-medium">{topic.name}</Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    topic.visibility === "PUBLIC" ? "success" : "neutral"
                  }
                  size="sm"
                >
                  {topic.visibility === "PRIVATE" ? <Lock /> : <Globe />}
                  {topic.visibility.charAt(0) +
                    topic.visibility.slice(1).toLowerCase()}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <DefaultOptInSwitch topic={topic} />
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {topic.subscriberCount.toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <TopicActionsDropdown topic={topic} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
