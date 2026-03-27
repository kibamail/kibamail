import * as cheerio from "cheerio";

/**
 * Field mapping entry from the API.
 */
interface FieldMappingEntry {
  contactPropertyId: string;
  contactPropertyType: "standard" | "custom";
  fieldType: "string" | "number";
}

export type ApiFieldMapping = Record<string, FieldMappingEntry>;

interface HtmlField {
  name: string;
  tagName: string;
  type?: string;
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
 * Input types that should be excluded from fieldMapping requirements.
 * These are control elements, not data inputs.
 */
const EXCLUDED_INPUT_TYPES = new Set(["submit", "button", "reset", "image"]);

/**
 * Extract all named input fields from the single <form> in the HTML.
 */
export function extractInputFieldsFromHtml(html: string): HtmlField[] {
  const $ = cheerio.load(html);
  const form = $("form");
  const fields: HtmlField[] = [];

  if (form.length !== 1) return fields;

  form
    .find("input[name], select[name], textarea[name]")
    .each((_i, el) => {
      const $el = $(el);
      const name = $el.attr("name");
      const tagName = ((el as any).tagName as string ?? "").toLowerCase();
      const type = $el.attr("type")?.toLowerCase();

      if (!name) return;

      // Skip control inputs
      if (tagName === "input" && type && EXCLUDED_INPUT_TYPES.has(type)) return;

      fields.push({ name, tagName, type });
    });

  return fields;
}

/**
 * Validate that the HTML contains exactly one <form> element.
 */
export function validateFormHtml(html: string): ValidationResult {
  const $ = cheerio.load(html);
  const formCount = $("form").length;
  const errors: ValidationError[] = [];

  if (formCount === 0) {
    errors.push({
      field: "_html",
      message: "HTML must contain a <form> element",
    });
  } else if (formCount > 1) {
    errors.push({
      field: "_html",
      message: `HTML must contain exactly one <form> element, found ${formCount}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate bidirectional consistency between HTML form inputs and fieldMapping.
 *
 * Rules:
 * 1. No orphan mappings — every fieldMapping key must match a named input
 * 2. No unmapped fields — every named input must have a fieldMapping entry
 * 3. SIGN_UP forms require email mapping
 */
export function validateHtmlFieldMapping(
  html: string,
  fieldMapping: ApiFieldMapping,
  formType: "SIGN_UP" | "SURVEY",
): ValidationResult {
  const errors: ValidationError[] = [];

  // First validate the HTML structure
  const htmlValidation = validateFormHtml(html);
  if (!htmlValidation.valid) {
    return htmlValidation;
  }

  const htmlFields = extractInputFieldsFromHtml(html);
  const htmlFieldNames = new Set(htmlFields.map((f) => f.name));

  // 1. No orphan mappings
  for (const fieldName of Object.keys(fieldMapping)) {
    if (!htmlFieldNames.has(fieldName)) {
      errors.push({
        field: fieldName,
        message: `fieldMapping references field '${fieldName}' which does not exist in the HTML form`,
      });
    }
  }

  // 2. No unmapped fields
  for (const fieldName of htmlFieldNames) {
    if (!fieldMapping[fieldName]) {
      errors.push({
        field: fieldName,
        message: `Input field '${fieldName}' in form has no entry in fieldMapping`,
      });
    }
  }

  // 3. SIGN_UP forms require email
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

  return { valid: errors.length === 0, errors };
}
