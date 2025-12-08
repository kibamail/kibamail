"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { MoreHoriz, Trash, Eye, Copy } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import Link from "next/link";
import type { FormStatus } from "@prisma/client";
import { EditFormButton } from "./edit-form-button";

type FormListItem = {
  id: string;
  name: string;
  description: string | null;
  status: FormStatus;
  effectiveStatus: string;
  submissions: number;
  draftVersionId?: string;
};

function FormActionsDropdown({ form }: { form: FormListItem }) {
  return (
    <div className="flex items-center gap-2">
      <EditFormButton
        formId={form.id}
        formName={form.name}
        formStatus={form.status}
        draftVersionId={form.draftVersionId}
        showLabel={false}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item>
            <Eye className="w-4 h-4" />
            Preview
          </DropdownMenu.Item>
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
    </div>
  );
}

export function FormsTable({ forms }: { forms: FormListItem[] }) {
  if (forms.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No forms yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first form to start collecting information from your
          audience.
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
            <Table.Head className="w-[180px]">Total Submissions</Table.Head>
            <Table.Head className="w-[100px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {forms.map((form) => (
            <Table.Row key={form.id}>
              <Table.Cell>
                <Link
                  href={`/w/forms/${form.id}`}
                  className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                >
                  {form.name}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    form.effectiveStatus === "PUBLISHED"
                      ? "success"
                      : form.effectiveStatus === "DRAFT"
                        ? "neutral"
                        : "warning"
                  }
                  size="sm"
                >
                  {form.effectiveStatus === "PUBLISHED"
                    ? "Live"
                    : form.effectiveStatus === "DRAFT"
                      ? "Draft"
                      : "Archived"}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm font-medium text-kb-content-primary">
                  {form.submissions.toLocaleString()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <FormActionsDropdown form={form} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
