"use client";

import * as Alert from "@kibamail/owly/alert";
import { Button } from "@kibamail/owly/button";
import { Checkbox } from "@kibamail/owly/checkbox";
import * as Dialog from "@kibamail/owly/dialog";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { WarningCircle } from "iconoir-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import {
  API_SCOPES_BY_CATEGORY,
  API_KEY_PRESETS,
  API_SCOPES,
} from "@/config/api";
import { ApiKeyCreatedModal } from "./api-key-created-modal";
import type { ToggleState } from "@/hooks/utils/useToggleState";

interface CreateApiKeyFormData {
  name: string;
  scopes: string[];
}

export function CreateApiKeyModal({ open, onOpenChange }: ToggleState) {
  const router = useRouter();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("none");

  const { success: toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyFormData>({
    defaultValues: {
      name: "",
      scopes: [],
    },
  });

  const selectedScopes = watch("scopes");
  const hasAllScopes =
    selectedScopes?.length === API_SCOPES.length && selectedScopes.length > 0;

  function onPresetChange(presetName: string) {
    setSelectedPreset(presetName);
    const preset = API_KEY_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setValue("scopes", preset.scopes);
    }
  }

  const createMutation = useMutation({
    mutationFn(data: CreateApiKeyFormData) {
      return internalApi.apiKeys().create(data);
    },
    onSuccess(data) {
      setCreatedKey(data.key);
      setShowSuccessModal(true);
      onOpenChange?.(false);
      router.refresh();

      toast("Api key created successfully.");
    },
  });

  function onToggleScope(scope: string) {
    const currentScopes = selectedScopes || [];
    if (currentScopes.includes(scope)) {
      setValue(
        "scopes",
        currentScopes.filter((s) => s !== scope)
      );
    } else {
      setValue("scopes", [...currentScopes, scope]);
    }
  }

  function handleClose() {
    reset();
    setSelectedPreset("none");
    onOpenChange?.(false);
  }

  function onSuccessModalClose() {
    setShowSuccessModal(false);
    setCreatedKey(null);
  }

  function onSubmit(data: CreateApiKeyFormData) {
    if (!data.scopes || data.scopes.length === 0) {
      return;
    }

    createMutation.mutate(data);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleClose}>
        <Dialog.Content className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Dialog.Header>
              <Dialog.Title>Create API Key</Dialog.Title>
              <Dialog.Description>
                Create a new API key with specific scopes for programmatic
                access.
              </Dialog.Description>
            </Dialog.Header>

            <div className="space-y-6 py-4 px-6">
              <TextField.Root
                id="name"
                placeholder="Zapier integration"
                {...register("name", {
                  required: "Name is required",
                  maxLength: {
                    value: 100,
                    message: "Name is too long",
                  },
                })}
              >
                <TextField.Label>Name</TextField.Label>
                {errors.name && (
                  <TextField.Error>{errors.name.message}</TextField.Error>
                )}
              </TextField.Root>

              <div className="space-y-2">
                <Select.Root
                  value={selectedPreset}
                  onValueChange={onPresetChange}
                >
                  <Select.Label>Preset</Select.Label>
                  <Select.Trigger placeholder="Select a preset" />
                  <Select.Content className="z-50">
                    {API_KEY_PRESETS.map((preset) => (
                      <Select.Item key={preset.name} value={preset.name}>
                        {preset.displayName}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className="space-y-4">
                {Object.entries(API_SCOPES_BY_CATEGORY).map(
                  ([category, scopes]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-medium">{category}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {scopes.map((scope) => (
                          <div
                            key={scope.name}
                            className="flex items-center gap-3"
                          >
                            <Checkbox
                              id={`scope-${scope.name}`}
                              checked={
                                selectedScopes?.includes(scope.name) || false
                              }
                              onCheckedChange={() => onToggleScope(scope.name)}
                            />
                            <label
                              htmlFor={`scope-${scope.name}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {scope.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
              {errors.scopes && (
                <p className="text-sm text-kb-content-negative">
                  {errors.scopes.message}
                </p>
              )}

              {hasAllScopes && (
                <Alert.Root variant="warning">
                  <Alert.Icon>
                    <WarningCircle />
                  </Alert.Icon>
                  <Alert.Title>
                    This api key will have 100% full access to all resources and
                    operations.
                  </Alert.Title>
                </Alert.Root>
              )}
            </div>

            <Dialog.Footer className="flex items-center justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                loading={createMutation.isPending}
              >
                Create API Key
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {createdKey && (
        <ApiKeyCreatedModal
          open={showSuccessModal}
          onOpenChange={onSuccessModalClose}
          apiKey={createdKey}
        />
      )}
    </>
  );
}
