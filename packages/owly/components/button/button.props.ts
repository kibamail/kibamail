import type { ComponentProps } from "react"
import type { ResponsiveProp, SlottableComponentProp } from "../utils/props.js"

export const variants = [
  "primary",
  "secondary",
  "destructive",
  "tertiary",
] as const

export const widths = ["fit", "full"] as const

export const sizes = ["lg", "md", "sm", "xs"] as const

export interface ButtonProps
  extends SlottableComponentProp,
    ComponentProps<"button"> {
  variant?: (typeof variants)[number]
  size?: ResponsiveProp<(typeof sizes)[number]>
  width?: ResponsiveProp<(typeof widths)[number]>
  loading?: boolean
}
