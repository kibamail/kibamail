"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InteractiveDivProps {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /**
   * When true, the div only stops event propagation without any interactive behavior.
   * Useful for preventing click bubbling in nested interactive elements.
   */
  stopPropagationOnly?: boolean;
  /**
   * Accessible label for screen readers. Required when the content
   * doesn't clearly convey the purpose of the interactive element.
   */
  "aria-label"?: string;
}

/**
 * An accessible interactive container that uses semantic button element.
 * Use this instead of a plain div with onClick to ensure keyboard users
 * can interact with the element.
 *
 * For elements that only need to stop event propagation (like wrappers
 * around editable content), use `stopPropagationOnly={true}`.
 */
export function InteractiveDiv({
  onClick,
  children,
  className,
  disabled,
  stopPropagationOnly,
  "aria-label": ariaLabel,
}: InteractiveDivProps) {
  function onClickInternal(
    event: MouseEvent<HTMLButtonElement | HTMLDivElement>
  ) {
    if (stopPropagationOnly) {
      event.stopPropagation();
      return;
    }
    if (disabled) return;
    onClick?.(event as MouseEvent<HTMLButtonElement>);
  }

  if (stopPropagationOnly) {
    return (
      <div role="presentation" onClick={onClickInternal} className={className}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClickInternal}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "appearance-none bg-transparent border-0 p-0 m-0 text-left w-full",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}
