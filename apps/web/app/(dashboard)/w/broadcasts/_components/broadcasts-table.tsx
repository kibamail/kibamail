"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import {
  MoreHoriz,
  EditPencil,
  Trash,
  Copy,
  Eye,
  Clock,
  Check,
  SendDiagonal,
} from "iconoir-react";

type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT";

interface Broadcast {
  id: string;
  subject: string;
  status: BroadcastStatus;
  audienceName: string;
  recipientCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  openRate: number | null;
  clickRate: number | null;
}

const staticBroadcasts: Broadcast[] = [
  {
    id: "1",
    subject: "Welcome to our December Newsletter",
    status: "SENT",
    audienceName: "All Subscribers",
    recipientCount: 12500,
    scheduledAt: null,
    sentAt: "2024-12-10T10:00:00Z",
    openRate: 42.5,
    clickRate: 8.3,
  },
  {
    id: "2",
    subject: "Holiday Sale - 50% Off Everything!",
    status: "SCHEDULED",
    audienceName: "Active Customers",
    recipientCount: 8200,
    scheduledAt: "2024-12-20T09:00:00Z",
    sentAt: null,
    openRate: null,
    clickRate: null,
  },
  {
    id: "3",
    subject: "Product Update: New Features Released",
    status: "SENT",
    audienceName: "Product Users",
    recipientCount: 5400,
    scheduledAt: null,
    sentAt: "2024-12-05T14:30:00Z",
    openRate: 38.2,
    clickRate: 12.1,
  },
  {
    id: "4",
    subject: "Year in Review - Your 2024 Highlights",
    status: "DRAFT",
    audienceName: "All Subscribers",
    recipientCount: 12500,
    scheduledAt: null,
    sentAt: null,
    openRate: null,
    clickRate: null,
  },
  {
    id: "5",
    subject: "Upcoming Webinar: Best Practices for 2025",
    status: "SENDING",
    audienceName: "Newsletter Subscribers",
    recipientCount: 3200,
    scheduledAt: null,
    sentAt: null,
    openRate: null,
    clickRate: null,
  },
];

function getStatusBadge(status: BroadcastStatus) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="neutral" size="sm">
          <EditPencil className="w-3 h-3" />
          Draft
        </Badge>
      );
    case "SCHEDULED":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="w-3 h-3" />
          Scheduled
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
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BroadcastActionsDropdown({ broadcast }: { broadcast: Broadcast }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item>
          <Eye className="w-4 h-4" />
          View Details
        </DropdownMenu.Item>
        {broadcast.status === "DRAFT" && (
          <DropdownMenu.Item>
            <EditPencil className="w-4 h-4" />
            Edit
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

export function BroadcastsTable() {
  const broadcasts = staticBroadcasts;

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
            <Table.Head className="w-[100px]">Status</Table.Head>
            <Table.Head className="w-[160px]">Audience</Table.Head>
            <Table.Head className="w-[100px]">Recipients</Table.Head>
            <Table.Head className="w-[160px]">Date</Table.Head>
            <Table.Head className="w-[80px]">Opens</Table.Head>
            <Table.Head className="w-[80px]">Clicks</Table.Head>
            <Table.Head className="w-[80px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {broadcasts.map((broadcast) => (
            <Table.Row key={broadcast.id}>
              <Table.Cell className="font-medium">
                {broadcast.subject}
              </Table.Cell>
              <Table.Cell>{getStatusBadge(broadcast.status)}</Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {broadcast.audienceName}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {broadcast.recipientCount.toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary">
                  {broadcast.status === "SCHEDULED"
                    ? formatDate(broadcast.scheduledAt)
                    : formatDate(broadcast.sentAt)}
                </span>
              </Table.Cell>
              <Table.Cell>
                {broadcast.openRate !== null ? (
                  <span className="text-sm font-medium text-kb-content-primary">
                    {broadcast.openRate}%
                  </span>
                ) : (
                  <span className="text-sm text-kb-content-tertiary">-</span>
                )}
              </Table.Cell>
              <Table.Cell>
                {broadcast.clickRate !== null ? (
                  <span className="text-sm font-medium text-kb-content-primary">
                    {broadcast.clickRate}%
                  </span>
                ) : (
                  <span className="text-sm text-kb-content-tertiary">-</span>
                )}
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
