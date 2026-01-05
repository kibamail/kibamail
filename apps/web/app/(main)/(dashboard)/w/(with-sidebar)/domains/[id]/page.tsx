import {
  DashboardLayoutStickyContentHeaderContainer,
  DashboardLayoutStickyDetailHeader,
  DashboardLayoutStickyDetailHeaderDescription,
  DashboardLayoutStickyDetailHeaderTitle,
} from "@kibamail/owly/dashboard-layout";
import dayjs from "dayjs";
import { Globe } from "iconoir-react";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

import type { SslStatus } from "../_components/ssl-status-badge";
import { CopyableText } from "./_components/copyable-text";
import { DnsRecordsSection } from "./_components/dns-records-section";
import { DomainActionsDropdown } from "./_components/domain-actions-dropdown";
import { SslStatusSection } from "./_components/ssl-status-section";
import { TrackingToggle } from "./_components/tracking-toggle";
import { VerifyDomainButton } from "./_components/verify-domain-button";

interface DomainDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DomainDetailPage({
  params,
}: DomainDetailPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session.currentOrganization) {
    throw new Error("No active workspace found");
  }

  const workspaceId = session.currentOrganization.id;

  const domain = await prisma.sendingDomain.findFirst({
    where: {
      id,
      workspaceId,
    },
  });

  if (!domain) {
    notFound();
  }

  const isFullyVerified =
    domain.dkimVerifiedAt !== null &&
    domain.returnPathDomainVerifiedAt !== null &&
    domain.trackingDomainVerifiedAt !== null;

  const verifiedCount = [
    domain.dkimVerifiedAt !== null,
    domain.returnPathDomainVerifiedAt !== null,
    domain.trackingDomainVerifiedAt !== null,
  ].filter(Boolean).length;

  return (
    <DashboardLayoutStickyContentHeaderContainer className="mt-8">
      <DashboardLayoutStickyDetailHeader>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-kb-background-secondary flex items-center justify-center">
            <Globe className="w-7 h-7 text-kb-content-tertiary" />
          </div>

          <div className="flex flex-col flex-1">
            <DashboardLayoutStickyDetailHeaderDescription>
              Sending Domain
            </DashboardLayoutStickyDetailHeaderDescription>
            <DashboardLayoutStickyDetailHeaderTitle>
              {domain.name}
            </DashboardLayoutStickyDetailHeaderTitle>
          </div>

          <div className="flex items-center gap-3">
            <VerifyDomainButton
              domainId={domain.id}
              isFullyVerified={isFullyVerified}
            />
            <DomainActionsDropdown
              domainId={domain.id}
              domainName={domain.name}
            />
          </div>
        </div>
      </DashboardLayoutStickyDetailHeader>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div>
          <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
            Status
          </div>
          <div className="text-sm text-kb-content-primary">
            {isFullyVerified ? "Ready to send" : `${verifiedCount}/3 verified`}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
            ID
          </div>
          <CopyableText text={domain.id} />
        </div>

        <div>
          <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
            Created
          </div>
          <div className="text-sm text-kb-content-primary">
            {dayjs(domain.createdAt).format("MMM D, YYYY h:mm A")}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
            Last Verified
          </div>
          <div className="text-sm text-kb-content-primary">
            {domain.recordsLastVerifiedAt
              ? dayjs(domain.recordsLastVerifiedAt).format("MMM D, YYYY h:mm A")
              : "Never"}
          </div>
        </div>

        <div>
          <TrackingToggle
            domainId={domain.id}
            field="openTrackingEnabled"
            initialValue={domain.openTrackingEnabled}
            label="Open Tracking"
            help="Track when recipients open your emails"
          />
        </div>

        <div>
          <TrackingToggle
            domainId={domain.id}
            field="clickTrackingEnabled"
            initialValue={domain.clickTrackingEnabled}
            label="Click Tracking"
            help="Track when recipients click links in your emails"
          />
        </div>
      </div>

      <DnsRecordsSection domain={domain} />

      <SslStatusSection
        domainId={domain.id}
        initialStatus={domain.sslIssuanceStatus as SslStatus}
        initialError={domain.sslIssuanceError}
        trackingVerified={domain.trackingDomainVerifiedAt !== null}
      />
    </DashboardLayoutStickyContentHeaderContainer>
  );
}
