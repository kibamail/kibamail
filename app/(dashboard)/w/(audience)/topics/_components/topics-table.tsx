"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { MoreHoriz, EditPencil, Trash } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";

// Static data matching actual database schema
const mockTopics = [
  {
    id: "cm3yz1top123",
    workspaceId: "org_123",
    name: "Newsletter",
    description: "Weekly newsletter updates",
    slug: "newsletter",
    visibility: "PUBLIC" as const,
    isPrimary: true,
    subscriberCount: 2456, // This would be calculated from ContactTopic
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz2top456",
    workspaceId: "org_123",
    name: "Product Updates",
    description: "New feature announcements and updates",
    slug: "product-updates",
    visibility: "PUBLIC" as const,
    isPrimary: false,
    subscriberCount: 1823,
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-10T14:20:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz3top789",
    workspaceId: "org_123",
    name: "Marketing",
    description: "Promotional content and special offers",
    slug: "marketing",
    visibility: "PUBLIC" as const,
    isPrimary: false,
    subscriberCount: 987,
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-08T16:45:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz4top012",
    workspaceId: "org_123",
    name: "Events",
    description: "Webinars, conferences, and event notifications",
    slug: "events",
    visibility: "PUBLIC" as const,
    isPrimary: false,
    subscriberCount: 654,
    createdAt: "2024-01-05T08:10:00Z",
    updatedAt: "2024-01-05T08:10:00Z",
    deletedAt: null,
  },
  {
    id: "cm3yz5top345",
    workspaceId: "org_123",
    name: "Beta Features",
    description: "Early access to new features",
    slug: "beta-features",
    visibility: "PRIVATE" as const,
    isPrimary: false,
    subscriberCount: 234,
    createdAt: "2024-01-03T12:15:00Z",
    updatedAt: "2024-01-03T12:15:00Z",
    deletedAt: null,
  },
];

function TopicActionsDropdown({ topic }: { topic: typeof mockTopics[0] }) {
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

export function TopicsTable() {
  if (mockTopics.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No topics yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first topic to organize your content.
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
            <Table.Head className="w-[120px]">Visibility</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mockTopics.map((topic) => (
            <Table.Row key={topic.id}>
              <Table.Cell className="font-medium">
                <div className="flex items-center gap-2">
                  {topic.name}
                  {topic.isPrimary && (
                    <Badge variant="warning" size="sm">Primary</Badge>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {topic.subscriberCount.toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={topic.visibility === "PUBLIC" ? "success" : "neutral"}
                  size="sm"
                >
                  {topic.visibility.charAt(0) + topic.visibility.slice(1).toLowerCase()}
                </Badge>
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
