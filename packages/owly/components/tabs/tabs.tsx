"use client"

import React from "react"
import * as TabsPrimitive from "./tabs-primitive.js"

import { type TabsRootProps } from "./tabs.props.js"

import cn from "classnames"
import {
  getResponsiveClassNamesForProp,
  getVariableClassNamesForProp,
} from "../utils/props.js"

import { createContext } from "@radix-ui/react-context"

const [TabsProvider, useTabsContext] = createContext<TabsRootProps>("Tabs")

const TabsRoot = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsRootProps
>(({ className, width, variant, ...props }, ref) => {
  const { className: widthClassName } = getResponsiveClassNamesForProp<
    TabsRootProps["width"]
  >("width", width, "fit")

  const { className: variantClassName } = getVariableClassNamesForProp<
    TabsRootProps["variant"]
  >("variant", variant, "primary")

  return (
    <TabsProvider variant={variant} width={width}>
      <TabsPrimitive.Root
        ref={ref}
        className={cn(
          "kb-tabs-root",
          widthClassName,
          variantClassName,
          className
        )}
        {...props}
      />
    </TabsProvider>
  )
})

TabsRoot.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = useTabsContext("TabsList")
  const [isMounted, setIsMounted] = React.useState(false)

  const { className: variantClassName } = getVariableClassNamesForProp<
    TabsRootProps["variant"]
  >("variant", variant, "primary")

  React.useEffect(() => {
    // Enable animations after component mounts to prevent indicator from animating on mount
    const timeout = setTimeout(() => {
      setIsMounted(true)
    }, 50)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn("kb-tabs-list", variantClassName, className)}
      data-mounted={isMounted || undefined}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant } = useTabsContext("TabsList")

  const { className: variantClassName } = getVariableClassNamesForProp<
    TabsRootProps["variant"]
  >("variant", variant, "primary")

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("kb-reset kb-tabs-trigger", variantClassName, className)}
      {...props}
    />
  )
})

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("kb-tabs-content", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

const TabsIndicator = React.forwardRef<
  React.ElementRef<(typeof TabsPrimitive)["Indicator"]>,
  React.ComponentPropsWithoutRef<(typeof TabsPrimitive)["Indicator"]>
>(({ className, ...props }, ref) => {
  const { variant } = useTabsContext("TabsList")

  const { className: variantClassName } = getVariableClassNamesForProp<
    TabsRootProps["variant"]
  >("variant", variant, "primary")

  return (
    <TabsPrimitive.Indicator
      ref={ref}
      className={cn("kb-tabs-indicator", variantClassName, className)}
      {...props}
    />
  )
})

const Root = TabsRoot
const List = TabsList
const Trigger = TabsTrigger
const Content = TabsContent
const Indicator = TabsIndicator

export {
  //
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  //
  Root,
  List,
  Trigger,
  Content,
  Indicator,
}
