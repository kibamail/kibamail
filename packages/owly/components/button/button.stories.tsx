import React from "react"
import {
  SendDiagonal,
  CheckCircle,
  XmarkCircle,
  BadgeCheck,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import { Button } from "./button"

const meta = {
  title: "Components/Button",
  component: Button,
} satisfies Meta<typeof Button>

export default meta

type ButtonStoryFn = StoryFn<typeof Button>

export const Variants: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Primary</h5>
        <div>
          <Button variant="primary">
            <SendDiagonal />
            Publish website
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Primary disabled</h5>
        <div>
          <Button variant="primary" disabled={true}>
            <SendDiagonal />
            Save changes
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Primary loading</h5>
        <div>
          <Button variant="primary" loading={true}>
            <SendDiagonal />
            Save changes
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Secondary</h5>
        <div>
          <Button variant="secondary">
            <CheckCircle />
            Save changes
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Secondary disabled</h5>
        <div>
          <Button variant="secondary" disabled>
            <XmarkCircle />
            Cancel action
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Secondary loading</h5>
        <div>
          <Button variant="secondary" loading>
            <XmarkCircle />
            Cancel action
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Destructive</h5>
        <div>
          <Button variant="destructive">
            <XmarkCircle />
            Delete emails
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Destructive disabled</h5>
        <div>
          <Button variant="destructive" disabled>
            <XmarkCircle />
            Delete emails
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Destructive Loading</h5>
        <div>
          <Button variant="destructive" loading>
            <XmarkCircle />
            Delete emails
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Tertiary</h5>
        <div>
          <Button variant="tertiary">
            <BadgeCheck />
            Clean up emails
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Tertiary disabled</h5>
        <div>
          <Button variant="tertiary" disabled>
            <BadgeCheck />
            Clean up emails
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Tertiary loading</h5>
        <div>
          <Button variant="tertiary" loading>
            <BadgeCheck />
            Clean up emails
          </Button>
        </div>
      </div>
    </>
  )
}

export const Sizes: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Large (lg) - Default</h5>
        <div>
          <Button variant="primary" size="lg">
            <SendDiagonal />
            Large Button
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Medium (md)</h5>
        <div>
          <Button variant="primary" size="md">
            <SendDiagonal />
            Medium Button
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Small (sm)</h5>
        <div>
          <Button variant="primary" size="sm">
            <SendDiagonal />
            Small Button
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Extra Small (xs)</h5>
        <div>
          <Button variant="primary" size="xs">
            <SendDiagonal />
            Extra Small
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>All Sizes Comparison</h5>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Button variant="secondary" size="lg">
            Large
          </Button>
          <Button variant="secondary" size="md">
            Medium
          </Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
          <Button variant="secondary" size="xs">
            XS
          </Button>
        </div>
      </div>
    </>
  )
}

export const Widths: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Fit content</h5>
        <div>
          <Button variant="primary" width="fit">
            <SendDiagonal />
            Publish broadcast
          </Button>
        </div>
      </div>

      <div className="box">
        <h5>Full width</h5>
        <div>
          <Button
            variant="destructive"
            width={{
              base: "fit",
              lg: "full",
            }}
          >
            <SendDiagonal />
            Save broadcast
          </Button>
        </div>
      </div>
    </>
  )
}
