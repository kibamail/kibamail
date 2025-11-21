"use client";

import type { ContactProperty } from "@prisma/client";
import { ContactColumnsSelector } from "./contact-columns-selector";

interface ContactColumnsManagerProps {
  contactProperties: Pick<ContactProperty, "name">[];
  selectedColumns: string[];
}

export function ContactColumnsManager({
  contactProperties,
  selectedColumns: initialColumns,
}: ContactColumnsManagerProps) {
  async function handleColumnsChange(columns: string[]) {
    try {
      await fetch("/api/internal/v1/table-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableName: "contacts",
          config: {
            columns,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to save table preferences:", error);
    }
  }

  return (
    <ContactColumnsSelector
      contactProperties={contactProperties}
      selectedColumns={initialColumns}
      onColumnsChange={handleColumnsChange}
    />
  );
}
