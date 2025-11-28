import React from "react"
import cn from "classnames"
import { Slot } from "@radix-ui/react-slot"
import {
  getVariableClassNamesForProp,
  type SlottableComponentProp,
} from "../utils/props.js"

import { Text } from "../text/text.js"

type AlertRootElement = React.ElementRef<"div">

export const variants = [
  "error",
  "warning",
  "success",
  "info",
  "feature",
  "default",
] as const

export interface AlertRootProps
  extends React.ComponentPropsWithoutRef<"div">,
    SlottableComponentProp {
  variant?: (typeof variants)[number]
}

const Alert = React.forwardRef<AlertRootElement, AlertRootProps>(
  (props, forwardedRef) => {
    const { variant, className, asChild, ...rootProps } = props

    const Component = asChild ? Slot : "div"

    const { className: variantClassName } = getVariableClassNamesForProp<
      AlertRootProps["variant"]
    >("variant", variant)

    return (
      <Component
        {...rootProps}
        className={cn("kb-alert kb-reset", className, variantClassName)}
        ref={forwardedRef}
      />
    )
  }
)

Alert.displayName = "Alert.Root"

const AlertTitle = React.forwardRef<
  React.ElementRef<typeof Text>,
  React.ComponentPropsWithoutRef<typeof Text>
>((props, forwardedRef) => {
  const { className, ...textProps } = props

  return (
    <Text
      as="p"
      {...textProps}
      className={cn("kb-alert-title", className)}
      ref={forwardedRef}
    />
  )
})

const AlertIcon = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>((props, forwardedRef) => {
  const { className, ...iconProps } = props

  return (
    <div
      {...iconProps}
      className={cn("kb-alert-icon", className)}
      ref={forwardedRef}
    />
  )
})

AlertTitle.displayName = "Alert.Title"

export { Alert as Root, AlertTitle as Title, AlertIcon as Icon }
