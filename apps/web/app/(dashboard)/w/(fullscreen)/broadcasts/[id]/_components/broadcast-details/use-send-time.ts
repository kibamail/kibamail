import { useCallback, useMemo } from "react";
import dayjs from "dayjs";

interface TimeOption {
  value: string;
  label: string;
}

// Generate time options from midnight to 11:30pm in 30-minute intervals
function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = dayjs().hour(hour).minute(minute);
      const value = time.format("HH:mm");
      const label = time.format("h:mm A");
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

interface UseSendTimeProps {
  sendAt?: Date;
  onChange: (sendAt: Date | undefined) => void;
}

export function useSendTime({ sendAt, onChange }: UseSendTimeProps) {
  // Extract date from sendAt (start of day)
  const selectedDate = useMemo(() => {
    if (!sendAt) return undefined;
    return dayjs(sendAt).startOf("day").toDate();
  }, [sendAt]);

  // Extract time from sendAt (HH:mm format)
  const selectedTime = useMemo(() => {
    if (!sendAt) return "";
    return dayjs(sendAt).format("HH:mm");
  }, [sendAt]);

  // Check if selected date is today
  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    return dayjs(selectedDate).isSame(dayjs(), "day");
  }, [selectedDate]);

  // Filter time options to exclude past times when today is selected
  const availableTimeOptions = useMemo(() => {
    if (!isToday) return TIME_OPTIONS;

    const now = dayjs();
    const currentMinutes = now.hour() * 60 + now.minute();

    return TIME_OPTIONS.filter((option) => {
      const [hours, minutes] = option.value.split(":").map(Number);
      const optionMinutes = hours * 60 + minutes;
      return optionMinutes > currentMinutes;
    });
  }, [isToday]);

  // Combine date and time into a single Date object
  const combineDateAndTime = useCallback(
    (date: Date | undefined, time: string) => {
      if (!date) {
        onChange(undefined);
        return;
      }

      if (!time) {
        // If no time selected, default to start of day
        onChange(dayjs(date).startOf("day").toDate());
        return;
      }

      const [hours, minutes] = time.split(":").map(Number);
      const combined = dayjs(date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .toDate();
      onChange(combined);
    },
    [onChange]
  );

  // Handle date change with validation
  const onDateChange = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        combineDateAndTime(date, selectedTime);
        return;
      }

      // If switching to today, check if current time is still valid
      const isSwitchingToToday = dayjs(date).isSame(dayjs(), "day");
      if (isSwitchingToToday && selectedTime) {
        const now = dayjs();
        const currentMinutes = now.hour() * 60 + now.minute();
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const selectedMinutes = hours * 60 + minutes;

        // If selected time is in the past, clear it
        if (selectedMinutes <= currentMinutes) {
          combineDateAndTime(date, "");
          return;
        }
      }

      combineDateAndTime(date, selectedTime);
    },
    [combineDateAndTime, selectedTime]
  );

  // Handle time change
  const onTimeChange = useCallback(
    (time: string) => {
      combineDateAndTime(selectedDate, time);
    },
    [combineDateAndTime, selectedDate]
  );

  // Get relative time string for display
  const relativeTimeString = useMemo(() => {
    if (!sendAt) return null;
    return dayjs(sendAt).fromNow();
  }, [sendAt]);

  return {
    selectedDate,
    selectedTime,
    availableTimeOptions,
    onDateChange,
    onTimeChange,
    relativeTimeString,
  };
}
