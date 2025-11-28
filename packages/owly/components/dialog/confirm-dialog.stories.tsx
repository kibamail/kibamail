import React from "react"
import type { Meta, StoryFn } from "@storybook/react"
import { ConfirmDialog } from "./confirm-dialog.js"
import { Button } from "../button/button.js"

const meta = {
  title: "Components/ConfirmDialog",
} satisfies Meta

export default meta

type ConfirmDialogStoryFn = StoryFn

const BasicDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Basic Confirm Dialog</h5>
      <p className="mb-4">A simple confirmation dialog with default styling</p>
      {result && <p className="mb-4 text-green-600">Result: {result}</p>}
      <Button onClick={() => setOpen(true)}>Open Confirm Dialog</Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirm Action"
        description="Are you sure you want to proceed with this action?"
        confirm={{
          onClick: () => {
            setResult("Confirmed!")
            setOpen(false)
          },
        }}
        cancel={{
          onClick: () => {
            setResult("Cancelled")
          },
        }}
      />
    </div>
  )
}

export const Basic: ConfirmDialogStoryFn = () => {
  return <BasicDemo />
}

const DestructiveDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Destructive Action</h5>
      <p className="mb-4">Use the destructive variant for dangerous actions like delete</p>
      {result && <p className="mb-4 text-red-600">Result: {result}</p>}
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete Item
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Item"
        description="This action cannot be undone. Are you sure you want to delete this item?"
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: () => {
            setResult("Item deleted!")
            setOpen(false)
          },
        }}
        cancel={{
          onClick: () => {
            setResult("Deletion cancelled")
          },
        }}
      />
    </div>
  )
}

export const Destructive: ConfirmDialogStoryFn = () => {
  return <DestructiveDemo />
}

const CustomLabelsDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Custom Labels</h5>
      <p className="mb-4">Customize the button labels to fit your use case</p>
      {result && <p className="mb-4 text-blue-600">Result: {result}</p>}
      <Button onClick={() => setOpen(true)}>Save Changes</Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Unsaved Changes"
        description="You have unsaved changes. Do you want to save them before leaving?"
        confirm={{
          children: "Save Changes",
          onClick: () => {
            setResult("Changes saved!")
            setOpen(false)
          },
        }}
        cancel={{
          children: "Discard",
          onClick: () => {
            setResult("Changes discarded")
          },
        }}
      />
    </div>
  )
}

export const CustomLabels: ConfirmDialogStoryFn = () => {
  return <CustomLabelsDemo />
}

const LoadingStateDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  const handleConfirm = () => {
    setLoading(true)
    setResult("Processing...")

    // Simulate async operation
    setTimeout(() => {
      setLoading(false)
      setResult("Action completed!")
      setOpen(false)
    }, 2000)
  }

  return (
    <div className="box">
      <h5>Loading State</h5>
      <p className="mb-4">Show loading state during async operations</p>
      {result && <p className="mb-4 text-green-600">Result: {result}</p>}
      <Button onClick={() => setOpen(true)}>Submit Form</Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Submit Form"
        description="Are you ready to submit this form?"
        confirm={{
          children: "Submit",
          loading: loading,
          onClick: handleConfirm,
        }}
        cancel={{
          disabled: loading,
          onClick: () => {
            setResult("Submission cancelled")
          },
        }}
      />
    </div>
  )
}

export const LoadingState: ConfirmDialogStoryFn = () => {
  return <LoadingStateDemo />
}

const NoDescriptionDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Without Description</h5>
      <p className="mb-4">Confirm dialog can work without a description</p>
      {result && <p className="mb-4 text-green-600">Result: {result}</p>}
      <Button onClick={() => setOpen(true)}>Quick Confirm</Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Are you sure?"
        confirm={{
          onClick: () => {
            setResult("Confirmed!")
            setOpen(false)
          },
        }}
        cancel={{
          onClick: () => {
            setResult("Cancelled")
          },
        }}
      />
    </div>
  )
}

export const NoDescription: ConfirmDialogStoryFn = () => {
  return <NoDescriptionDemo />
}

const MultipleDialogsDemo = () => {
  const [openFirst, setOpenFirst] = React.useState(false)
  const [openSecond, setOpenSecond] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Multiple Dialogs</h5>
      <p className="mb-4">Multiple confirm dialogs can be used independently</p>
      {result && <p className="mb-4 text-blue-600">Result: {result}</p>}
      <div style={{ display: "flex", gap: "var(--sp-md)" }}>
        <Button onClick={() => setOpenFirst(true)}>Save</Button>
        <Button variant="destructive" onClick={() => setOpenSecond(true)}>
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={openFirst}
        onOpenChange={setOpenFirst}
        title="Save Changes"
        description="Do you want to save your changes?"
        confirm={{
          children: "Save",
          onClick: () => {
            setResult("Saved!")
            setOpenFirst(false)
          },
        }}
      />

      <ConfirmDialog
        open={openSecond}
        onOpenChange={setOpenSecond}
        title="Delete Item"
        description="This cannot be undone. Are you sure?"
        confirm={{
          variant: "destructive",
          children: "Delete",
          onClick: () => {
            setResult("Deleted!")
            setOpenSecond(false)
          },
        }}
      />
    </div>
  )
}

export const MultipleDialogs: ConfirmDialogStoryFn = () => {
  return <MultipleDialogsDemo />
}

const ConfirmTextDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<string>("")

  return (
    <div className="box">
      <h5>Confirm Text Required</h5>
      <p className="mb-4">
        For highly destructive actions, require the user to type a specific text
        to enable the confirm button
      </p>
      {result && <p className="mb-4 text-red-600">Result: {result}</p>}
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete Account
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Account"
        description="This action is permanent and cannot be undone. All your data will be permanently deleted."
        confirmText="DELETE"
        confirm={{
          variant: "destructive",
          children: "Delete Account",
          onClick: () => {
            setResult("Account deleted!")
            setOpen(false)
          },
        }}
        cancel={{
          onClick: () => {
            setResult("Deletion cancelled")
          },
        }}
      />
    </div>
  )
}

export const ConfirmText: ConfirmDialogStoryFn = () => {
  return <ConfirmTextDemo />
}
