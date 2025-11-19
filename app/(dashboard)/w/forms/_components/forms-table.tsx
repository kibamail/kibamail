"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { EditPencil, MoreHoriz, Trash, Eye, Copy } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import Link from "next/link";
import type { Form } from "@prisma/client";

type FormWithSubmissions = Form & {
  submissions: number;
};

function FormActionsDropdown({ form }: { form: FormWithSubmissions }) {
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
  );
}

export function FormsTable({ forms }: { forms: FormWithSubmissions[] }) {
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
                  href={`/forms/${form.id}`}
                  className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                >
                  {form.name}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={
                    form.status === "PUBLISHED"
                      ? "success"
                      : form.status === "DRAFT"
                        ? "neutral"
                        : "warning"
                  }
                  size="sm"
                >
                  {form.status === "PUBLISHED"
                    ? "Live"
                    : form.status === "DRAFT"
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
