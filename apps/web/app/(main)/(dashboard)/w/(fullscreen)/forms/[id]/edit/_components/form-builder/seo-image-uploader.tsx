"use client";

import { Button } from "@kibamail/owly/button";
import { useToast } from "@kibamail/owly/toast";
import { CloudUpload, Trash } from "iconoir-react";
import { useRef, useState } from "react";
import { internalApi } from "@/lib/api/client";

interface SeoImageUploaderProps {
  formId: string;
  currentImage: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  uploadEndpoint: "seo-image" | "favicon";
  accept: string;
  maxSize: number;
  previewSize?: "default" | "small";
}

export function SeoImageUploader({
  formId,
  currentImage,
  onUploadComplete,
  onRemove,
  uploadEndpoint,
  accept,
  maxSize,
  previewSize = "default",
}: SeoImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const toast = useToast();

  const maxSizeLabel =
    maxSize >= 1024 * 1024
      ? `${maxSize / 1024 / 1024}MB`
      : `${maxSize / 1024}KB`;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed types: ${accept}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File size exceeds maximum allowed size of ${maxSizeLabel}`);
      return;
    }

    setIsUploading(true);

    try {
      const result = await internalApi
        .forms()
        .uploadSeoAsset(formId, uploadEndpoint, file);

      onUploadComplete(result.url);
      toast.success(
        uploadEndpoint === "seo-image"
          ? "SEO image uploaded successfully"
          : "Favicon uploaded successfully",
      );
    } catch (error) {
      console.error(`Failed to upload ${uploadEndpoint}:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to upload. Please try again.`,
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    setIsRemoving(true);

    try {
      await internalApi.forms().deleteSeoAsset(formId, uploadEndpoint);
      onRemove();
      toast.success(
        uploadEndpoint === "seo-image"
          ? "SEO image removed"
          : "Favicon removed",
      );
    } catch (error) {
      console.error(`Failed to remove ${uploadEndpoint}:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to remove. Please try again.`,
      );
    } finally {
      setIsRemoving(false);
    }
  }

  const previewClasses =
    previewSize === "small"
      ? "w-8 h-8 rounded border border-kb-border-primary bg-kb-bg-secondary"
      : "w-full aspect-[1200/630] rounded-lg bg-kb-bg-secondary";

  return (
    <div className="space-y-3">
      {currentImage && (
        <div className="w-full">
          <div className={`${previewClasses} overflow-hidden`}>
            <img
              src={currentImage}
              alt={
                uploadEndpoint === "seo-image" ? "SEO preview" : "Favicon preview"
              }
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isRemoving}
        >
          <CloudUpload className="w-4 h-4" />
          {isUploading ? "Uploading..." : currentImage ? "Replace" : "Upload"}
        </Button>
        {currentImage && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={handleRemove}
            disabled={isUploading || isRemoving}
          >
            <Trash className="w-4 h-4" />
            {isRemoving ? "Removing..." : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}
