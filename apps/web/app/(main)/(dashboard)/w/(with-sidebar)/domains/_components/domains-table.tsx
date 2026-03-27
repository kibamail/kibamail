"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as Popover from "@kibamail/owly/popover";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import { Check, MoreHoriz, NavArrowDown, Refresh, Trash, Xmark } from "iconoir-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { DomainListItem } from "@/app/(main)/(dashboard)/w/(with-sidebar)/domains/page";
import { useDomainsPolling } from "@/hooks/use-domain-polling";
import { useMutation } from "@/hooks/use-mutation";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import type { SslStatus } from "./ssl-status-badge";

function DomainActionsDropdown({ domain }: { domain: DomainListItem }) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const deleteDialogState = useToggleState();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().verify(domain.id);
    },
    onSuccess: (data) => {
      const allVerified =
        data.verification.allVerified && data.verification.mx?.configured;
      if (allVerified) {
        toast("All DNS records verified successfully!");
      } else {
        const verified = [
          data.verification.dkim.configured,
          data.verification.returnPath.configured,
          data.verification.tracking.configured,
          data.verification.dmarc.configured,
          data.verification.mx?.configured,
        ].filter(Boolean).length;
        toast(`${verified}/5 DNS records verified`);
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

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <Badge variant={verified ? "success" : "neutral"} size="sm">
      {verified ? <Check className="w-3 h-3" /> : <Xmark className="w-3 h-3" />}
      {verified ? "Verified" : "Pending"}
    </Badge>
  );
}

function SslBadge({ status }: { status: SslStatus | null }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="success" size="sm">
          <Check className="w-3 h-3" />
          Secured
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="info" size="sm">
          <Refresh className="w-3 h-3 animate-spin" />
          Securing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="neutral" size="sm">
          <Refresh className="w-3 h-3" />
          Queued
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="error" size="sm">
          <Xmark className="w-3 h-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          <Xmark className="w-3 h-3" />
          Pending
        </Badge>
      );
  }
}

function getSslStatusVerified(status: SslStatus | null): boolean {
  return status === "completed";
}

function StatusDropdown({ domain }: { domain: DomainListItem }) {
  const dkimVerified = Boolean(domain.dkimVerifiedAt);
  const returnPathVerified = Boolean(domain.returnPathDomainVerifiedAt);
  const trackingVerified = Boolean(domain.trackingDomainVerifiedAt);
  const dmarcVerified = Boolean(domain.dmarcVerifiedAt);
  const inboxMxVerified = Boolean(domain.inboxMxVerifiedAt);
  const sslStatus = domain.sslIssuanceStatus as SslStatus;
  const sslVerified = getSslStatusVerified(sslStatus);

  const requiredChecks = [dkimVerified, returnPathVerified, trackingVerified, sslVerified];
  if (domain.dmarcEnabled) requiredChecks.push(dmarcVerified);
  if (domain.inboxEnabled) requiredChecks.push(inboxMxVerified);

  const totalRequired = requiredChecks.length;
  const verifiedCount = requiredChecks.filter(Boolean).length;
  const allVerified = verifiedCount === totalRequired;

  const statuses = [
    { label: "DKIM", verified: dkimVerified, enabled: true },
    { label: "Return Path", verified: returnPathVerified, enabled: true },
    { label: "Tracking", verified: trackingVerified, enabled: true },
    { label: "DMARC", verified: dmarcVerified, enabled: domain.dmarcEnabled },
    { label: "MX (Inbox)", verified: inboxMxVerified, enabled: domain.inboxEnabled },
  ];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-left"
        >
          <Badge variant={allVerified ? "success" : "warning"} size="sm">
            {allVerified ? "Ready to send" : `${verifiedCount}/${totalRequired} verified`}
          </Badge>
          <NavArrowDown className="w-3.5 h-3.5 text-kb-content-tertiary" />
        </button>
      </Popover.Trigger>
      <Popover.Content align="start" className="w-64 p-0">
        <div className="py-2">
          {statuses.map((status) => (
            <div
              key={status.label}
              className={`flex items-center justify-between px-3 py-2 ${!status.enabled ? "opacity-30" : ""}`}
            >
              <span className="text-sm text-kb-content-secondary">
                {status.label}
              </span>
              <VerificationBadge verified={status.verified} />
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-kb-content-secondary">SSL</span>
            <SslBadge status={sslStatus} />
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export function DomainsTable({
  domains: initialDomains,
}: {
  domains: DomainListItem[];
}) {
  // Poll for domains that have SSL issuance in progress
  const { data: polledData } = useDomainsPolling({
    initialDomains,
  });

  // Merge polled data with initial data
  const domains = useMemo(() => {
    if (!polledData?.data) {
      return initialDomains;
    }

    // Create a map of polled domains by ID
    const polledMap = new Map(polledData.data.map((d) => [d.id, d]));

    // Update initial domains with polled data where available
    return initialDomains.map((domain) => {
      const polled = polledMap.get(domain.id);
      if (polled) {
        return {
          ...domain,
          sslIssuanceStatus: polled.sslStatus,
          sslIssuanceError: polled.sslError,
        };
      }
      return domain;
    });
  }, [initialDomains, polledData]);

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
            <Table.Head className="w-[180px]">Status</Table.Head>
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
                <StatusDropdown domain={domain} />
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
