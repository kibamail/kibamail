"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import {
  Archive,
  EditPencil,
  HistoricShield,
  MoreHoriz,
  SendDiagonal,
  Trash,
} from "iconoir-react";
import Link from "next/link";
import { useState } from "react";
import type { Automation } from "@prisma/client";
import { CreateAutomationButton } from "./create-automation-button";

type AutomationWithVersions = Automation & {
  versions: Automation[];
  publishedVersion: Automation | null;
  allVersions: Automation[];
};

interface AutomationsTableProps {
  automations: AutomationWithVersions[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PUBLISHED":
      return (
        <Badge variant="success" size="sm">
          Published
        </Badge>
      );
    case "ARCHIVED":
      return (
        <Badge variant="warning" size="sm">
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          Draft
        </Badge>
      );
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function AutomationActionsDropdown({
  automation,
}: {
  automation: AutomationWithVersions;
}) {
  // Always link to root ID - page will handle showing draft or creating one
  const editLink = `/flows/${automation.id}`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item asChild>
          <Link href={editLink}>
            <EditPencil className="w-4 h-4" />
            Edit
          </Link>
        </DropdownMenu.Item>
        {automation.publishedVersion && (
          <DropdownMenu.Item>
            <Archive className="w-4 h-4" />
            Archive
          </DropdownMenu.Item>
        )}
        {!automation.publishedVersion && automation.status === "DRAFT" && (
          <DropdownMenu.Item>
            <SendDiagonal className="w-4 h-4" />
            Publish
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="text-kb-content-error">
          <Trash className="w-4 h-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

interface VersionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: AutomationWithVersions;
}

function VersionsModal({ open, onOpenChange, automation }: VersionsModalProps) {
  // Root ID is the automation's own ID since we only show root automations in the table
  const rootId = automation.id;

  const getVersionLink = (version: Automation) => {
    // Draft versions don't need version param
    if (version.status === "DRAFT") {
      return `/flows/${rootId}`;
    }
    // Other versions use version query param
    return `/flows/${rootId}?version=${version.version}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-lg">
        <Dialog.Header>
          <Dialog.Title>Version History</Dialog.Title>
        </Dialog.Header>
        <div className="py-4 px-6">
          <p className="text-sm text-kb-content-secondary mb-4">
            {automation.name}
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {automation.allVersions.map((version) => (
              <Link
                key={version.id}
                href={getVersionLink(version)}
                className="flex items-center justify-between p-3 rounded-lg border border-kb-border-tertiary hover:bg-kb-surface-secondary transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      Version {version.version}
                    </span>
                    <span className="text-xs text-kb-content-secondary">
                      {version.publishedAt
                        ? `Published ${formatDate(new Date(version.publishedAt))}`
                        : `Created ${formatDate(new Date(version.createdAt))}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(version.status)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function AutomationsTable({ automations }: AutomationsTableProps) {
  const [selectedAutomation, setSelectedAutomation] =
    useState<AutomationWithVersions | null>(null);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);

  function onVersionsClick(automation: AutomationWithVersions) {
    setSelectedAutomation(automation);
    setVersionsModalOpen(true);
  }

  if (automations.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No automations yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first automation to start engaging with your audience
          automatically.
        </EmptyCard.Description>
        <EmptyCard.Action>
          <CreateAutomationButton />
        </EmptyCard.Action>
      </EmptyCard.Root>
    );
  }

  return (
    <>
      <Table.Container>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head className="w-[120px]">Status</Table.Head>
              <Table.Head className="w-[100px]">Versions</Table.Head>
              <Table.Head className="w-[150px]">Created</Table.Head>
              <Table.Head className="w-[100px]">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {automations.map((automation) => {
              // Show published version status if exists, otherwise root status
              const displayStatus = automation.publishedVersion
                ? automation.publishedVersion.status
                : automation.status;

              // Always link to root ID - page will handle showing draft or creating one
              const editLink = `/flows/${automation.id}`;

              return (
                <Table.Row key={automation.id}>
                  <Table.Cell>
                    <Link
                      href={editLink}
                      className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                    >
                      {automation.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>{getStatusBadge(displayStatus)}</Table.Cell>
                  <Table.Cell>
                    <button
                      type="button"
                      onClick={() => onVersionsClick(automation)}
                      className="flex items-center gap-1.5 text-sm text-kb-content-secondary hover:text-kb-content-primary transition-colors cursor-pointer"
                    >
                      <HistoricShield className="w-4 h-4" />
                      <span>{automation.allVersions.length}</span>
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-kb-content-secondary">
                      {formatDate(automation.createdAt)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <AutomationActionsDropdown automation={automation} />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.Container>

      {selectedAutomation && (
        <VersionsModal
          open={versionsModalOpen}
          onOpenChange={setVersionsModalOpen}
          automation={selectedAutomation}
        />
      )}
    </>
  );
}
