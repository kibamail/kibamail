"use client"

import React from "react"
import * as Toast from "./toast.js"
import { XmarkIcon } from "./xmark-icon.js"
import { getDefaultIconForVariant } from "./toast-icons.js"

export const toastPositions = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

export type ToastPosition = (typeof toastPositions)[number]

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: (typeof Toast.variants)[number]
  position?: ToastPosition
  action?: {
    label: string
    onClick: () => void
    altText: string
  }
  icon?: React.ReactNode
  duration?: number
  onDismiss?: () => void
}

interface ToastContextValue {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, "id">) => string
  removeToast: (id: string) => void
  updateToast: (id: string, toast: Partial<ToastData>) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
)

export interface ToastProviderProps {
  children: React.ReactNode
  /**
   * The duration in milliseconds before a toast automatically closes.
   * @default 5000
   */
  duration?: number
  /**
   * Maximum number of toasts to show at once.
   * @default 5
   */
  maxToasts?: number
  /**
   * Default position for toasts.
   * @default "top-center"
   */
  defaultPosition?: ToastPosition
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  duration = 5000,
  maxToasts = 5,
  defaultPosition = "top-center",
}) => {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const addToast = React.useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = Math.random().toString(36).substring(2, 11)
      const newToast: ToastData = {
        ...toast,
        id,
        duration: toast.duration ?? duration,
        position: toast.position ?? defaultPosition,
      }

      setToasts((prev) => {
        const updated = [...prev, newToast]
        // Keep only the latest toasts up to maxToasts
        return updated.slice(-maxToasts)
      })

      return id
    },
    [duration, maxToasts, defaultPosition]
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const updateToast = React.useCallback(
    (id: string, updates: Partial<ToastData>) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id ? { ...toast, ...updates } : toast
        )
      )
    },
    []
  )

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      updateToast,
    }),
    [toasts, addToast, removeToast, updateToast]
  )

  // Group toasts by position
  const toastsByPosition = React.useMemo(() => {
    const grouped: Record<ToastPosition, ToastData[]> = {
      "top-left": [],
      "top-center": [],
      "top-right": [],
      "bottom-left": [],
      "bottom-center": [],
      "bottom-right": [],
    }

    toasts.forEach((toast) => {
      const position = toast.position || defaultPosition
      grouped[position].push(toast)
    })

    return grouped
  }, [toasts, defaultPosition])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast.Provider>
        {toastPositions.map((position) => {
          const positionToasts = toastsByPosition[position]
          if (positionToasts.length === 0) return null

          return (
            <React.Fragment key={position}>
              {positionToasts.map((toast) => (
                <Toast.Root
                  key={toast.id}
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) {
                      toast.onDismiss?.()
                      removeToast(toast.id)
                    }
                  }}
                  variant={toast.variant}
                  duration={toast.duration}
                  data-position={position}
                >
                  <Toast.Icon>
                    {toast.icon ?? getDefaultIconForVariant(toast.variant)}
                  </Toast.Icon>
                  <div>
                    <Toast.Title>{toast.title}</Toast.Title>
                    {toast.description && (
                      <Toast.Description>{toast.description}</Toast.Description>
                    )}
                  </div>
                  {toast.action && (
                    <Toast.Action
                      altText={toast.action.altText}
                      onClick={toast.action.onClick}
                      asChild
                    >
                      <button className="underline kb-reset">
                        {toast.action.label}
                      </button>
                    </Toast.Action>
                  )}
                  <Toast.Close>
                    <XmarkIcon />
                  </Toast.Close>
                </Toast.Root>
              ))}
              <Toast.Viewport data-position={position} />
            </React.Fragment>
          )
        })}
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export const useToastContext = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider")
  }
  return context
}
