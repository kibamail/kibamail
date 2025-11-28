import React from "react"

export type IconElement = React.ElementRef<"svg">
export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> {}

export const CircleIcon = React.forwardRef<IconElement, IconProps>(
  (props, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={10}
        height={10}
        viewBox="0 0 10 10"
        fill="none"
        {...props}
        ref={forwardedRef}
      >
        <circle cx={5} cy={5} r={5} fill="currentColor" />
      </svg>
    )
  }
)

CircleIcon.displayName = "IconoirCircleIcon"
