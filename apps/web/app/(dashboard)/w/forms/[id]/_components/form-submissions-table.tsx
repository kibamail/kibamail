"use client";

import { Badge } from "@kibamail/owly/badge";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import type { FormSubmission, FormSubmissionStatus } from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";

dayjs.extend(relativeTime);

type SubmissionWithContact = FormSubmission & {
  contact: {
    id: string;
    email: string;
  } | null;
};

interface FormSubmissionsTableProps {
  submissions: SubmissionWithContact[];
}

function getStatusBadgeVariant(status: FormSubmissionStatus) {
  switch (status) {
    case "PROCESSED":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "error";
    case "SPAM":
      return "neutral";
    default:
      return "neutral";
  }
}

function getStatusLabel(status: FormSubmissionStatus) {
  switch (status) {
    case "PROCESSED":
      return "Processed";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "SPAM":
      return "Spam";
    default:
      return status;
  }
}

export function FormSubmissionsTable({
  submissions,
}: FormSubmissionsTableProps) {
  if (submissions.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No submissions yet</EmptyCard.Title>
        <EmptyCard.Description>
          When users submit this form, their responses will appear here.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Contact</Table.Head>
            <Table.Head className="w-[120px]">Status</Table.Head>
            <Table.Head className="w-[180px]">Submitted</Table.Head>
            <Table.Head className="w-[150px]">IP Address</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {submissions.map((submission) => (
            <Table.Row key={submission.id}>
              <Table.Cell>
                {submission.contact ? (
                  <Link
                    href={`/w/contacts/${submission.contact.id}`}
                    className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                  >
                    {submission.contact.email}
                  </Link>
                ) : (
                  <span className="text-kb-content-tertiary">Anonymous</span>
                )}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  variant={getStatusBadgeVariant(submission.status)}
                  size="sm"
                >
                  {getStatusLabel(submission.status)}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <span
                  className="text-sm text-kb-content-secondary"
                  title={dayjs(submission.createdAt).format(
                    "MMM D, YYYY h:mm A"
                  )}
                >
                  {dayjs(submission.createdAt).fromNow()}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-sm text-kb-content-secondary font-mono">
                  {submission.ipAddress || "-"}
                </span>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
