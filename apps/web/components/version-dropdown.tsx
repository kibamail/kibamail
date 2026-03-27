"use client";

import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { useToast } from "@kibamail/owly/toast";
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

export interface VersionItem {
  id: string;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  createdAt: Date;
}

interface VersionDropdownProps {
  currentId: string;
  currentVersion: number;
  currentStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  rootId: string;
  versions: VersionItem[];
  isLiveVersion: boolean;
  basePath: string;
  pathSuffix?: string;
  queryKey: string;
  onCreateVersion: (rootId: string) => Promise<{ id: string }>;
  onPublish: (id: string) => Promise<unknown>;
}

function getStatusIcon(status: string, isLive: boolean) {
  if (isLive) return <Flash className="w-3.5 h-3.5 text-emerald-500" />;

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

function getStatusLabel(status: string, isLive: boolean) {
  if (isLive) return "Live";

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

function getStatusBadgeClasses(status: string, isLive: boolean) {
  if (isLive) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";

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

export function VersionDropdown({
  currentId,
  currentVersion,
  currentStatus,
  rootId,
  versions,
  isLiveVersion,
  basePath,
  pathSuffix = "",
  queryKey,
  onCreateVersion,
  onPublish,
}: VersionDropdownProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success: toast, error: toastError } = useToast();

  const hasDraft = versions.some((v) => v.status === "DRAFT");

  const createVersionMutation = useMutation({
    mutationFn: () => onCreateVersion(rootId),
    onSuccess: (newVersion) => {
      toast("New draft created");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      router.push(`${basePath}/${newVersion.id}${pathSuffix}`);
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to create new draft");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => onPublish(currentId),
    onSuccess: () => {
      toast("Version is now live");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      router.refresh();
    },
    onError: (error: Error) => {
      toastError(error.message || "Failed to set version as live");
    },
  });

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
          const isCurrent = version.id === currentId;
          const isVersionLive =
            version.status === "PUBLISHED" ||
            (version.status === "DRAFT" && versions.length === 1);

          return (
            <DropdownMenu.Item
              key={version.id}
              onClick={() => {
                if (version.id !== currentId) {
                  router.push(`${basePath}/${version.id}${pathSuffix}`);
                }
              }}
            >
              <span className="flex items-center gap-2">
                {getStatusIcon(version.status, isVersionLive)}
                <span>Version {version.version}</span>
              </span>
              <span className="flex items-center gap-2 ml-auto">
                <span
                  className={`text-xs ${isVersionLive ? "text-emerald-600" : "text-kb-content-tertiary"}`}
                >
                  {getStatusLabel(version.status, isVersionLive)}
                </span>
                {isCurrent && (
                  <Check className="w-4 h-4 text-kb-content-primary" />
                )}
              </span>
            </DropdownMenu.Item>
          );
        })}

        {(!hasDraft || currentStatus === "ARCHIVED") && (
          <>
            <DropdownMenu.Separator />

            {!hasDraft && (
              <DropdownMenu.Item
                onClick={() => createVersionMutation.mutate()}
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

            {currentStatus === "ARCHIVED" && (
              <DropdownMenu.Item
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Flash className="w-4 h-4" />
                <span>
                  {publishMutation.isPending ? "Setting..." : "Set as Live"}
                </span>
              </DropdownMenu.Item>
            )}
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
