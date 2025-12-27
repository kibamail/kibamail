"use client";

import { Button } from "@kibamail/owly/button";
import * as SettingsCard from "@kibamail/owly/settings-card";

interface DeleteWorkspaceCardProps {
  workspaceName: string;
}

export function DeleteWorkspaceCard({
  workspaceName,
}: DeleteWorkspaceCardProps) {
  const onDeleteWorkspace = () => {
    // TODO: Implement delete workspace functionality
    console.log("Delete workspace");
  };

  return (
    <SettingsCard.Root>
      <SettingsCard.Header>
        <div>
          <h3 className="text-lg font-semibold text-kb-content-primary">
            Delete workspace
          </h3>
          <p className="text-sm text-kb-content-secondary mt-1">
            Permanently delete this workspace and all its data
          </p>
        </div>
      </SettingsCard.Header>

      <SettingsCard.Content>
        <p className="text-sm text-kb-content-secondary max-w-3xl py-6">
          Once you delete a workspace, there is no going back. This action will
          permanently delete the{" "}
          <span className="font-semibold">{workspaceName}</span> workspace, all
          team members will lose access, and all data associated with this
          workspace including API keys, webhooks, and settings will be
          permanently removed. Please be certain before proceeding.
        </p>
      </SettingsCard.Content>

      <SettingsCard.Footer>
        <div className="w-full flex items-center justify-end">
          <Button variant="destructive" size="sm" onClick={onDeleteWorkspace}>
            Delete workspace
          </Button>
        </div>
      </SettingsCard.Footer>
    </SettingsCard.Root>
  );
}
