"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import { Check, MoreHoriz, Refresh, Trash, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

import type { DomainListItem } from "@/app/(main)/(dashboard)/w/(with-sidebar)/domains/page";

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant={verified ? "success" : "neutral"} size="sm">
      {verified ? <Check className="w-3 h-3" /> : <Xmark className="w-3 h-3" />}
      {verified ? "Verified" : "Pending"}
    </Badge>
  );
}

function DomainActionsDropdown({ domain }: { domain: DomainListItem }) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const deleteDialogState = useToggleState();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().verify(domain.id);
    },
    onSuccess: (data) => {
      if (data.verification.allVerified) {
        toast("All DNS records verified successfully!");
      } else {
        const verified = [
          data.verification.dkim.configured,
          data.verification.returnPath.configured,
          data.verification.tracking.configured,
        ].filter(Boolean).length;
        toast(`${verified}/3 DNS records verified`);
      }
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to verify DNS records");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().delete(domain.id);
    },
    onSuccess: () => {
      toast("Domain deleted successfully");
      deleteDialogState.onOpenChange?.(false);
      router.refresh();
    },
    onError: (error) => {
      toastError(error.message || "Failed to delete domain");
    },
  });

  function onVerify() {
    verifyMutation.mutate();
  }

  function onDelete() {
    deleteDialogState.onOpenChange?.(true);
  }

  function onConfirmDelete() {
    deleteMutation.mutate();
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm">
            <MoreHoriz className="w-4 h-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="w-48">
          <DropdownMenu.Item
            onClick={onVerify}
            disabled={verifyMutation.isPending}
          >
            <Refresh className="w-4 h-4" />
            Verify DNS
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="text-kb-content-error"
            onClick={onDelete}
          >
            <Trash className="w-4 h-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfirmDialog
        {...deleteDialogState}
        title="Delete sending domain"
        description={`Are you sure you want to delete "${domain.name}"? This action cannot be undone and will remove all DNS configuration for this domain.`}
        confirmText={domain.name}
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

function OverallStatus({ domain }: { domain: DomainListItem }) {
  const dkimVerified = domain.dkimVerifiedAt !== null;
  const returnPathVerified = domain.returnPathDomainVerifiedAt !== null;
  const trackingVerified = domain.trackingDomainVerifiedAt !== null;
  const allVerified = dkimVerified && returnPathVerified && trackingVerified;

  if (allVerified) {
    return (
      <Badge variant="success" size="sm">
        Ready to send
      </Badge>
    );
  }

  const verifiedCount = [
    dkimVerified,
    returnPathVerified,
    trackingVerified,
  ].filter(Boolean).length;

  return (
    <Badge variant="warning" size="sm">
      {verifiedCount}/3 verified
    </Badge>
  );
}

export function DomainsTable({ domains }: { domains: DomainListItem[] }) {
  if (domains.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No sending domains yet</EmptyCard.Title>
        <EmptyCard.Description>
          Add a sending domain to start sending emails from your own domain.
        </EmptyCard.Description>
      </EmptyCard.Root>
    );
  }

  return (
    <Table.Container>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Domain</Table.Head>
            <Table.Head className="w-[140px]">Status</Table.Head>
            <Table.Head className="w-[120px]">DKIM</Table.Head>
            <Table.Head className="w-[120px]">Return Path</Table.Head>
            <Table.Head className="w-[120px]">Tracking</Table.Head>
            <Table.Head className="w-[80px]">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {domains.map((domain) => (
            <Table.Row key={domain.id}>
              <Table.Cell>
                <Link
                  href={`/w/domains/${domain.id}`}
                  className="font-medium underline underline-offset-4 cursor-pointer hover:text-kb-content-tertiary transition ease-linear"
                >
                  {domain.name}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <OverallStatus domain={domain} />
              </Table.Cell>
              <Table.Cell>
                <VerificationBadge verified={domain.dkimVerifiedAt !== null} />
              </Table.Cell>
              <Table.Cell>
                <VerificationBadge
                  verified={domain.returnPathDomainVerifiedAt !== null}
                />
              </Table.Cell>
              <Table.Cell>
                <VerificationBadge
                  verified={domain.trackingDomainVerifiedAt !== null}
                />
              </Table.Cell>
              <Table.Cell>
                <DomainActionsDropdown domain={domain} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.Container>
  );
}
