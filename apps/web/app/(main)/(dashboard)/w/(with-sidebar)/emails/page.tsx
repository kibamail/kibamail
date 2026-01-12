import { Badge, Text } from "@kibamail/owly";
import {
  DashboardLayoutContentHeader,
  DashboardLayoutStickyContentHeaderContainer,
} from "@kibamail/owly/dashboard-layout";
import type { EventType, Prisma, TransactionalEmailStatus } from "@prisma/client";
import {
  StatsCard,
  StatsCardItem,
} from "@/app/(main)/(dashboard)/w/(with-sidebar)/_components/stats-card";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

import { EmailsPagination } from "./_components/emails-pagination";
import { EmailsPolling } from "./_components/emails-polling";
import { EmailsSearch } from "./_components/emails-search";
import { EmailsStatusFilter } from "./_components/emails-status-filter";
import { EmailsTable, type EmailListItem } from "./_components/emails-table";

const PAGE_SIZE = 10;

async function getTransactionalEmails(
  workspaceId: string,
  search?: string,
  status?: TransactionalEmailStatus,
  after?: string,
  before?: string
): Promise<{ emails: EmailListItem[]; hasMore: boolean }> {
  const where: Prisma.TransactionalEmailWhereInput = { workspaceId };

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { toEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const baseQuery = {
    where,
    orderBy: before
      ? ({ createdAt: "asc" } as const)
      : ({ createdAt: "desc" } as const),
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      sendingId: true,
      fromEmail: true,
      fromName: true,
      toEmail: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  };

  const emails = after
    ? await prisma.transactionalEmail.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
    ? await prisma.transactionalEmail.findMany({
        ...baseQuery,
        cursor: { id: before },
        skip: 1,
      })
    : await prisma.transactionalEmail.findMany(baseQuery);

  const hasMore = emails.length > PAGE_SIZE;
  const items = hasMore ? emails.slice(0, -1) : emails;

  if (before) {
    items.reverse();
  }

  // Fetch latest event for each email
  const sendingIds = items.map((e) => e.sendingId);
  const latestEvents = await getLatestEventsForEmails(sendingIds);

  const formattedEmails: EmailListItem[] = items.map((email) => ({
    id: email.id,
    sendingId: email.sendingId,
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toEmail: email.toEmail,
    subject: email.subject,
    status: email.status,
    latestEventType: latestEvents.get(email.sendingId) || null,
    createdAt: email.createdAt,
  }));

  return { emails: formattedEmails, hasMore };
}

async function getLatestEventsForEmails(
  sendingIds: string[]
): Promise<Map<string, EventType>> {
  if (sendingIds.length === 0) {
    return new Map();
  }

  // Get the latest event for each sendingId using a raw query for efficiency
  const latestEvents = await prisma.$queryRaw<
    Array<{ sendingId: string; type: EventType }>
  >`
    SELECT DISTINCT ON ("sendingId") "sendingId", "type"
    FROM "events"
    WHERE "sendingId" = ANY(${sendingIds})
    ORDER BY "sendingId", "createdAt" DESC
  `;

  const eventMap = new Map<string, EventType>();
  for (const event of latestEvents) {
    eventMap.set(event.sendingId, event.type);
  }

  return eventMap;
}

async function getEmailStats(workspaceId: string) {
  const [total, delivered, bounced, opened] = await Promise.all([
    prisma.transactionalEmail.count({ where: { workspaceId } }),
    prisma.transactionalEmail.count({
      where: { workspaceId, status: "DELIVERED" },
    }),
    prisma.transactionalEmail.count({
      where: { workspaceId, status: "BOUNCED" },
    }),
    prisma.transactionalEmail.count({
      where: { workspaceId, openCount: { gt: 0 } },
    }),
  ]);

  const deliveredPercentage =
    total > 0 ? Math.round((delivered / total) * 100) : 0;
  const bouncedPercentage = total > 0 ? Math.round((bounced / total) * 100) : 0;
  const openedPercentage = total > 0 ? Math.round((opened / total) * 100) : 0;

  return {
    total,
    delivered,
    deliveredPercentage,
    bounced,
    bouncedPercentage,
    opened,
    openedPercentage,
  };
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: TransactionalEmailStatus;
    after?: string;
    before?: string;
  }>;
}) {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const params = await searchParams;
  const search = params.search;
  const status = params.status;
  const after = params.after;
  const before = params.before;

  const [{ emails, hasMore: fetchedExtra }, stats] = await Promise.all([
    getTransactionalEmails(
      session.currentOrganization.id,
      search,
      status,
      after,
      before
    ),
    getEmailStats(session.currentOrganization.id),
  ]);

  // Determine pagination flags based on navigation direction
  // - When navigating backwards (before): fetchedExtra tells us if there's a previous page,
  //   and we know there's a next page because we came from it
  // - When navigating forwards (after): we know there's a previous page because we came from it,
  //   and fetchedExtra tells us if there's a next page
  // - When on first page (no cursor): no previous page, fetchedExtra tells us if there's a next page
  let hasMore: boolean;
  let hasPrevious: boolean;

  if (before) {
    hasPrevious = fetchedExtra;
    hasMore = true;
  } else if (after) {
    hasPrevious = true;
    hasMore = fetchedExtra;
  } else {
    hasPrevious = false;
    hasMore = fetchedExtra;
  }

  return (
    <div className="w-full">
      <EmailsPolling />
      <DashboardLayoutStickyContentHeaderContainer>
        <DashboardLayoutContentHeader title="Emails" />
      </DashboardLayoutStickyContentHeaderContainer>

      <div className="py-4 space-y-6">
        <StatsCard>
          <StatsCardItem>
            <Text className="text-kb-content-tertiary">Total Sent</Text>
            <div className="flex items-center justify-between">
              <Text
                size="xl"
                className="text-kb-content-primary text-6xl font-bold!"
              >
                {stats.total.toLocaleString()}
              </Text>
            </div>
          </StatsCardItem>
          <StatsCardItem>
            <Text className="text-kb-content-tertiary">Delivered</Text>
            <div className="flex items-center justify-between">
              <Text
                size="xl"
                className="text-kb-content-primary text-6xl font-bold!"
              >
                {stats.delivered.toLocaleString()}
              </Text>
              <Badge variant="success" size="sm">
                {stats.deliveredPercentage}%
              </Badge>
            </div>
          </StatsCardItem>
          <StatsCardItem>
            <Text className="text-kb-content-tertiary">Bounced</Text>
            <div className="flex items-center justify-between">
              <Text
                size="xl"
                className="text-kb-content-primary text-6xl font-bold!"
              >
                {stats.bounced.toLocaleString()}
              </Text>
              <Badge variant="error" size="sm">
                {stats.bouncedPercentage}%
              </Badge>
            </div>
          </StatsCardItem>
          <StatsCardItem>
            <Text className="text-kb-content-tertiary">Opened</Text>
            <div className="flex items-center justify-between">
              <Text
                size="xl"
                className="text-kb-content-primary text-6xl font-bold!"
              >
                {stats.opened.toLocaleString()}
              </Text>
              <Badge variant="info" size="sm">
                {stats.openedPercentage}%
              </Badge>
            </div>
          </StatsCardItem>
        </StatsCard>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <EmailsSearch />
            <EmailsStatusFilter />
          </div>
        </div>

        <EmailsTable emails={emails} />

        <EmailsPagination
          hasMore={hasMore}
          hasPrevious={hasPrevious}
          firstId={emails[0]?.id}
          lastId={emails[emails.length - 1]?.id}
          search={search}
          status={status}
        />
      </div>
    </div>
  );
}
