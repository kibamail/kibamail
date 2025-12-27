"use client";

import * as Dialog from "@kibamail/owly/dialog";
import { Button } from "@kibamail/owly/button";
import * as TextField from "@kibamail/owly/text-field";
import { BookStack } from "iconoir-react";
import type { ToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/hooks/use-mutation";

interface CreateWorkspaceProps extends ToggleState {}

export function CreateWorkspace({ open, onOpenChange }: CreateWorkspaceProps) {
  const router = useRouter();

  const { mutate, isPending, isError } = useMutation({
    mutationFn(name: string) {
      return internalApi.workspaces().create({ name });
    },
    onSuccess() {
      onOpenChange?.(false);

      router.refresh();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutate(new FormData(event.currentTarget).get("name") as string);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Create new workspace</Dialog.Title>
          <Dialog.Description>
            Create a new workspace to organize your projects and team members.
          </Dialog.Description>
        </Dialog.Header>

        <form onSubmit={onSubmit}>
          <div className="p-5">
            <TextField.Root
              placeholder="Enter your workspace name"
              name="name"
              id="name"
              required
            >
              <TextField.Label>Workspace name</TextField.Label>
              <TextField.Slot side="left">
                <BookStack />
              </TextField.Slot>
              {isError ? (
                <TextField.Error>
                  Failed to create workspace. Please try again.
                </TextField.Error>
              ) : null}
            </TextField.Root>
          </div>
          <Dialog.Footer className="flex justify-between">
            <Dialog.Close asChild>
              <Button variant="secondary">Close</Button>
            </Dialog.Close>
            <Button type="submit" loading={isPending}>
              Create workspace
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
