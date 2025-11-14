"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { MoreHoriz, EditPencil, Trash, Play } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";

// Static data matching actual database schema
const mockSegments = [
  {
    id: "cm3yz1seg123",
    workspaceId: "org_123",
    name: "Active Subscribers",
    description: "Users who have opened emails in the last 30 days",
    type: "DYNAMIC" as const,
    conditions: {
      and: [
        { field: "status", operator: "equals", value: "SUBSCRIBED" },
        { field: "lastEngagement", operator: "greaterThan", value: "30d" }
      ]
    },
    contactCount: 1245, // This would be calculated from ContactSegment or query
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz2seg456",
    workspaceId: "org_123",
    name: "New Signups",
    description: "Users who signed up in the last 7 days",
    type: "DYNAMIC" as const,
    conditions: {
      and: [
        { field: "createdAt", operator: "greaterThan", value: "7d" }
      ]
    },
    contactCount: 89,
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-10T14:20:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz3seg789",
    workspaceId: "org_123",
    name: "High Value Customers",
    description: "Customers with purchase value > $500",
    type: "STATIC" as const,
    conditions: null,
    contactCount: 156,
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-08T16:45:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz4seg012",
    workspaceId: "org_123",
    name: "Inactive Users",
    description: "Users who haven't engaged in 90+ days",
    type: "DYNAMIC" as const,
    conditions: {
      and: [
        { field: "lastEngagement", operator: "lessThan", value: "90d" }
      ]
    },
    contactCount: 567,
    createdAt: "2024-01-05T08:10:00Z",
    updatedAt: "2024-01-05T08:10:00Z",
    deletedAt: null,
  },
];

function SegmentActionsDropdown({ segment }: { segment: typeof mockSegments[0] }) {
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
        <DropdownMenu.Item>
          <Play className="w-4 h-4" />
          Refresh
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

export function SegmentsTable() {
  if (mockSegments.length === 0) {
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
          {mockSegments.map((segment) => (
            <Table.Row key={segment.id}>
              <Table.Cell className="font-medium">
                {segment.name}
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {segment.contactCount.toLocaleString()}
                </span>
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
