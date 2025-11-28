// 99% of the code for this component was directly copied from Radix Themes, as I saw no need to recreate a spinner when they already did one. (https://radix-ui.com/themes)
// Thank you Radix.

import * as React from "react"
import cn from "classnames"
import { getResponsiveClassNamesForProp } from "../utils/props.js"

export const sizes = ["md", "lg", "xl"] as const

interface SpinnerOwnProps {
  loading?: boolean
  size?: (typeof sizes)[number]
}

type SpinnerElement = React.ElementRef<"span">

interface SpinnerProps
  extends React.ComponentPropsWithoutRef<"span">,
    SpinnerOwnProps {}
const Spinner = React.forwardRef<SpinnerElement, SpinnerProps>(
  (props, forwardedRef) => {
    const { size, loading = true, className, children, ...spinnerProps } = props

    const { className: sizeClassName } = getResponsiveClassNamesForProp<
      SpinnerProps["size"]
    >("size", size, "md")

    if (!loading) return children

    const spinner = (
      <span
        {...spinnerProps}
        ref={forwardedRef}
        className={cn("kb-spinner", sizeClassName, className)}
      >
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
        <span className="kb-spinner-leaf" />
      </span>
    )

    if (children === undefined) return spinner

    return null
  }
)
Spinner.displayName = "Spinner"

export { Spinner }
export type { SpinnerProps }
