"use client";

import { Button } from "@kibamail/owly/button";
import { LetterAvatar } from "@kibamail/owly/letter-avatar";
import * as SettingsCard from "@kibamail/owly/settings-card";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { CloudUpload } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import { Image } from "@/lib/components/image";
import { useOrganization } from "@/lib/contexts/user-context";

export function WorkspaceProfileCard() {
  const router = useRouter();
  const organization = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState(organization?.name ?? "");
  const toast = useToast();

  const { mutate: saveChanges, isPending: isSaving } = useMutation({
    async mutationFn() {
      if (!organization) return;

      const updateData: Record<string, string> = {};

      if (workspaceName !== organization.name) {
        updateData.name = workspaceName;
      }

      if (pendingLogoUrl) {
        updateData.logoUrl = pendingLogoUrl;
      }

      await internalApi.workspaces().update(organization.id, updateData);
    },
    onSuccess() {
      toast.success("Workspace updated successfully.");

      // Clear pending changes
      setPendingLogoUrl(null);

      // Refresh to update session
      router.refresh();
    },
  });

  if (!organization) {
    return null;
  }

  const workspaceId = organization.id;
  const currentAvatar =
    pendingLogoUrl ?? organization.branding?.logoUrl ?? null;
  const hasChanges =
    pendingLogoUrl !== null || workspaceName !== organization.name;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.",
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB. Please upload a smaller image.");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to S3 only, don't update Logto yet
      const result = await internalApi
        .workspaces()
        .updateLogo(workspaceId, file);

      // Store the pending logo URL
      setPendingLogoUrl(result.data.logoUrl);
    } catch (error) {
      console.error("Failed to upload logo:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload logo. Please try again.",
      );
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <h3 className="text-lg font-semibold text-kb-content-primary">
            Workspace profile
          </h3>
          <p className="text-sm text-kb-content-secondary mt-1">
            Update your workspace name and avatar
          </p>
        </div>
      </SettingsCard.Header>

      <SettingsCard.Content>
        <div className="space-y-6">
          {/* Workspace Avatar */}
          <div className="space-y-2">
            <label
              htmlFor="workspace-avatar"
              className="text-sm font-medium text-kb-content-secondary"
            >
              Workspace avatar
            </label>
            <div className="flex items-center gap-4 mt-2">
              {currentAvatar ? (
                <div className="w-12 h-12 rounded-md overflow-hidden relative">
                  <Image
                    src={currentAvatar}
                    alt="Workspace avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <LetterAvatar size="sm">{workspaceName}</LetterAvatar>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <CloudUpload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Update image"}
              </Button>
            </div>
          </div>

          {/* Workspace Name */}
          <div className="max-w-md">
            <TextField.Root
              id="workspace-name"
              name="workspace-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
            >
              <TextField.Label>Workspace name</TextField.Label>
            </TextField.Root>
          </div>
        </div>
      </SettingsCard.Content>

      <SettingsCard.Footer>
        <div className="w-full flex items-center justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => saveChanges()}
            disabled={!hasChanges || isSaving}
            loading={isSaving}
          >
            Save changes
          </Button>
        </div>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
}
