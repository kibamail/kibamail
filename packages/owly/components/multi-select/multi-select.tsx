"use client"

import cn from "classnames"
import * as React from "react"
import { composeRefs } from "@radix-ui/react-compose-refs"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useId } from "@radix-ui/react-id"
import { NavArrowDownIcon } from "../select-field/select-field.icons.js"
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
import { Checkbox } from "../checkbox/checkbox.js"
import { useControllableState } from "@radix-ui/react-use-controllable-state"

type HiddenMultiSelectInputElement = React.ElementRef<"input">

type HiddenInputProps = Pick<
  React.ComponentPropsWithoutRef<"input">,
  "style" | "name" | "aria-label" | "aria-labelledby"
>

export const sizes = ["regular", "sm"] as const

const MULTI_SELECT_NAME = "MultiSelect"
const [MultiSelectProvider, useMultiSelectContext] = createContext<{
  baseId: string
  size: (typeof sizes)[number]
  selectedValues: string[]
  onValueToggle: (value: string) => void
  disabled?: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
}>(MULTI_SELECT_NAME)

interface MultiSelectRootProps extends HiddenInputProps {
  className?: string
  children?: React.ReactNode
  size?: (typeof sizes)[number]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  disabled?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const MultiSelectRoot = React.forwardRef<
  HiddenMultiSelectInputElement,
  MultiSelectRootProps
>((props, forwardedRef) => {
  const {
    children,
    name,
    className,
    size = "regular",
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    value,
    defaultValue = [],
    onValueChange,
    disabled,
    open,
    defaultOpen,
    onOpenChange,
  } = props

  const hiddenInputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const [selectedValues = [], setSelectedValues] = useControllableState({
    defaultProp: defaultValue,
    prop: value,
    onChange: onValueChange,
  })

  const allChildren = React.Children.toArray(children)

  const isInvalid = allChildren.some(
    (child) => React.isValidElement(child) && child.type === MultiSelectError
  )

  function syncHiddenInputValue(values: string[]) {
    const input = hiddenInputRef.current

    if (!input) return

    input.value = values.join(",")
  }

  function onValueToggle(value: string) {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]

    setSelectedValues(newValues)
    syncHiddenInputValue(newValues)
  }

  const baseId = useId()

  return (
    <MultiSelectProvider
      baseId={baseId}
      size={size}
      selectedValues={selectedValues}
      onValueToggle={onValueToggle}
      disabled={disabled}
      triggerRef={triggerRef}
    >
      <PopoverPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <input
          type="hidden"
          name={name}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          defaultValue={defaultValue.join(",")}
          ref={composeRefs(hiddenInputRef, forwardedRef)}
        />
        <div
          data-invalid={isInvalid}
          data-disabled={disabled}
          className={cn("kb-multi-select-root", {
            "kb-size-sm": size === "sm",
          }, className)}
        >
          {children}
        </div>
      </PopoverPrimitive.Root>
    </MultiSelectProvider>
  )
})

MultiSelectRoot.displayName = "MultiSelect.Root"

const MultiSelectLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />
  }
)

MultiSelectLabel.displayName = "MultiSelect.Label"

type MultiSelectTriggerElement = React.ElementRef<
  typeof PopoverPrimitive.Trigger
>

export interface MultiSelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
  placeholder?: string
}

const MultiSelectTrigger = React.forwardRef<
  MultiSelectTriggerElement,
  MultiSelectTriggerProps
>((props, forwardedRef) => {
  const { baseId, selectedValues, disabled, triggerRef } = useMultiSelectContext(
    "MultiSelect.Trigger"
  )
  const { children, className, placeholder, ...triggerProps } = props

  const displayText =
    selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : placeholder || "Select items"

  return (
    <PopoverPrimitive.Trigger asChild disabled={disabled}>
      <button
        {...triggerProps}
        ref={composeRefs(forwardedRef, triggerRef)}
        disabled={disabled}
        data-disabled={disabled || undefined}
        aria-describedby={[makeErrorId(baseId), makeHintId(baseId)].join(" ")}
        className={cn("kb-reset", "kb-multi-select-trigger", className)}
        data-placeholder={selectedValues.length === 0 ? "" : undefined}
      >
        <span className="kb-multi-select-trigger-inner">
          <Text as="span" className="kb-multi-select-trigger-text">
            {displayText}
          </Text>
        </span>
        <NavArrowDownIcon className="kb-multi-select-icon" />
      </button>
    </PopoverPrimitive.Trigger>
  )
})

MultiSelectTrigger.displayName = "MultiSelect.Trigger"

type MultiSelectContentElement = React.ElementRef<
  typeof PopoverPrimitive.Content
>

interface MultiSelectContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  container?: React.ComponentPropsWithoutRef<
    typeof PopoverPrimitive.Portal
  >["container"]
}

const MultiSelectContent = React.forwardRef<
  MultiSelectContentElement,
  MultiSelectContentProps
