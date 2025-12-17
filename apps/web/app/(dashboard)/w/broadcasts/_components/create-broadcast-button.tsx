"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { CreateBroadcastModal } from "./create-broadcast-modal";

interface SenderIdentity {
  id: string;
  name: string;
  email: string;
  localPart: string;
  domain: string;
  domainId: string;
  verified: boolean;
}

interface Domain {
  id: string;
  name: string;
}

interface CreateBroadcastButtonProps {
  senderIdentities: SenderIdentity[];
  domains: Domain[];
}

export function CreateBroadcastButton({
  senderIdentities,
  domains,
}: CreateBroadcastButtonProps) {
  const modalState = useToggleState();

  return (
    <>
      <Button onClick={() => modalState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Create Broadcast
      </Button>
      <CreateBroadcastModal
        {...modalState}
        senderIdentities={senderIdentities}
        domains={domains}
      />
    </>
  );
}
