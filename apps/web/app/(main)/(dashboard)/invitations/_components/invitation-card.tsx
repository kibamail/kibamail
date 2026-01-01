"use client";

import { Button } from "@kibamail/owly/button";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import type { LogtoWorkspace } from "@/auth/logto";

interface InvitationCardProps {
  invitation: {
    id: string;
    workspaceId: string;
  };
  workspace: LogtoWorkspace;
}

export function InvitationCard({ invitation, workspace }: InvitationCardProps) {
  const router = useRouter();

  const acceptMutation = useMutation({
    mutationFn() {
      return internalApi.invitations().update(invitation.id, {
        status: "Accepted",
      });
    },
    onSuccess() {
      router.push("/w");
      router.refresh();
    },
  });

  const rejectMutation = useMutation({
    mutationFn() {
      return internalApi.invitations().update(invitation.id, {
        status: "Revoked",
      });
    },
    onSuccess() {
      router.refresh();
    },
  });

  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="w-full border border-kb-border-tertiary px-4 p-2 rounded-md flex items-center justify-between">
      <p className="text-sm">{workspace?.name}</p>

      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => rejectMutation.mutate()}
          disabled={isPending}
          loading={rejectMutation.isPending}
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={() => acceptMutation.mutate()}
          disabled={isPending}
          loading={acceptMutation.isPending}
        >
          Join workspace
        </Button>
      </div>
    </div>
  );
}
