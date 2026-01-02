"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import { MoreHoriz, Trash, Eye, Copy } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormStatus } from "@prisma/client";

import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

import { EditFormButton } from "./edit-form-button";

type FormListItem = {
  id: string;
  name: string;
  description: string | null;
  status: FormStatus;
  effectiveStatus: string;
  submissions: number;
  draftVersionId?: string;
};

function FormActionsDropdown({ form }: { form: FormListItem }) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const deleteDialogState = useToggleState();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.forms().delete(form.id);
    },
    onSuccess: () => {
      toast("Form deleted successfully");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete form");
    },
  });

  function onDelete() {
    deleteDialogState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  const canDelete = form.status === "DRAFT";

  return (
    <>
      <div className="flex items-center gap-2">
        <EditFormButton
          formId={form.id}
          formName={form.name}
          formStatus={form.status}
          draftVersionId={form.draftVersionId}
          showLabel={false}
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" size="sm">
              <MoreHoriz className="w-4 h-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="w-48">
            <DropdownMenu.Item>
              <Eye className="w-4 h-4" />
              Preview
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <Copy className="w-4 h-4" />
              Duplicate
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
      </div>

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete form"
        description={`Are you sure you want to delete "${form.name}"? This action cannot be undone and will permanently remove the form and all its data.`}
        confirmText={form.name}
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

export function FormsTable({ forms }: { forms: FormListItem[] }) {
  if (forms.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No forms yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first form to start collecting information from your
          audience.
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
            <Table.Head className="w-[180px]">Total Submissions</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {forms.map((form) => (
            <Table.Row key={form.id}>
              <Table.Cell>
                <Link
                  href={`/w/forms/${form.id}/edit`}
                  className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                >
                  {form.name}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    form.effectiveStatus === "PUBLISHED"
                      ? "success"
                      : form.effectiveStatus === "DRAFT"
                        ? "neutral"
                        : "warning"
                  }
                  size="sm"
                >
                  {form.effectiveStatus === "PUBLISHED"
                    ? "Live"
                    : form.effectiveStatus === "DRAFT"
                      ? "Draft"
                      : "Archived"}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {form.submissions.toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <FormActionsDropdown form={form} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
