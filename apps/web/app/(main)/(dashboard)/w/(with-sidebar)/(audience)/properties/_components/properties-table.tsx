"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import type { ContactProperty } from "@prisma/client";
import { format } from "date-fns";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { CreateContactPropertyModal } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/create-contact-property-modal";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface PropertiesTableProps {
  properties: Pick<ContactProperty, "id" | "name" | "type" | "defaultValue">[];
}

function formatDefaultValue(
  type: ContactProperty["type"],
  value: string | null,
): string {
  if (!value) return "—";

  if (type === "DATE") {
    try {
      const timestamp = parseInt(value, 10);
      return format(new Date(timestamp), "MMM d, yyyy");
    } catch {
      return value;
    }
  }

  return value;
}

function PropertyActionsDropdown({
  property,
}: {
  property: PropertiesTableProps["properties"][0];
}) {
  const { success: toast, error: errorToast } = useToast();
  const router = useRouter();
  const deleteDialogState = useToggleState();
  const editModalState = useToggleState();

  const deleteMutation = useMutation({
    async mutationFn() {
      return internalApi.contactProperties().delete(property.id);
    },
    onSuccess() {
      toast("Contact property deleted successfully.");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError() {
      errorToast("Failed to delete contact property. Please try again.");
    },
  });

  function onEdit() {
    editModalState.onOpenChange?.(true);
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

      <CreateContactPropertyModal
        {...editModalState}
        property={property}
        mode="edit"
      />

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete contact property"
        description={`Are you sure you want to delete "${property.name}"? This action cannot be undone and will remove this property from all contacts.`}
        confirmText={property.name.toUpperCase()}
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

export function PropertiesTable({ properties }: PropertiesTableProps) {
  if (properties.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No properties yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first property to collect additional contact information.
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
            <Table.Head>Type</Table.Head>
            <Table.Head>Default value</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {properties.map((property) => (
            <Table.Row key={property.id}>
              <Table.Cell className="font-medium">{property.name}</Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    property.type === "STRING"
                      ? "neutral"
                      : property.type === "NUMBER"
                        ? "success"
                        : property.type === "DATE"
                          ? "warning"
                          : "error" // BOOLEAN
                  }
                  size="sm"
                >
                  {property.type.charAt(0) +
                    property.type.slice(1).toLowerCase()}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {formatDefaultValue(property.type, property.defaultValue)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <PropertyActionsDropdown property={property} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
