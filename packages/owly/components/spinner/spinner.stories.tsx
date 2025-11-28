import React from "react"

import type { Meta, StoryFn } from "@storybook/react"

import { Spinner } from "./spinner"

const meta = {
  title: "Components/Spinner",
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta

type ButtonStoryFn = StoryFn<typeof Spinner>

export const Sizes: ButtonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Size - Medium</h5>
        <div>
          <Spinner />
        </div>
      </div>

      <div className="box">
        <h5>Size - Large</h5>
        <div>
          <Spinner size="lg" />
        </div>
      </div>

      <div className="box">
        <h5>Size - Extra large</h5>
        <div>
          <Spinner size="xl" />
        </div>
      </div>
    </>
  )
}