>((props, forwardedRef) => {
  const { className, container, children, ...contentProps } = props
  const { triggerRef, size } = useMultiSelectContext("MultiSelect.Content")
  const [triggerWidth, setTriggerWidth] = React.useState(0)

  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [triggerRef])

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        sideOffset={4}
        {...contentProps}
        align="start"
        ref={forwardedRef}
        style={{ width: triggerWidth || undefined, ...contentProps.style }}
        className={cn("kb-multi-select-content", {
          "kb-multi-select-content-sm": size === "sm",
        }, className)}
      >
        <div className="kb-multi-select-viewport">{children}</div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
MultiSelectContent.displayName = "MultiSelect.Content"

type MultiSelectItemElement = React.ElementRef<"div">
interface MultiSelectItemProps
  extends React.ComponentPropsWithoutRef<"div"> {
  value: string
  disabled?: boolean
}

const MultiSelectItem = React.forwardRef<
  MultiSelectItemElement,
  MultiSelectItemProps
>((props, forwardedRef) => {
  const { className, children, value, disabled, onClick, ...itemProps } = props
  const { selectedValues, onValueToggle, disabled: contextDisabled, size } =
    useMultiSelectContext("MultiSelect.Item")

  const isSelected = selectedValues.includes(value)
  const isDisabled = disabled || contextDisabled

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return
    onValueToggle(value)
    onClick?.(event)
  }

  return (
    <div
      {...itemProps}
      ref={forwardedRef}
      data-disabled={isDisabled || undefined}
      data-selected={isSelected || undefined}
      onClick={handleClick}
      className={cn("kb-multi-select-item", {
        "kb-multi-select-item-sm": size === "sm",
      }, className)}
    >
      <Text as="span" className="kb-multi-select-item-text">
        {children}
      </Text>
      <div className="kb-multi-select-item-indicator">
        <Checkbox
          variant="circle"
          size="sm"
          checked={isSelected}
          disabled={isDisabled}
          onCheckedChange={() => {}}
          tabIndex={-1}
        />
      </div>
    </div>
  )
})
MultiSelectItem.displayName = "MultiSelect.Item"

type MultiSelectGroupElement = React.ElementRef<"div">
interface MultiSelectGroupProps extends React.ComponentPropsWithoutRef<"div"> {}

const MultiSelectGroup = React.forwardRef<
  MultiSelectGroupElement,
  MultiSelectGroupProps
>(({ className, ...props }, forwardedRef) => (
  <div
    {...props}
    ref={forwardedRef}
    className={cn("kb-multi-select-group", className)}
  />
))
MultiSelectGroup.displayName = "MultiSelect.Group"

type MultiSelectLabelElement = React.ElementRef<"div">
interface MultiSelectLabelProps extends React.ComponentPropsWithoutRef<"div"> {}

const MultiSelectGroupLabel = React.forwardRef<
  MultiSelectLabelElement,
  MultiSelectLabelProps
>(({ className, ...props }, forwardedRef) => (
  <div
    {...props}
    ref={forwardedRef}
    className={cn("kb-multi-select-label", className)}
  />
))

MultiSelectGroupLabel.displayName = "MultiSelect.GroupLabel"

type MultiSelectSeparatorElement = React.ElementRef<"div">
interface MultiSelectSeparatorProps
  extends React.ComponentPropsWithoutRef<"div"> {}
const MultiSelectSeparator = React.forwardRef<
  MultiSelectSeparatorElement,
  MultiSelectSeparatorProps
>(({ className, ...props }, forwardedRef) => (
  <div
    {...props}
    ref={forwardedRef}
    className={cn("kb-multi-select-separator", className)}
  />
))
MultiSelectSeparator.displayName = "MultiSelect.Separator"

const MULTI_SELECT_ERROR_NAME = "MultiSelect.Error"

const MultiSelectError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useMultiSelectContext(MULTI_SELECT_ERROR_NAME)

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />
})

MultiSelectError.displayName = MULTI_SELECT_ERROR_NAME

const MULTI_SELECT_HINT_NAME = "MultiSelect.Hint"

const MultiSelectHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useMultiSelectContext(MULTI_SELECT_HINT_NAME)

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />
})

MultiSelectHint.displayName = MULTI_SELECT_HINT_NAME

export {
  MultiSelectRoot as Root,
  MultiSelectLabel as Label,
  MultiSelectTrigger as Trigger,
  MultiSelectContent as Content,
  MultiSelectItem as Item,
  MultiSelectGroup as Group,
  MultiSelectGroupLabel as GroupLabel,
  MultiSelectSeparator as Separator,
  MultiSelectError as Error,
  MultiSelectHint as Hint,
}

export type {
  MultiSelectRootProps as RootProps,
  MultiSelectTriggerProps as TriggerProps,
  MultiSelectContentProps as ContentProps,
  MultiSelectItemProps as ItemProps,
  MultiSelectGroupProps as GroupProps,
  MultiSelectLabelProps as LabelProps,
  MultiSelectSeparatorProps as SeparatorProps,
}
