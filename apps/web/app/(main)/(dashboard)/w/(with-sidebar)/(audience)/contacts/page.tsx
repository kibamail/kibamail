import { Badge, Text } from "@kibamail/owly";
import * as Tabs from "@kibamail/owly/tabs";
import type { ContactStatus, Prisma } from "@prisma/client";
import {
  StatsCard,
  StatsCardItem,
} from "@/app/(main)/(dashboard)/w/(with-sidebar)/_components/stats-card";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { getRedisClient } from "@/lib/storage/redis-client";
import { ContactColumnsManager } from "./_components/contact-columns-manager";
import { ContactStatusFilter } from "./_components/contact-status-filter";
import { ContactsPagination } from "./_components/contacts-pagination";
import { ContactsSearch } from "./_components/contacts-search";
import { ContactsTable } from "./_components/contacts-table";

const PAGE_SIZE = 50;

const DEFAULT_COLUMNS = [
  "email",
  "firstName",
  "lastName",
  "status",
  "subscribedAt",
];

async function getTablePreferences(userId: string) {
  const redis = getRedisClient();
  const key = `table-preferences:${userId}:contacts`;

  const config = await redis.get(key);

  if (!config) {
    return { columns: DEFAULT_COLUMNS };
  }

  return JSON.parse(config) as { columns: string[] };
}

async function getContacts(
  workspaceId: string,
  search?: string,
  status?: ContactStatus,
  after?: string,
  before?: string,
) {
  const where: Prisma.ContactWhereInput = { workspaceId };

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const contactProperties = await prisma.contactProperty.findMany({
    where: { workspaceId },
    select: { name: true, slot: true, type: true },
  });

  const baseQuery = {
    where,
    orderBy: before ? ({ id: "asc" } as const) : ({ id: "desc" } as const),
    take: PAGE_SIZE + 1, // Take one extra to check if there are more
  };

  const contacts = after
    ? await prisma.contact.findMany({
        ...baseQuery,
        cursor: { id: after },
        skip: 1,
      })
    : before
      ? await prisma.contact.findMany({
          ...baseQuery,
          cursor: { id: before },
          skip: 1,
        })
      : await prisma.contact.findMany(baseQuery);

  const hasMore = contacts.length > PAGE_SIZE;
  const items = hasMore ? contacts.slice(0, -1) : contacts;

  if (before) {
    items.reverse();
  }

  const formattedContacts = items.map((contact) => {
    const properties: Record<string, unknown> = {};
    for (const property of contactProperties) {
      const value = contact[property.slot as keyof typeof contact];
      if (value !== null && value !== undefined) {
        properties[property.name] = value;
      }
    }

    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      status: contact.status,
      subscribedAt: contact.subscribedAt,
      properties,
    };
  });

  return { contacts: formattedContacts, hasMore, contactProperties };
}

async function getContactStats(workspaceId: string) {
  const [total, subscribed, unsubscribed, bounced, complained] =
    await Promise.all([
      prisma.contact.count({ where: { workspaceId } }),
      prisma.contact.count({
        where: { workspaceId, status: "SUBSCRIBED" },
      }),
      prisma.contact.count({
        where: { workspaceId, status: "UNSUBSCRIBED" },
      }),
      prisma.contact.count({
        where: { workspaceId, status: "BOUNCED" },
      }),
      prisma.contact.count({
        where: { workspaceId, status: "COMPLAINED" },
      }),
    ]);

  const subscribedPercentage =
    total > 0 ? Math.round((subscribed / total) * 100) : 0;
  const unsubscribedPercentage =
    total > 0 ? Math.round((unsubscribed / total) * 100) : 0;
  const bouncedPercentage = total > 0 ? Math.round((bounced / total) * 100) : 0;

  return {
    total,
    subscribed,
    subscribedPercentage,
    unsubscribed,
    unsubscribedPercentage,
    bounced,
    bouncedPercentage,
    complained,
  };
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: ContactStatus;
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

  const [{ contacts, hasMore, contactProperties }, stats, preferences] =
    await Promise.all([
      getContacts(
        session.currentOrganization.id,
        search,
        status,
        after,
        before,
      ),
      getContactStats(session.currentOrganization.id),
      getTablePreferences(session.user.sub),
    ]);

  const hasPrevious = !!after || !!before;

  return (
    <Tabs.Content value="contacts" className="py-4 space-y-6">
      <StatsCard>
        <StatsCardItem>
          <Text className="text-kb-content-tertiary">Total Contacts</Text>
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
          <Text className="text-kb-content-tertiary">Subscribed</Text>
          <div className="flex items-center justify-between">
            <Text
              size="xl"
              className="text-kb-content-primary text-6xl font-bold!"
            >
              {stats.subscribed.toLocaleString()}
            </Text>

            <Badge variant="success" size="sm">
              {stats.subscribedPercentage}%
            </Badge>
          </div>
        </StatsCardItem>
        <StatsCardItem>
          <Text className="text-kb-content-tertiary">Unsubscribed</Text>
          <div className="flex items-center justify-between">
            <Text
              size="xl"
              className="text-kb-content-primary text-6xl font-bold!"
            >
              {stats.unsubscribed.toLocaleString()}
            </Text>

            <Badge variant="warning" size="sm">
              {stats.unsubscribedPercentage}%
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
      </StatsCard>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ContactsSearch />
          <ContactStatusFilter />
        </div>
        <ContactColumnsManager
          contactProperties={contactProperties}
          selectedColumns={preferences.columns}
        />
      </div>

      <ContactsTable
        contacts={contacts}
        selectedColumns={preferences.columns}
        contactProperties={contactProperties}
      />

      <ContactsPagination
        hasMore={hasMore}
        hasPrevious={hasPrevious}
        firstId={contacts[0]?.id}
        lastId={contacts[contacts.length - 1]?.id}
        search={search}
        status={status}
      />
    </Tabs.Content>
  );
}
