"use client";

import * as DropdownMenu from "@kibamail/owly/dropdown-menu";
import { Button } from "@kibamail/owly/button";
import { Filter } from "iconoir-react";

interface WebhookStatusFilterProps {
  value: "all" | "success" | "failed";
  onChange: (value: "all" | "success" | "failed") => void;
}

const statusLabels = {
  all: "All statuses",
  success: "Success",
  failed: "Failed",
};

export function WebhookStatusFilter({
  value,
  onChange,
}: WebhookStatusFilterProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="sm">
          <Filter className="w-4 h-4" />
          {statusLabels[value]}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" className="w-48">
        <DropdownMenu.Item onClick={() => onChange("all")}>
          {statusLabels.all}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onChange("success")}>
          {statusLabels.success}
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onChange("failed")}>
          {statusLabels.failed}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
