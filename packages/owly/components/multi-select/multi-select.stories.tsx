import React from "react"
import type { Meta, StoryFn } from "@storybook/react"

import * as MultiSelect from "./multi-select"
import {
  Eye,
  Mail,
  NavArrowRight,
  Plus,
  UserBadgeCheck,
  XmarkCircle,
} from "iconoir-react"

const meta: Meta<typeof MultiSelect> = {
  title: "Components/MultiSelect",
}

type MultiSelectStoryFn = StoryFn<typeof MultiSelect>

export const Types: MultiSelectStoryFn = () => {
  const [controlled, setControlled] = React.useState<string[]>(["apple"])
  const [controlled2, setControlled2] = React.useState<string[]>([])

  return (
    <div className="grid grid-cols-3 gap-12">
      <div className="box">
        <h5>Default - Basic multi-select (uncontrolled)</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["apple", "orange"]}>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
              <MultiSelect.Item value="grape" disabled>
                Grape (disabled)
              </MultiSelect.Item>
              <MultiSelect.Separator />

              <MultiSelect.Item value="workspace-1">Workspace 1</MultiSelect.Item>
              <MultiSelect.Item value="workspace-2">Workspace 2</MultiSelect.Item>
              <MultiSelect.Item value="workspace-3">Workspace 3</MultiSelect.Item>
              <MultiSelect.Item value="workspace-4">Workspace 4</MultiSelect.Item>
            </MultiSelect.Content>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>Controlled - With state management</h5>

        <div className="">
          <MultiSelect.Root
            value={controlled}
            onValueChange={setControlled}
          >
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
            </MultiSelect.Content>
          </MultiSelect.Root>

          <div className="mt-4 text-sm">
            Selected: {controlled.join(", ") || "None"}
          </div>
        </div>
      </div>

      <div className="box">
        <h5>No default value - Placeholder</h5>

        <div className="">
          <MultiSelect.Root name="fruits">
            <MultiSelect.Trigger placeholder="Select fruits" />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
            </MultiSelect.Content>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>With Label</h5>

        <div className="">
          <MultiSelect.Root>
            <MultiSelect.Label htmlFor="favourite-fruits">
              Your favourite fruits
            </MultiSelect.Label>
            <MultiSelect.Trigger
              aria-labelledby="favourite-fruits"
              id="favourite-fruits"
              placeholder="Select fruits"
            />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
            </MultiSelect.Content>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>With Error message</h5>

        <div className="">
          <MultiSelect.Root>
            <MultiSelect.Trigger placeholder="Select fruits" />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
            </MultiSelect.Content>

            <MultiSelect.Error>
              We failed to save your changes. Please try again.
            </MultiSelect.Error>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>With Hint / Helper message</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["carrot"]}>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
              <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
            </MultiSelect.Content>

            <MultiSelect.Hint>You can select multiple options</MultiSelect.Hint>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>With custom icons and content</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["carrot"]}>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange" className="flex items-center">
                <UserBadgeCheck />
                Orange
              </MultiSelect.Item>
              <MultiSelect.Item value="apple" className="flex items-center">
                <Mail />
                Apple
              </MultiSelect.Item>
              <MultiSelect.Item value="carrot" className="flex items-center">
                <Eye />
                Carrot
              </MultiSelect.Item>

              <MultiSelect.Separator />
              <div className="sticky bottom-0">
                <div className="flex items-center justify-between w-full px-4 py-2">
                  <div className="flex items-center gap-8">
                    <Plus />
                    Create a new option
                  </div>

                  <NavArrowRight />
                </div>
              </div>
            </MultiSelect.Content>

            <MultiSelect.Hint>You can select multiple options</MultiSelect.Hint>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>Disabled</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["orange", "apple"]} disabled>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="orange" className="flex items-center">
                <UserBadgeCheck />
                Orange
              </MultiSelect.Item>
              <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
              <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
            </MultiSelect.Content>

            <MultiSelect.Hint>This select is disabled</MultiSelect.Hint>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>With Groups and Labels</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["apple"]}>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Group>
                <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
                <MultiSelect.Item value="orange">Orange</MultiSelect.Item>
                <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
                <MultiSelect.Item value="grape">Grape</MultiSelect.Item>
              </MultiSelect.Group>

              <MultiSelect.Separator />

              <MultiSelect.Group>
                <MultiSelect.GroupLabel>Vegetables</MultiSelect.GroupLabel>
                <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
                <MultiSelect.Item value="potato">Potato</MultiSelect.Item>
                <MultiSelect.Item value="broccoli">Broccoli</MultiSelect.Item>
              </MultiSelect.Group>
            </MultiSelect.Content>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>Controlled with clear action</h5>

        <div className="">
          <MultiSelect.Root
            value={controlled2}
            onValueChange={setControlled2}
          >
            <MultiSelect.Label>Select options</MultiSelect.Label>
            <MultiSelect.Trigger />
            <MultiSelect.Content>
              <MultiSelect.Item value="option-1">Option 1</MultiSelect.Item>
              <MultiSelect.Item value="option-2">Option 2</MultiSelect.Item>
              <MultiSelect.Item value="option-3">Option 3</MultiSelect.Item>
              <MultiSelect.Item value="option-4">Option 4</MultiSelect.Item>
            </MultiSelect.Content>
          </MultiSelect.Root>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => setControlled2([])}
              className="text-sm underline"
            >
              Clear all
            </button>
            <button
              onClick={() =>
                setControlled2(["option-1", "option-2", "option-3", "option-4"])
              }
              className="text-sm underline"
            >
              Select all
            </button>
          </div>

          <div className="mt-4 text-sm">
            Selected: {controlled2.join(", ") || "None"}
          </div>
        </div>
      </div>

      <div className="box">
        <h5>Mixed disabled items</h5>

        <div className="">
          <MultiSelect.Root defaultValue={["option-1"]}>
            <MultiSelect.Trigger placeholder="Select options" />
            <MultiSelect.Content>
              <MultiSelect.Item value="option-1">Option 1 (Available)</MultiSelect.Item>
              <MultiSelect.Item value="option-2" disabled>
                Option 2 (Disabled)
              </MultiSelect.Item>
              <MultiSelect.Item value="option-3">Option 3 (Available)</MultiSelect.Item>
              <MultiSelect.Item value="option-4" disabled>
                Option 4 (Disabled)
              </MultiSelect.Item>
              <MultiSelect.Item value="option-5">Option 5 (Available)</MultiSelect.Item>
            </MultiSelect.Content>
            <MultiSelect.Hint>Some options are disabled</MultiSelect.Hint>
          </MultiSelect.Root>
        </div>
      </div>

      <div className="box">
        <h5>Empty state</h5>

        <div className="">
          <MultiSelect.Root>
            <MultiSelect.Trigger placeholder="No options available" />
            <MultiSelect.Content>
              <div className="px-4 py-8 text-sm text-center text-gray-500">
                No options available
              </div>
            </MultiSelect.Content>
          </MultiSelect.Root>
        </div>
      </div>
    </div>
  )
}

export default meta
