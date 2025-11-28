import * as React from "react"
import cn from "classnames"
import {
  getVariableClassNamesForProp,
  getResponsiveClassNamesForProp,
} from "../utils/props.js"

type LetterAvatarElement = React.ElementRef<"div">

export interface LetterAvatarProps
  extends React.ComponentPropsWithoutRef<"div"> {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  color?: "notice" | "negative" | "highlight" | "positive" | "info"
}

// Available colors for auto-detection
const AVATAR_COLORS = ["notice", "negative", "highlight", "positive", "info"] as const

/**
 * Generates a consistent color based on a character
 * Same character will always return the same color
 */
function getColorFromChar(char: string): typeof AVATAR_COLORS[number] {
  if (!char) return "info"

  // Get the character code and create a simple hash
  const charCode = char.toUpperCase().charCodeAt(0)

  // Map A-Z (65-90) and 0-9 (48-57) to color indices
  // Use modulo to ensure we stay within the color array bounds
  const colorIndex = charCode % AVATAR_COLORS.length

  return AVATAR_COLORS[colorIndex]
}

export const LetterAvatar = React.forwardRef<
  LetterAvatarElement,
  LetterAvatarProps
>(function LetterAvatar(props, ref) {
  const { children, className, size = "md", color, ...divProps } = props

  const { className: sizeClassName } = getResponsiveClassNamesForProp<
    LetterAvatarProps["size"]
  >("size", size, "md")

  // Extract first character from children
  const getFirstChar = () => {
    if (typeof children === "string") {
      return children.charAt(0).toUpperCase()
    }
    return ""
  }

  const firstChar = getFirstChar()

  // Use provided color or auto-detect from first character
  const derivedColor = color || getColorFromChar(firstChar)

  const { className: colorClassName } = getVariableClassNamesForProp<
    LetterAvatarProps["color"]
  >("color", derivedColor)

  return (
    <div
      {...divProps}
      ref={ref}
      className={cn(
        "kb-letter-avatar",
        sizeClassName,
        colorClassName,
        className
      )}
    >
      {firstChar}
    </div>
  )
})
