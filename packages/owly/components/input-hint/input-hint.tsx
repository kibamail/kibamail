import React from "react"
import cn from "classnames"
import { Slot } from "@radix-ui/react-slot"
import {
  WarningCircleIcon,
  type IconElement,
  type IconProps,
} from "./input-hint-icons.js"

export type InputHintElement = React.ElementRef<"span">

export interface InputHintProps extends React.ComponentPropsWithoutRef<"span"> {
  baseId: string
  __internalIndex?: number
}

const InputHint = React.forwardRef<InputHintElement, InputHintProps>(
  (props, forwardedRef) => {
    const { className, id, baseId, children, __internalIndex, ...hintProps } =
      props

    const hintId = makeHintId(baseId, __internalIndex)

    const allChildren = React.Children.toArray(children)

    const HintIcon = allChildren.find(
      (child) => React.isValidElement(child) && child.type === InputHintIcon
    )

    const restOfChildren = allChildren.filter(
      (child) =>
        (React.isValidElement(child) && child.type !== InputHintIcon) ||
        !React.isValidElement(child)
    )

    return (
      <div className={cn("kb-input-hint", className)}>
        {HintIcon ? (
          <InputHintIcon>{HintIcon}</InputHintIcon>
        ) : (
          <WarningCircleIcon aria-hidden />
        )}
        <span
          {...hintProps}
          id={id || hintId}
          className={"kb-input-hint-text"}
          ref={forwardedRef}
        >
          {restOfChildren}
        </span>
      </div>
    )
  }
)

const InputHintIcon = React.forwardRef<IconElement, IconProps>(
  (props, forwardedRef) => {
    const { className, ...slotProps } = props

    return (
      <Slot
        {...(slotProps as React.HTMLAttributes<HTMLElement>)}
        aria-hidden
        ref={forwardedRef as React.ForwardedRef<HTMLElement>}
      />
    )
  }
)

const InputError = React.forwardRef<InputHintElement, InputHintProps>(
  (props, forwardedRef) => {
    const { className, baseId, __internalIndex, ...hintProps } = props

    const errorId = makeErrorId(baseId, __internalIndex)

    return (
      <InputHint
        baseId={baseId}
        id={errorId}
        {...hintProps}
        className={cn("kb-input-hint-error", className)}
        ref={forwardedRef}
      />
    )
  }
)

function makeHintId(baseId: string, index?: number) {
  return `${baseId}-hint${index !== undefined ? `-${index}` : ""}`
}

function makeErrorId(baseId: string, index?: number) {
  return `${baseId}-error${index !== undefined ? `-${index}` : ""}`
}

export { InputHint, InputError, InputHintIcon, makeErrorId, makeHintId }
