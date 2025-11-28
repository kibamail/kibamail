import React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import type { ResponsiveProp } from "../utils/props.js"

export const sizes = ["sm", "md"] as const

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  size?: ResponsiveProp<(typeof sizes)[number]>
}

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> { }
