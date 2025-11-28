import React from "react"

export type IconElement = React.ElementRef<"svg">
export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> {}

export const WarningCircleIcon = React.forwardRef<IconElement, IconProps>(
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
          d="M12 7L12 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 17.01L12.01 16.9989"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
)

WarningCircleIcon.displayName = "IconoirWarningCircleIcon"
