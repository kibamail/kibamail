"use client";

import * as Alert from "@kibamail/owly/alert";
import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as Popover from "@kibamail/owly/popover";
import * as Select from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import type { SendingDomain } from "@prisma/client";
import { WarningTriangle } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface TransformedSenderIdentity {
  id: string;
  name: string;
  email: string;
  localPart: string;
  domain: string;
  domainId: string;
  verified: boolean;
}

interface BroadcastFormData {
  name: string;
  senderIdentityId?: string;
  fromLocalPart?: string;
  fromDomainId?: string;
}

interface CreateBroadcastModalProps extends ToggleState {
  senderIdentities: TransformedSenderIdentity[];
  domains: Pick<SendingDomain, "id" | "name">[];
}

export function CreateBroadcastModal({
  open,
  onOpenChange,
  senderIdentities,
  domains,
}: CreateBroadcastModalProps) {
  const router = useRouter();
  const { success: toast } = useToast();
  const nameFieldId = useId();
  const fromLocalPartFieldId = useId();
  const [domainPopoverOpen, setDomainPopoverOpen] = useState(false);
  const [isAddingNewSender, setIsAddingNewSender] = useState(false);

  const hasSenderIdentities = senderIdentities.length > 0;
  const hasDomains = domains.length > 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BroadcastFormData>({
    defaultValues: {
      name: "",
      senderIdentityId: hasSenderIdentities
        ? senderIdentities[0]?.id
        : undefined,
      fromLocalPart: "",
      fromDomainId: hasDomains ? domains[0]?.id : undefined,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        senderIdentityId: hasSenderIdentities
          ? senderIdentities[0]?.id
          : undefined,
        fromLocalPart: "",
        fromDomainId: hasDomains ? domains[0]?.id : undefined,
      });
      setIsAddingNewSender(false);
    }
  }, [open, reset, hasSenderIdentities, hasDomains, senderIdentities, domains]);

  const mutation = useMutation<unknown, Error, BroadcastFormData>({
    async mutationFn(data: BroadcastFormData) {
      let from: string | undefined;

      if (isAddingNewSender || !hasSenderIdentities) {
        // User is adding a new sender or there are no existing sender identities
        if (hasDomains && data.fromLocalPart && data.fromDomainId) {
          const selectedDomain = domains.find(
            (d) => d.id === data.fromDomainId
          );
          if (selectedDomain && data.fromLocalPart.trim()) {
            from = `${data.fromLocalPart.trim()}@${selectedDomain.name}`;
          }
        }
      } else if (data.senderIdentityId) {
        // User selected an existing sender identity
        const selectedIdentity = senderIdentities.find(
          (si) => si.id === data.senderIdentityId
        );
        if (selectedIdentity) {
          from = selectedIdentity.email;
        }
      }

      return internalApi.broadcasts().create({
        name: data.name,
        ...(from && { from }),
      });
    },
    onSuccess(data) {
      toast("Broadcast created successfully.");
      onClose();
      const broadcast = data as { id: string };
      router.push(`/broadcasts/${broadcast.id}`);
      router.refresh();
    },
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: BroadcastFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Create New Broadcast</Dialog.Title>
            <Dialog.Description>
              Create a new email broadcast to send to your audience.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id={nameFieldId}
              placeholder="Weekly Newsletter"
              {...register("name", {
                required: "Broadcast name is required",
                maxLength: {
                  value: 255,
                  message: "Name must be 255 characters or less",
                },
              })}
            >
              <TextField.Label>Name</TextField.Label>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>

            {hasSenderIdentities && !isAddingNewSender && (
              <Select.Root
                value={watch("senderIdentityId")}
                onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setIsAddingNewSender(true);
                    setValue("senderIdentityId", undefined);
                  } else {
                    setValue("senderIdentityId", value);
                  }
                }}
              >
                <Select.Label help="Select who this broadcast will be sent from">
                  From
                </Select.Label>
                <Select.Trigger placeholder="Select sender" />
                <Select.Content className="z-50">
                  {senderIdentities.map((identity) => (
                    <Select.Item key={identity.id} value={identity.id}>
                      <span>{identity.email}</span>
                    </Select.Item>
                  ))}
                  {hasDomains && (
                    <Select.Item value="__add_new__">
                      <span className="text-kb-content-secondary">
                        + Add new sender
                      </span>
                    </Select.Item>
                  )}
                </Select.Content>
              </Select.Root>
            )}

            {(isAddingNewSender || !hasSenderIdentities) && hasDomains && (
              <TextField.Root
                id={fromLocalPartFieldId}
                placeholder="newsletter"
                {...register("fromLocalPart", {
                  maxLength: {
                    value: 64,
                    message: "Email local part must be 64 characters or less",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+$/,
                    message: "Invalid characters in email local part",
                  },
                })}
              >
                <TextField.Label>From email</TextField.Label>
                <TextField.Slot side="right">
                  <Popover.Root
                    open={domainPopoverOpen}
                    onOpenChange={setDomainPopoverOpen}
                  >
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className="text-kb-content-secondary hover:text-kb-content-primary cursor-pointer text-sm"
                      >
                        @
                        {domains.find((d) => d.id === watch("fromDomainId"))
                          ?.name || "Select domain"}
                      </button>
                    </Popover.Trigger>
                    <Popover.Content
                      align="end"
                      className="w-48 -ml-2 bg-kb-surface-primary border border-kb-stroke-secondary rounded-lg shadow-lg p-1"
                    >
                      {domains.map((domain) => (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => {
                            setValue("fromDomainId", domain.id);
                            setDomainPopoverOpen(false);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-kb-content-primary hover:bg-kb-surface-secondary rounded cursor-pointer"
                        >
                          {domain.name}
                        </button>
                      ))}
                    </Popover.Content>
                  </Popover.Root>
                </TextField.Slot>
                {errors.fromLocalPart && (
                  <TextField.Error>
                    {errors.fromLocalPart.message}
                  </TextField.Error>
                )}
              </TextField.Root>
            )}

            {!hasDomains && (
              <Alert.Root variant="warning">
                <Alert.Icon>
                  <WarningTriangle className="w-5 h-5" />
                </Alert.Icon>
                <div className="flex flex-col gap-1">
                  <Alert.Title>No sending domains configured</Alert.Title>
                  <p className="text-sm text-kb-content-secondary">
                    You need to add a sending domain before you can send
                    broadcasts. Go to Settings &rarr; Domains to add one.
                  </p>
                </div>
              </Alert.Root>
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
              disabled={mutation.isPending}
              loading={mutation.isPending}
            >
              Create Broadcast
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
