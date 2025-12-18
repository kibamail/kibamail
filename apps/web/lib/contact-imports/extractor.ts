import type { ContactProperty } from "@prisma/client";
import type { ParsedRow } from "@/lib/csv";
import { isValidEmail, normalizeEmail } from "@/lib/csv";
import {
  isStandardField,
  type ColumnMapping,
  type ExtractedData,
  type StandardField,
} from "./types";

export class ContactDataExtractor {
  constructor(
    private columnMapping: ColumnMapping,
    private contactProperties: ContactProperty[]
  ) {}

  extract(row: ParsedRow): ExtractedData {
    const standardFields: Partial<Record<StandardField, string>> = {};
    const customProperties: Record<string, string> = {};
    const errors: string[] = [];
    let email: string | null = null;

    for (const [csvColumn, targetField] of Object.entries(this.columnMapping)) {
      const value = row.data[csvColumn];
      if (!value) continue;

      const result = this.processField(targetField, value);

      if (result.error) {
        errors.push(result.error);
      } else if (result.email) {
        email = result.email;
      } else if (result.standardField) {
        standardFields[result.standardField.key] = result.standardField.value;
      } else if (result.customProperty) {
        customProperties[result.customProperty.slot] = result.customProperty.value;
      }
    }

    return { email, standardFields, customProperties, errors };
  }

  private processField(
    targetField: string,
    value: string
  ): {
    email?: string;
    standardField?: { key: StandardField; value: string };
    customProperty?: { slot: string; value: string };
    error?: string;
  } {
    if (targetField === "email") {
      return this.processEmailField(value);
    }

    if (isStandardField(targetField)) {
      return { standardField: { key: targetField, value } };
    }

    return this.processCustomProperty(targetField, value);
  }

  private processEmailField(value: string): { email?: string; error?: string } {
    const normalized = normalizeEmail(value);
    if (!isValidEmail(normalized)) {
      return { error: `Invalid email format: "${value}"` };
    }
    return { email: normalized };
  }

  private processCustomProperty(
    propertyId: string,
    value: string
  ): { customProperty?: { slot: string; value: string } } {
    const property = this.contactProperties.find((p) => p.id === propertyId);
    if (!property) return {};
    return { customProperty: { slot: property.slot, value } };
  }
}
