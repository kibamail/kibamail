import * as Tabs from "@kibamail/owly/tabs";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { TopicsTable } from "./_components/topics-table";

async function getTopics(workspaceId: string) {
  const topics = await prisma.topic.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          contacts: {
            where: {
              status: "SUBSCRIBED",
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return topics.map((topic) => ({
    ...topic,
    subscriberCount: topic._count.contacts,
  }));
}

export default async function TopicsPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const topics = await getTopics(session.currentOrganization.id);

  return (
    <Tabs.Content value="topics" className="py-4">
      <TopicsTable topics={topics} />
    </Tabs.Content>
  );
}
