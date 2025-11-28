import React from "react"

import type { Meta, StoryFn } from "@storybook/react"

import { Heading } from "./heading"

const meta: Meta<typeof Heading> = {
  title: "Components/Heading",
  component: Heading,
}

type HeadingStoryFn = StoryFn<typeof Heading>

export const Sizes: HeadingStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Size - Extra Small</h5>

        <div>
          <Heading size="xs">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>
      <div className="box">
        <h5>Size - Small</h5>

        <div>
          <Heading size="sm">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Size - Medium</h5>

        <div>
          <Heading size="md">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Size - Large</h5>

        <div>
          <Heading size="lg">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Size - Extra large</h5>

        <div>
          <Heading size="xl">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>
    </>
  )
}

export const Variants: HeadingStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Variant: Display - Size - Extra Small</h5>

        <div>
          <Heading size="xs" variant="display">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>
      <div className="box">
        <h5>Variant: Display - Size - Small</h5>

        <div>
          <Heading size="sm" variant="display">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Display - Size - Medium</h5>

        <div>
          <Heading size="md" variant="display">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Display - Size - Large</h5>

        <div>
          <Heading size="lg" variant="display">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Display - Size - Extra large</h5>

        <div>
          <Heading size="xl" variant="display">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Heading - Size - Extra Small</h5>

        <div>
          <Heading size="xs" variant="heading">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>
      <div className="box">
        <h5>Variant: Heading - Size - Small</h5>

        <div>
          <Heading size="sm" variant="heading">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Heading - Size - Medium</h5>

        <div>
          <Heading size="md" variant="heading">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Heading - Size - Large</h5>

        <div>
          <Heading size="lg" variant="heading">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>

      <div className="box">
        <h5>Variant: Heading - Size - Extra large</h5>

        <div>
          <Heading size="xl" variant="heading">
            The quick brown fox jumps over the lazy dog
          </Heading>
        </div>
      </div>
    </>
  )
}

export default meta
