import React from "react"
import {
  WarningCircleSolid,
  WarningTriangleSolid,
  LabelSolid,
  CheckCircleSolid,
} from "iconoir-react"
import type { Meta, StoryFn } from "@storybook/react"

import { ToastProvider, useToast } from "./index"

const meta = {
  title: "Components/Toast",
} satisfies Meta

export default meta

type VariantStoryFn = StoryFn

const VariantsDemo = () => {
  const toast = useToast()

  return (
    <div className="space-y-4">
      <div className="box">
        <h5>Toast Variants</h5>
        <p className="mb-4">Click buttons to trigger different toast variants with default icons</p>
        <div className="flex gap-2 flex-wrap">
          <button
            className="kb-button"
            onClick={() =>
              toast.toast({
                title: "We received your payment. We will be in touch via email.",
              })
            }
          >
            Default
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.error("Failed to authenticate you with Github.")
            }
          >
            Error
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.warning("Your email credits are about to expire.")
            }
          >
            Warning
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.success("We completed your account verification.")
            }
          >
            Success
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.info("We need some more documents to proceed.")
            }
          >
            Info
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.feature("New feature available: Dark mode!")
            }
          >
            Feature
          </button>

          <button
            className="kb-button"
            onClick={() =>
              toast.loading("Processing your request...")
            }
          >
            Loading
          </button>
        </div>
      </div>
    </div>
  )
}

export const Variants: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <VariantsDemo />
    </ToastProvider>
  )
}

const WithDescriptionDemo = () => {
  const toast = useToast()

  return (
    <div className="box">
      <h5>Toast with Description</h5>
      <p className="mb-4">Toasts can include a description for additional context</p>
      <div className="flex gap-2 flex-wrap">
        <button
          className="kb-button"
          onClick={() =>
            toast.success("Account verified successfully", {
              description: "You can now access all features of your account.",
              icon: <CheckCircleSolid />,
            })
          }
        >
          With Description
        </button>

        <button
          className="kb-button"
          onClick={() =>
            toast.error("Failed to save changes", {
              description: "Please check your internet connection and try again.",
              icon: <WarningCircleSolid />,
            })
          }
        >
          Error with Description
        </button>
      </div>
    </div>
  )
}

export const WithDescription: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <WithDescriptionDemo />
    </ToastProvider>
  )
}

const WithActionDemo = () => {
  const toast = useToast()
  const [actionClicked, setActionClicked] = React.useState(false)

  return (
    <div className="box">
      <h5>Toast with Action</h5>
      <p className="mb-4">Toasts can include action buttons</p>
      {actionClicked && (
        <p className="mb-2 text-green-600">Action was clicked!</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          className="kb-button"
          onClick={() =>
            toast.warning("Your email credits are about to expire.", {
              icon: <WarningTriangleSolid />,
              action: {
                label: "Renew now",
                altText: "Renew subscription",
                onClick: () => {
                  setActionClicked(true)
                  setTimeout(() => setActionClicked(false), 2000)
                },
              },
            })
          }
        >
          Show with Action
        </button>

        <button
          className="kb-button"
          onClick={() =>
            toast.info("You have unsaved changes.", {
              icon: <WarningCircleSolid />,
              description: "Would you like to save them before leaving?",
              action: {
                label: "Save now",
                altText: "Save changes",
                onClick: () => {
                  setActionClicked(true)
                  setTimeout(() => setActionClicked(false), 2000)
                },
              },
            })
          }
        >
          With Action & Description
        </button>
      </div>
    </div>
  )
}

export const WithAction: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <WithActionDemo />
    </ToastProvider>
  )
}

const StackedDemo = () => {
  const toast = useToast()

  const getIcon = (variant: string) => {
    switch (variant) {
      case "error":
        return <WarningCircleSolid />
      case "warning":
        return <WarningTriangleSolid />
      case "success":
        return <CheckCircleSolid />
      case "info":
        return <WarningCircleSolid />
      default:
        return <LabelSolid />
    }
  }

  const addMultipleToasts = () => {
    toast.success("File uploaded successfully", { icon: getIcon("success") })
    setTimeout(() => {
      toast.info("Processing started", { icon: getIcon("info") })
    }, 300)
    setTimeout(() => {
      toast.success("Processing complete", { icon: getIcon("success") })
    }, 600)
  }

  return (
    <div className="box">
      <h5>Stacked Toasts</h5>
      <p className="mb-4">
        Click multiple buttons quickly to see toasts stack. Maximum of 5 toasts
        shown at once.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          className="kb-button"
          onClick={() =>
            toast.toast({
              title: "Default notification",
              icon: getIcon("default"),
            })
          }
        >
          Add Default
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.error("An error occurred", {
              icon: getIcon("error"),
            })
          }
        >
          Add Error
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.warning("Warning message", {
              icon: getIcon("warning"),
            })
          }
        >
          Add Warning
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.success("Success message", {
              icon: getIcon("success"),
            })
          }
        >
          Add Success
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.info("Info message", {
              icon: getIcon("info"),
            })
          }
        >
          Add Info
        </button>
        <button className="kb-button" onClick={addMultipleToasts}>
          Add Multiple Toasts
        </button>
      </div>
    </div>
  )
}

export const Stacked: VariantStoryFn = () => {
  return (
    <ToastProvider duration={5000} maxToasts={5}>
      <StackedDemo />
    </ToastProvider>
  )
}

