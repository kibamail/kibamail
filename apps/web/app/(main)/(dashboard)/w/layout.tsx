import type { PropsWithChildren } from "react";
import { createDefaultWorkspaceAction } from "@/app/(main)/(auth)/actions/create-default-workspace";
import { getSession } from "@/lib/auth/get-session";
import { UserProvider } from "@/lib/contexts/user-context";
import { QueryProvider } from "@/lib/providers/query-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  let session = await getSession();

  if (!session.currentOrganization) {
    await createDefaultWorkspaceAction();
    session = await getSession();
  }

  return (
    <QueryProvider>
      <UserProvider session={session}>{children}</UserProvider>
    </QueryProvider>
  );
}
