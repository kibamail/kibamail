import React from "react"
import cn from "classnames"
import { Slot } from "@radix-ui/react-slot"
import {
  getResponsiveClassNamesForProp,
  getVariableClassNamesForProp,
} from "../utils/props.js"
import type { ButtonProps } from "./button.props.js"

import { Spinner } from "../spinner/spinner.js"

export const Button = React.forwardRef<React.ElementRef<"button">, ButtonProps>(
  function Button(props, ref) {
    const {
      asChild,
      className: classNameProp,
      variant,
      size,
      loading = false,
      width,
      disabled = props.loading ?? false,
      children,
      ...buttonProps
    } = props

    const { className } = getResponsiveClassNamesForProp<ButtonProps["size"]>(
      "size",
      size,
      "lg"
    )
    const { className: variantClassName } = getVariableClassNamesForProp<
      ButtonProps["variant"]
    >("variant", variant, "primary")
    const { className: widthClassName } = getResponsiveClassNamesForProp<
      ButtonProps["width"]
    >("width", width, "fit")

    const Component = asChild ? Slot : "button"

    return (
      <Component
        data-kb-disabled={disabled}
        data-kb-loading={loading}
        {...buttonProps}
        ref={ref}
        className={cn(
          "kb-button",
          loading ? "kb-loading" : undefined,
          variantClassName,
          widthClassName,
          className,
          classNameProp
        )}
        disabled={disabled}
      >
        {loading ? (
          <>
            {/* when in loading state, visually hide the content of the button, but still maintain the original width of the button */}
            <span
              style={{ display: "contents", visibility: "hidden" }}
              aria-hidden
            >
              {children}
            </span>

            {/*Position spinner at the center of button*/}
            <span className="kb-loading-spinner">
              <Spinner size="lg" />
            </span>
          </>
        ) : (
          children
        )}
      </Component>
    )
  }
)
