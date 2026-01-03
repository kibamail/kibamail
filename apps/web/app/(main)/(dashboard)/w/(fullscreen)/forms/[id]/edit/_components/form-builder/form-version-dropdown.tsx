"use client";

import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
import type { FormStatus } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  Clock,
  EditPencil,
  Flash,
  NavArrowDown,
  Plus,
} from "iconoir-react";
import { useRouter } from "next/navigation";
import { internalApi } from "@/lib/api/client";

export interface FormVersionItem {
  id: string;
  version: number;
  status: FormStatus;
  publishedAt: Date | null;
  createdAt: Date;
}

interface FormVersionDropdownProps {
  currentFormId: string;
  currentVersion: number;
  currentStatus: FormStatus;
  rootFormId: string;
  versions: FormVersionItem[];
  isLiveVersion: boolean;
}

function getStatusIcon(status: FormStatus, isLive: boolean) {
  if (isLive) {
    return <Flash className="w-3.5 h-3.5 text-emerald-500" />;
  }
  switch (status) {
    case "DRAFT":
      return <EditPencil className="w-3.5 h-3.5 text-kb-content-tertiary" />;
    case "PUBLISHED":
      return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case "ARCHIVED":
      return <Archive className="w-3.5 h-3.5 text-kb-content-tertiary" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-kb-content-tertiary" />;
  }
}

function getStatusLabel(status: FormStatus, isLive: boolean) {
  if (isLive) {
    return "Live";
  }
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

function getStatusBadgeClasses(status: FormStatus, isLive: boolean) {
  if (isLive) {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  }
  switch (status) {
    case "DRAFT":
      return "bg-kb-surface-tertiary text-kb-content-secondary border-kb-border-tertiary";
    case "PUBLISHED":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "ARCHIVED":
      return "bg-kb-surface-tertiary text-kb-content-tertiary border-kb-border-tertiary";
    default:
      return "bg-kb-surface-tertiary text-kb-content-secondary border-kb-border-tertiary";
  }
}

export function FormVersionDropdown({
  currentFormId,
  currentVersion,
  currentStatus,
  rootFormId,
  versions,
  isLiveVersion,
}: FormVersionDropdownProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success: toast, error: toastError } = useToast();

  const hasDraft = versions.some((v) => v.status === "DRAFT");

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      return internalApi.forms().createVersion(rootFormId);
    },
    onSuccess: (newVersion) => {
      toast("New draft created");
      queryClient.invalidateQueries({ queryKey: ["form"] });
      router.push(`/w/forms/${newVersion.id}/edit`);
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to create new draft");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return internalApi.forms().publish(currentFormId);
    },
    onSuccess: () => {
      toast("Version is now live");
      queryClient.invalidateQueries({ queryKey: ["form"] });
      router.refresh();
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to set version as live");
    },
  });

  function onVersionSelect(versionId: string) {
    if (versionId !== currentFormId) {
      router.push(`/w/forms/${versionId}/edit`);
    }
  }

  function onCreateDraft() {
    createVersionMutation.mutate();
  }

  function onSetAsLive() {
    publishMutation.mutate();
  }

  const canSetAsLive = currentStatus === "ARCHIVED";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-kb-surface-secondary transition-colors"
        >
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(currentStatus, isLiveVersion)}`}
          >
            {getStatusIcon(currentStatus, isLiveVersion)}v{currentVersion} -{" "}
            {getStatusLabel(currentStatus, isLiveVersion)}
          </span>
          <NavArrowDown className="w-4 h-4 text-kb-content-tertiary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start" className="w-56">
        <div className="px-2 py-1.5 text-kb-content-tertiary text-xs font-normal">
          Versions
        </div>

        {versions.map((version) => {
          const isCurrentVersion = version.id === currentFormId;
          const isVersionLive =
            version.status === "PUBLISHED" ||
            (version.status === "DRAFT" && versions.length === 1);

          return (
            <DropdownMenu.Item
              key={version.id}
              onClick={() => onVersionSelect(version.id)}
            >
              <span className="flex items-center gap-2">
                {getStatusIcon(version.status, isVersionLive)}
                <span>Version {version.version}</span>
              </span>
              <span className="flex items-center gap-2 ml-auto">
                <span
                  className={`text-xs ${
                    isVersionLive
                      ? "text-emerald-600"
                      : "text-kb-content-tertiary"
                  }`}
                >
                  {getStatusLabel(version.status, isVersionLive)}
                </span>
                {isCurrentVersion && (
                  <Check className="w-4 h-4 text-kb-content-primary" />
                )}
              </span>
            </DropdownMenu.Item>
          );
        })}

        <DropdownMenu.Separator />

        {!hasDraft && (
          <DropdownMenu.Item
            onClick={onCreateDraft}
            disabled={createVersionMutation.isPending}
          >
            <Plus className="w-4 h-4" />
            <span>
              {createVersionMutation.isPending
                ? "Creating..."
                : "Create New Draft"}
            </span>
          </DropdownMenu.Item>
        )}

        {canSetAsLive && (
          <DropdownMenu.Item
            onClick={onSetAsLive}
            disabled={publishMutation.isPending}
          >
            <Flash className="w-4 h-4" />
            <span>
              {publishMutation.isPending ? "Setting..." : "Set as Live"}
            </span>
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
