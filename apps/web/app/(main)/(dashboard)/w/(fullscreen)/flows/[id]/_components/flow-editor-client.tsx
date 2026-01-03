"use client";

import { Badge, Button, Heading } from "@kibamail/owly";
import * as SelectField from "@kibamail/owly/select-field";
import type { Edge, Node } from "@xyflow/react";
import { Check, EditPencil, SendDiagonal, Undo, Xmark } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlowCanvas } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/canvas/flow";
import { FlowComposerSidebar } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-composer-sidebar";
import {
  FlowEditorProvider,
  useFlowEditor,
} from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/flow-editor-context";
import { PublishAutomationModal } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/publish-automation-modal";
import { RenameAutomationModal } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_components/rename-automation-modal";
import { useFlowAutoSave } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/_hooks/use-flow-auto-save";
import { useFlowStore } from "@/app/(main)/(dashboard)/w/(fullscreen)/flows/[id]/state/flow-store";
import type { AutomationResponse } from "@/app/(main)/api/v1/automations/schema";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface FlowEditorClientProps {
  automation: AutomationResponse;
  allVersions: AutomationResponse[];
  rootId: string;
}

function FlowEditorContent({
  automation,
  allVersions,
  rootId,
}: FlowEditorClientProps) {
  const { saveStatus, hasUnsavedChanges } = useFlowEditor();
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const router = useRouter();
  const initializeFromAutomation = useFlowStore(
    (state) => state.initializeFromAutomation,
  );

  const rollbackMutation = useMutation({
    mutationFn: () => internalApi.automations().rollback(automation.id),
    onSuccess: () => {
      router.refresh();
    },
  });

  useEffect(() => {
    if (automation.nodes && automation.edges) {
      initializeFromAutomation(
        automation.nodes as Node[],
        automation.edges as Edge[],
      );
    }
  }, [automation.nodes, automation.edges, initializeFromAutomation]);

  useFlowAutoSave();

  function onVersionChange(versionNumber: string) {
    const version = parseInt(versionNumber, 10);
    const selectedVersion = allVersions.find((v) => v.version === version);

    if (!selectedVersion) return;

    const isDraft = selectedVersion.status === "DRAFT";
    const url = isDraft
      ? `/w/flows/${rootId}`
      : `/w/flows/${rootId}?version=${version}`;

    router.push(url);
  }

  const getStatusBadge = () => {
    if (saveStatus === "saving") {
      return (
        <Badge variant="neutral" className="animate-pulse">
          Saving...
        </Badge>
      );
    }
    if (saveStatus === "success") {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <Check className="w-3 h-3" />
          Saved
        </Badge>
      );
    }
    if (saveStatus === "error") {
      return <Badge variant="error">Save failed</Badge>;
    }
    if (hasUnsavedChanges) {
      return <Badge variant="warning">Unsaved changes</Badge>;
    }

    if (automation.status === "DRAFT") {
      return <Badge variant="neutral">Draft</Badge>;
    }
    if (automation.status === "PUBLISHED") {
      return <Badge variant="success">Published</Badge>;
    }
    if (automation.status === "ARCHIVED") {
      return <Badge variant="warning">Archived</Badge>;
    }

    return null;
  };

  const getVersionLabel = (version: AutomationResponse) => {
    const statusLabel =
      version.status === "PUBLISHED"
        ? " (Live)"
        : version.status === "DRAFT"
          ? " (Draft)"
          : "";
    return `v${version.version}${statusLabel}`;
  };

  const rootAutomation = allVersions.find((v) => v.id === rootId);
  const automationName = rootAutomation?.name || automation.name;

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2">
      <div className="h-[60px] w-full flex items-center justify-between px-3 shrink-0 bg-kb-bg-layout">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <a href="/w/automations">
              <Xmark className="w-6! h-6!" />
            </a>
          </Button>

          <Heading
            size="xs"
            className="mb-0 flex items-center text-kb-content-tertiary shrink-0"
          >
            {automationName}

            <Button
              variant="tertiary"
              size="sm"
              className="ml-2"
              onClick={() => setIsRenameModalOpen(true)}
            >
              <EditPencil className="kb-content-tertiary" />
            </Button>
          </Heading>

          {/* Version Switcher */}
          {allVersions.length > 1 && (
            <SelectField.Root
              value={automation.version.toString()}
              onValueChange={onVersionChange}
              size="sm"
            >
              <SelectField.Trigger
                className="min-w-[140px]!"
                placeholder="Select version"
              />
              <SelectField.Content className="min-w-[140px]!">
                {allVersions.map((version) => (
                  <SelectField.Item
                    key={version.id}
                    value={version.version.toString()}
                  >
                    {getVersionLabel(version)}
                  </SelectField.Item>
                ))}
              </SelectField.Content>
            </SelectField.Root>
          )}
        </div>

        <div className="flex items-center gap-4">
          {getStatusBadge()}
          {automation.status === "ARCHIVED" && (
            <Button
              variant="secondary"
              onClick={() => rollbackMutation.mutate()}
              disabled={rollbackMutation.isPending}
            >
              <Undo className="w-4 h-4 mr-2" />
              {rollbackMutation.isPending
                ? "Rolling back..."
                : "Rollback to this version"}
            </Button>
          )}
          <Button
            disabled={automation.status !== "DRAFT"}
            onClick={() => setIsPublishModalOpen(true)}
          >
            <SendDiagonal className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <PublishAutomationModal
        open={isPublishModalOpen}
        onOpenChange={setIsPublishModalOpen}
      />

      <RenameAutomationModal
        open={isRenameModalOpen}
        onOpenChange={setIsRenameModalOpen}
        automationId={rootId}
        currentName={automationName}
      />

      <div className="grow border border-kb-border-tertiary rounded-lg flex max-w-full">
        <div className="grow h-[calc(100vh-67px)] overflow-hidden">
          <FlowCanvas />
        </div>
        <FlowComposerSidebar />
      </div>
    </div>
  );
}

export function FlowEditorClient({
  automation,
  allVersions,
  rootId,
}: FlowEditorClientProps) {
  return (
    <FlowEditorProvider
      automationId={automation.id}
      initialAutomation={automation}
    >
      <FlowEditorContent
        automation={automation}
        allVersions={allVersions}
        rootId={rootId}
      />
    </FlowEditorProvider>
  );
}
