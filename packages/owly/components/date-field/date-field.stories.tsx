import React, { useState } from "react"
import type { Meta, StoryFn } from "@storybook/react"
import * as DateField from "./date-field"
import * as DateRangeField from "./date-range-field"

const meta = {
  title: "Components/DateField",
} satisfies Meta<typeof DateField.Root>

export default meta

type DateFieldStoryFn = StoryFn<typeof DateField.Root>

export const Default: DateFieldStoryFn = () => {
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h3 style={{ marginBottom: "16px" }}>DateField</h3>
      <DateField.Root
        value={date}
        onValueChange={setDate}
        placeholder="Select a date"
      />
      {date && (
        <div style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
          Selected: {date.toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

export const WithLabelAndHint: DateFieldStoryFn = () => {
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h3 style={{ marginBottom: "16px" }}>DateField with Label and Hint</h3>
      <DateField.Root
        value={date}
        onValueChange={setDate}
        placeholder="Select a date"
        label="Birth Date"
        hint="Select your date of birth"
      />
    </div>
  )
}

export const WithError: DateFieldStoryFn = () => {
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h3 style={{ marginBottom: "16px" }}>DateField with Error</h3>
      <DateField.Root
        value={date}
        onValueChange={setDate}
        placeholder="Select a date"
        label="Event Date"
        error="This field is required"
      />
    </div>
  )
}

export const Sizes: DateFieldStoryFn = () => {
  const [regularDate, setRegularDate] = useState<Date | undefined>(undefined)
  const [smallDate, setSmallDate] = useState<Date | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Regular Size</h5>
        <DateField.Root
          size="regular"
          value={regularDate}
          onValueChange={setRegularDate}
          placeholder="Select a date"
          label="Date"
        />
      </div>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Small Size</h5>
        <DateField.Root
          size="sm"
          value={smallDate}
          onValueChange={setSmallDate}
          placeholder="Select a date"
          label="Date"
        />
      </div>
    </div>
  )
}

export const DateRange: DateFieldStoryFn = () => {
  const [dateRange, setDateRange] = useState<[Date, Date] | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "600px" }}>
      <h3 style={{ marginBottom: "16px" }}>DateRangeField</h3>
      <DateRangeField.Root
        value={dateRange}
        onValueChange={setDateRange}
        placeholder="Select date range"
        label="Date Range"
        hint="Select a start and end date"
      />
    </div>
  )
}

export const DateRangeSizes: DateFieldStoryFn = () => {
  const [regularRange, setRegularRange] = useState<[Date, Date] | undefined>(undefined)
  const [smallRange, setSmallRange] = useState<[Date, Date] | undefined>(undefined)

  return (
    <div style={{ padding: "40px", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Regular Size</h5>
        <DateRangeField.Root
          size="regular"
          value={regularRange}
          onValueChange={setRegularRange}
          placeholder="Select date range"
          label="Date Range"
        />
      </div>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Small Size</h5>
        <DateRangeField.Root
          size="sm"
          value={smallRange}
          onValueChange={setSmallRange}
          placeholder="Select date range"
          label="Date Range"
        />
      </div>
    </div>
  )
}

export const Disabled: DateFieldStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Disabled DateField</h5>
        <DateField.Root
          disabled
          placeholder="Select a date"
          label="Date"
        />
      </div>
      <div>
        <h5 style={{ marginBottom: "8px" }}>Disabled DateRangeField</h5>
        <DateRangeField.Root
          disabled
          placeholder="Select date range"
          label="Date Range"
        />
      </div>
    </div>
  )
}

export const WithCalendarIcon: DateFieldStoryFn = () => {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h3 style={{ marginBottom: "16px" }}>DateField with Calendar Icon</h3>
      <p style={{ marginBottom: "16px", fontSize: "14px", color: "#666" }}>
        Notice the calendar icon in the left slot of the input field.
      </p>
      <DateField.Root
        value={date}
        onValueChange={setDate}
        placeholder="Select a date"
        label="Event Date"
        hint="Click to open the calendar picker"
      />
      {date && (
        <div style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
          Selected: {date.toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
