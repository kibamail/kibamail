"use client";

import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly/text";
import { CloudUpload } from "iconoir-react";
import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@kibamail/owly/toast";
import { useFileUpload } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/hooks/use-file-upload";
import {
  SectionHeader,
  SectionDivider,
} from "@/components/email-editor/details-sections/shared";
import type { FormContent } from "./types";

interface UploadTabProps {
  formId: string;
  content: FormContent | null;
  readonly: boolean;
  onDeployed: () => void;
}

const ACCEPTED_EXTENSIONS = [
  ".html", ".css", ".js",
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
  ".mp4", ".webm",
  ".woff", ".woff2", ".ttf", ".otf",
  ".pdf", ".ico",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadTab({
  formId,
  content,
  readonly,
  onDeployed,
}: UploadTabProps) {
  const { success: toast } = useToast();

  const deployMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch(
        `/api/internal/v1/forms/${formId}/deploy`,
        { method: "POST", body: formData },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message ?? error.message ?? "Deploy failed",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      toast("Form deployed successfully");
      onDeployed();
    },
  });

  const { state, getRootProps, getDropzoneProps, getHiddenInputProps } =
    useFileUpload({
      onFileAccept: () => {
        const accepted = state.acceptedFiles;
        if (accepted.length > 0) {
          deployMutation.mutate(accepted);
        }
      },
      accept: ACCEPTED_EXTENSIONS,
      maxFiles: 50,
      isDisabled: readonly || deployMutation.isPending,
      allowDrop: !readonly && !deployMutation.isPending,
    });

  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <section>
          <SectionHeader
            title="Upload form"
            description={readonly
              ? "This form is published. Create a new version to upload changes."
              : "Upload your site bundle containing one HTML file and any CSS, JS, images, fonts, or video assets."}
          />

          <div {...(readonly ? {} : getRootProps())}>
            <div
              {...(readonly ? {} : getDropzoneProps())}
              className={`w-full h-72 rounded-3xl border border-dashed transition-[border,background] ease-in-out flex items-center justify-center flex-col ${
                readonly
                  ? "bg-kb-bg-disabled border-kb-border-tertiary cursor-not-allowed opacity-60"
                  : "bg-kb-bg-secondary border-kb-border-secondary data-dragging:border-kb-border-focus data-dragging:bg-kb-bg-info-subtle cursor-pointer hover:bg-kb-bg-tertiary"
              }`}
            >
                <CloudUpload className="w-8 h-8 text-kb-content-tertiary mb-2" />

                <Text size="lg" className="font-semibold">
                  {deployMutation.isPending
                    ? "Deploying..."
                    : "Drag and drop your files here"}
                </Text>

                {!deployMutation.isPending && (
                  <Button
                    variant="tertiary"
                    type="button"
                    className="text-kb-content-tertiary -mt-0.5"
                  >
                    or click here to select from your device
                  </Button>
                )}

                <Text size="sm" className="mt-2 text-kb-content-tertiary">
                  50MB max total upload size
                </Text>
              </div>

              {!readonly && state.rejectedFiles.length > 0 && (
                <Text className="mt-2 text-kb-content-error text-sm">
                  Some files were rejected. Accepted types: {ACCEPTED_EXTENSIONS.join(", ")}
                </Text>
              )}

              {!readonly && <input {...getHiddenInputProps()} />}
            </div>
          </section>

        {deployMutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <Text size="sm" className="text-red-700">
              {deployMutation.error.message}
            </Text>
          </div>
        )}

        {content && (
          <>
            <SectionDivider />

            <section>
              <SectionHeader title="Current deployment" />

              {content.files?.length > 0 ? (
                <div className="space-y-2">
                  {content.files.map((file) => (
                    <div key={file.name} className="flex items-center gap-2">
                      <pre className="text-sm font-mono">
                        <code>{file.name}</code>
                      </pre>
                      <div className="w-full grow h-px bg-kb-border-tertiary" />
                      <Text variant="tertiary" className="shrink-0">
                        {formatFileSize(file.size)}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text variant="tertiary">
                  HTML content deployed (no additional assets)
                </Text>
              )}
            </section>
          </>
        )}

        {!content && !readonly && (
          <div className="mt-8 text-center">
            <Text variant="tertiary">
              No content deployed yet. Upload your form files above.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
