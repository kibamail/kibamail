"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";

interface DoubleOptInPreviewProps {
  emailId: string;
  isActive: boolean;
}

export function DoubleOptInPreview({
  emailId,
  isActive,
}: DoubleOptInPreviewProps) {
  const hasLoadedOnce = useRef(false);

  const {
    data: preview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["email-preview", emailId],
    queryFn: () => internalApi.emails().preview(emailId),
    enabled: isActive,
  });

  useEffect(() => {
    if (isActive && hasLoadedOnce.current) {
      refetch();
    }
    if (isActive) {
      hasLoadedOnce.current = true;
    }
  }, [isActive, refetch]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-kb-border-tertiary border-t-kb-content-primary rounded-full animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <span className="text-kb-content-danger">Failed to load preview</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-kb-content-primary underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!preview?.hasContent) {
    return (
      <div className="h-full flex items-center justify-center text-kb-content-secondary">
        <div className="flex flex-col items-center gap-3">
          <span>No content to preview</span>
          <span className="text-sm">
            Add some content in the editor to see a preview
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-kb-surface-secondary overflow-auto">
      <iframe
        srcDoc={preview.html}
        title="Email Preview"
        className="w-full h-[2000px] border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
