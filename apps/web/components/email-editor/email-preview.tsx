"use client";

import { Text } from "@kibamail/owly/text";
import { useQuery } from "@tanstack/react-query";

interface EmailPreviewProps {
  entityId: string;
  isActive: boolean;
  onGetPreview?: () => Promise<{ html: string; hasContent: boolean }>;
}

export function EmailPreview({
  entityId,
  isActive,
  onGetPreview,
}: EmailPreviewProps) {
  const { data: preview, isLoading } = useQuery({
    queryKey: ["email-preview", entityId],
    queryFn: async () => {
      if (!onGetPreview) {
        return { html: "", hasContent: false };
      }
      return onGetPreview();
    },
    enabled: isActive && !!onGetPreview,
    refetchOnWindowFocus: false,
  });

  if (!onGetPreview) {
    return (
      <div className="h-full w-full bg-kb-surface-primary flex items-center justify-center">
        <Text className="text-kb-content-secondary">Preview not available</Text>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full bg-kb-surface-primary flex items-center justify-center">
        <Text className="text-kb-content-secondary">Loading preview...</Text>
      </div>
    );
  }

  if (!preview?.hasContent) {
    return (
      <div className="h-full w-full bg-kb-surface-primary flex items-center justify-center">
        <Text className="text-kb-content-secondary">
          Add content to see a preview
        </Text>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-kb-surface-secondary overflow-auto">
      <iframe
        srcDoc={preview.html}
        className="w-full h-full border-0"
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
