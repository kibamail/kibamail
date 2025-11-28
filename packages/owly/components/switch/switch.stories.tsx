import React from "react"
import {
  CheckCircle,
  XmarkCircle,
  WarningCircle,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import * as Switch from "./switch"

import "./switch.css"
import "../input-label/input-label.css"
import "../input-hint/input-hint.css"

const meta = {
  title: "Components/Switch",
  component: Switch.Root,
} satisfies Meta<typeof Switch.Root>

export default meta

type SwitchStoryFn = StoryFn<typeof Switch.Root>

export const Types: SwitchStoryFn = () => {
  return (
    <div className="grid grid-cols-3 gap-12">
      <div className="box">
        <h5>Basic Switch</h5>

        <div className="">
          <Switch.Root />
        </div>
      </div>
      
      <div className="box">
        <h5>With Label</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label>Enable notifications</Switch.Label>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>Checked by default</h5>

        <div className="">
          <Switch.Root defaultChecked>
            <Switch.Label>Airplane mode</Switch.Label>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>With hint</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label>Dark mode</Switch.Label>
            <Switch.Hint>
              <Switch.HintIcon>
                <CheckCircle />
              </Switch.HintIcon>
              Toggle between light and dark themes
            </Switch.Hint>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>With error</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label>Two-factor authentication</Switch.Label>
            <Switch.Error>This setting is required for your account type.</Switch.Error>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>Disabled</h5>

        <div className="">
          <Switch.Root disabled>
            <Switch.Label>Maintenance mode</Switch.Label>
            <Switch.Hint>
              <Switch.HintIcon>
                <WarningCircle />
              </Switch.HintIcon>
              Contact admin to enable
            </Switch.Hint>
          </Switch.Root>
        </div>
      </div>
    </div>
  )
}

export const Sizes: SwitchStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Regular Size (default)</h5>
        <Switch.Root defaultChecked>
          <Switch.Label>Enable notifications</Switch.Label>
          <Switch.Hint>
            <Switch.HintIcon>
              <CheckCircle />
            </Switch.HintIcon>
            Receive email and push notifications
          </Switch.Hint>
        </Switch.Root>
      </div>

      <div className="box">
        <h5>Small Size</h5>
        <Switch.Root size="sm" defaultChecked>
          <Switch.Label>Enable notifications</Switch.Label>
          <Switch.Hint>
            <Switch.HintIcon>
              <CheckCircle />
            </Switch.HintIcon>
            Receive email and push notifications
          </Switch.Hint>
        </Switch.Root>
      </div>
    </div>
  )
}

export const States: SwitchStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Success state</h5>

        <div className="">
          <Switch.Root defaultChecked>
            <Switch.Label>Auto-save enabled</Switch.Label>
            <Switch.Hint>
              <Switch.HintIcon>
                <CheckCircle />
              </Switch.HintIcon>
              Your work is automatically saved
            </Switch.Hint>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>Error state with multiple hints</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label>API access</Switch.Label>
            <Switch.Error>API access is currently disabled.</Switch.Error>
            <Switch.Hint>
              <Switch.HintIcon>
                <XmarkCircle />
              </Switch.HintIcon>
              Contact support to enable API access
            </Switch.Hint>
            <Switch.Hint>
              <Switch.HintIcon>
                <XmarkCircle />
              </Switch.HintIcon>
              Requires premium subscription
            </Switch.Hint>
          </Switch.Root>
        </div>
      </div>
    </div>
  )
}

export const WithHelp: SwitchStoryFn = () => {
  return (
    <div className="grid grid-cols-2 gap-12">
      <div className="box">
        <h5>Label with help text</h5>

        <div className="">
          <Switch.Root defaultChecked>
            <Switch.Label help="When enabled, your work will be automatically saved every few minutes to prevent data loss">
              Auto-save
            </Switch.Label>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>Label with help JSX</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label help={
              <div>
                <strong>Two-factor authentication adds:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                  <li>Extra security layer</li>
                  <li>Protection against unauthorized access</li>
                  <li>Peace of mind for sensitive data</li>
                </ul>
              </div>
            }>
              Two-factor authentication
            </Switch.Label>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and error</h5>

        <div className="">
          <Switch.Root>
            <Switch.Label help="This setting is required for compliance with your organization's security policy">
              Security monitoring
            </Switch.Label>
            <Switch.Error>This setting must be enabled for your account type</Switch.Error>
          </Switch.Root>
        </div>
      </div>

      <div className="box">
        <h5>With help and hint</h5>

        <div className="">
          <Switch.Root defaultChecked>
            <Switch.Label help="Email notifications help you stay updated on important changes and activities">
              Email notifications
            </Switch.Label>
            <Switch.Hint>
              <Switch.HintIcon>
                <CheckCircle />
              </Switch.HintIcon>
              You can customize notification preferences in settings
            </Switch.Hint>
          </Switch.Root>
        </div>
      </div>
    </div>
  )
}
