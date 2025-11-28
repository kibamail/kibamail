"use client"

import * as React from "react"
import cn from "classnames"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useControllableState } from "@radix-ui/react-use-controllable-state"
import { createContext } from "@radix-ui/react-context"
import { useId } from "@radix-ui/react-id"
import * as TextField from "../text-field/text-field.js"
import { Calendar } from "../calendar/calendar.js"
import type {
  InputLabelElement,
  InputLabelProps,
} from "../input-label/input-label.js"
import type {
  InputHintElement,
  InputHintProps,
} from "../input-hint/input-hint.js"

// Calendar Icon Component
const CalendarIcon = React.forwardRef<
  React.ElementRef<"svg">,
  React.ComponentPropsWithoutRef<"svg">
>((props, forwardedRef) => {
  return (
    <svg
      width="18"
      height="18"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
      {...props}
      ref={forwardedRef}
    >
      <path
        d="M15 4V2M15 4V6M15 4H10.5M3 10V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V10H3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 10V6C3 4.89543 3.89543 4 5 4H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 2V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 10V6C21 4.89543 20.1046 4 19 4H18.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

CalendarIcon.displayName = "CalendarIcon";

const DATE_FIELD_NAME = "DateField"
const [DateFieldProvider, useDateFieldContext] = createContext<{
  baseId: string
}>(DATE_FIELD_NAME)

export const sizes = ["regular", "sm"] as const

export interface DateFieldProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "size" | "value" | "defaultValue" | "onChange"> {
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date | undefined) => void
  size?: (typeof sizes)[number]
  label?: string
  error?: string
  hint?: string
}

const DateFieldRoot = React.forwardRef<HTMLInputElement, DateFieldProps>(
  (props, forwardedRef) => {
    const {
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder = "Select date",
      disabled,
      size = "regular",
      className,
      name,
      label,
      error,
      hint,
      children,
      ...inputProps
    } = props

    const baseId = useId()
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue,
      onChange: onValueChange,
    })

    const handleDateChange = (dates: Date[]) => {
      if (dates.length > 0) {
        setValue(dates[0])
        setOpen(false)
      }
    }

    const formatDate = (date: Date | undefined) => {
      if (!date) return ""
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }

    return (
      <DateFieldProvider baseId={baseId}>
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <PopoverPrimitive.Trigger asChild disabled={disabled}>
            <div className={cn("kb-date-field-root", className)}>
              <TextField.Root
                ref={forwardedRef}
                type="text"
                size={size}
                value={formatDate(value)}
                placeholder={placeholder}
                readOnly
                disabled={disabled}
                name={name}
                {...inputProps}
              >
                {label && <TextField.Label>{label}</TextField.Label>}
                <TextField.Slot side="left">
                  <CalendarIcon />
                </TextField.Slot>
                {children}
                {error && <TextField.Error>{error}</TextField.Error>}
                {hint && <TextField.Hint>{hint}</TextField.Hint>}
              </TextField.Root>
            </div>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className="kb-date-field-content"
              align="start"
              sideOffset={4}
            >
              <Calendar
                size={size === "sm" ? "sm" : "md"}
                dates={value ? [value] : []}
                onDatesChange={handleDateChange}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </DateFieldProvider>
    )
  }
)

DateFieldRoot.displayName = "DateField.Root"

const DateFieldSlot = React.forwardRef<
  React.ElementRef<typeof TextField.Slot>,
  React.ComponentPropsWithoutRef<typeof TextField.Slot>
>((props, forwardedRef) => {
  return <TextField.Slot {...props} ref={forwardedRef} />
})

DateFieldSlot.displayName = "DateField.Slot"

const DATE_FIELD_HINT_NAME = "DateField.Hint"

const DateFieldHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useDateFieldContext(DATE_FIELD_HINT_NAME)

  return <TextField.Hint {...props} ref={forwardedRef} />
})

DateFieldHint.displayName = "DateField.Hint"

const DATE_FIELD_ERROR_NAME = "DateField.Error"

const DateFieldError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useDateFieldContext(DATE_FIELD_ERROR_NAME)

  return <TextField.Error {...props} ref={forwardedRef} />
})

DateFieldError.displayName = "DateField.Error"

const DateFieldLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <TextField.Label {...props} ref={forwardedRef} />
  }
)

DateFieldLabel.displayName = "DateField.Label"

const DateFieldHintIcon = TextField.HintIcon

DateFieldHintIcon.displayName = "DateField.HintIcon"

export {
  //
  DateFieldRoot,
  DateFieldSlot,
  DateFieldHint,
  DateFieldHintIcon,
  DateFieldError,
  DateFieldLabel,

  //
  DateFieldRoot as Root,
  DateFieldSlot as Slot,
  DateFieldHint as Hint,
  DateFieldHintIcon as HintIcon,
  DateFieldError as Error,
  DateFieldLabel as Label,
}
