import * as Tabs from "@kibamail/owly/tabs";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { PropertiesTable } from "./_components/properties-table";

async function getContactProperties(workspaceId: string) {
  const properties = await prisma.contactProperty.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return properties.map((property) => ({
    id: property.id,
    name: property.name,
    type: property.type,
    defaultValue: property.defaultValue,
  }));
}

export default async function PropertiesPage() {
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const properties = await getContactProperties(session.currentOrganization.id);

  return (
    <Tabs.Content value="properties" className="py-4">
      <PropertiesTable properties={properties} />
    </Tabs.Content>
  );
}
