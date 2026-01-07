import dayjs from "dayjs";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";

import type { SslStatus } from "../_components/ssl-status-badge";
import { CopyableText } from "./_components/copyable-text";
import { DnsRecordsSection } from "./_components/dns-records-section";
import { SslStatusSection } from "./_components/ssl-status-section";
import { TrackingToggle } from "./_components/tracking-toggle";

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

  const dkimVerified = Boolean(domain.dkimVerifiedAt);
  const returnPathVerified = Boolean(domain.returnPathDomainVerifiedAt);
  const trackingVerified = Boolean(domain.trackingDomainVerifiedAt);
  const dmarcVerified = Boolean(domain.dmarcVerifiedAt);
  const inboxMxVerified = Boolean(domain.inboxMxVerifiedAt);

  const isFullyVerified =
    dkimVerified &&
    returnPathVerified &&
    trackingVerified &&
    dmarcVerified &&
    inboxMxVerified;

  const verifiedCount = [
    dkimVerified,
    returnPathVerified,
    trackingVerified,
    dmarcVerified,
    inboxMxVerified,
  ].filter(Boolean).length;

  return (
    <div className="py-6">
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div>
          <div className="text-xs font-medium text-kb-content-tertiary uppercase mb-2">
            Status
          </div>
          <div className="text-sm text-kb-content-primary">
            {isFullyVerified ? "Ready to send" : `${verifiedCount}/5 verified`}
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
    </div>
  );
}
