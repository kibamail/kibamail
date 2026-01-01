"use client";

import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { Button } from "@kibamail/owly/button";
import { Calendar } from "iconoir-react";

interface WebhookEventsFilterProps {
  value: "24h" | "14d" | "30d";
  onChange: (value: "24h" | "14d" | "30d") => void;
}

const timePeriodLabels = {
  "24h": "Last 24 hours",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
};

export function WebhookEventsFilter({
  value,
  onChange,
}: WebhookEventsFilterProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <Calendar className="w-4 h-4" />
          {timePeriodLabels[value]}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" className="w-48">
        <DropdownMenu.Item onClick={() => onChange("24h")}>
          {timePeriodLabels["24h"]}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onChange("14d")}>
          {timePeriodLabels["14d"]}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onChange("30d")}>
          {timePeriodLabels["30d"]}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
