import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import type { ComponentPropsWithoutRef } from "react"
import type { ResponsiveProp } from "../utils/props.js"

export type CheckboxElement = React.ElementRef<typeof CheckboxPrimitive.Root>

export const variant = ["default", "circle"] as const

export const sizes = ["sm", "md"] as const

export interface CheckboxProps
  extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  variant?: (typeof variant)[number]
  size?: ResponsiveProp<(typeof sizes)[number]>
}
