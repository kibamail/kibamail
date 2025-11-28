import * as React from "react"

export type IconElement = React.ElementRef<"svg">
export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> {}

export const CheckIcon = React.forwardRef<IconElement, IconProps>(
  (props, forwardedRef) => {
    return (
      <svg
        width="24px"
        height="24px"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M5 13L9 17L19 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
)

export const NavArrowDownIcon = React.forwardRef<IconElement, IconProps>(
  (props, forwardedRef) => {
    return (
      <svg
        width="24px"
        height="24px"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="currentColor"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M6 9L12 15L18 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
)

NavArrowDownIcon.displayName = "NavArrowDownIcon"
