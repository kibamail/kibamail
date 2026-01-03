import type { ContactImport } from "@prisma/client";
import type { ColumnMapping } from "./types";

export interface ReadinessResult {
  ready: boolean;
  missing: string[];
}

export class ImportReadinessChecker {
  check(contactImport: ContactImport): ReadinessResult {
    const missing: string[] = [];

    if (!this.hasColumnMapping(contactImport)) {
      missing.push("columnMapping");
    }

    if (!this.hasEmailMapping(contactImport)) {
      missing.push("emailColumnMapping");
    }

    if (!this.hasTotalRows(contactImport)) {
      missing.push("totalRows");
    }

    return { ready: missing.length === 0, missing };
  }

  private hasColumnMapping(contactImport: ContactImport): boolean {
    const mapping = contactImport.columnMapping as ColumnMapping | null;
    return mapping !== null && Object.keys(mapping).length > 0;
  }

  private hasEmailMapping(contactImport: ContactImport): boolean {
    const mapping = contactImport.columnMapping as ColumnMapping | null;
    if (!mapping) return false;
    return Object.values(mapping).includes("email");
  }

  private hasTotalRows(contactImport: ContactImport): boolean {
    return contactImport.totalRows > 0;
  }
}

export function checkImportReadiness(
  contactImport: ContactImport,
): ReadinessResult {
  return new ImportReadinessChecker().check(contactImport);
}
