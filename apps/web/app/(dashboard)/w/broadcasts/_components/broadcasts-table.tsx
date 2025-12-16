"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import type { Broadcast, BroadcastStatus, EmailContent } from "@prisma/client";
import Link from "next/link";
import {
  MoreHoriz,
  EditPencil,
  Trash,
  Copy,
  Eye,
  Clock,
  Check,
  SendDiagonal,
  WarningTriangle,
  Archive,
} from "iconoir-react";

type BroadcastWithEmailContent = Broadcast & {
  emailContent: Pick<EmailContent, "subject"> | null;
};

function getStatusBadge(status: BroadcastStatus) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="neutral" size="sm">
          <EditPencil className="w-3 h-3" />
          Draft
        </Badge>
      );
    case "QUEUED_FOR_SENDING":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "SENDING":
      return (
        <Badge variant="info" size="sm">
          <SendDiagonal className="w-3 h-3" />
          Sending
        </Badge>
      );
    case "SENT":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Sent
        </Badge>
      );
    case "SENDING_FAILED":
      return (
        <Badge variant="error" size="sm">
          <WarningTriangle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case "DRAFT_ARCHIVED":
    case "ARCHIVED":
      return (
        <Badge variant="neutral" size="sm">
          <Archive className="w-3 h-3" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          {status}
        </Badge>
      );
  }
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BroadcastActionsDropdown({
  broadcast,
}: {
  broadcast: BroadcastWithEmailContent;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item asChild>
          <Link href={`/broadcasts/${broadcast.id}`}>
            <Eye className="w-4 h-4" />
            View Details
          </Link>
        </DropdownMenu.Item>
        {broadcast.status === "DRAFT" && (
          <DropdownMenu.Item asChild>
            <Link href={`/broadcasts/${broadcast.id}`}>
              <EditPencil className="w-4 h-4" />
              Edit
            </Link>
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item>
          <Copy className="w-4 h-4" />
          Duplicate
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

interface BroadcastsTableProps {
  broadcasts: BroadcastWithEmailContent[];
}

export function BroadcastsTable({ broadcasts }: BroadcastsTableProps) {
  if (broadcasts.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No broadcasts yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first broadcast to start sending emails to your audience.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Subject</Table.Head>
            <Table.Head className="w-[120px]">Status</Table.Head>
            <Table.Head className="w-[180px]">Send On</Table.Head>
            <Table.Head className="w-[80px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {broadcasts.map((broadcast) => (
            <Table.Row key={broadcast.id}>
              <Table.Cell className="font-medium">
                <Link
                  href={`/broadcasts/${broadcast.id}`}
                  className="hover:text-kb-content-brand transition-colors"
                >
                  {broadcast.emailContent?.subject || broadcast.name || "Untitled"}
                </Link>
              </Table.Cell>
              <Table.Cell>{getStatusBadge(broadcast.status)}</Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {formatDate(broadcast.sendAt)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <BroadcastActionsDropdown broadcast={broadcast} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
