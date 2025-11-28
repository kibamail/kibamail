"use client"

import React from "react"
import cn from "classnames"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

type TooltipProviderElement = React.ComponentRef<typeof TooltipPrimitive.Provider>
type TooltipRootElement = React.ComponentRef<typeof TooltipPrimitive.Root>
type TooltipTriggerElement = React.ElementRef<typeof TooltipPrimitive.Trigger>
type TooltipContentElement = React.ElementRef<typeof TooltipPrimitive.Content>
type TooltipArrowElement = React.ElementRef<typeof TooltipPrimitive.Arrow>

export interface TooltipProviderProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {}

export interface TooltipRootProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {}

export interface TooltipTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {}

export interface TooltipPortalProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Portal> {}

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {}

export interface TooltipArrowProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow> {}

const TooltipProvider = React.forwardRef<TooltipProviderElement, TooltipProviderProps>(
  (props, forwardedRef) => {
    const { delayDuration = 400, skipDelayDuration = 300, ...providerProps } = props

    return (
      <TooltipPrimitive.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        {...providerProps}
      />
    )
  }
)

TooltipProvider.displayName = "Tooltip.Provider"

const TooltipRoot = React.forwardRef<TooltipRootElement, TooltipRootProps>(
  (props, forwardedRef) => {
    const { delayDuration = 400, ...rootProps } = props

    return (
      <TooltipPrimitive.Root
        delayDuration={delayDuration}
        {...rootProps}
      />
    )
  }
)

TooltipRoot.displayName = "Tooltip.Root"

const TooltipTrigger = React.forwardRef<TooltipTriggerElement, TooltipTriggerProps>(
  (props, forwardedRef) => {
    const { className, children, ...triggerProps } = props

    return (
      <TooltipPrimitive.Trigger
        {...triggerProps}
        ref={forwardedRef}
        className={cn("kb-tooltip-trigger", className)}
        asChild
      >
        {children}
      </TooltipPrimitive.Trigger>
    )
  }
)

TooltipTrigger.displayName = "Tooltip.Trigger"

const TooltipPortal = (props: TooltipPortalProps) => {
  return <TooltipPrimitive.Portal {...props} />
}

TooltipPortal.displayName = "Tooltip.Portal"

const TooltipContent = React.forwardRef<TooltipContentElement, TooltipContentProps>(
  (props, forwardedRef) => {
    const { className, children, sideOffset = 4, ...contentProps } = props

    return (
      <TooltipPrimitive.Content
        {...contentProps}
        ref={forwardedRef}
        sideOffset={sideOffset}
        className={cn("kb-tooltip-content", className)}
      >
        {children}
        <TooltipPrimitive.Arrow className="kb-tooltip-arrow" />
      </TooltipPrimitive.Content>
    )
  }
)

TooltipContent.displayName = "Tooltip.Content"

const TooltipArrow = React.forwardRef<TooltipArrowElement, TooltipArrowProps>(
  (props, forwardedRef) => {
    const { className, ...arrowProps } = props

    return (
      <TooltipPrimitive.Arrow
        {...arrowProps}
        ref={forwardedRef}
        className={cn("kb-tooltip-arrow", className)}
      />
    )
  }
)

TooltipArrow.displayName = "Tooltip.Arrow"

export {
  //
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,

  //
  TooltipProvider as Provider,
  TooltipRoot as Root,
  TooltipTrigger as Trigger,
  TooltipPortal as Portal,
  TooltipContent as Content,
  TooltipArrow as Arrow,
}
