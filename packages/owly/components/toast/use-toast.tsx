"use client"

import React from "react"
import { useToastContext, type ToastData } from "./toast-provider.js"

export interface ToastOptions extends Omit<ToastData, "id"> {}

export const useToast = () => {
  const context = useToastContext()

  const toast = React.useCallback(
    (options: ToastOptions) => {
      return context.addToast(options)
    },
    [context]
  )

  // Convenience methods for different variants
  const success = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "success" })
    },
    [toast]
  )

  const error = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "error" })
    },
    [toast]
  )

  const warning = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "warning" })
    },
    [toast]
  )

  const info = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "info" })
    },
    [toast]
  )

  const feature = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "feature" })
    },
    [toast]
  )

  const loading = React.useCallback(
    (title: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      return toast({ ...options, title, variant: "loading" })
    },
    [toast]
  )

  return {
    toast,
    success,
    error,
    warning,
    info,
    feature,
    loading,
    dismiss: context.removeToast,
    update: context.updateToast,
  }
}
