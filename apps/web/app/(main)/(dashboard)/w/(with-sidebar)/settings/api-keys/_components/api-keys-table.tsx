"use client";

import { Badge } from "@kibamail/owly/badge";
import { Button } from "@kibamail/owly/button";
import { ConfirmDialog } from "@kibamail/owly/dialog";
import * as EmptyCard from "@kibamail/owly/empty-card";
import * as HoverCard from "@kibamail/owly/hover-card";
import * as Table from "@kibamail/owly/table";
import { useToast } from "@kibamail/owly/toast";
import { formatDistanceToNow } from "date-fns";
import { Trash } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import { CreateApiKeyButton } from "./create-api-key-button";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  canManage: boolean;
}

export function ApiKeysTable({ apiKeys, canManage }: ApiKeysTableProps) {
  const router = useRouter();
  const { success } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (apiKeyId: string) => internalApi.apiKeys().delete(apiKeyId),
    onSuccess: () => {
      success("API key deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedApiKey(null);
      router.refresh();
    },
  });

  function onDelete(apiKey: ApiKey) {
    setSelectedApiKey(apiKey);
    setDeleteDialogOpen(true);
  }

  function onConfirmDelete() {
    if (!selectedApiKey) {
      return;
    }

    deleteMutation.mutate(selectedApiKey.id);
  }

  function isDeleting(apiKeyId: string) {
    return deleteMutation.isPending && deleteMutation.variables === apiKeyId;
  }

  if (apiKeys.length === 0) {
    return (
      <EmptyCard.Root>
        <EmptyCard.Title>No api keys yet</EmptyCard.Title>
        <EmptyCard.Description>
          Create your first api key to authenticate api requests.
        </EmptyCard.Description>
        <EmptyCard.Action>
          <CreateApiKeyButton size="sm" />
        </EmptyCard.Action>
      </EmptyCard.Root>
    );
  }

  return (
    <>
      <Table.Container>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head className="min-w-[150px] lg:min-w-0">Name</Table.Head>
              <Table.Head>Key</Table.Head>
              <Table.Head className="min-w-[220px] lg:min-w-0">
                Scopes
              </Table.Head>
              <Table.Head className="min-w-[220px] lg:min-w-0">
                Last Used
              </Table.Head>
              <Table.Head className="min-w-[180px] lg:min-w-0">
                Created
              </Table.Head>
              {canManage && (
                <Table.Head className="w-[100px]">Actions</Table.Head>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {apiKeys.map((apiKey) => (
              <Table.Row key={apiKey.id}>
                <Table.Cell className="font-medium">{apiKey.name}</Table.Cell>
                <Table.Cell>
                  <code className="text-xs bg-kb-bg-secondary px-2 py-1 rounded">
                    {apiKey.keyPreview}
                  </code>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.scopes.slice(0, 3).map((scope) => (
                      <Badge key={scope} variant="neutral" size="sm">
                        {scope}
                      </Badge>
                    ))}
                    {apiKey.scopes.length > 3 && (
                      <HoverCard.Root openDelay={150}>
                        <HoverCard.Trigger asChild>
                          <span className="text-xs text-kb-text-secondary cursor-help">
                            +{apiKey.scopes.length - 3} more
                          </span>
                        </HoverCard.Trigger>
                        <HoverCard.Portal>
                          <HoverCard.Content
                            side="bottom"
                            align="start"
                            className="z-50 w-36! min-w-0! max-h-48 overflow-y-auto"
                          >
                            <div className="flex flex-col gap-1">
                              {apiKey.scopes.map((scope) => (
                                <Badge key={scope} variant="neutral" size="sm">
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </HoverCard.Content>
                        </HoverCard.Portal>
                      </HoverCard.Root>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-sm text-kb-text-secondary">
                  {apiKey.lastUsedAt
                    ? formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                        addSuffix: true,
                      })
                    : "Never"}
                </Table.Cell>
                <Table.Cell className="text-sm text-kb-text-secondary">
                  {formatDistanceToNow(new Date(apiKey.createdAt), {
                    addSuffix: true,
                  })}
                </Table.Cell>
                {canManage && (
                  <Table.Cell>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDelete(apiKey)}
                      disabled={deleteMutation.isPending}
                      loading={isDeleting(apiKey.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.Container>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirm delete api key"
        description={
          selectedApiKey
            ? `Any applications using this key will lose access.`
            : ""
        }
        confirmText={selectedApiKey?.name?.toUpperCase()}
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: onConfirmDelete,
          loading: deleteMutation.isPending,
          disabled: deleteMutation.isPending,
        }}
        cancel={{
          variant: "secondary",
          children: "Cancel",
          disabled: deleteMutation.isPending,
        }}
      />
    </>
  );
}
