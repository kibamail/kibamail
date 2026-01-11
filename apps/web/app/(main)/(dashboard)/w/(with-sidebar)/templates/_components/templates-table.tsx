"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

type TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  displayStatus: "LIVE" | "DRAFT" | "ARCHIVED";
  latestVersion: number;
  linkTargetId: string;
  hasDraft: boolean;
  hasLive: boolean;
  createdAt: string;
  updatedAt: string;
};

function TemplateActionsDropdown({ template }: { template: TemplateListItem }) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const deleteDialogState = useToggleState();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.emailTemplates().delete(template.id);
    },
    onSuccess: () => {
      toast("Template deleted successfully");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete template");
    },
  });

  function onDelete() {
    deleteDialogState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  // Can only delete if there's no live version and template is in draft
  const canDelete = !template.hasLive && template.displayStatus === "DRAFT";

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/w/templates/${template.linkTargetId}`)}
        >
          <EditPencil className="w-4 h-4" />
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" size="sm">
              <MoreHoriz className="w-4 h-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="w-48">
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
      </div>

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete template"
        description={`Are you sure you want to delete "${template.name}"? This action cannot be undone and will permanently remove the template.`}
        confirmText={template.name}
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

export function TemplatesTable({
  templates,
}: {
  templates: TemplateListItem[];
}) {
  if (templates.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No templates yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first email template to start building reusable
          transactional emails.
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
            <Table.Head className="w-[120px]">Status</Table.Head>
            <Table.Head className="w-[100px]">Version</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {templates.map((template) => (
            <Table.Row key={template.id}>
              <Table.Cell>
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/w/templates/${template.linkTargetId}`}
                    className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                  >
                    {template.name}
                  </Link>
                  {template.description && (
                    <span className="text-sm text-kb-content-tertiary">
                      {template.description}
                    </span>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    template.displayStatus === "LIVE"
                      ? "success"
                      : template.displayStatus === "DRAFT"
                        ? "neutral"
                        : "warning"
                  }
                  size="sm"
                >
                  {template.displayStatus === "LIVE"
                    ? "Live"
                    : template.displayStatus === "DRAFT"
                      ? "Draft"
                      : "Archived"}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  v{template.latestVersion}
                </span>
              </Table.Cell>
              <Table.Cell>
                <TemplateActionsDropdown template={template} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
