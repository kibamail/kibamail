"use client";

import { Button } from "@kibamail/owly/button";
import { Checkbox } from "@kibamail/owly/checkbox";
import * as Popover from "@kibamail/owly/popover";
import type { ContactProperty } from "@prisma/client";
import { ViewColumns3 } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ContactColumnsSelectorProps {
  contactProperties: Pick<ContactProperty, "name">[];
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

// Built-in columns that are always available
const BUILT_IN_COLUMNS = [
  { id: "email", label: "Email" },
  { id: "firstName", label: "First Name" },
  { id: "lastName", label: "Last Name" },
  { id: "status", label: "Status" },
  { id: "subscribedAt", label: "Subscribed At" },
];

export function ContactColumnsSelector({
  contactProperties,
  selectedColumns,
  onColumnsChange,
}: ContactColumnsSelectorProps) {
  const router = useRouter();
  const [pendingColumns, setPendingColumns] = useState(selectedColumns);

  function handleToggleColumn(columnId: string) {
    const newColumns = pendingColumns.includes(columnId)
      ? pendingColumns.filter((id) => id !== columnId)
      : [...pendingColumns, columnId];

    setPendingColumns(newColumns);
    onColumnsChange(newColumns);
    router.refresh();
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secondary" size="sm">
          <ViewColumns3 className="w-4 h-4" />
          Columns
        </Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        className="w-64 max-h-96 overflow-y-auto bg-kb-surface-primary border border-kb-stroke-secondary rounded-lg shadow-lg p-2"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-kb-content-tertiary">
          Built-in Columns
        </div>
        {BUILT_IN_COLUMNS.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => handleToggleColumn(column.id)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-kb-content-primary hover:bg-kb-surface-secondary rounded cursor-pointer"
          >
            <Checkbox checked={pendingColumns.includes(column.id)} />
            {column.label}
          </button>
        ))}

        {contactProperties.length > 0 && (
          <>
            <div className="h-px bg-kb-stroke-secondary my-2" />
            <div className="px-2 py-1.5 text-xs font-semibold text-kb-content-tertiary">
              Custom Properties
            </div>
            {contactProperties.map((property) => (
              <button
                key={property.name}
                type="button"
                onClick={() => handleToggleColumn(property.name)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-kb-content-primary hover:bg-kb-surface-secondary rounded cursor-pointer"
              >
                <Checkbox checked={pendingColumns.includes(property.name)} />
                {property.name}
              </button>
            ))}
          </>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
