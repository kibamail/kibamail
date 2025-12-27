"use client";

import { Button } from "@kibamail/owly/button";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import { MoreHoriz, Xmark } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface Invitation {
  id: string;
  invitee: string;
}

interface InvitationActionsDropdownProps {
  invitation: Invitation;
}

export function InvitationActionsDropdown({
  invitation,
}: InvitationActionsDropdownProps) {
  const router = useRouter();
  const toast = useToast();

  const cancelMutation = useMutation({
    async mutationFn(invitationId: string) {
      const t = toast.loading("Cancelling invitation...");
      await internalApi.workspaces().invitations().cancel(invitationId);
      toast.dismiss(t);
    },
    onSuccess: () => {
      toast.success("Invitation cancelled successfully");
      router.refresh();
    },
  });

  const handleCancelClick = () => {
    cancelMutation.mutate(invitation.id);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item
          className="text-kb-content-negative"
          onClick={handleCancelClick}
          disabled={cancelMutation.isPending}
        >
          <Xmark className="w-4 h-4" />
          Cancel invitation
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
