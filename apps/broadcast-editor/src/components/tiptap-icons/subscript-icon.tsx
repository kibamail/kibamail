import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

// Keeping custom SVG as iconoir doesn't have a subscript icon
export const SubscriptIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 5L13 15M13 5L3 15" />
      <path d="M21 19H17C17 17.5 21 16.5 21 15C21 14 20 13 19 13C18 13 17 13.5 17 14.5" />
    </svg>
  )
})

SubscriptIcon.displayName = "SubscriptIcon"
