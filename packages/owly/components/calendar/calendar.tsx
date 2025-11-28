"use client"

import * as React from "react";
import cn from "classnames";
import {
  useDatePicker,
  type DPDay,
  type DPUserConfig,
} from "@rehookify/datepicker";
import { Button } from "../button/button.js";
import { NavArrowLeftIcon, NavArrowRightIcon } from "./calendar-icons.js";
import { Text } from "../text/text.js";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

export interface CalendarProps {
  dates?: Date[];
  onDatesChange?: (dates: Date[]) => void;
  size?: "sm" | "md";
  datePickerProps?: Partial<DPUserConfig>;
}

const Calendar = ({
  dates: prop,
  datePickerProps,
  onDatesChange: onDatesChangeProp,
  size = "md",
}: CalendarProps) => {
  const [selectedDates, onDatesChange] = useControllableState<Date[]>({
    prop,
    defaultProp: [],
    onChange: onDatesChangeProp,
  });

  const {
    data: { calendars, weekDays, formattedDates, months, years },
    propGetters: { dayButton, addOffset, subtractOffset },
  } = useDatePicker({
    selectedDates: selectedDates ?? [],
    onDatesChange,
    ...datePickerProps,
  });

  const { month, year, days } = calendars[0];

  function getDayClassName(day: DPDay) {
    const classNames = ["kb-calendar-day"];

    if (day.disabled) {
      classNames.push("kb-calendar-day-disabled");
    }

    if (day.selected) {
      classNames.push("kb-calendar-day-selected");
    }

    if (day.inCurrentMonth) {
      classNames.push("kb-calendar-day-in-current-month");
    }

    if (day.now) {
      classNames.push("kb-calendar-day-now");
    }

    return classNames.join(" ");
  }

  return (
    <div className={cn("kb-calendar-root", {
      "kb-calendar-root-sm": size === "sm",
      "kb-calendar-root-md": size === "md",
    })}>
      <div className="kb-calendar-header">
        <Button
          variant="secondary"
          size="xs"
          className="kb-calendar-header-button"
          {...subtractOffset({ months: 1 })}
        >
          <NavArrowLeftIcon />
        </Button>

        <Text className="kb-calendar-header-label">
          {month} {year}
        </Text>

        <Button
          variant="secondary"
          size="xs"
          className="kb-calendar-header-button"
          {...addOffset({ months: 1 })}
        >
          <NavArrowRightIcon />
        </Button>
      </div>

      <div className="kb-calendar-week-days">
        {weekDays.map((day) => (
          <span className="kb-calendar-week-day" key={day}>
            {day.slice(0, -1)}
          </span>
        ))}
      </div>

      <div className="kb-calendar-days-grid">
        {days.map((day) => (
          <button
            className={getDayClassName(day)}
            key={day.$date.toString()}
            {...dayButton(day)}
          >
            <Text>{day.day}</Text>
          </button>
        ))}
      </div>
    </div>
  );
};
Calendar.displayName = "Calendar";

export { Calendar };
