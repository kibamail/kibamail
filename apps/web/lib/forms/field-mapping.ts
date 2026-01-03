/**
 * Form Field Mapping Utilities
 *
 * Handles extraction of fields from form builder schemas and generation of
 * slot mappings for form submissions.
 *
 * Key concepts:
 * - Fields are extracted from pages[].sections[].fields[] structure
 * - Presentation fields (like "content") are excluded from submission mapping
 * - Each field is assigned a slot (fieldString0-39 or fieldNum0-14)
 * - Slot assignments are permanent per root form for data integrity
 * - New versions inherit parent mappings and only assign new slots for new fields
 */

import type {
  ContactPropertyMapping,
  FieldType,
  FormBuilderSchema,
  FormField,
} from "@/lib/form-builder/schema";

// Field types that should map to numeric slots
const NUMERIC_FIELD_TYPES = new Set<FieldType>(["number", "rating", "slider"]);

// Presentation field types that don't store submission data
const PRESENTATION_FIELD_TYPES = new Set<FieldType>(["content"]);

// Hidden fields are input fields but don't need contact property mapping from UI
const HIDDEN_FIELD_TYPES = new Set<FieldType>(["hidden"]);

// Maximum slots available
const MAX_STRING_SLOTS = 40;
const MAX_NUM_SLOTS = 15;

/**
 * Represents a field extracted from a form schema
 */
export interface ExtractedField {
  name: string;
  type: FieldType;
  label?: string;
  contactProperty?: ContactPropertyMapping;
}

/**
 * Represents a field extracted with its contact property mapping
 */
export interface ExtractedFieldWithMapping extends ExtractedField {
  contactProperty?: ContactPropertyMapping;
}

/**
 * Represents a single field mapping
 */
export interface FieldSlotMapping {
  slot: string;
  type: "string" | "number";
  fieldType: string;
  label?: string;
  /** Contact property this field is mapped to (e.g., "email", "firstName") */
  contactPropertyId?: string;
  /** Whether this is a standard or custom contact property */
  contactPropertyType?: "standard" | "custom";
}

/**
 * The complete field mapping for a form
 */
export type FormFieldMapping = Record<string, FieldSlotMapping>;

/**
 * Extracts all input fields from a form builder schema.
 * Excludes presentation fields (like "content") that don't capture user input.
 *
 * @param schema - The form builder schema (can be null/undefined/empty)
 * @returns Array of extracted fields with name, type, and optional label
 */
export function extractFieldsFromSchema(schema: unknown): ExtractedField[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const formSchema = schema as FormBuilderSchema;
  const allFields: ExtractedField[] = [];

  // Handle pages[].sections[].fields[] structure
  if (formSchema.pages && Array.isArray(formSchema.pages)) {
    for (const page of formSchema.pages) {
      if (page.sections && Array.isArray(page.sections)) {
        for (const section of page.sections) {
          if (section.fields && Array.isArray(section.fields)) {
            for (const field of section.fields) {
              // Skip presentation fields that don't store data
              if (PRESENTATION_FIELD_TYPES.has(field.type)) {
                continue;
              }

              // Only include fields with a valid name
              if (field.name) {
                allFields.push({
                  name: field.name,
                  type: field.type,
                  label: field.label,
                  contactProperty: field.contactProperty,
                });
              }
            }
          }
        }
      }
    }
  }

  return allFields;
}

/**
 * Extracts all input fields from a form builder schema with their contact property mappings.
 * Excludes presentation fields (like "content") that don't capture user input.
 * Used for publish validation to check that all fields are mapped.
 *
 * @param schema - The form builder schema (can be null/undefined/empty)
 * @returns Array of extracted fields with name, type, label, and contactProperty
 */
export function extractFieldsWithContactProperty(
  schema: unknown,
): ExtractedFieldWithMapping[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const formSchema = schema as FormBuilderSchema;
  const allFields: ExtractedFieldWithMapping[] = [];

  // Handle pages[].sections[].fields[] structure
  if (formSchema.pages && Array.isArray(formSchema.pages)) {
    for (const page of formSchema.pages) {
      if (page.sections && Array.isArray(page.sections)) {
        for (const section of page.sections) {
          if (section.fields && Array.isArray(section.fields)) {
            for (const field of section.fields) {
              // Skip presentation fields that don't store data
              if (PRESENTATION_FIELD_TYPES.has(field.type)) {
                continue;
              }

              // Skip hidden fields - they don't require contact property mapping
              if (HIDDEN_FIELD_TYPES.has(field.type)) {
                continue;
              }

              // Only include fields with a valid name
              if (field.name) {
                allFields.push({
                  name: field.name,
                  type: field.type,
                  label: field.label,
                  contactProperty: field.contactProperty,
                });
              }
            }
          }
        }
      }
    }
  }

  return allFields;
}

/**
 * Extracts all fields from a form schema including presentation fields.
 * Used for rendering and validation purposes.
 *
 * @param schema - The form builder schema
 * @returns Array of all form fields
 */
function extractAllFieldsFromSchema(schema: unknown): FormField[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const formSchema = schema as FormBuilderSchema;
  const allFields: FormField[] = [];

  if (formSchema.pages && Array.isArray(formSchema.pages)) {
    for (const page of formSchema.pages) {
      if (page.sections && Array.isArray(page.sections)) {
        for (const section of page.sections) {
          if (section.fields && Array.isArray(section.fields)) {
            allFields.push(...section.fields);
          }
        }
      }
    }
  }

  return allFields;
}

