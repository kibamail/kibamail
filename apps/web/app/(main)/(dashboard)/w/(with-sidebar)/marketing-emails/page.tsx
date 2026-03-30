import {
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import Link from "next/link";

import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

async function getMarketingEmails(workspaceId: string) {
  return prisma.email.findMany({
    where: {
      workspaceId,
      type: { not: "TRANSACTIONAL" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      subject: true,
      type: true,
      createdAt: true,
    },
  });
}

export default async function MarketingEmailsPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const emails = await getMarketingEmails(session.currentOrganization.id);

  return (
    <div className="w-full">
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Marketing Emails" />
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="flex w-full flex-col gap-4">
        {emails.length === 0 ? (
          <EmptyCard.Root>
            <EmptyCard.Title>No marketing emails yet</EmptyCard.Title>
            <EmptyCard.Description>
              Marketing emails can be created via the API or CLI. They will
              appear here once created.
            </EmptyCard.Description>
          </EmptyCard.Root>
        ) : (
          <Table.Container>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Subject</Table.Head>
                  <Table.Head className="w-[140px]">Type</Table.Head>
                  <Table.Head className="w-[180px]">Created</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {emails.map((email) => (
                  <Table.Row key={email.id}>
                    <Table.Cell>
                      <Link
                        href={`/w/marketing-emails/${email.id}`}
                        className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                      >
                        {email.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-kb-content-secondary">
                        {email.subject || "No subject"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-kb-content-secondary capitalize">
                        {email.type.toLowerCase()}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-kb-content-secondary">
                        {new Date(email.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.Container>
        )}
      </div>
    </div>
  );
}
