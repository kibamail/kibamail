"use client"

import React, { type ComponentPropsWithoutRef } from "react"
import cn from "classnames"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { composeRefs } from "@radix-ui/react-compose-refs"
import { createContext } from "@radix-ui/react-context"
import { getVariableClassNamesForProp } from "../utils/props.js"
import { useId } from "@radix-ui/react-id"

import {
  type InputLabelElement,
  type InputLabelProps,
  InputLabel,
} from "../input-label/input-label.js"

import {
  InputError,
  InputHint,
  type InputHintElement,
  InputHintIcon,
  type InputHintProps,
  makeErrorId,
  makeHintId,
} from "../input-hint/input-hint.js"

const SWITCH_NAME = "Switch"
const [SwitchProvider, useSwitchContext] = createContext<{
  baseId: string
}>(SWITCH_NAME)

export const sizes = ["regular", "sm"] as const

type SwitchElement = React.ElementRef<typeof SwitchPrimitive.Root>

export interface SwitchProps
  extends Omit<ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "size"> {
  size?: (typeof sizes)[number]
}

const SwitchRoot = React.forwardRef<SwitchElement, SwitchProps>(
  (props, forwardedRef) => {
    const switchRef = React.useRef<React.ElementRef<typeof SwitchPrimitive.Root>>(null)
    const { className, children, size = "regular", ...switchProps } = props

    const { className: sizeClassName } = getVariableClassNamesForProp<
      SwitchProps["size"]
    >("size", size)

    const baseId = useId()

    const childrenArray = React.Children.toArray(children)

    const labels = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === SwitchLabel
    )

    const errors = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === SwitchError
    )

    const hints = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === SwitchHint
    )

    const rest = childrenArray.filter((child) => {
      if (!React.isValidElement(child)) return true
      return ![SwitchLabel, SwitchError, SwitchHint].includes(
        child.type as any
      )
    })

    const label = labels.length > 0 ? labels[0] : null
    const isInvalid = errors.length > 0

    const ariaDescribedBy = () => {
      const describedByIds: string[] = []

      if (errors.length > 0) {
        errors.forEach((_, index) => {
          describedByIds.push(makeErrorId(baseId, index))
        })
      }

      if (hints.length > 0) {
        hints.forEach((_, index) => {
          describedByIds.push(makeHintId(baseId, index))
        })
      }

      return describedByIds.length > 0 ? describedByIds.join(" ") : undefined
    }

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (target.closest("button")) return

      event.preventDefault()
      switchRef.current?.click()
    }

    return (
      <SwitchProvider baseId={baseId}>
        <div
          data-invalid={isInvalid}
          onPointerDown={onPointerDown}
          className={cn("kb-switch-root", className, sizeClassName)}
        >
          <div className={cn("kb-switch-content")}>
            {label}
            <SwitchPrimitive.Root
              aria-invalid={isInvalid}
              data-invalid={isInvalid}
              aria-describedby={ariaDescribedBy()}
              {...switchProps}
              ref={composeRefs(switchRef, forwardedRef)}
              className="kb-reset kb-switch-input"
            >
              <SwitchPrimitive.Thumb className="kb-switch-thumb" />
            </SwitchPrimitive.Root>
          </div>
          {errors.map((error, errorIndex) =>
            React.isValidElement(error) ? React.cloneElement(error, { __internalIndex: errorIndex } as any) : error
          )}
          {hints.map((hint, hintIndex) =>
            React.isValidElement(hint) ? React.cloneElement(hint, { __internalIndex: hintIndex } as any) : hint
          )}
          {rest}
        </div>
      </SwitchProvider>
    )
  }
)

SwitchRoot.displayName = "Switch.Root"

const SWITCH_HINT_NAME = "Switch.Hint"

const SwitchHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useSwitchContext(SWITCH_HINT_NAME)

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />
})

SwitchHint.displayName = "Switch.Hint"

const SWITCH_ERROR_NAME = "Switch.Error"

const SwitchError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useSwitchContext(SWITCH_ERROR_NAME)

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />
})

SwitchError.displayName = "Switch.Error"

const SwitchLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />
  }
)

SwitchLabel.displayName = "Switch.Label"

const SwitchHintIcon = InputHintIcon

SwitchHintIcon.displayName = "Switch.HintIcon"

export {
  //
  SwitchRoot,
  SwitchHint,
  SwitchHintIcon,
  SwitchError,
  SwitchLabel,

  //
  SwitchRoot as Root,
  SwitchHint as Hint,
  SwitchHintIcon as HintIcon,
  SwitchError as Error,
  SwitchLabel as Label,
}
