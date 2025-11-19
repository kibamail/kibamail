"use client";

import { Button, Heading } from "@kibamail/owly";
import * as Dialog from "@kibamail/owly/dialog";
import * as TextField from "@kibamail/owly/text-field";
import * as TextareaField from "@kibamail/owly/textarea-field";
import { useToast } from "@kibamail/owly/toast";
import type { Form } from "@prisma/client";
import { EditPencil } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

interface FormEditData {
  name: string;
  description?: string;
}

export function FormHeader({ form }: { form: Form }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { success: toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormEditData>({
    defaultValues: {
      name: form.name,
      description: form.description || "",
    },
  });

  const { mutate: updateForm, isPending } = useMutation({
    mutationFn: async (data: FormEditData) => {
      return await internalApi.forms().update(form.id, data);
    },
    onSuccess: () => {
      toast("Form updated successfully");
      setOpen(false);
      router.refresh();
    },
  });

  const onSubmit = (data: FormEditData) => {
    updateForm(data);
  };

  return (
    <>
      <Heading
        size="xs"
        className="mb-0 flex items-center text-kb-content-tertiary"
      >
        {form.name}:
        <Button
          variant="tertiary"
          size="sm"
          className="ml-2"
          onClick={() => setOpen(true)}
        >
          <EditPencil className="kb-content-tertiary" />
        </Button>
      </Heading>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Edit Form</Dialog.Title>
            <Dialog.Description>
              Update the name and description of your form.
            </Dialog.Description>
          </Dialog.Header>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-4">
              <TextField.Root
                {...register("name", {
                  required: "Form name is required",
                  maxLength: {
                    value: 200,
                    message: "Name must be 200 characters or less",
                  },
                })}
                placeholder="Enter form name"
              >
                <TextField.Label>Name</TextField.Label>

                {errors.name && (
                  <TextField.Error>{errors.name.message}</TextField.Error>
                )}
              </TextField.Root>

              <TextareaField.Root
                {...register("description", {
                  maxLength: {
                    value: 1000,
                    message: "Description must be 1000 characters or less",
                  },
                })}
                placeholder="Enter form description"
              >
                <TextareaField.Label>
                  Description (optional)
                </TextareaField.Label>

                {errors.description && (
                  <TextareaField.Error>
                    {errors.description.message}
                  </TextareaField.Error>
                )}
              </TextareaField.Root>
            </div>

            <Dialog.Footer className="flex items-center justify-between">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
