"use client";

import { Text } from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import type { EventType, TransactionalEmailStatus } from "@prisma/client";
import { Eye, MoreHoriz } from "iconoir-react";
import Link from "next/link";
import { EmailStatusBadge } from "./email-status-badge";

export interface EmailListItem {
  id: string;
  sendingId: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  status: TransactionalEmailStatus;
  latestEventType: EventType | null;
  createdAt: Date;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function EmailActionsDropdown({ email }: { email: EmailListItem }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item asChild>
          <Link href={`/w/emails/${email.id}`}>
            <Eye className="w-4 h-4" />
            View Details
          </Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

interface EmailsTableProps {
  emails: EmailListItem[];
}

export function EmailsTable({ emails }: EmailsTableProps) {
  if (emails.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No emails found</EmptyCard.Title>
        <EmptyCard.Description>
          Transactional emails you send will appear here.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Recipient</Table.Head>
            <Table.Head className="w-[220px]">Status</Table.Head>
            <Table.Head className="w-[200px]">Date</Table.Head>
            <Table.Head className="w-20">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {emails.map((email) => (
            <Table.Row
              key={email.id}
              className="cursor-pointer hover:bg-kb-surface-secondary"
            >
              <Table.Cell>
                <Link
                  className="flex items-center gap-1"
                  href={`/w/emails/${email.id}`}
                >
                  <span className="font-medium underline">{email.toEmail}</span>

                  <Text className="ml-1! mt-2" variant="tertiary" size="sm">
                    {email.subject}
                  </Text>
                </Link>
              </Table.Cell>

              <Table.Cell><EmailStatusBadge eventType={email.latestEventType} /></Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {formatDate(email.createdAt)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <EmailActionsDropdown email={email} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
