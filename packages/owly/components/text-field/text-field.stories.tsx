import React from "react"
import type { Meta, StoryFn } from "@storybook/react"

import * as TextField from "./text-field"
import { Eye, Mail, XmarkCircle } from "iconoir-react"

const meta: Meta<typeof TextField> = {
  title: "Components/TextField",
}

type TextFieldStoryFn = StoryFn<typeof TextField>

export const Types: TextFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-3 gap-12">
      <div className="box">
        <h5>Default - No icon slots</h5>

        <div className="">
          <TextField.Root placeholder="Enter your work email" type="email" />
        </div>
      </div>
      <div className="box">
        <h5>Slot left</h5>

        <div className="">
          <TextField.Root placeholder="Enter your work email" type="email">
            <TextField.Label>Email address</TextField.Label>
            <TextField.Slot side="left">
              <Mail />
            </TextField.Slot>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>Slot right</h5>

        <div className="">
          <TextField.Root placeholder="Enter a strong password" type="password">
            <TextField.Slot side="right">
              <Eye />
            </TextField.Slot>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With hint text</h5>

        <div className="">
          <TextField.Root placeholder="Enter a strong password" type="password">
            <TextField.Slot side="right">
              <Eye />
            </TextField.Slot>
            <TextField.Hint>Must be at least 8 characters long</TextField.Hint>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With error text</h5>

        <div className="">
          <TextField.Root placeholder="Enter a strong password" type="password">
            <TextField.Slot side="right">
              <Eye />
            </TextField.Slot>
            <TextField.Error>
              Must be at least 8 characters long
            </TextField.Error>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With both error and hint text</h5>

        <div className="">
          <TextField.Root placeholder="Enter a strong password" type="password">
            <TextField.Slot side="right">
              <Eye />
            </TextField.Slot>
            <TextField.Error>Your password is incorrect.</TextField.Error>
            <TextField.Hint>
              It must be at least 8 characters long
            </TextField.Hint>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With multiple hints</h5>

        <div className="">
          <TextField.Root placeholder="Enter a strong password" type="password">
            <TextField.Slot side="right">
              <Eye />
            </TextField.Slot>
            <TextField.Error>Your password is incorrect.</TextField.Error>
            <TextField.Hint>
              <TextField.HintIcon>
                <XmarkCircle />
              </TextField.HintIcon>
              It must be at least 8 characters long
            </TextField.Hint>
            <TextField.Hint>
              <TextField.HintIcon>
                <XmarkCircle />
              </TextField.HintIcon>
              Must contain at least one capital letter
            </TextField.Hint>
            <TextField.Hint>
              <TextField.HintIcon>
                <XmarkCircle />
              </TextField.HintIcon>
              Must have a special character
            </TextField.Hint>
            <TextField.Hint>
              <TextField.HintIcon>
                <XmarkCircle />
              </TextField.HintIcon>
              Must have a number
            </TextField.Hint>
          </TextField.Root>
        </div>
      </div>
    </div>
  )
}

export const Sizes: TextFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Regular Size (default)</h5>
        <TextField.Root placeholder="Enter your email" type="email">
          <TextField.Label>Email address</TextField.Label>
          <TextField.Slot side="left">
            <Mail />
          </TextField.Slot>
        </TextField.Root>
      </div>

      <div className="box">
        <h5>Small Size</h5>
        <TextField.Root size="sm" placeholder="Enter your email" type="email">
          <TextField.Label>Email address</TextField.Label>
          <TextField.Slot side="left">
            <Mail />
          </TextField.Slot>
        </TextField.Root>
      </div>

      <div className="box">
        <h5>Regular with Hint</h5>
        <TextField.Root placeholder="Choose a password" type="password">
          <TextField.Label>Password</TextField.Label>
          <TextField.Hint>Must be at least 8 characters</TextField.Hint>
        </TextField.Root>
      </div>

      <div className="box">
        <h5>Small with Hint</h5>
        <TextField.Root size="sm" placeholder="Choose a password" type="password">
          <TextField.Label>Password</TextField.Label>
          <TextField.Hint>Must be at least 8 characters</TextField.Hint>
        </TextField.Root>
      </div>
    </div>
  )
}

export default meta

export const WithHelp: TextFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Label with help text</h5>

        <div className="">
          <TextField.Root placeholder="Enter your email" type="email">
            <TextField.Label help="We'll use this to send you important updates about your account">
              Email address
            </TextField.Label>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>Label with help JSX</h5>

        <div className="">
          <TextField.Root placeholder="Create a password" type="password">
            <TextField.Label help={
              <div>
                <strong>Password requirements:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                  <li>At least 8 characters</li>
                  <li>Include uppercase and lowercase</li>
                  <li>Include at least one number</li>
                </ul>
              </div>
            }>
              Password
            </TextField.Label>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and error</h5>

        <div className="">
          <TextField.Root placeholder="Enter your username" type="text">
            <TextField.Label help="Choose a unique username that others can easily remember">
              Username
            </TextField.Label>
            <TextField.Error>This username is already taken</TextField.Error>
          </TextField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and hint</h5>

        <div className="">
          <TextField.Root placeholder="Enter your phone number" type="tel">
            <TextField.Label help="We'll only use this for account security purposes">
              Phone number
            </TextField.Label>
            <TextField.Hint>Include country code (e.g., +1)</TextField.Hint>
          </TextField.Root>
        </div>
      </div>
    </div>
  )
}
