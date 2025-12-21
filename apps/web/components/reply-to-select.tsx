"use client";

import * as Select from "@kibamail/owly/select-field";
import type { TransformedSenderIdentity } from "@/components/sender-select";

interface ReplyToSelectProps {
  senderIdentities: TransformedSenderIdentity[];
  value?: string;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}

export function ReplyToSelect({
  senderIdentities,
  value,
  onChange,
  disabled = false,
}: ReplyToSelectProps) {
  function onValueChange(selectedValue: string) {
    if (selectedValue === "__none__") {
      onChange(undefined);
    } else {
      onChange(selectedValue);
    }
  }

  return (
    <Select.Root
      value={value || "__none__"}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Label>Reply to</Select.Label>
      <Select.Trigger placeholder="Same as sender" />
      <Select.Content className="z-50">
        <Select.Item value="__none__">
          <span className="text-kb-content-secondary">Same as sender</span>
        </Select.Item>
        {senderIdentities.map((identity) => (
          <Select.Item key={identity.id} value={identity.id}>
            <span>{identity.email}</span>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
