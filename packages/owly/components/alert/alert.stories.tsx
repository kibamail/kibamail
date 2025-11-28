import React from "react"
import {
  WarningCircleSolid,
  WarningTriangleSolid,
  Xmark,
  LabelSolid,
  CheckCircleSolid,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import * as Alert from "./alert"

const meta = {
  title: "Components/Alert",
} satisfies Meta<typeof Alert>

export default meta

type VariantStoryFn = StoryFn<typeof Alert>

export const Variants: VariantStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Alert - Default</h5>
        <div>
          <Alert.Root>
            <Alert.Icon>
              <LabelSolid />
            </Alert.Icon>
            <Alert.Title>
              We received your payment. We will be in touch via email.
            </Alert.Title>
          </Alert.Root>
        </div>
      </div>
      <div className="box">
        <h5>Alert - Error</h5>
        <div>
          <Alert.Root variant="error">
            <Alert.Icon>
              <WarningCircleSolid />
            </Alert.Icon>
            <Alert.Title>Failed to authenticate you with Github.</Alert.Title>
          </Alert.Root>
        </div>
      </div>

      <div className="box">
        <h5>Alert - Warning</h5>
        <div>
          <Alert.Root variant="warning">
            <Alert.Icon>
              <WarningTriangleSolid />
            </Alert.Icon>
            <Alert.Title className="w-full flex items-center justify-between">
              Your email credits are about to expire.
              <div className="flex items-center gap-8">
                <button className="underline kb-reset">Send as email</button>
                <Xmark className="ml-auto" />
              </div>
            </Alert.Title>
          </Alert.Root>
        </div>
      </div>

      <div className="box">
        <h5>Alert - Success</h5>
        <div>
          <Alert.Root variant="success">
            <Alert.Icon>
              <CheckCircleSolid />
            </Alert.Icon>
            <Alert.Title>We completed your account verification.</Alert.Title>
          </Alert.Root>
        </div>
      </div>

      <div className="box">
        <h5>Alert - Info</h5>
        <div>
          <Alert.Root variant="info">
            <Alert.Icon>
              <WarningCircleSolid />
            </Alert.Icon>
            <Alert.Title>We need some more documents to proceed.</Alert.Title>
          </Alert.Root>
        </div>
      </div>

      <div className="box">
        <h5>Alert - Feature</h5>
        <div>
          <Alert.Root variant="feature">
            <Alert.Icon>
              <LabelSolid />
            </Alert.Icon>
            <Alert.Title>We need some more documents to proceed.</Alert.Title>
          </Alert.Root>
        </div>
      </div>
    </>
  )
}
