"use client"

import cn from "classnames"
import * as React from "react"
import { composeRefs } from "@radix-ui/react-compose-refs"
import * as SelectFieldPrimitive from "@radix-ui/react-select"
import { useId } from "@radix-ui/react-id"
import { CheckIcon, NavArrowDownIcon } from "./select-field.icons.js"
import { Text } from "../text/text.js"
import {
  InputLabel,
  type InputLabelElement,
  type InputLabelProps,
} from "../input-label/input-label.js"
import { createContext } from "@radix-ui/react-context"
import {
  InputError,
  InputHint,
  makeErrorId,
  makeHintId,
  type InputHintElement,
  type InputHintProps,
} from "../input-hint/input-hint.js"
import { getVariableClassNamesForProp } from "../utils/props.js"

type HiddenSelectFieldInputElement = React.ElementRef<"input">

type HiddenInputProps = Pick<
  React.ComponentPropsWithoutRef<"input">,
  "style" | "name" | "aria-label" | "aria-labelledby"
>

export const sizes = ["regular", "sm"] as const

const SELECT_FIELD_NAME = "SelectField"
const [SelectFieldProvider, useSelectFieldContext] = createContext<{
  baseId: string
  size: (typeof sizes)[number]
}>(SELECT_FIELD_NAME)

interface SelectFieldRootProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Root>,
    HiddenInputProps {
  className?: string
  size?: (typeof sizes)[number]
}

const SelectFieldRoot = React.forwardRef<
  HiddenSelectFieldInputElement,
  SelectFieldRootProps
>((props, forwardedRef) => {
  const {
    children,
    name,
    style,
    className,
    size = "regular",
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...rootProps
  } = props

  const hiddenInputRef = React.useRef<HTMLInputElement>(null)

  const allChildren = React.Children.toArray(children)

  const isInvalid = allChildren.some(
    (child) => React.isValidElement(child) && child.type === SelectFieldError
  )

  function syncHiddenInputValue(value: string) {
    const input = hiddenInputRef.current

    if (!input) return

    input.value = value
  }

  function onSelectFieldValueChange(value: string) {
    rootProps?.onValueChange?.(value)
    syncHiddenInputValue(value)
  }

  const baseId = useId()

  const { className: sizeClassName } = getVariableClassNamesForProp<
    SelectFieldRootProps["size"]
  >("size", size)

  return (
    <SelectFieldProvider baseId={baseId} size={size}>
      <SelectFieldPrimitive.Root
        {...rootProps}
        onValueChange={onSelectFieldValueChange}
      >
        <input
          type="hidden"
          name={name}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          defaultValue={rootProps.defaultValue}
          ref={composeRefs(hiddenInputRef, forwardedRef)}
        />
        <div
          data-invalid={isInvalid}
          data-disabled={rootProps.disabled}
          className={cn("kb-select-root", className, sizeClassName)}
        >
          {children}
        </div>
      </SelectFieldPrimitive.Root>
    </SelectFieldProvider>
  )
})

SelectFieldRoot.displayName = "SelectField.Root"

const SelectFieldLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />
  }
)

SelectFieldLabel.displayName = "SelectField.Label"

type SelectFieldTriggerElement = React.ElementRef<
  typeof SelectFieldPrimitive.Trigger
>

export interface SelectFieldTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Trigger> {
  placeholder?: SelectFieldPrimitive.SelectValueProps["placeholder"]
}

const SelectFieldTrigger = React.forwardRef<
  SelectFieldTriggerElement,
  SelectFieldTriggerProps
>((props, forwardedRef) => {
  const { baseId } = useSelectFieldContext("SelectField.Trigger")
  const {
    children,
    className,
    placeholder,
    "aria-describedby": ariaDescribedBy,
    ...triggerProps
  } = props

  return (
    <SelectFieldPrimitive.Trigger asChild>
      <button
        {...triggerProps}
        ref={forwardedRef}
        aria-describedby={[
          ariaDescribedBy,
          makeErrorId(baseId),
          makeHintId(baseId),
        ].join(" ")}
        className={cn("kb-reset", "kb-select-trigger", className)}
      >
        <span className="kb-select-trigger-inner">
          <SelectFieldPrimitive.Value placeholder={placeholder}>
            {children}
          </SelectFieldPrimitive.Value>
        </span>
        <SelectFieldPrimitive.Icon asChild>
          <NavArrowDownIcon className="kb-select-icon" />
        </SelectFieldPrimitive.Icon>
      </button>
    </SelectFieldPrimitive.Trigger>
  )
})

SelectFieldTrigger.displayName = "SelectField.Trigger"

type SelectFieldContentElement = React.ElementRef<
  typeof SelectFieldPrimitive.Content
>

interface SelectFieldContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Content> {
  container?: React.ComponentPropsWithoutRef<
    typeof SelectFieldPrimitive.Portal
  >["container"]
}

const SelectFieldContent = React.forwardRef<
  SelectFieldContentElement,
  SelectFieldContentProps
