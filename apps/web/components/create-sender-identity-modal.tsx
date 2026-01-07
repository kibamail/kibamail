"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { Text } from "@kibamail/owly/text";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { NavArrowDown } from "iconoir-react";
import { useForm, Controller } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import type { TransformedSenderIdentity } from "./sender-select";

interface CreateSenderIdentityFormData {
  name: string;
  email: string;
  sendingDomainId: string;
}

export interface VerifiedDomain {
  id: string;
  name: string;
}

interface CreateSenderIdentityModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  domains: VerifiedDomain[];
  onSuccess?: (identity: TransformedSenderIdentity) => void;
  defaultDomainId?: string;
}

export function CreateSenderIdentityModal({
  open,
  onOpenChange,
  domains,
  onSuccess,
  defaultDomainId,
}: CreateSenderIdentityModalProps) {
  const { success: toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
    setError,
  } = useForm<CreateSenderIdentityFormData>({
    defaultValues: {
      name: "",
      email: "",
      sendingDomainId: defaultDomainId || domains[0]?.id || "",
    },
  });

  const selectedDomainId = watch("sendingDomainId");
  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  const mutation = useMutation({
    mutationFn: async (data: CreateSenderIdentityFormData) => {
      return await internalApi.senderIdentities().create({
        name: data.name,
        email: data.email,
        sendingDomainId: data.sendingDomainId,
      });
    },
    onSuccess: (data) => {
      toast("Sender identity created successfully");
      onClose();
      onSuccess?.(data as TransformedSenderIdentity);
    },
    setError,
  });

  function onClose() {
    reset({
      name: "",
      email: "",
      sendingDomainId: defaultDomainId || domains[0]?.id || "",
    });
    onOpenChange?.(false);
  }

  function onSubmit(data: CreateSenderIdentityFormData) {
    mutation.mutate(data);
  }

  const hasVerifiedDomains = domains.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Add Sender Identity</Dialog.Title>
            <Dialog.Description>
              Create a sender identity to use when sending emails. Choose a name
              and email address for this sender.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            {!hasVerifiedDomains ? (
              <Text size="sm" className="text-kb-content-secondary">
                You need to add and verify a sending domain before creating
                sender identities.
              </Text>
            ) : (
              <>
                <TextField.Root
                  id="name"
                  type="text"
                  placeholder="Sarah from Acme Corp"
                  {...register("name", {
                    required: "Name is required",
                    maxLength: {
                      value: 200,
                      message: "Name must be 200 characters or less",
                    },
                  })}
                >
                  <TextField.Label>Name</TextField.Label>
                  <TextField.Hint>
                    Display name shown in the &quot;From&quot; field
                  </TextField.Hint>
                  {errors.name && (
                    <TextField.Error>{errors.name.message}</TextField.Error>
                  )}
                </TextField.Root>

                <Controller
                  name="sendingDomainId"
                  control={control}
                  rules={{ required: "Domain is required" }}
                  render={({ field }) => (
                    <TextField.Root
                      id="email"
                      type="text"
                      placeholder="newsletter"
                      {...register("email", {
                        required: "Email is required",
                        maxLength: {
                          value: 64,
                          message: "Email must be 64 characters or less",
                        },
                        pattern: {
                          value: /^[a-zA-Z0-9._%+-]+$/,
                          message:
                            "Email can only contain letters, numbers, dots, underscores, percent, plus and hyphens",
                        },
                      })}
                    >
                      <TextField.Label>Email</TextField.Label>
                      <TextField.Slot side="right">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-sm text-kb-content-secondary hover:text-kb-content-primary transition-colors"
                            >
                              @{selectedDomain?.name || "select domain"}
                              <NavArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end" className="min-w-48">
                            {domains.map((domain) => (
                              <DropdownMenu.Item
                                key={domain.id}
                                onClick={() => field.onChange(domain.id)}
                              >
                                @{domain.name}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </TextField.Slot>
                      {errors.email && (
                        <TextField.Error>
                          {errors.email.message}
                        </TextField.Error>
                      )}
                      {errors.sendingDomainId && (
                        <TextField.Error>
                          {errors.sendingDomainId.message}
                        </TextField.Error>
                      )}
                    </TextField.Root>
                  )}
                />
              </>
            )}
          </div>

          <Dialog.Footer className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !hasVerifiedDomains}
              loading={mutation.isPending}
            >
              Create Sender
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
