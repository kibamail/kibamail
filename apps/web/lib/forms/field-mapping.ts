/**
 * Form Field Mapping Utilities
 *
 * Handles extraction of fields from SurveyJS schemas and generation of
 * slot mappings for form submissions.
 *
 * Key concepts:
 * - Fields are extracted from SurveyJS pages[].elements[] structure
 * - Panels can contain nested elements which are also extracted
 * - Each field is assigned a slot (fieldString0-39 or fieldNum0-14)
 * - Slot assignments are permanent per root form for data integrity
 * - New versions inherit parent mappings and only assign new slots for new fields
 */

// SurveyJS field types that should map to numeric slots
const NUMERIC_FIELD_TYPES = new Set([
  "rating",
  "nouislider",
  "slider",
  "expression",
]);

// Maximum slots available
const MAX_STRING_SLOTS = 40;
const MAX_NUM_SLOTS = 15;

/**
 * Represents a field extracted from a SurveyJS schema
 */
export interface ExtractedField {
  name: string;
  type: string;
  title?: string;
}

/**
 * Represents a single field mapping
 */
export interface FieldSlotMapping {
  slot: string;
  type: "string" | "number";
  fieldType: string;
  title?: string;
}

/**
 * The complete field mapping for a form
 */
export type FormFieldMapping = Record<string, FieldSlotMapping>;

/**
 * SurveyJS element structure (simplified)
 */
interface SurveyElement {
  name?: string;
  type?: string;
  title?: string;
  elements?: SurveyElement[];
}

/**
 * SurveyJS page structure
 */
interface SurveyPage {
  name?: string;
  elements?: SurveyElement[];
}

/**
 * SurveyJS schema structure
 */
interface SurveySchema {
  pages?: SurveyPage[];
  elements?: SurveyElement[];
}

/**
 * Recursively extracts all question fields from SurveyJS elements.
 * Handles nested elements within panels and other container types.
 *
 * @param elements - Array of SurveyJS elements
 * @returns Array of extracted fields with name and type
 */
function extractFieldsFromElements(elements: SurveyElement[]): ExtractedField[] {
  const fields: ExtractedField[] = [];

  for (const element of elements) {
    // Skip elements without a name (they can't store data)
    if (!element.name) {
      // But still check for nested elements (e.g., unnamed panels)
      if (element.elements && Array.isArray(element.elements)) {
        fields.push(...extractFieldsFromElements(element.elements));
      }
      continue;
    }

    // Container types that have nested elements
    const containerTypes = ["panel", "paneldynamic"];

    if (containerTypes.includes(element.type || "")) {
      // For panels, extract nested elements but also include the panel itself
      // if it has a name (some implementations store panel-level data)
      if (element.elements && Array.isArray(element.elements)) {
        fields.push(...extractFieldsFromElements(element.elements));
      }
      // Note: We don't add the panel itself as a field since panels
      // typically don't hold submission data directly
    } else {
      // Regular question element - add it as a field
      fields.push({
        name: element.name,
        type: element.type || "text",
        title: element.title,
      });
    }
  }

  return fields;
}

/**
 * Extracts all question fields from a SurveyJS schema.
 * Supports both flat (elements at root) and paged (pages[].elements[]) schemas.
 *
 * @param schema - The SurveyJS form schema (can be null/undefined/empty)
 * @returns Array of extracted fields with name, type, and optional title
 */
export function extractFieldsFromSchema(
  schema: unknown
): ExtractedField[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const surveySchema = schema as SurveySchema;
  const allFields: ExtractedField[] = [];

  // Handle paged schema (pages[].elements[])
  if (surveySchema.pages && Array.isArray(surveySchema.pages)) {
    for (const page of surveySchema.pages) {
      if (page.elements && Array.isArray(page.elements)) {
        allFields.push(...extractFieldsFromElements(page.elements));
      }
    }
  }

  // Handle flat schema (elements[] at root level)
  if (surveySchema.elements && Array.isArray(surveySchema.elements)) {
    allFields.push(...extractFieldsFromElements(surveySchema.elements));
  }

  return allFields;
}

/**
 * Determines the storage type for a SurveyJS field type.
 * Most fields store as strings, but some numeric types use number slots.
 *
 * @param fieldType - The SurveyJS field type
 * @returns "number" for numeric types, "string" for all others
 */
export function getStorageType(fieldType: string): "string" | "number" {
  return NUMERIC_FIELD_TYPES.has(fieldType) ? "number" : "string";
}

/**
 * Generates a field mapping for a form schema.
 * If an existing mapping is provided (from parent/previous version),
 * it preserves those slot assignments and only assigns new slots for new fields.
 *
 * @param schema - The SurveyJS form schema
 * @param existingMapping - Optional existing mapping to preserve (from parent form)
 * @returns Complete field mapping with slot assignments
 * @throws Error if slot limits are exceeded
 */
export function generateFieldMapping(
  schema: unknown,
  existingMapping: FormFieldMapping | null = null
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
      `Maximum string field slots (${MAX_STRING_SLOTS}) exceeded. Cannot add more string fields to this form.`
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
      `Maximum numeric field slots (${MAX_NUM_SLOTS}) exceeded. Cannot add more numeric fields to this form.`
    );
  }

  // Process each field
  for (const field of fields) {
    // Skip if field already has a mapping
    if (mapping[field.name]) {
      // Update title if it changed
      if (field.title && mapping[field.name].title !== field.title) {
        mapping[field.name] = {
          ...mapping[field.name],
          title: field.title,
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
        title: field.title,
      };
    } else {
      const slotIndex = getNextStringSlot();
      mapping[field.name] = {
        slot: `fieldString${slotIndex}`,
        type: "string",
        fieldType: field.type,
        title: field.title,
      };
    }
  }

  return mapping;
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
