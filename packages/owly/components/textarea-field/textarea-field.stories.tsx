import React from "react"
import {
  Mail,
  Eye,
  XmarkCircle,
  CheckCircle,
  WarningCircle,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import * as TextareaField from "./textarea-field"

import "./textarea-field.css"
import "../input-label/input-label.css"
import "../input-hint/input-hint.css"

const meta = {
  title: "Components/TextareaField",
  component: TextareaField.Root,
} satisfies Meta<typeof TextareaField.Root>

export default meta

type TextareaFieldStoryFn = StoryFn<typeof TextareaField.Root>

export const Types: TextareaFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-3 gap-12">
      <div className="box">
        <h5>Default - No icon slots</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message..." />
        </div>
      </div>
      <div className="box">
        <h5>Slot left</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message...">
            <TextareaField.Label>Message</TextareaField.Label>
            <TextareaField.Slot side="left">
              <Mail />
            </TextareaField.Slot>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>Slot right</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your feedback...">
            <TextareaField.Slot side="right">
              <Eye />
            </TextareaField.Slot>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With label</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message...">
            <TextareaField.Label>Message</TextareaField.Label>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With hint</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message...">
            <TextareaField.Label>Message</TextareaField.Label>
            <TextareaField.Hint>
              <TextareaField.HintIcon>
                <CheckCircle />
              </TextareaField.HintIcon>
              This field is optional
            </TextareaField.Hint>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With error</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message...">
            <TextareaField.Label>Message</TextareaField.Label>
            <TextareaField.Error>This field is required.</TextareaField.Error>
          </TextareaField.Root>
        </div>
      </div>
    </div>
  )
}

export const WithValidation: TextareaFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Success state</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your feedback..." defaultValue="Great product!">
            <TextareaField.Label>Feedback</TextareaField.Label>
            <TextareaField.Hint>
              <TextareaField.HintIcon>
                <CheckCircle />
              </TextareaField.HintIcon>
              Thank you for your feedback
            </TextareaField.Hint>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>Error state with multiple hints</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your message...">
            <TextareaField.Label>Message</TextareaField.Label>
            <TextareaField.Error>Your message is too short.</TextareaField.Error>
            <TextareaField.Hint>
              <TextareaField.HintIcon>
                <XmarkCircle />
              </TextareaField.HintIcon>
              It must be at least 10 characters long
            </TextareaField.Hint>
            <TextareaField.Hint>
              <TextareaField.HintIcon>
                <XmarkCircle />
              </TextareaField.HintIcon>
              Must contain meaningful content
            </TextareaField.Hint>
          </TextareaField.Root>
        </div>
      </div>
    </div>
  )
}

export const Sizes: TextareaFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Regular Size (default)</h5>
        <TextareaField.Root placeholder="Enter your message...">
          <TextareaField.Label>Message</TextareaField.Label>
          <TextareaField.Slot side="left">
            <Mail />
          </TextareaField.Slot>
        </TextareaField.Root>
      </div>

      <div className="box">
        <h5>Small Size</h5>
        <TextareaField.Root size="sm" placeholder="Enter your message...">
          <TextareaField.Label>Message</TextareaField.Label>
          <TextareaField.Slot side="left">
            <Mail />
          </TextareaField.Slot>
        </TextareaField.Root>
      </div>
    </div>
  )
}

export const WithContent: TextareaFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-1 gap-12">
      <div className="box">
        <h5>With default content</h5>
        <TextareaField.Root
          placeholder="Enter your message..."
          defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
        >
          <TextareaField.Label>Description</TextareaField.Label>
          <TextareaField.Hint>
            <TextareaField.HintIcon>
              <WarningCircle />
            </TextareaField.HintIcon>
            Maximum 500 characters
          </TextareaField.Hint>
        </TextareaField.Root>
      </div>
    </div>
  )
}

export const WithHelp: TextareaFieldStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Label with help text</h5>

        <div className="">
          <TextareaField.Root placeholder="Describe your project...">
            <TextareaField.Label help="Provide a detailed description to help others understand your project goals and requirements">
              Project description
            </TextareaField.Label>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>Label with help JSX</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your feedback...">
            <TextareaField.Label help={
              <div>
                <strong>Feedback guidelines:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                  <li>Be specific and constructive</li>
                  <li>Include examples when possible</li>
                  <li>Focus on actionable improvements</li>
                </ul>
              </div>
            }>
              Feedback
            </TextareaField.Label>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and error</h5>

        <div className="">
          <TextareaField.Root placeholder="Write your message...">
            <TextareaField.Label help="Messages are limited to 500 characters to ensure concise communication">
              Message
            </TextareaField.Label>
            <TextareaField.Error>Message is too long. Please keep it under 500 characters.</TextareaField.Error>
          </TextareaField.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and hint</h5>

        <div className="">
          <TextareaField.Root placeholder="Enter your bio...">
            <TextareaField.Label help="Your bio will be visible to other users and helps them understand your background">
              Bio
            </TextareaField.Label>
            <TextareaField.Hint>
              <TextareaField.HintIcon>
                <WarningCircle />
              </TextareaField.HintIcon>
              Keep it professional and relevant
            </TextareaField.Hint>
          </TextareaField.Root>
        </div>
      </div>
    </div>
  )
}
