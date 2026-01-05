"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@kibamail/owly/toast";
import { useDomainPolling } from "@/hooks/use-domain-polling";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import {
  SslInfoSection,
  type SslStatus,
} from "../../_components/ssl-status-badge";

interface SslStatusSectionProps {
  domainId: string;
  initialStatus: SslStatus;
  initialError: string | null;
  trackingVerified: boolean;
}

export function SslStatusSection({
  domainId,
  initialStatus,
  initialError,
  trackingVerified,
}: SslStatusSectionProps) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();

  // Poll for updates when SSL issuance is in progress
  const { data } = useDomainPolling({
    domainId,
    enabled: trackingVerified,
  });

  // Use polled data if available, otherwise fall back to initial
  const status = (data?.sslStatus ?? initialStatus) as SslStatus;
  const error = data?.sslError ?? initialError;

  const retrySslMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().retrySsl(domainId);
    },
    onSuccess: () => {
      toast("SSL certificate issuance queued");
      router.refresh();
    },
    onError: (err) => {
      toastError(err.message || "Failed to retry SSL issuance");
    },
  });

  const handleRetry = useCallback(() => {
    retrySslMutation.mutate();
  }, [retrySslMutation]);

  // Don't show the section if tracking DNS isn't verified yet
  if (!trackingVerified) {
    return null;
  }

  return (
    <div className="mt-8">
      <SslInfoSection
        status={status}
        error={error}
        onRetry={status === "failed" ? handleRetry : undefined}
        isRetrying={retrySslMutation.isPending}
      />
    </div>
  );
}
