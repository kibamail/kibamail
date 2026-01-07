"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { DomainActionsDropdown } from "./domain-actions-dropdown";
import { DomainTabsContainer } from "./domain-tabs-container";
import { VerifyDomainButton } from "./verify-domain-button";

interface DomainLayoutClientProps extends PropsWithChildren {
  domainId: string;
  domainName: string;
  isFullyVerified: boolean;
}

/**
 * Domain Layout Client
 *
 * Client component that renders domain layout with context-aware actions.
 */
export function DomainLayoutClient({
  domainId,
  domainName,
  isFullyVerified,
  children,
}: DomainLayoutClientProps) {
  const pathname = usePathname();
  const activeTab = pathname.includes("/senders") ? "senders" : "details";

  const headerActions = (
    <>
      {activeTab === "details" && (
        <>
          <VerifyDomainButton
            domainId={domainId}
            isFullyVerified={isFullyVerified}
          />
          <DomainActionsDropdown domainId={domainId} domainName={domainName} />
        </>
      )}
    </>
  );

  return (
    <DomainTabsContainer
      domainId={domainId}
      domainName={domainName}
      headerActions={headerActions}
    >
      {children}
    </DomainTabsContainer>
  );
}
