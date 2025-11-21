"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { EditPencil, MoreHoriz, Pause, Play, Trash } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import Link from "next/link";

// Static data for demonstration
const mockAutomations = [
  {
    id: "1",
    name: "Welcome Email Sequence",
    status: "active" as const,
    runs: { running: 12, completed: 245 },
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Abandoned Cart Recovery",
    status: "paused" as const,
    runs: { running: 0, completed: 89 },
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    name: "Product Recommendation Flow",
    status: "active" as const,
    runs: { running: 8, completed: 156 },
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    name: "Customer Feedback Survey",
    status: "draft" as const,
    runs: { running: 0, completed: 0 },
    createdAt: "2024-01-05",
  },
  {
    id: "5",
    name: "Birthday Discount Campaign",
    status: "active" as const,
    runs: { running: 3, completed: 67 },
    createdAt: "2024-01-03",
  },
];

function AutomationActionsDropdown({
  automation,
}: {
  automation: (typeof mockAutomations)[0];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item>
          <EditPencil className="w-4 h-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          {automation.status === "active" ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Activate
            </>
          )}
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

export function AutomationsTable() {
  if (mockAutomations.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No automations yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first automation to start engaging with your audience
          automatically.
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
            <Table.Head className="w-[120px]">Running</Table.Head>
            <Table.Head className="w-[120px]">Completed</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mockAutomations.map((automation) => (
            <Table.Row key={automation.id}>
              <Table.Cell>
                <Link
                  href={`/flows/${automation.id}`}
                  className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                >
                  {automation.name}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    automation.status === "active"
                      ? "success"
                      : automation.status === "paused"
                      ? "warning"
                      : "neutral"
                  }
                  size="sm"
                >
                  {automation.status.charAt(0).toUpperCase() +
                    automation.status.slice(1)}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {automation.runs.running}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {automation.runs.completed}
                </span>
              </Table.Cell>
              <Table.Cell>
                <AutomationActionsDropdown automation={automation} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
