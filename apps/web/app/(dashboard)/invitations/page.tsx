/**
 * Organization Invitations Page
 *
 * Displays a list of pending organization invitations for the current user.
 * Users can view and accept invitations to join workspaces.
 */

import { logto, LogtoWorkspace } from "@/auth/logto";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

import { Button, Heading } from "@kibamail/owly";
import { Invitations } from "./_components/invitations";
import Image from "next/image";
import { ArrowRight } from "iconoir-react";
import { InvitationCard } from "./_components/invitation-card";
export default async function InvitationsPage() {
  const ctx = await getSession();

  const invitations = await prisma.invitation.findMany({
    where: {
      inviteeEmail: ctx.user?.email as string,
    },
  });

  if (invitations.length === 0) {
    return redirect("/w");
  }

  const workspaces = await Promise.allSettled(
    invitations.map((invite) => logto.workspaces().get(invite.workspaceId)),
  );

  const knownWorkspaces: Record<string, LogtoWorkspace> = {};

  for (const workspace of workspaces) {
    if (workspace.status === "fulfilled" && workspace.value) {
      knownWorkspaces[workspace.value.id] = workspace.value;
    }
  }

  if (Object.keys(knownWorkspaces).length === 0) {
    return redirect("/w");
  }

  return (
    <div className="w-screen h-screen  bg-kb-bg-brand p-6 md:px-0 pt-24">
      {/* <Invitations /> */}

      <div className="w-full mb-8 flex justify-center">
        <Image
          src="/assets/logo-full-light.png"
          alt="Logo"
          width={200}
          height={50}
          priority
        />
      </div>
      <div className="w-full max-w-[32rem] bg-kb-bg-secondary mx-auto h-fit rounded-md border border-kb-border-tertiary shadow-sm">
        <div className="w-full border border-transparent p-6">
          <h1 className="mb-8 text-xl font-semibold font-heading text-kb-bg-brand">
            You've been invited
          </h1>
          <div className="grid grid-cols-1 gap-3">
            {invitations.map((invite) => {
              const workspace = knownWorkspaces[invite.workspaceId];
              return (
                <InvitationCard
                  key={invite.id}
                  invitation={invite}
                  workspace={workspace}
                />
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 w-full flex justify-end">
          <Button size="sm" variant="tertiary" className="underline">
            Continue to dashboard <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
