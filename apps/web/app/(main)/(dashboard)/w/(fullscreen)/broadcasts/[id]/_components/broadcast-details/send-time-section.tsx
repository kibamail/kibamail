"use client";

import * as Select from "@kibamail/owly/select-field";
import * as DateField from "@kibamail/owly/date-field";
import { Text } from "@kibamail/owly/text";
import { SectionHeader, SectionSaveButton } from "./shared";
import { useSendTime } from "./use-send-time";
import type { BroadcastDetails } from "./types";

interface SendTimeSectionProps {
  sendAt?: Date;
  onChange: (updates: Partial<BroadcastDetails>) => void;
  onSave: () => void;
  isSaving: boolean;
  readonly?: boolean;
}

export function SendTimeSection({
  sendAt,
  onChange,
  onSave,
  isSaving,
  readonly = false,
}: SendTimeSectionProps) {
  const {
    selectedDate,
    selectedTime,
    availableTimeOptions,
    onDateChange,
    onTimeChange,
    relativeTimeString,
  } = useSendTime({
    sendAt,
    onChange: (newSendAt) => onChange({ sendAt: newSendAt }),
  });

  return (
    <section>
      <SectionHeader
        title="Send time"
        description="Schedule when this broadcast should be sent. Leave empty to send immediately when you click Send."
      />

      <div className="flex gap-4">
        <div className="flex-1">
          <DateField.Root
            value={selectedDate}
            onValueChange={onDateChange}
            placeholder="Select date"
            label="Date"
            disabled={readonly}
          />
        </div>
        <div className="flex-1 max-w-36">
          <Select.Root value={selectedTime} onValueChange={onTimeChange} disabled={readonly}>
            <Select.Label>Time</Select.Label>
            <Select.Trigger placeholder="Select time" />
            <Select.Content className="z-50 max-h-60">
              {availableTimeOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {relativeTimeString && (
        <Text size="sm" className="text-kb-content-secondary mt-3">
          This broadcast will be sent out {relativeTimeString}.
        </Text>
      )}

      {!readonly && <SectionSaveButton onSave={onSave} isSaving={isSaving} />}
    </section>
  );
}