/**
 * Determines the storage type for a field type.
 * Most fields store as strings, but numeric types use number slots.
 *
 * @param fieldType - The field type
 * @returns "number" for numeric types, "string" for all others
 */
export function getStorageType(fieldType: FieldType): "string" | "number" {
  return NUMERIC_FIELD_TYPES.has(fieldType) ? "number" : "string";
}

/**
 * Generates a field mapping for a form schema.
 * If an existing mapping is provided (from parent/previous version),
 * it preserves those slot assignments and only assigns new slots for new fields.
 *
 * @param schema - The form builder schema
 * @param existingMapping - Optional existing mapping to preserve (from parent form)
 * @returns Complete field mapping with slot assignments
 * @throws Error if slot limits are exceeded
 */
export function generateFieldMapping(
  schema: unknown,
  existingMapping: FormFieldMapping | null = null,
): FormFieldMapping {
  const fields = extractFieldsFromSchema(schema);
  const mapping: FormFieldMapping = { ...(existingMapping || {}) };

  // Track used slots
  const usedStringSlots = new Set<number>();
  const usedNumSlots = new Set<number>();

  // Mark slots from existing mapping as used
  if (existingMapping) {
    for (const fieldMapping of Object.values(existingMapping)) {
      const slotMatch = fieldMapping.slot.match(/^field(String|Num)(\d+)$/);
      if (slotMatch) {
        const [, slotType, slotIndex] = slotMatch;
        if (slotType === "String") {
          usedStringSlots.add(parseInt(slotIndex, 10));
        } else {
          usedNumSlots.add(parseInt(slotIndex, 10));
        }
      }
    }
  }

  // Find next available slot
  function getNextStringSlot(): number {
    for (let i = 0; i < MAX_STRING_SLOTS; i++) {
      if (!usedStringSlots.has(i)) {
        usedStringSlots.add(i);
        return i;
      }
    }
    throw new Error(
      `Maximum string field slots (${MAX_STRING_SLOTS}) exceeded. Cannot add more string fields to this form.`,
    );
  }

  function getNextNumSlot(): number {
    for (let i = 0; i < MAX_NUM_SLOTS; i++) {
      if (!usedNumSlots.has(i)) {
        usedNumSlots.add(i);
        return i;
      }
    }
    throw new Error(
      `Maximum numeric field slots (${MAX_NUM_SLOTS}) exceeded. Cannot add more numeric fields to this form.`,
    );
  }

  // Process each field
  for (const field of fields) {
    // Skip if field already has a mapping
    if (mapping[field.name]) {
      // Update label if it changed
      if (field.label && mapping[field.name].label !== field.label) {
        mapping[field.name] = {
          ...mapping[field.name],
          label: field.label,
        };
      }
      continue;
    }

    // Determine storage type and assign slot
    const storageType = getStorageType(field.type);

    if (storageType === "number") {
      const slotIndex = getNextNumSlot();
      mapping[field.name] = {
        slot: `fieldNum${slotIndex}`,
        type: "number",
        fieldType: field.type,
        label: field.label,
        contactPropertyId: field.contactProperty?.id,
        contactPropertyType: field.contactProperty?.type,
      };
    } else {
      const slotIndex = getNextStringSlot();
      mapping[field.name] = {
        slot: `fieldString${slotIndex}`,
        type: "string",
        fieldType: field.type,
        label: field.label,
        contactPropertyId: field.contactProperty?.id,
        contactPropertyType: field.contactProperty?.type,
      };
    }
  }

  return mapping;
}

/**
 * Transforms submission data from field names to contact property IDs.
 * Used for SIGN_UP forms where data needs to match the contact schema.
 *
 * @param data - Raw submission data keyed by field names
 * @param fieldMapping - The field mapping containing contactPropertyId
 * @returns Transformed data keyed by contact property IDs (e.g., "email", "firstName")
 */
export function transformToContactData(
  data: Record<string, unknown>,
  fieldMapping: FormFieldMapping,
): Record<string, unknown> {
  const contactData: Record<string, unknown> = {};

  for (const [fieldName, value] of Object.entries(data)) {
    const mapping = fieldMapping[fieldName];
    if (!mapping || !mapping.contactPropertyId) continue;

    // Use the contact property ID as the key
    contactData[mapping.contactPropertyId] = value;
  }

  return contactData;
}

/**
 * Gets the slot counts from an existing mapping.
 * Useful for determining remaining capacity.
 *
 * @param mapping - The field mapping to analyze
 * @returns Object with counts of used string and number slots
 */
export function getSlotCounts(mapping: FormFieldMapping): {
  stringSlots: number;
  numSlots: number;
  maxStringSlots: number;
  maxNumSlots: number;
} {
  let stringSlots = 0;
  let numSlots = 0;

  for (const fieldMapping of Object.values(mapping)) {
    if (fieldMapping.type === "string") {
      stringSlots++;
    } else {
      numSlots++;
    }
  }

  return {
    stringSlots,
    numSlots,
    maxStringSlots: MAX_STRING_SLOTS,
    maxNumSlots: MAX_NUM_SLOTS,
  };
}
