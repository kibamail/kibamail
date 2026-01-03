import type { ContactProperty } from "@prisma/client";
import type { ParsedRow } from "@/lib/csv";
import { isValidEmail, normalizeEmail } from "@/lib/csv";
import {
  normalizeCity,
  normalizeCountry,
  normalizePhone,
  normalizeTimezone,
} from "./normalizers";
import {
  type ColumnMapping,
  type ExtractedData,
  isStandardField,
  type StandardField,
} from "./types";

type FieldProcessResult = {
  email?: string;
  standardField?: { key: StandardField; value: string };
  customProperty?: { slot: string; value: string };
  error?: string;
  skipped?: boolean;
};

export class ContactDataExtractor {
  constructor(
    private columnMapping: ColumnMapping,
    private contactProperties: ContactProperty[],
  ) {}

  extract(row: ParsedRow): ExtractedData {
    const standardFields: Partial<Record<StandardField, string>> = {};
    const customProperties: Record<string, string> = {};
    const errors: string[] = [];
    let email: string | null = null;

    const countryValue = this.getCountryValueFromRow(row);

    for (const [csvColumn, targetField] of Object.entries(this.columnMapping)) {
      const value = row.data[csvColumn];
      if (!value) continue;

      const result = this.processField(targetField, value, countryValue);

      if (result.error) {
        errors.push(result.error);
      } else if (result.email) {
        email = result.email;
      } else if (result.standardField) {
        standardFields[result.standardField.key] = result.standardField.value;
      } else if (result.customProperty) {
        customProperties[result.customProperty.slot] =
          result.customProperty.value;
      }
    }

    return { email, standardFields, customProperties, errors };
  }

  private getCountryValueFromRow(row: ParsedRow): string | undefined {
    for (const [csvColumn, targetField] of Object.entries(this.columnMapping)) {
      if (targetField === "country") {
        const rawCountry = row.data[csvColumn];
        if (rawCountry) {
          const result = normalizeCountry(rawCountry);
          if (result.success) {
            return result.value;
          }
        }
      }
    }
    return undefined;
  }

  private processField(
    targetField: string,
    value: string,
    countryHint?: string,
  ): FieldProcessResult {
    if (targetField === "email") {
      return this.processEmailField(value);
    }

    if (isStandardField(targetField)) {
      return this.processStandardField(targetField, value, countryHint);
    }

    return this.processCustomProperty(targetField, value);
  }

  private processStandardField(
    field: StandardField,
    value: string,
    countryHint?: string,
  ): FieldProcessResult {
    switch (field) {
      case "phone": {
        const result = normalizePhone(value, countryHint);
        if (!result.success) {
          return { skipped: true };
        }
        return { standardField: { key: field, value: result.value } };
      }
      case "country": {
        const result = normalizeCountry(value);
        if (!result.success) {
          return { skipped: true };
        }
        return { standardField: { key: field, value: result.value } };
      }
      case "timezone": {
        const result = normalizeTimezone(value);
        if (!result.success) {
          return { skipped: true };
        }
        return { standardField: { key: field, value: result.value } };
      }
      case "city": {
        const result = normalizeCity(value);
        if (!result.success) {
          return { skipped: true };
        }
        return { standardField: { key: field, value: result.value } };
      }
      default:
        return { standardField: { key: field, value } };
    }
  }

  private processEmailField(value: string): FieldProcessResult {
    const normalized = normalizeEmail(value);
    if (!isValidEmail(normalized)) {
      return { error: `Invalid email format: "${value}"` };
    }
    return { email: normalized };
  }

  private processCustomProperty(
    propertyId: string,
    value: string,
  ): FieldProcessResult {
    const property = this.contactProperties.find((p) => p.id === propertyId);
    if (!property) return {};
    return { customProperty: { slot: property.slot, value } };
  }
}
