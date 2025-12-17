"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import type { SendingDomain } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import {
  SenderSelect,
  getEmailFromSenderSelect,
  type TransformedSenderIdentity,
  type CreatedDomain,
} from "@/components/sender-select";

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
  const [isAddingNewSender, setIsAddingNewSender] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id || "");
  const [addedDomains, setAddedDomains] = useState<CreatedDomain[]>([]);

  const allDomains = [...domains, ...addedDomains];
  const hasSenderIdentities = senderIdentities.length > 0;
  const hasDomains = allDomains.length > 0;

  const onDomainCreated = (domain: CreatedDomain) => {
    setAddedDomains((prev) => [...prev, domain]);
    setDomainId(domain.id);
  };

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
      setLocalPart("");
      setDomainId(domains[0]?.id || "");
      setAddedDomains([]);
    }
  }, [open, reset, hasSenderIdentities, hasDomains, senderIdentities, domains]);

  const mutation = useMutation<unknown, Error, BroadcastFormData>({
    async mutationFn(data: BroadcastFormData) {
      const from = getEmailFromSenderSelect({
        senderIdentities,
        domains: allDomains,
        senderIdentityId: data.senderIdentityId,
        localPart,
        domainId,
        isAddingNew: isAddingNewSender || !hasSenderIdentities,
      });

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

            <SenderSelect
              senderIdentities={senderIdentities}
              domains={allDomains}
              value={watch("senderIdentityId")}
              onChange={(id) => setValue("senderIdentityId", id)}
              localPart={localPart}
              onLocalPartChange={setLocalPart}
              domainId={domainId}
              onDomainIdChange={setDomainId}
              isAddingNew={isAddingNewSender}
              onIsAddingNewChange={setIsAddingNewSender}
              onDomainCreated={onDomainCreated}
              labelHelp="Select who this broadcast will be sent from"
            />
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
