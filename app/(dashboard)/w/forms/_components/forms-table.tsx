"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { EditPencil, MoreHoriz, Trash, Eye, Copy } from "iconoir-react";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import Link from "next/link";

// Static data for demonstration
const mockForms = [
  {
    id: "1",
    name: "Newsletter Signup",
    status: "live" as const,
    submissions: 1247,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Contact Us Form",
    status: "live" as const,
    submissions: 453,
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    name: "Product Feedback Survey",
    status: "draft" as const,
    submissions: 0,
    createdAt: "2024-01-10",
  },
  {
    id: "4",
    name: "Event Registration",
    status: "live" as const,
    submissions: 892,
    createdAt: "2024-01-08",
  },
  {
    id: "5",
    name: "Early Access Waitlist",
    status: "draft" as const,
    submissions: 0,
    createdAt: "2024-01-05",
  },
];

function FormActionsDropdown({ form }: { form: (typeof mockForms)[0] }) {
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

export function FormsTable() {
  if (mockForms.length === 0) {
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
          {mockForms.map((form) => (
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
                  variant={form.status === "live" ? "success" : "neutral"}
                  size="sm"
                >
                  {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
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
