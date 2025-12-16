"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { Refresh } from "iconoir-react";
import { useRouter } from "next/navigation";

import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface VerifyDomainButtonProps {
  domainId: string;
  isFullyVerified: boolean;
}

export function VerifyDomainButton({
  domainId,
  isFullyVerified,
}: VerifyDomainButtonProps) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await internalApi.domains().verify(domainId);
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

  return (
    <Button
      onClick={() => verifyMutation.mutate()}
      loading={verifyMutation.isPending}
      disabled={isFullyVerified || verifyMutation.isPending}
    >
      <Refresh className="w-4 h-4" />
      Verify Records
    </Button>
  );
}
