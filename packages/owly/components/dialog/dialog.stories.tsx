import React from "react"
import {
  AtSignCircle,
  CheckCircle,
  CheckSquare,
  Eye,
  InfoCircle,
  Mail,
  WarningCircle,
} from "iconoir-react"
import type { Meta, StoryFn, StoryObj } from "@storybook/react"

import * as TextField from "../text-field/text-field.js"
import * as Dialog from "./dialog"
import { Button } from "../button"

const meta: Meta<typeof Dialog> = {
  title: "Components/Dialog",
}

type Story = StoryObj<typeof Dialog>
type DialogStoryFn = StoryFn<typeof Dialog>

export const Types: DialogStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Default - With header and footer</h5>

        <div>
          <Dialog.Root>
            <Dialog.Trigger>
              <Button>Open dialog</Button>
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Add subscribers</Dialog.Title>
                <Dialog.Description>
                  Add and tag your new subscriber. Additional info can be added
                  after adding the new subscriber.
                </Dialog.Description>
              </Dialog.Header>

              <div style={{ padding: "20px" }}>
                <TextField.Root
                  placeholder="Enter your work email"
                  type="email"
                >
                  <TextField.Label>Email address</TextField.Label>
                  <TextField.Slot side="left">
                    <Mail />
                  </TextField.Slot>
                </TextField.Root>
              </div>
              <Dialog.Footer className="flex justify-between">
                <Dialog.Close asChild>
                  <Button variant="secondary">Close</Button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <Button>Save changes</Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
        </div>
      </div>
    </>
  )
}

export default meta