const CustomDurationDemo = () => {
  const toast = useToast()

  return (
    <div className="box">
      <h5>Custom Duration</h5>
      <p className="mb-4">Control how long toasts stay visible</p>
      <div className="flex gap-2 flex-wrap">
        <button
          className="kb-button"
          onClick={() =>
            toast.success("Quick message (2 seconds)", {
              icon: <CheckCircleSolid />,
              duration: 2000,
            })
          }
        >
          2 seconds
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.info("Standard message (5 seconds)", {
              icon: <WarningCircleSolid />,
              duration: 5000,
            })
          }
        >
          5 seconds
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.warning("Long message (10 seconds)", {
              icon: <WarningTriangleSolid />,
              duration: 10000,
            })
          }
        >
          10 seconds
        </button>
        <button
          className="kb-button"
          onClick={() =>
            toast.error("Stays forever (manual dismiss)", {
              icon: <WarningCircleSolid />,
              duration: Infinity,
            })
          }
        >
          Infinite
        </button>
      </div>
    </div>
  )
}

export const CustomDuration: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <CustomDurationDemo />
    </ToastProvider>
  )
}

const OnDismissDemo = () => {
  const toast = useToast()
  const [dismissCount, setDismissCount] = React.useState(0)

  return (
    <div className="box">
      <h5>On Dismiss Callback</h5>
      <p className="mb-4">Execute code when toasts are dismissed</p>
      <p className="mb-4">Toasts dismissed: {dismissCount}</p>
      <button
        className="kb-button"
        onClick={() =>
          toast.success("Dismiss me to increment counter", {
            icon: <CheckCircleSolid />,
            onDismiss: () => setDismissCount((c) => c + 1),
          })
        }
      >
        Show Toast
      </button>
    </div>
  )
}

export const OnDismiss: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <OnDismissDemo />
    </ToastProvider>
  )
}

const PositionsDemo = () => {
  const toast = useToast()

  const positions = [
    { value: "top-left" as const, label: "Top Left" },
    { value: "top-center" as const, label: "Top Center" },
    { value: "top-right" as const, label: "Top Right" },
    { value: "bottom-left" as const, label: "Bottom Left" },
    { value: "bottom-center" as const, label: "Bottom Center" },
    { value: "bottom-right" as const, label: "Bottom Right" },
  ]

  return (
    <div className="box">
      <h5>Toast Positions</h5>
      <p className="mb-4">
        Toasts can be positioned in 6 different locations with appropriate
        animations
      </p>
      <div className="grid grid-cols-3 gap-2">
        {positions.map((pos) => (
          <button
            key={pos.value}
            className="kb-button"
            onClick={() =>
              toast.success(`Toast at ${pos.label}`, {
                icon: <CheckCircleSolid />,
                position: pos.value,
              })
            }
          >
            {pos.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export const Positions: VariantStoryFn = () => {
  return (
    <ToastProvider defaultPosition="top-center">
      <PositionsDemo />
    </ToastProvider>
  )
}

const MixedPositionsDemo = () => {
  const toast = useToast()

  const showMultiplePositions = () => {
    toast.success("Top left notification", {
      position: "top-left",
      icon: <CheckCircleSolid />,
    })
    setTimeout(() => {
      toast.info("Top center notification", {
        position: "top-center",
        icon: <WarningCircleSolid />,
      })
    }, 200)
    setTimeout(() => {
      toast.warning("Bottom right notification", {
        position: "bottom-right",
        icon: <WarningTriangleSolid />,
      })
    }, 400)
  }

  return (
    <div className="box">
      <h5>Multiple Positions Simultaneously</h5>
      <p className="mb-4">Show toasts in different positions at the same time</p>
      <button className="kb-button" onClick={showMultiplePositions}>
        Show Multiple Positions
      </button>
    </div>
  )
}

export const MixedPositions: VariantStoryFn = () => {
  return (
    <ToastProvider defaultPosition="top-center">
      <MixedPositionsDemo />
    </ToastProvider>
  )
}

const DismissAndUpdateDemo = () => {
  const toast = useToast()
  const [currentToastId, setCurrentToastId] = React.useState<string | null>(
    null
  )

  const showPersistentToast = () => {
    const id = toast.info("This toast will stay until dismissed", {
      icon: <WarningCircleSolid />,
      duration: Infinity,
    })
    setCurrentToastId(id)
  }

  const dismissToast = () => {
    if (currentToastId) {
      toast.dismiss(currentToastId)
      setCurrentToastId(null)
    }
  }

  const updateToast = () => {
    if (currentToastId) {
      toast.update(currentToastId, {
        title: "Toast updated!",
        variant: "success",
        icon: <CheckCircleSolid />,
      })
    }
  }

  return (
    <div className="box">
      <h5>Dismiss and Update Toasts</h5>
      <p className="mb-4">
        Toast methods return an ID that can be used to dismiss or update the
        toast
      </p>
      <div className="flex gap-2 flex-wrap">
        <button className="kb-button" onClick={showPersistentToast}>
          Show Persistent Toast
        </button>
        <button
          className="kb-button"
          onClick={updateToast}
          disabled={!currentToastId}
        >
          Update Toast
        </button>
        <button
          className="kb-button"
          onClick={dismissToast}
          disabled={!currentToastId}
        >
          Dismiss Toast
        </button>
      </div>
    </div>
  )
}

export const DismissAndUpdate: VariantStoryFn = () => {
  return (
    <ToastProvider>
      <DismissAndUpdateDemo />
    </ToastProvider>
  )
}
