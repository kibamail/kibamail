/**
 * API Keys Settings Page
 *
 * Manage API keys for workspace authentication to the public API.
 * Users can create, view, and delete API keys with granular scopes.
 */

import { getSession } from "@/lib/auth/get-session";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { ApiKeysTable } from "./_components/api-keys-table";
import { SearchInput } from "@/app/(dashboard)/w/(with-sidebar)/_components/search-input";

interface ApiKeysPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ApiKeysPage({ searchParams }: ApiKeysPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const search = params.search;

  const workspaceId = session.currentOrganization?.id as string;

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      workspaceId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { keyPreview: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPreview: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const canManageApiKeys = hasPermission(session, "manage:api-keys");

  return (
    <div className="w-full">
      <div className="mb-4">
        <SearchInput />
      </div>

      <ApiKeysTable
        apiKeys={apiKeys.map((key) => ({
          ...key,
          scopes: (key.scopes as string[]) || [],
        }))}
        canManage={canManageApiKeys}
      />
    </div>
  );
}