>((props, forwardedRef) => {
  const { className, container, children, ...contentProps } = props
  const { size } = useSelectFieldContext("SelectField.Content")

  return (
    <SelectFieldPrimitive.Portal container={container}>
      <SelectFieldPrimitive.Content
        sideOffset={4}
        {...contentProps}
        asChild={false}
        position="popper"
        ref={forwardedRef}
        className={cn("kb-select-content", {
          "kb-select-content-sm": size === "sm",
        }, className)}
      >
        <SelectFieldPrimitive.Viewport className="kb-select-viewport">
          {children}
        </SelectFieldPrimitive.Viewport>
      </SelectFieldPrimitive.Content>
    </SelectFieldPrimitive.Portal>
  )
})
SelectFieldContent.displayName = "SelectField.Content"

type SelectFieldItemElement = React.ElementRef<typeof SelectFieldPrimitive.Item>
interface SelectFieldItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Item> {}

const SelectFieldItem = React.forwardRef<
  SelectFieldItemElement,
  SelectFieldItemProps
>((props, forwardedRef) => {
  const { className, children, ...itemProps } = props
  const { size } = useSelectFieldContext("SelectField.Item")

  return (
    <SelectFieldPrimitive.Item
      {...itemProps}
      asChild={false}
      ref={forwardedRef}
      className={cn("kb-select-item", {
        "kb-select-item-sm": size === "sm",
      }, className)}
    >
      <SelectFieldPrimitive.ItemText asChild>
        <Text as="span" className="kb-select-item-text">
          {children}
        </Text>
      </SelectFieldPrimitive.ItemText>
      <SelectFieldPrimitive.ItemIndicator className="kb-select-item-indicator">
        <CheckIcon />
      </SelectFieldPrimitive.ItemIndicator>
    </SelectFieldPrimitive.Item>
  )
})
SelectFieldItem.displayName = "SelectField.Item"

type SelectFieldGroupElement = React.ElementRef<
  typeof SelectFieldPrimitive.Group
>
interface SelectFieldGroupProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Group> {}

const SelectFieldGroup = React.forwardRef<
  SelectFieldGroupElement,
  SelectFieldGroupProps
>(({ className, ...props }, forwardedRef) => (
  <SelectFieldPrimitive.Group
    {...props}
    asChild={false}
    ref={forwardedRef}
    className={cn("kb-select-group", className)}
  />
))
SelectFieldGroup.displayName = "SelectField.Group"

type SelectFieldLabelElement = React.ElementRef<
  typeof SelectFieldPrimitive.Label
>
interface SelectFieldLabelProps
  extends React.ComponentPropsWithoutRef<typeof SelectFieldPrimitive.Label> {}

const SelectFieldGroupLabel = React.forwardRef<
  SelectFieldLabelElement,
  SelectFieldLabelProps
>(({ className, ...props }, forwardedRef) => (
  <SelectFieldPrimitive.Label
    {...props}
    asChild={false}
    ref={forwardedRef}
    className={cn("kb-select-label", className)}
  />
))

SelectFieldGroupLabel.displayName = "SelectField.GroupLabel"

type SelectFieldSeparatorElement = React.ElementRef<
  typeof SelectFieldPrimitive.Separator
>
interface SelectFieldSeparatorProps
  extends React.ComponentPropsWithoutRef<
    typeof SelectFieldPrimitive.Separator
  > {}
const SelectFieldSeparator = React.forwardRef<
  SelectFieldSeparatorElement,
  SelectFieldSeparatorProps
>(({ className, ...props }, forwardedRef) => (
  <SelectFieldPrimitive.Separator
    {...props}
    asChild={false}
    ref={forwardedRef}
    className={cn("kb-select-separator", className)}
  />
))
SelectFieldSeparator.displayName = "SelectField.Separator"

const SELECT_FIELD_ERROR_NAME = "SelectField.Error"

const SelectFieldError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useSelectFieldContext(SELECT_FIELD_ERROR_NAME)

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />
})

SelectFieldError.displayName = SELECT_FIELD_ERROR_NAME

const SELECT_FIELD_HINT_NAME = "SelectField.Error"

const SelectFieldHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useSelectFieldContext(SELECT_FIELD_HINT_NAME)

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />
})

SelectFieldHint.displayName = SELECT_FIELD_HINT_NAME

export {
  SelectFieldRoot as Root,
  SelectFieldLabel as Label,
  SelectFieldTrigger as Trigger,
  SelectFieldContent as Content,
  SelectFieldItem as Item,
  SelectFieldGroup as Group,
  SelectFieldGroupLabel as GroupLabel,
  SelectFieldSeparator as Separator,
  SelectFieldError as Error,
  SelectFieldHint as Hint,
}

export type {
  SelectFieldRootProps as RootProps,
  SelectFieldTriggerProps as TriggerProps,
  SelectFieldContentProps as ContentProps,
  SelectFieldItemProps as ItemProps,
  SelectFieldGroupProps as GroupProps,
  SelectFieldLabelProps as LabelProps,
  SelectFieldSeparatorProps as SeparatorProps,
}
