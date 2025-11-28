import React from "react"
import type { Meta, StoryFn } from "@storybook/react"

import { RadioGroup, RadioGroupItem } from "./radio-group"

const meta: Meta<typeof RadioGroup> = {
  title: "Components/RadioGroup",
  component: RadioGroup,
}

type RadioGroupStoryFn = StoryFn<typeof RadioGroup>

export const Sizes: RadioGroupStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Size - Medium</h5>

        <div>
          <RadioGroup size="md">
            <div className="flex items-center gap-6">
              <RadioGroupItem value="admin" id="admin-md" />
              <label htmlFor="admin-md">Manages billing and team members</label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="manager" id="manager-md" />
              <label htmlFor="manager-md">
                Send newsletters, import subscribers
              </label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="viewer" id="viewer-md" />
              <label htmlFor="viewer-md">
                See broadcast reports and analytics
              </label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="box">
        <h5>Size - Small</h5>

        <div>
          <RadioGroup size="sm">
            <div className="flex items-center gap-6">
              <RadioGroupItem value="admin" id="admin" />
              <label htmlFor="admin">Manages billing and team members</label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="manager" id="manager" />
              <label htmlFor="manager">
                Send newsletters, import subscribers
              </label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="viewer" id="viewer" />
              <label htmlFor="viewer">
                See broadcast reports and analytics
              </label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </>
  )
}

export const States: RadioGroupStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Disabled</h5>

        <div>
          <RadioGroup size="md">
            <div className="flex items-center gap-6">
              <RadioGroupItem value="admin" id="admin-md" disabled />
              <label htmlFor="admin-md">Manages billing and team members</label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="manager" id="manager-md" disabled />
              <label htmlFor="manager-md">
                Send newsletters, import subscribers
              </label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="viewer" id="viewer-md" disabled />
              <label htmlFor="viewer-md">
                See broadcast reports and analytics
              </label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="box">
        <h5>Disabled - Checked</h5>

        <div>
          <RadioGroup size="md" defaultValue="manager">
            <div className="flex items-center gap-6">
              <RadioGroupItem value="admin" id="admin-md" disabled />
              <label htmlFor="admin-md">Manages billing and team members</label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="manager" id="manager-md" disabled />
              <label htmlFor="manager-md">
                Send newsletters, import subscribers
              </label>
            </div>
            <div className="flex items-center gap-6">
              <RadioGroupItem value="viewer" id="viewer-md" disabled />
              <label htmlFor="viewer-md">
                See broadcast reports and analytics
              </label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </>
  )
}

export default meta
