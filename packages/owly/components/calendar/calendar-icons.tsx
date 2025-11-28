import React from "react"

export type IconElement = React.ElementRef<"svg">
export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> { }

export const NavArrowLeftIcon = React.forwardRef<IconElement, IconProps>(
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
     d="M15 6L9 12L15 18"
     stroke="currentColor"
     strokeWidth="1.5"
     strokeLinecap="round"
     strokeLinejoin="round"
    />
   </svg>
  )
 }
)

NavArrowLeftIcon.displayName = "IconoirNavArrowLeftIcon"

export const NavArrowRightIcon = React.forwardRef<IconElement, IconProps>(
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
     d="M9 6L15 12L9 18"
     stroke="currentColor"
     strokeWidth="1.5"
     strokeLinecap="round"
     strokeLinejoin="round"
    />
   </svg>
  )
 }
)

NavArrowRightIcon.displayName = "IconoirNavArrowRightIcon"
