import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

// Keeping custom SVG as iconoir doesn't have a superscript icon
export const SuperscriptIcon = memo(({ className, ...props }: SvgProps) => {
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
      <path d="M3 7L13 17M13 7L3 17" />
      <path d="M21 11H17C17 9.5 21 8.5 21 7C21 6 20 5 19 5C18 5 17 5.5 17 6.5" />
    </svg>
  )
})

SuperscriptIcon.displayName = "SuperscriptIcon"
