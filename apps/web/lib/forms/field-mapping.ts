/**
 * Form Field Mapping Utilities
 *
 * Handles generation of slot mappings for form submissions.
 *
 * Key concepts:
 * - Each field is assigned a slot (fieldString0-39 or fieldNum0-14)
 * - Slot assignments are permanent per root form for data integrity
 * - New versions inherit parent mappings and only assign new slots for new fields
 */

import type { ApiFieldMapping } from "@/lib/json-render/validation";

// Maximum slots available
const MAX_STRING_SLOTS = 40;
const MAX_NUM_SLOTS = 15;

/**
 * Represents a single field slot mapping
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
 * Generates a slot mapping from the API field mapping sidecar.
 *
 * If an existing slot mapping is provided (from parent/previous version),
 * it preserves those slot assignments and only assigns new slots for new fields.
 *
 * @param apiMapping - The user-provided field mapping from the API
 * @param existingSlotMapping - Optional existing slot mapping to preserve (from parent form)
 * @returns Complete field slot mapping with slot assignments
 * @throws Error if slot limits are exceeded
 */
export function generateFieldMappingFromApiMapping(
  apiMapping: ApiFieldMapping,
  existingSlotMapping: FormFieldMapping | null = null,
): FormFieldMapping {
  const mapping: FormFieldMapping = { ...(existingSlotMapping || {}) };

  // Track used slots
  const usedStringSlots = new Set<number>();
  const usedNumSlots = new Set<number>();

  // Mark slots from existing mapping as used
  if (existingSlotMapping) {
    for (const fieldMapping of Object.values(existingSlotMapping)) {
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

  // Process each field from the API mapping
  for (const [fieldName, entry] of Object.entries(apiMapping)) {
    // Skip if field already has a slot mapping
    if (mapping[fieldName]) {
      // Update contact property info if it changed
      mapping[fieldName] = {
        ...mapping[fieldName],
        contactPropertyId: entry.contactPropertyId,
        contactPropertyType: entry.contactPropertyType,
      };
      continue;
    }

    // Assign a new slot
    if (entry.fieldType === "number") {
      const slotIndex = getNextNumSlot();
      mapping[fieldName] = {
        slot: `fieldNum${slotIndex}`,
        type: "number",
        fieldType: entry.fieldType,
        contactPropertyId: entry.contactPropertyId,
        contactPropertyType: entry.contactPropertyType,
      };
    } else {
      const slotIndex = getNextStringSlot();
      mapping[fieldName] = {
        slot: `fieldString${slotIndex}`,
        type: "string",
        fieldType: entry.fieldType,
        contactPropertyId: entry.contactPropertyId,
        contactPropertyType: entry.contactPropertyType,
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
