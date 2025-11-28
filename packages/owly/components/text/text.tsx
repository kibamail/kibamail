import React from "react"
import cn from "classnames"
import { Slot } from "@radix-ui/react-slot"
import {
  getResponsiveClassNamesForProp,
  type ResponsiveProp,
  type SlottableComponentProp,
} from "../utils/props.js"

export const sizes = ["xl", "lg", "md", "sm", "xs"] as const
export const variants = ["primary", "secondary", "tertiary"] as const

type TextElement = React.ElementRef<"span">

type TextLabelProps = { as: "label" } & React.ComponentPropsWithoutRef<"label">
type TextDivProps = { as: "div" } & React.ComponentPropsWithoutRef<"div">
type TextSpanProps = { as?: "span" } & React.ComponentPropsWithoutRef<"span">
type TextParagraphProps = { as: "p" } & React.ComponentPropsWithoutRef<"p">

export interface BaseTextProps extends SlottableComponentProp {
  size?: ResponsiveProp<(typeof sizes)[number]>
  variant?: (typeof variants)[number]
}

export type TextProps = BaseTextProps &
  (TextLabelProps | TextDivProps | TextSpanProps | TextParagraphProps)

const Text = React.forwardRef<TextElement, TextProps>((props, forwardedRef) => {
  const {
    asChild,
    children,
    as = "span",
    size,
    variant = "primary",
    className,
    ...elementProps
  } = props

  const Element = as

  const { className: sizeClassName } = getResponsiveClassNamesForProp<
    TextProps["size"]
  >("size", size, "md")

  return (
    <Slot
      {...elementProps}
      ref={forwardedRef}
      className={cn(
        "kb-text kb-reset",
        sizeClassName,
        `kb-text-variant-${variant}`,
        className
      )}
    >
      {asChild ? children : <Element>{children}</Element>}
    </Slot>
  )
})

export { Text }
