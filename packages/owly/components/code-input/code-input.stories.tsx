import React from "react"
import type { Meta, StoryFn } from "@storybook/react"

import * as CodeInput from "./code-input"

const meta: Meta<typeof CodeInput> = {
  title: "Components/CodeInput",
}

type CodeInputStoryFn = StoryFn<typeof CodeInput>

export const States: CodeInputStoryFn = () => {
  return (
    <div className="grid grid-cols-3 gap-12">
      <div className="box">
        <h5>Default - 6 code slots</h5>

        <div className="flex justify-center">
          <CodeInput.Input autoFocus />
        </div>
      </div>

      <div className="box">
        <h5>Shorter code - 4 code slots</h5>

        <div className="flex justify-center">
          <CodeInput.Input maxLength={4} />
        </div>
      </div>

      <div className="box">
        <h5>With hint</h5>

        <div className="flex justify-center">
          <CodeInput.Input maxLength={4} id="code">
            <CodeInput.Label htmlFor="code">
              Email verification code
            </CodeInput.Label>
            <CodeInput.Hint>
              Enter the 4-digit code sent to your email
            </CodeInput.Hint>
          </CodeInput.Input>
        </div>
      </div>

      <div className="box">
        <h5>With Error (and hint)</h5>

        <div className="flex justify-center">
          <CodeInput.Input maxLength={6}>
            <CodeInput.Hint>
              Enter the 4-digit code sent to your email
            </CodeInput.Hint>
            <CodeInput.Error>
              Failed to verify your code. Please try again.
            </CodeInput.Error>
          </CodeInput.Input>
        </div>
      </div>
    </div>
  )
}

export default meta
