"use client"

import React, { type ComponentPropsWithoutRef } from "react"
import cn from "classnames"
type TextareaFieldElement = React.ElementRef<"textarea">
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

const TEXTAREA_FIELD_NAME = "TextareaField"
const [TextareaFieldProvider, useTextareaFieldContext] = createContext<{
  baseId: string
}>(TEXTAREA_FIELD_NAME)

export const sizes = ["regular", "sm"] as const

export interface TextareaFieldProps
  extends Omit<ComponentPropsWithoutRef<"textarea">, "size"> {
  size?: (typeof sizes)[number]
}

const TextareaFieldRoot = React.forwardRef<TextareaFieldElement, TextareaFieldProps>(
  (props, forwardedRef) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const { className, children, size = "regular", ...textareaProps } = props

    const { className: sizeClassName } = getVariableClassNamesForProp<
      TextareaFieldProps["size"]
    >("size", size)

    const baseId = useId()

    const childrenArray = React.Children.toArray(children)

    const labels = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === TextareaFieldLabel
    )

    const errors = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === TextareaFieldError
    )

    const hints = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === TextareaFieldHint
    )

    const slots = childrenArray.filter((child) =>
      React.isValidElement(child) && child.type === TextareaFieldSlot
    )

    const rest = childrenArray.filter((child) => {
      if (!React.isValidElement(child)) return true
      return ![TextareaFieldLabel, TextareaFieldError, TextareaFieldHint, TextareaFieldSlot].includes(
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
      if (target.closest("textarea")) return

      event.preventDefault()
      textareaRef.current?.focus()
    }

    return (
      <TextareaFieldProvider baseId={baseId}>
        <div
          data-invalid={isInvalid}
          onPointerDown={onPointerDown}
          className={cn("kb-textarea-field-root", className, sizeClassName)}
        >
          {label}
          <div className={cn("kb-textarea-field-content")}>
            <textarea
              spellCheck={false}
              aria-invalid={isInvalid}
              data-invalid={isInvalid}
              aria-describedby={ariaDescribedBy()}
              {...textareaProps}
              ref={composeRefs(textareaRef, forwardedRef)}
              className="kb-reset kb-textarea-field-input"
            />
            {slots}
          </div>
          {errors.map((error, errorIndex) =>
            React.isValidElement(error) ? React.cloneElement(error, { __internalIndex: errorIndex } as any) : error
          )}
          {hints.map((hint, hintIndex) =>
            React.isValidElement(hint) ? React.cloneElement(hint, { __internalIndex: hintIndex } as any) : hint
          )}
          {rest}
        </div>
      </TextareaFieldProvider>
    )
  }
)

TextareaFieldRoot.displayName = "TextareaField.Root"

export const sides = ["left", "right"] as const

type TextareaFieldSlotElement = React.ElementRef<"div">

export interface TextareaFieldSlotProps extends ComponentPropsWithoutRef<"div"> {
  side: (typeof sides)[number]
}

const TextareaFieldSlot = React.forwardRef<
  TextareaFieldSlotElement,
  TextareaFieldSlotProps
>((props, forwardedRef) => {
  const { side, ...slotProps } = props
  const { className: sideClassName } = getVariableClassNamesForProp<
    TextareaFieldSlotProps["side"]
  >("side", props.side)

  return (
    <div
      data-side={side}
      {...slotProps}
      ref={forwardedRef}
      className={cn("kb-textarea-field-slot", sideClassName)}
    />
  )
})

TextareaFieldSlot.displayName = "TextareaField.Slot"

const TEXTAREA_FIELD_HINT_NAME = "TextareaField.Hint"

const TextareaFieldHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useTextareaFieldContext(TEXTAREA_FIELD_HINT_NAME)

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />
})

TextareaFieldHint.displayName = "TextareaField.Hint"

const TEXTAREA_FIELD_ERROR_NAME = "TextareaField.Error"

const TextareaFieldError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useTextareaFieldContext(TEXTAREA_FIELD_ERROR_NAME)

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />
})

TextareaFieldError.displayName = "TextareaField.Error"

const TextareaFieldLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />
  }
)

TextareaFieldLabel.displayName = "TextareaField.Label"

const TextareaFieldHintIcon = InputHintIcon

TextareaFieldHintIcon.displayName = "TextareaField.HintIcon"

export {
  //
  TextareaFieldRoot,
  TextareaFieldSlot,
  TextareaFieldHint,
  TextareaFieldHintIcon,
  TextareaFieldError,
  TextareaFieldLabel,

  //
  TextareaFieldRoot as Root,
  TextareaFieldSlot as Slot,
  TextareaFieldHint as Hint,
  TextareaFieldHintIcon as HintIcon,
  TextareaFieldError as Error,
  TextareaFieldLabel as Label,
}
