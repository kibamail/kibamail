"use client";

import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import dayjs from "dayjs";
import { EditPencil, MoreHoriz, Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreateSenderIdentityModal,
  type VerifiedDomain,
} from "@/components/create-sender-identity-modal";
import { EditSenderIdentityModal } from "@/components/edit-sender-identity-modal";
import type { TransformedSenderIdentity } from "@/components/sender-select";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface SenderIdentityActionsDropdownProps {
  identity: TransformedSenderIdentity;
  onEdit: () => void;
  onDelete: () => void;
}

function SenderIdentityActionsDropdown({
  identity,
  onEdit,
  onDelete,
}: SenderIdentityActionsDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <MoreHoriz className="w-4 h-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="w-48">
        <DropdownMenu.Item onClick={onEdit}>
          <EditPencil className="w-4 h-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="text-kb-content-error" onClick={onDelete}>
          <Trash className="w-4 h-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

interface SenderIdentitiesTableProps {
  senderIdentities: TransformedSenderIdentity[];
  domainId: string;
  domainName: string;
  domainVerified: boolean;
}

export function SenderIdentitiesTable({
  senderIdentities: initialIdentities,
  domainId,
  domainName,
  domainVerified,
}: SenderIdentitiesTableProps) {
  const [identities, setIdentities] =
    useState<TransformedSenderIdentity[]>(initialIdentities);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIdentity, setSelectedIdentity] =
    useState<TransformedSenderIdentity | null>(null);

  const deleteDialogState = useToggleState();
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();

  const verifiedDomains: VerifiedDomain[] = domainVerified
    ? [{ id: domainId, name: domainName }]
    : [];

  const deleteMutation = useMutation({
    mutationFn: async (identityId: string) => {
      return internalApi.senderIdentities().delete(identityId);
    },
    onSuccess: () => {
      toast("Sender identity deleted");
      if (selectedIdentity) {
        setIdentities((prev) => prev.filter((i) => i.id !== selectedIdentity.id));
      }
      deleteDialogState.onOpenChange?.(false);
      setSelectedIdentity(null);
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete sender identity");
    },
  });

  function onIdentityCreated(identity: TransformedSenderIdentity) {
    setIdentities((prev) => [identity, ...prev]);
    router.refresh();
  }

  function onIdentityUpdated(identity: TransformedSenderIdentity) {
    setIdentities((prev) =>
      prev.map((i) => (i.id === identity.id ? identity : i)),
    );
    router.refresh();
  }

  function onEditClick(identity: TransformedSenderIdentity) {
    setSelectedIdentity(identity);
    setEditModalOpen(true);
  }

  function onDeleteClick(identity: TransformedSenderIdentity) {
    setSelectedIdentity(identity);
    deleteDialogState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    if (selectedIdentity) {
      deleteMutation.mutate(selectedIdentity.id);
    }
  }

  if (identities.length === 0) {
    return (
      <>
        <EmptyCard.Root>
          <EmptyCard.Title>No sender identities yet</EmptyCard.Title>
          <EmptyCard.Description>
            {domainVerified
              ? "Create a sender identity to start sending emails from this domain."
              : "Verify your domain first, then create sender identities to send emails."}
          </EmptyCard.Description>
          <EmptyCard.Action>
            <Button
              onClick={() => setCreateModalOpen(true)}
              disabled={!domainVerified}
            >
              Add Sender Identity
            </Button>
          </EmptyCard.Action>
        </EmptyCard.Root>

        <CreateSenderIdentityModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          domains={verifiedDomains}
          onSuccess={onIdentityCreated}
          defaultDomainId={domainId}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-kb-content-primary">
            Sender Identities
          </h2>
          <p className="text-sm text-kb-content-secondary">
            {identities.length} sender{identities.length === 1 ? "" : "s"} for{" "}
            {domainName}
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          disabled={!domainVerified}
        >
          Add Sender Identity
        </Button>
      </div>

      <Table.Container>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Email</Table.Head>
              <Table.Head>Reply-To</Table.Head>
              <Table.Head className="w-[140px]">Created</Table.Head>
              <Table.Head className="w-[80px]">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {identities.map((identity) => (
              <Table.Row key={identity.id}>
                <Table.Cell>
                  <span className="font-medium">{identity.name}</span>
                </Table.Cell>
                <Table.Cell>{identity.email}</Table.Cell>
                <Table.Cell>
                  <span className="text-kb-content-tertiary">
                    {identity.replyToEmail || "—"}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  {identity.createdAt
                    ? dayjs(identity.createdAt).format("MMM D, YYYY")
                    : "—"}
                </Table.Cell>
                <Table.Cell>
                  <SenderIdentityActionsDropdown
                    identity={identity}
                    onEdit={() => onEditClick(identity)}
                    onDelete={() => onDeleteClick(identity)}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.Container>

      <CreateSenderIdentityModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        domains={verifiedDomains}
        onSuccess={onIdentityCreated}
        defaultDomainId={domainId}
      />

      <EditSenderIdentityModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        identity={selectedIdentity}
        onSuccess={onIdentityUpdated}
      />

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete sender identity"
        description={
          selectedIdentity
            ? `Are you sure you want to delete "${selectedIdentity.name}" (${selectedIdentity.email})? This action cannot be undone.`
            : ""
        }
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: onConfirmDelete,
          loading: deleteMutation.isPending,
          disabled: deleteMutation.isPending,
        }}
      />
    </>
  );
}
