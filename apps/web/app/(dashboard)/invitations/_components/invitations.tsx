"use client";

import * as Dialog from "@kibamail/owly/dialog";
import { Button } from "@kibamail/owly/button";
import * as TextField from "@kibamail/owly/text-field";
export function Invitations() {
  return (
    <Dialog.Root open={true}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>You've been invited</Dialog.Title>
          <Dialog.Description>
            Create a new workspace to organize your projects and team members.
          </Dialog.Description>
        </Dialog.Header>

        <form>
          <div className="p-5">
            <TextField.Root
              placeholder="Enter your workspace name"
              name="name"
              id="name"
              required
            >
              <TextField.Label>Workspace name</TextField.Label>
              <TextField.Slot side="left">{/* <BookStack /> */}</TextField.Slot>
            </TextField.Root>
          </div>
          <Dialog.Footer className="flex justify-end">
            <Button type="submit">Continue to dashboard</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
