"use client";

import { Text } from "@kibamail/owly";
import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import type { EventType, TransactionalEmailStatus } from "@prisma/client";
import {
  Check,
  Clock,
  Eye,
  Mail,
  MoreHoriz,
  RefreshDouble,
  WarningCircle,
  Xmark,
} from "iconoir-react";
import Link from "next/link";

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

function getEventBadge(eventType: EventType | null) {
  if (!eventType) {
    return (
      <Badge variant="neutral" size="sm">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  }

  switch (eventType) {
    case "Queued":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "Reception":
      return (
        <Badge variant="info" size="sm">
          <Mail className="w-3 h-3" />
          Received
        </Badge>
      );
    case "Delivery":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Delivered
        </Badge>
      );
    case "Bounce":
    case "AdminBounce":
    case "OOB":
      return (
        <Badge variant="error" size="sm">
          <Xmark className="w-3 h-3" />
          Bounced
        </Badge>
      );
    case "TransientFailure":
      return (
        <Badge variant="warning" size="sm">
          <RefreshDouble className="w-3 h-3" />
          Temporary failure
        </Badge>
      );
    case "Feedback":
      return (
        <Badge variant="error" size="sm">
          <WarningCircle className="w-3 h-3" />
          Complained
        </Badge>
      );
    case "Rejection":
    case "Expiration":
      return (
        <Badge variant="error" size="sm">
          <Xmark className="w-3 h-3" />
          Failed
        </Badge>
      );
    case "Open":
      return (
        <Badge variant="success" size="sm">
          <Eye className="w-3 h-3" />
          Opened
        </Badge>
      );
    case "Click":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Clicked
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          {eventType}
        </Badge>
      );
  }
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

              <Table.Cell>{getEventBadge(email.latestEventType)}</Table.Cell>
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
