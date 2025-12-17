import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const FooterIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Horizontal divider line at top */}
      <line x1="3" y1="6" x2="21" y2="6" />
      {/* Footer text lines */}
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  )
})

FooterIcon.displayName = "FooterIcon"
