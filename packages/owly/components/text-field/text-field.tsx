"use client"

import React, { type ComponentPropsWithoutRef } from "react"
import cn from "classnames"
type TextFieldElement = React.ElementRef<"input">
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

const TEXT_FIELD_NAME = "TextField"
const [TextFieldProvider, useTextFieldContext] = createContext<{
  baseId: string
}>(TEXT_FIELD_NAME)

export const sizes = ["regular", "sm"] as const

export interface TextFieldProps
  extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  size?: (typeof sizes)[number]
}

const TextFieldRoot = React.forwardRef<TextFieldElement, TextFieldProps>(
  (props, forwardedRef) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const { className, children, size = "regular", ...inputProps } = props

    const { className: sizeClassName } = getVariableClassNamesForProp<
      TextFieldProps["size"]
    >("size", size)

    const baseId = useId()

    function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
      const target = event.target as HTMLElement

      // If pointer event happened on an interactive element, do nothing.
      if (target.closest("input, button, a")) {
        return
      }

      const input = inputRef.current

      if (!input) {
        return
      }

      const endOfInputTextPosition = input.value.length

      requestAnimationFrame(function () {
        try {
          input.setSelectionRange(
            endOfInputTextPosition,
            endOfInputTextPosition
          )
        } catch (error) {}
        input.focus()
      })
    }

    const allChildren = React.Children.toArray(children)

    const slots: React.ReactElement[] = []
    const hints: React.ReactElement[] = []
    const errors: React.ReactElement[] = []
    const rest: React.ReactElement[] = []
    const label: React.ReactElement[] = []

    let isInvalid = false

    for (const child of allChildren) {
      if (!React.isValidElement(child)) {
        continue
      }

      if (child.type === TextFieldLabel) {
        label.push(child)
        continue
      }

      if (child.type === TextFieldError) {
        isInvalid = true
        errors.push(child)
        continue
      }

      if (child.type === TextFieldHint) {
        hints.push(child)
        continue
      }

      if (child.type === TextFieldSlot) {
        slots.push(child)
        continue
      }

      rest.push(child)
    }

    function ariaDescribedBy() {
      const hintDescriptions = hints.map((_hint, hintIndex) =>
        makeHintId(baseId, hintIndex)
      )

      const errorDescriptions = errors.map((_error, errorIndex) =>
        makeErrorId(baseId, errorIndex)
      )

      return [...hintDescriptions, ...errorDescriptions].join(" ")
    }

    return (
      <TextFieldProvider baseId={baseId}>
        <div
          data-invalid={isInvalid}
          onPointerDown={onPointerDown}
          className={cn("kb-text-field-root", className, sizeClassName)}
        >
          {label}
          <div className={cn("kb-text-field-content")}>
            <input
              spellCheck={false}
              aria-invalid={isInvalid}
              data-invalid={isInvalid}
              aria-describedby={ariaDescribedBy()}
              {...inputProps}
              ref={composeRefs(inputRef, forwardedRef)}
              className="kb-reset kb-text-field-input"
            />
            {slots}
          </div>
          {errors.map((error, errorIndex) =>
            React.cloneElement(error, { __internalIndex: errorIndex } as any)
          )}
          {hints.map((hint, hintIndex) =>
            React.cloneElement(hint, { __internalIndex: hintIndex } as any)
          )}
          {rest}
        </div>
      </TextFieldProvider>
    )
  }
)

TextFieldRoot.displayName = "TextField.Root"

export const sides = ["left", "right"] as const

type TextFieldSlotElement = React.ElementRef<"div">

export interface TextFieldSlotProps extends ComponentPropsWithoutRef<"div"> {
  side: (typeof sides)[number]
}

const TextFieldSlot = React.forwardRef<
  TextFieldSlotElement,
  TextFieldSlotProps
>((props, forwardedRef) => {
  const { side, ...slotProps } = props
  const { className: sideClassName } = getVariableClassNamesForProp<
    TextFieldSlotProps["side"]
  >("side", props.side)

  return (
    <div
      data-side={side}
      {...slotProps}
      ref={forwardedRef}
      className={cn("kb-text-field-slot", sideClassName)}
    />
  )
})

TextFieldSlot.displayName = "TextField.Slot"

const TEXT_FIELD_HINT_NAME = "TextField.Hint"

const TextFieldHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useTextFieldContext(TEXT_FIELD_HINT_NAME)

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />
})

TextFieldHint.displayName = "TextField.Hint"

const TEXT_FIELD_ERROR_NAME = "TextField.Error"

const TextFieldError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useTextFieldContext(TEXT_FIELD_ERROR_NAME)

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />
})

TextFieldError.displayName = "TextField.Error"

const TextFieldLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />
  }
)

TextFieldLabel.displayName = "TextField.Label"

const TextFieldHintIcon = InputHintIcon

TextFieldHintIcon.displayName = "TextField.HintIcon"

export {
  //
  TextFieldRoot,
  TextFieldSlot,
  TextFieldHint,
  TextFieldHintIcon,
  TextFieldError,
  TextFieldLabel,

  //
  TextFieldRoot as Root,
  TextFieldSlot as Slot,
  TextFieldHint as Hint,
  TextFieldHintIcon as HintIcon,
  TextFieldError as Error,
  TextFieldLabel as Label,
}
