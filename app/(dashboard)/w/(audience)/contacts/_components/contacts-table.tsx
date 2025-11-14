"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { MoreHoriz, EditPencil, Trash } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import Link from "next/link";

// Static data matching actual database schema
const mockContacts = [
  {
    id: "cm3yz1abc123",
    workspaceId: "org_123",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+1-555-0123",
    country: "US",
    timezone: "America/New_York",
    city: "New York",
    status: "SUBSCRIBED" as const,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    topics: ["Newsletter", "Product Updates"], // This would come from ContactTopic join
  },
  {
    id: "cm3yz2def456",
    workspaceId: "org_123",
    email: "jane.smith@example.com",
    firstName: "Jane",
    lastName: "Smith",
    phone: "+1-555-0124",
    country: "CA",
    timezone: "America/Toronto",
    city: "Toronto",
    status: "UNSUBSCRIBED" as const,
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-12T09:15:00Z",
    topics: ["Newsletter"],
  },
  {
    id: "cm3yz3ghi789",
    workspaceId: "org_123",
    email: "bob.johnson@example.com",
    firstName: "Bob",
    lastName: "Johnson",
    phone: null,
    country: "GB",
    timezone: "Europe/London",
    city: "London",
    status: "SUBSCRIBED" as const,
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-08T16:45:00Z",
    topics: ["Product Updates", "Marketing"],
  },
  {
    id: "cm3yz4jkl012",
    workspaceId: "org_123",
    email: "alice.brown@example.com",
    firstName: "Alice",
    lastName: "Brown",
    phone: "+1-555-0125",
    country: "AU",
    timezone: "Australia/Sydney",
    city: "Sydney",
    status: "BOUNCED" as const,
    createdAt: "2024-01-05T08:10:00Z",
    updatedAt: "2024-01-06T12:30:00Z",
    topics: [],
  },
];

function ContactActionsDropdown({
  contact,
}: {
  contact: (typeof mockContacts)[0];
}) {
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

export function ContactsTable() {
  if (mockContacts.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No contacts yet</EmptyCard.Title>
        <EmptyCard.Description>
          Add your first contact to start building your audience.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Email</Table.Head>
            <Table.Head className="w-[120px]">Status</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mockContacts.map((contact) => (
            <Table.Row key={contact.id}>
              <Table.Cell className="font-medium">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://picsum.photos/seed/${contact.id}/24/24`}
                    alt={`Avatar for ${contact.email}`}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <Link
                    href={`/w/contacts/${contact.id}`}
                    className="text-kb-content-secondary underline underline-offset-4 hover:text-kb-content-tertiary"
                  >
                    {contact.email}
                  </Link>
                </div>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    contact.status === "SUBSCRIBED"
                      ? "success"
                      : contact.status === "UNSUBSCRIBED"
                      ? "error"
                      : contact.status === "BOUNCED"
                      ? "warning"
                      : contact.status === "COMPLAINED"
                      ? "error"
                      : "neutral" // ARCHIVED
                  }
                  size="sm"
                >
                  {contact.status.charAt(0) +
                    contact.status.slice(1).toLowerCase()}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <ContactActionsDropdown contact={contact} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
