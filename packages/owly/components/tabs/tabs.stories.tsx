import React from "react"
import type { Meta, StoryFn } from "@storybook/react"

import * as Tabs from "./tabs"
import { Archive, MinusCircle, SendDiagonal } from "iconoir-react"

const meta = {
  title: "Components/Tabs",
} satisfies Meta<typeof Tabs>

export default meta

type TabsStoryFn = StoryFn<typeof Tabs>

export const Width: TabsStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Fit</h5>
        <div>
          <Tabs.Root defaultValue="pending">
            <Tabs.List>
              <Tabs.Trigger value="sent">
                <SendDiagonal />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="pending">
                <MinusCircle />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="archived">
                <Archive />
                Archived
              </Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending">
              These newsletters are pending
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      <div className="box">
        <h5>Full width</h5>
        <div>
          <Tabs.Root defaultValue="pending" width="full">
            <Tabs.List>
              <Tabs.Trigger value="sent">
                <SendDiagonal />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="pending">
                <MinusCircle />
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger value="archived">
                <Archive />
                Archived
              </Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending">
              These newsletters are pending
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </>
  )
}

export const Variants: TabsStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Primary</h5>
        <div>
          <Tabs.Root defaultValue="pending">
            <Tabs.List>
              <Tabs.Trigger value="sent">Sent</Tabs.Trigger>
              <Tabs.Trigger value="pending">Scheduled</Tabs.Trigger>
              <Tabs.Trigger value="archived">Drafts</Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending">
              These newsletters are pending
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      <div className="box">
        <h5>Secondary</h5>
        <div>
          <Tabs.Root defaultValue="pending" variant="secondary">
            <Tabs.List>
              <Tabs.Trigger value="sent">
                <SendDiagonal />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="pending">
                <MinusCircle />
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger value="archived">
                <Archive />
                Archived
              </Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending">
              These newsletters are pending
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      <div className="box">
        <h5>Secondary with nested primary</h5>
        <div>
          <Tabs.Root defaultValue="pending" variant="secondary">
            <Tabs.List>
              <Tabs.Trigger value="sent">
                <SendDiagonal />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="pending">
                <MinusCircle />
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger value="archived">
                <Archive />
                Archived
              </Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending" style={{ paddingTop: "32px" }}>
              <Tabs.Root defaultValue="pending">
                <Tabs.List>
                  <Tabs.Trigger value="sent">Sent</Tabs.Trigger>
                  <Tabs.Trigger value="pending">Scheduled</Tabs.Trigger>
                  <Tabs.Trigger value="archived">Drafts</Tabs.Trigger>

                  <Tabs.Indicator />
                </Tabs.List>

                <Tabs.Content value="pending">
                  These newsletters are pending
                </Tabs.Content>
                <Tabs.Content value="sent">
                  These newsletters were already sent
                </Tabs.Content>
                <Tabs.Content value="archived">
                  Archived newsletters
                </Tabs.Content>
              </Tabs.Root>
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      <div className="box">
        <h5>Primary with nested secondary</h5>
        <div>
          <Tabs.Root defaultValue="pending" variant="primary">
            <Tabs.List>
              <Tabs.Trigger value="sent">
                <SendDiagonal />
                Sent
              </Tabs.Trigger>
              <Tabs.Trigger value="pending">
                <MinusCircle />
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger value="archived">
                <Archive />
                Archived
              </Tabs.Trigger>

              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content value="pending" style={{ paddingTop: "32px" }}>
              <Tabs.Root defaultValue="secondary">
                <Tabs.List>
                  <Tabs.Trigger value="sent">Sent</Tabs.Trigger>
                  <Tabs.Trigger value="pending">Scheduled</Tabs.Trigger>
                  <Tabs.Trigger value="archived">Drafts</Tabs.Trigger>

                  <Tabs.Indicator />
                </Tabs.List>

                <Tabs.Content value="pending">
                  These newsletters are pending
                </Tabs.Content>
                <Tabs.Content value="sent">
                  These newsletters were already sent
                </Tabs.Content>
                <Tabs.Content value="archived">
                  Archived newsletters
                </Tabs.Content>
              </Tabs.Root>
            </Tabs.Content>
            <Tabs.Content value="sent">
              These newsletters were already sent
            </Tabs.Content>
            <Tabs.Content value="archived">Archived newsletters</Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </>
  )
}
