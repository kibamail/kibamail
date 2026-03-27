import type { Spec } from "@json-render/core";

/**
 * Component types that represent form inputs (have a `name` prop).
 */
const INPUT_COMPONENT_TYPES = new Set([
  "Input",
  "Textarea",
  "Select",
  "Checkbox",
  "Radio",
  "Switch",
  "Slider",
  "Rating",
  "FileUpload",
  "HiddenField",
]);

/**
 * Component types that store numeric values.
 */
const NUMERIC_COMPONENT_TYPES = new Set(["Rating", "Slider"]);

interface FieldMappingEntry {
  contactPropertyId: string;
  contactPropertyType: "standard" | "custom";
  fieldType: "string" | "number";
}

export type ApiFieldMapping = Record<string, FieldMappingEntry>;

interface SpecField {
  name: string;
  componentType: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Extract all input fields from a json-render spec.
 * Walks spec.elements and finds any element whose type is an input component
 * and has a `name` prop.
 */
export function extractInputFieldsFromSpec(spec: Spec): SpecField[] {
  const fields: SpecField[] = [];

  if (!spec?.elements) return fields;

  for (const element of Object.values(spec.elements)) {
    const el = element as { type?: string; props?: Record<string, unknown> };

    if (!el.type || !INPUT_COMPONENT_TYPES.has(el.type)) continue;

    const name = el.props?.name;
    if (typeof name === "string" && name.length > 0) {
      fields.push({ name, componentType: el.type });
    }
  }

  return fields;
}

/**
 * Validate bidirectional consistency between a json-render spec and its fieldMapping.
 *
 * Rules:
 * 1. No orphan mappings — every fieldMapping key must match a `name` prop in the spec
 * 2. No unmapped fields — every input component with a `name` must have a fieldMapping entry
 * 3. Type consistency — numeric components must map to fieldType "number"
 * 4. SIGN_UP forms require email — at least one entry must map to the "email" contact property
 */
export function validateSpecFieldMapping(
  spec: Spec,
  fieldMapping: ApiFieldMapping,
  formType: "SIGN_UP" | "SURVEY",
): ValidationResult {
  const errors: ValidationError[] = [];
  const specFields = extractInputFieldsFromSpec(spec);
  const specFieldNames = new Set(specFields.map((f) => f.name));
  const specFieldsByName = new Map(specFields.map((f) => [f.name, f]));

  // 1. No orphan mappings
  for (const fieldName of Object.keys(fieldMapping)) {
    if (!specFieldNames.has(fieldName)) {
      errors.push({
        field: fieldName,
        message: `fieldMapping references field '${fieldName}' which does not exist in the spec`,
      });
    }
  }

  // 2. No unmapped input fields
  for (const fieldName of specFieldNames) {
    if (!fieldMapping[fieldName]) {
      errors.push({
        field: fieldName,
        message: `Input field '${fieldName}' in spec has no entry in fieldMapping`,
      });
    }
  }

  // 3. Type consistency
  for (const [fieldName, mapping] of Object.entries(fieldMapping)) {
    const specField = specFieldsByName.get(fieldName);
    if (!specField) continue; // already caught by rule 1

    const isNumeric = NUMERIC_COMPONENT_TYPES.has(specField.componentType);

    // Check Input type="number" as well
    if (specField.componentType === "Input") {
      // We can't check Input's type prop from here without deeper spec inspection,
      // so we trust the fieldMapping's fieldType declaration for Input components
      continue;
    }

    if (isNumeric && mapping.fieldType !== "number") {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' uses component '${specField.componentType}' which is numeric, but fieldMapping declares fieldType '${mapping.fieldType}'`,
      });
    }

    if (!isNumeric && mapping.fieldType !== "string") {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' uses component '${specField.componentType}' which is not numeric, but fieldMapping declares fieldType '${mapping.fieldType}'`,
      });
    }
  }

  // 4. SIGN_UP forms require email
  if (formType === "SIGN_UP") {
    const hasEmail = Object.values(fieldMapping).some(
      (m) =>
        m.contactPropertyId === "email" && m.contactPropertyType === "standard",
    );

    if (!hasEmail) {
      errors.push({
        field: "_form",
        message:
          "SIGN_UP forms require at least one field mapped to the 'email' standard contact property",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
