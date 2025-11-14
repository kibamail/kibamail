"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { MoreHoriz, EditPencil, Trash } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";

// Static data matching actual database schema
const mockProperties = [
  {
    id: "cm3yz1prop123",
    workspaceId: "org_123",
    name: "Company",
    slot: "company",
    type: "STRING" as const,
    defaultValue: null,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz2prop456",
    workspaceId: "org_123",
    name: "Purchase Date",
    slot: "purchase_date",
    type: "DATE" as const,
    defaultValue: null,
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-10T14:20:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz3prop789",
    workspaceId: "org_123",
    name: "Total Spent",
    slot: "total_spent",
    type: "NUMBER" as const,
    defaultValue: "0",
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-08T16:45:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz4prop012",
    workspaceId: "org_123",
    name: "Is Premium",
    slot: "is_premium",
    type: "BOOLEAN" as const,
    defaultValue: "false",
    createdAt: "2024-01-05T08:10:00Z",
    updatedAt: "2024-01-05T08:10:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz5prop345",
    workspaceId: "org_123",
    name: "Job Title",
    slot: "job_title",
    type: "STRING" as const,
    defaultValue: null,
    createdAt: "2024-01-03T12:15:00Z",
    updatedAt: "2024-01-03T12:15:00Z",
    deletedAt: null,
  },
];

function PropertyActionsDropdown({ property }: { property: typeof mockProperties[0] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="tertiary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item>
          <EditPencil className="w-4 h-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="text-kb-content-error">
          <Trash className="w-4 h-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export function PropertiesTable() {
  if (mockProperties.length === 0) {
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
            <Table.Head>Default Value</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mockProperties.map((property) => (
            <Table.Row key={property.id}>
              <Table.Cell className="font-medium">
                {property.name}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    property.type === "STRING" ? "neutral" :
                    property.type === "NUMBER" ? "success" :
                    property.type === "DATE" ? "warning" :
                    "error" // BOOLEAN
                  }
                  size="sm"
                >
                  {property.type.charAt(0) + property.type.slice(1).toLowerCase()}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {property.defaultValue || "—"}
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
