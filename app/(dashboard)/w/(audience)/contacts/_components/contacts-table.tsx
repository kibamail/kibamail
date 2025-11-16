"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import type { ContactProperty, ContactStatus } from "@prisma/client";
import dayjs from "dayjs";
import gravatarUrl from "gravatar-url";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";
import Link from "next/link";
import { useState } from "react";
import { CreateContactModal } from "./create-contact-modal";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: ContactStatus;
  subscribedAt: Date | null;
  properties: Record<string, unknown>;
};

export interface ContactsTableProps {
  contacts: Contact[];
  selectedColumns: string[];
  contactProperties: Pick<ContactProperty, "name" | "type">[];
}

function formatCellValue(
  value: unknown,
  propertyType?: "DATE" | "NUMBER" | "TEXT" | "STRING"
): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (propertyType === "DATE" && typeof value === "number") {
    return dayjs(value).format("MMM D, YYYY");
  }

  if (value instanceof Date) {
    return dayjs(value).format("MMM D, YYYY h:mm A");
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value);
}

// Get column label
function getColumnLabel(columnId: string): string {
  const labels: Record<string, string> = {
    email: "Email",
    firstName: "First Name",
    lastName: "Last Name",
    status: "Status",
    subscribedAt: "Subscribed At",
  };

  return labels[columnId] || columnId;
}

function ContactActionsDropdown({
  contact,
  onEdit,
}: {
  contact: Contact;
  onEdit: () => void;
}) {
  return (
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
        <DropdownMenu.Item className="text-kb-content-error">
          <Trash className="w-4 h-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export function ContactsTable({
  contacts,
  selectedColumns,
  contactProperties,
}: ContactsTableProps) {
  const [editContact, setEditContact] = useState<{
    id: string;
    email: string;
    status: ContactStatus;
    topics: string[];
    properties: Record<string, unknown>;
  } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  function handleEditContact(contact: Contact) {
    // Map contact data to the format expected by the modal
    const contactForEdit = {
      id: contact.id,
      email: contact.email,
      status: contact.status,
      topics: [], // We'll need to fetch this from the API
      properties: contact.properties,
    };

    setEditContact(contactForEdit);
    setEditModalOpen(true);
  }

  if (contacts.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No contacts yet</EmptyCard.Title>
        <EmptyCard.Description>
          Add your first contact to start building your audience.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  function getPropertyType(propertyName: string) {
    return contactProperties.find((p) => p.name === propertyName)?.type;
  }

  function getCellValue(contact: Contact, columnId: string): unknown {
    if (columnId in contact) {
      return contact[columnId as keyof Contact];
    }

    return contact.properties[columnId];
  }

  return (
    <>
      <Table.Container>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              {selectedColumns.map((columnId) => (
                <Table.Head key={columnId}>{getColumnLabel(columnId)}</Table.Head>
              ))}
              <Table.Head className="w-[100px]">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {contacts.map((contact) => (
              <Table.Row key={contact.id}>
                {selectedColumns.map((columnId) => {
                  const value = getCellValue(contact, columnId);
                  const propertyType = getPropertyType(columnId);

                  // Special rendering for email column with avatar
                  if (columnId === "email") {
                    return (
                      <Table.Cell key={columnId} className="font-medium">
                        <div className="flex items-center gap-2">
                          <img
                            src={gravatarUrl(String(value), { size: 24 })}
                            alt={`Avatar for ${value}`}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <Link
                            href={`/w/contacts/${contact.id}`}
                            className="text-kb-content-secondary underline underline-offset-4 hover:text-kb-content-tertiary"
                          >
                            {String(value)}
                          </Link>
                        </div>
                      </Table.Cell>
                    );
                  }

                  return (
                    <Table.Cell key={columnId}>
                      {formatCellValue(value, propertyType)}
                    </Table.Cell>
                  );
                })}
                <Table.Cell>
                  <ContactActionsDropdown
                    contact={contact}
                    onEdit={() => handleEditContact(contact)}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.Container>

      <CreateContactModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        contact={editContact || undefined}
        mode="edit"
      />
    </>
  );
}
