"use client"

import * as React from "react"
import cn from "classnames"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useControllableState } from "@radix-ui/react-use-controllable-state"
import { createContext } from "@radix-ui/react-context"
import { useId } from "@radix-ui/react-id"
import * as TextField from "../text-field/text-field.js"
import { CalendarRange } from "../calendar/calendar-range.js"
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

const DATE_RANGE_FIELD_NAME = "DateRangeField"
const [DateRangeFieldProvider, useDateRangeFieldContext] = createContext<{
  baseId: string
}>(DATE_RANGE_FIELD_NAME)

export const sizes = ["regular", "sm"] as const

export interface DateRangeFieldProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "size" | "value" | "defaultValue" | "onChange"> {
  value?: [Date, Date] | undefined
  defaultValue?: [Date, Date]
  onValueChange?: (dates: [Date, Date] | undefined) => void
  size?: (typeof sizes)[number]
  label?: string
  error?: string
  hint?: string
}

const DateRangeFieldRoot = React.forwardRef<HTMLInputElement, DateRangeFieldProps>(
  (props, forwardedRef) => {
    const {
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder = "Select date range",
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

    const handleApply = (dates: Date[]) => {
      if (dates.length === 2) {
        setValue([dates[0], dates[1]] as [Date, Date])
        setOpen(false)
      }
    }

    const handleClose = () => {
      setOpen(false)
    }

    const formatDateRange = (dates: [Date, Date] | undefined) => {
      if (!dates || dates.length !== 2) return ""
      const [start, end] = dates
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    }

    return (
      <DateRangeFieldProvider baseId={baseId}>
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <PopoverPrimitive.Trigger asChild disabled={disabled}>
            <div className={cn("kb-date-range-field-root", className)}>
              <TextField.Root
                ref={forwardedRef}
                type="text"
                size={size}
                value={formatDateRange(value)}
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
              className="kb-date-range-field-content"
              align="start"
              sideOffset={4}
            >
              <CalendarRange
                size={size === "sm" ? "sm" : "md"}
                dates={value ? [...value] : []}
                onApply={handleApply}
                onClose={handleClose}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </DateRangeFieldProvider>
    )
  }
)

DateRangeFieldRoot.displayName = "DateRangeField.Root"

const DateRangeFieldSlot = React.forwardRef<
  React.ElementRef<typeof TextField.Slot>,
  React.ComponentPropsWithoutRef<typeof TextField.Slot>
>((props, forwardedRef) => {
  return <TextField.Slot {...props} ref={forwardedRef} />
})

DateRangeFieldSlot.displayName = "DateRangeField.Slot"

const DATE_RANGE_FIELD_HINT_NAME = "DateRangeField.Hint"

const DateRangeFieldHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useDateRangeFieldContext(DATE_RANGE_FIELD_HINT_NAME)

  return <TextField.Hint {...props} ref={forwardedRef} />
})

DateRangeFieldHint.displayName = "DateRangeField.Hint"

const DATE_RANGE_FIELD_ERROR_NAME = "DateRangeField.Error"

const DateRangeFieldError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useDateRangeFieldContext(DATE_RANGE_FIELD_ERROR_NAME)

  return <TextField.Error {...props} ref={forwardedRef} />
})

DateRangeFieldError.displayName = "DateRangeField.Error"

const DateRangeFieldLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <TextField.Label {...props} ref={forwardedRef} />
  }
)

DateRangeFieldLabel.displayName = "DateRangeField.Label"

const DateRangeFieldHintIcon = TextField.HintIcon

DateRangeFieldHintIcon.displayName = "DateRangeField.HintIcon"

export {
  //
  DateRangeFieldRoot,
  DateRangeFieldSlot,
  DateRangeFieldHint,
  DateRangeFieldHintIcon,
  DateRangeFieldError,
  DateRangeFieldLabel,

  //
  DateRangeFieldRoot as Root,
  DateRangeFieldSlot as Slot,
  DateRangeFieldHint as Hint,
  DateRangeFieldHintIcon as HintIcon,
  DateRangeFieldError as Error,
  DateRangeFieldLabel as Label,
}
