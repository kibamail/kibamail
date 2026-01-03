"use client";

import { Button } from "@kibamail/owly/button";
import { Plus } from "iconoir-react";
import { useRouter } from "next/navigation";
import {
  CreateDomainModal,
  type CreatedDomain,
} from "@/components/create-domain-modal";
import { useToggleState } from "@/hooks/utils/useToggleState";

export function CreateDomainButton() {
  const router = useRouter();
  const toggleState = useToggleState();

  function onSuccess(domain: CreatedDomain) {
    router.push(`/w/domains/${domain.id}`);
  }

  return (
    <>
      <Button onClick={() => toggleState.onOpenChange?.(true)}>
        <Plus className="w-4 h-4" />
        Add Domain
      </Button>
      <CreateDomainModal
        open={toggleState.open}
        onOpenChange={toggleState.onOpenChange}
        onSuccess={onSuccess}
      />
    </>
  );
}
