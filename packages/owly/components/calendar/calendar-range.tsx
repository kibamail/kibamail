"use client"

import * as React from "react";
import {
  DatePickerStateProvider,
  useContextCalendars,
  useContextDays,
  useContextDatePickerOffsetPropGetters,
  useContextDaysPropGetters,
} from "@rehookify/datepicker";
import { Button } from "../button/button.js";
import { NavArrowLeftIcon, NavArrowRightIcon } from "./calendar-icons.js";
import { Text } from "../text/text.js";
import cn from "classnames";

export interface CalendarRangeProps {
  dates?: Date[];
  onDatesChange?: (dates: Date[]) => void;
  minDate?: Date;
  maxDate?: Date;
  size?: "sm" | "md";
  onApply?: (dates: Date[]) => void;
  onClose?: () => void;
}

interface CalendarRangeRootProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  size?: "sm" | "md";
  onApply?: (dates: Date[]) => void;
  onClose?: () => void;
}

const CalendarRangeRoot = ({ selectedDates, onDatesChange, size = "md", onApply, onClose }: CalendarRangeRootProps) => {
  const { calendars, weekDays } = useContextCalendars();
  const { dayButton } = useContextDaysPropGetters();
  const { addOffset, subtractOffset } = useContextDatePickerOffsetPropGetters();

  const presets = [
    { label: "Last 3 days", days: 3 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 60 days", days: 60 },
    { label: "Last 90 days", days: 90 },
  ];

  const handlePresetClick = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    // Update the selected dates
    onDatesChange([start, end]);
  };

  const getDayClassName = (day: any) => {
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

    if (day.range === "in-range") {
      classNames.push("kb-calendar-day-in-range");
    }

    if (day.range === "range-start") {
      classNames.push("kb-calendar-day-range-start");
    }

    if (day.range === "range-end") {
      classNames.push("kb-calendar-day-range-end");
    }

    if (day.range === "will-be-in-range") {
      classNames.push("kb-calendar-day-will-be-in-range");
    }

    if (day.range === "will-be-range-start") {
      classNames.push("kb-calendar-day-will-be-range-start");
    }

    if (day.range === "will-be-range-end") {
      classNames.push("kb-calendar-day-will-be-range-end");
    }

    return classNames.join(" ");
  };

  return (
    <div className={cn("kb-calendar-range-wrapper", {
      "kb-calendar-range-wrapper-sm": size === "sm",
      "kb-calendar-range-wrapper-md": size === "md",
    })}>
      {/* Presets Column */}
      <div className="kb-calendar-range-presets">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className="kb-calendar-range-preset-item"
            onClick={() => handlePresetClick(preset.days)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calendars Section */}
      <div className="kb-calendar-range-calendars">
        {/* Calendars Container */}
        <div className="kb-calendar-range-months">
          <div className="kb-calendar-range-month-container">
            {calendars[0] && (
              <div className="kb-calendar-root kb-calendar-range-month">
                <div className="kb-calendar-header kb-calendar-range-header">
                  <Button
                    variant="secondary"
                    size="xs"
                    className="kb-calendar-header-button"
                    {...subtractOffset({ months: 1 })}
                  >
                    <NavArrowLeftIcon />
                  </Button>

                  <Text className="kb-calendar-header-label">
                    {calendars[0].month} {calendars[0].year}
                  </Text>

                  <div className="kb-calendar-header-spacer" />
                </div>

                <div className="kb-calendar-week-days">
                  {weekDays.map((day) => (
                    <span className="kb-calendar-week-day" key={day}>
                      {day.slice(0, -1)}
                    </span>
                  ))}
                </div>

                <div className="kb-calendar-days-grid">
                  {calendars[0].days.map((day) => (
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
            )}
          </div>

          <div className="kb-calendar-range-divider" />

          <div className="kb-calendar-range-month-container">
            {calendars[1] && (
              <div className="kb-calendar-root kb-calendar-range-month">
                <div className="kb-calendar-header kb-calendar-range-header">
                  <div className="kb-calendar-header-spacer" />

                  <Text className="kb-calendar-header-label">
                    {calendars[1].month} {calendars[1].year}
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
                  {calendars[1].days.map((day) => (
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="kb-calendar-range-footer">
          <div className="kb-calendar-range-footer-content">
            <Text className="kb-calendar-range-footer-label">
              Range: {selectedDates.length === 2
                ? `${selectedDates[0].toLocaleDateString()} - ${selectedDates[1].toLocaleDateString()}`
                : 'Select dates'}
            </Text>
            <div className="kb-calendar-range-footer-actions">
              <Button variant="tertiary" size={size === "sm" ? "xs" : "sm"} onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size={size === "sm" ? "xs" : "sm"}
                onClick={() => onApply?.(selectedDates)}
                disabled={selectedDates.length !== 2}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarRange = ({
  dates: selectedDatesProp,
  onDatesChange: onDatesChangeProp,
  minDate,
  maxDate,
  size = "md",
  onApply,
  onClose,
}: CalendarRangeProps) => {
  const now = new Date();
  const [selectedDates, onDatesChange] = React.useState<Date[]>(
    selectedDatesProp || []
  );
  const [offsetDate, onOffsetChange] = React.useState<Date>(now);

  React.useEffect(() => {
    if (selectedDatesProp) {
      onDatesChange(selectedDatesProp);
    }
  }, [selectedDatesProp]);

  React.useEffect(() => {
    if (onDatesChangeProp) {
      onDatesChangeProp(selectedDates);
    }
  }, [selectedDates, onDatesChangeProp]);

  return (
    <DatePickerStateProvider
      config={{
        selectedDates,
        onDatesChange,
        offsetDate,
        onOffsetChange,
        dates: {
          mode: "range",
          minDate,
          maxDate,
        },
        calendar: {
          offsets: [1], // [0] is implicit, so [1] gives us current month + next month
        },
      }}
    >
      <CalendarRangeRoot
        selectedDates={selectedDates}
        onDatesChange={onDatesChange}
        size={size}
        onApply={onApply}
        onClose={onClose}
      />
    </DatePickerStateProvider>
  );
};

CalendarRange.displayName = "CalendarRange";

export { CalendarRange };
