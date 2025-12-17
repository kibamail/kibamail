"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import { useToast } from "@kibamail/owly/toast";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface CreateDomainFormData {
  name: string;
}

export interface CreatedDomain {
  id: string;
  name: string;
}

interface CreateDomainModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (domain: CreatedDomain) => void;
}

export function CreateDomainModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateDomainModalProps) {
  const { success: toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<CreateDomainFormData>({
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateDomainFormData) => {
      return await internalApi.domains().create({
        name: data.name,
      });
    },
    onSuccess: (data) => {
      toast("Domain created successfully");
      onClose();
      onSuccess?.(data as CreatedDomain);
    },
    setError,
  });

  function onClose() {
    reset();
    onOpenChange?.(false);
  }

  function onSubmit(data: CreateDomainFormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content className="max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header>
            <Dialog.Title>Add Sending Domain</Dialog.Title>
            <Dialog.Description>
              Add a domain to send emails from. You'll need to configure DNS
              records to verify ownership.
            </Dialog.Description>
          </Dialog.Header>

          <div className="space-y-6 py-4 px-6">
            <TextField.Root
              id="name"
              type="text"
              placeholder="example.com"
              {...register("name", {
                required: "Domain name is required",
                pattern: {
                  value: /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/,
                  message: "Enter a valid domain name (e.g., example.com)",
                },
              })}
            >
              <TextField.Label>Domain Name</TextField.Label>
              {errors.name && (
                <TextField.Error>{errors.name.message}</TextField.Error>
              )}
            </TextField.Root>
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
              Add Domain
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
