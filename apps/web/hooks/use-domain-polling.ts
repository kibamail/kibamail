/**
 * Domain Polling Hook
 *
 * Provides automatic polling for domain data when SSL certificate
 * issuance is pending or in progress.
 */

import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";
import type { SendingDomainResponse } from "@/app/(main)/api/v1/domains/schema";

const POLLING_INTERVAL = 3000; // 3 seconds

type SslStatus = "pending" | "in_progress" | "completed" | "failed" | null;

/**
 * Check if a domain needs polling based on SSL status
 */
function needsPolling(sslStatus: SslStatus): boolean {
  return sslStatus === "pending" || sslStatus === "in_progress";
}

interface UseDomainPollingOptions {
  domainId: string;
  initialData?: SendingDomainResponse;
  enabled?: boolean;
  interval?: number;
}

/**
 * Hook for polling a single domain's status
 *
 * Automatically polls when SSL status is "pending" or "in_progress"
 * and stops when status changes to "completed" or "failed"
 */
export function useDomainPolling({
  domainId,
  initialData,
  enabled = true,
  interval = POLLING_INTERVAL,
}: UseDomainPollingOptions) {
  return useQuery({
    queryKey: ["domain", domainId],
    queryFn: () => internalApi.domains().get(domainId),
    initialData,
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.sslStatus;
      if (needsPolling(status ?? null)) {
        return interval;
      }
      return false;
    },
    // Don't refetch on window focus during polling
    refetchOnWindowFocus: (query) => {
      const status = query.state.data?.sslStatus;
      return !needsPolling(status ?? null);
    },
  });
}

interface DomainListItem {
  id: string;
  sslIssuanceStatus: string | null;
  [key: string]: unknown;
}

interface UseDomainsPollingOptions<T extends DomainListItem> {
  initialDomains: T[];
  enabled?: boolean;
  interval?: number;
}

/**
 * Hook for polling a list of domains
 *
 * Automatically polls when any domain has SSL status "pending" or "in_progress"
 * and stops when all domains are "completed", "failed", or null
 */
export function useDomainsPolling<T extends DomainListItem>({
  initialDomains,
  enabled = true,
  interval = POLLING_INTERVAL,
}: UseDomainsPollingOptions<T>) {
  // Check if any domain needs polling
  const anyNeedsPolling = initialDomains.some((d) =>
    needsPolling(d.sslIssuanceStatus as SslStatus)
  );

  return useQuery({
    queryKey: ["domains-list"],
    queryFn: () => internalApi.domains().list(),
    enabled: enabled && anyNeedsPolling,
    refetchInterval: (query) => {
      const domains = query.state.data?.data ?? [];
      const stillNeedsPolling = domains.some((d) =>
        needsPolling(d.sslStatus ?? null)
      );
      if (stillNeedsPolling) {
        return interval;
      }
      return false;
    },
    // Don't refetch on window focus during polling
    refetchOnWindowFocus: false,
  });
}
