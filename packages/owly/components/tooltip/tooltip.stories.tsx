import React from "react"
import {
  Plus,
  InfoCircle,
  WarningTriangle,
  Settings,
  HelpCircle,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import * as Tooltip from "./tooltip"
import { Button } from "../button/button"

import "./tooltip.css"

const meta = {
  title: "Components/Tooltip",
  component: Tooltip.Root,
} satisfies Meta<typeof Tooltip.Root>

export default meta

type TooltipStoryFn = StoryFn<typeof Tooltip.Root>

export const Basic: TooltipStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", justifyContent: "center" }}>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">
              <Plus />
              Hover me
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Add to library
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}

export const Sides: TooltipStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "40px", justifyItems: "center" }}>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Top</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="top">
              Tooltip on top
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Right</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="right">
              Tooltip on right
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Bottom</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="bottom">
              Tooltip on bottom
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Left</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="left">
              Tooltip on left
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}

export const WithIcons: TooltipStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", justifyContent: "center" }}>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary" size="sm">
              <InfoCircle />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              More information about this feature
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary" size="sm">
              <Settings />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Open settings
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary" size="sm">
              <HelpCircle />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Get help and support
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary" size="sm">
              <WarningTriangle />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              This action cannot be undone
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}

export const LongContent: TooltipStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", justifyContent: "center" }}>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Short tooltip</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Quick tip
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button variant="secondary">Long tooltip</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              This is a longer tooltip that demonstrates how the component handles more text content. It will wrap appropriately and maintain good readability.
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}

export const DelayVariations: TooltipStoryFn = () => {
  return (
    <div style={{ padding: "100px", display: "flex", gap: "20px", justifyContent: "center" }}>
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger>
            <Button variant="secondary">No delay</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Appears immediately
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root delayDuration={700}>
          <Tooltip.Trigger>
            <Button variant="secondary">Slow delay</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>
              Takes longer to appear
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  )
}
