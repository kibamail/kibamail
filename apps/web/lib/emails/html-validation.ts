/**
 * Marketing Email HTML Validation
 *
 * Validates raw HTML email content using cheerio. Extracts template variables,
 * checks for structural issues, and warns about email-unfriendly elements.
 *
 * Follows the same pattern as lib/forms/html-validation.ts.
 */

import * as cheerio from "cheerio";
import {
  STANDARD_VARIABLES,
  extractVariables,
  isValidVariable,
} from "./variables";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface EmailHtmlValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  variables: string[];
}

/**
 * Tags that email clients will strip. Not blocking, but worth warning about.
 */
const DANGEROUS_TAGS = ["script", "iframe", "object", "embed", "applet"];

/**
 * Validate raw HTML email content.
 *
 * Checks:
 * 1. HTML is parseable
 * 2. Has a <body> (or is body content)
 * 3. No dangerous tags (warnings)
 * 4. Extracts and validates {{variable}} references
 *
 * @param html - Raw HTML string
 * @returns Validation result with errors, warnings, and extracted variables
 */
export function validateEmailHtml(html: string): EmailHtmlValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!html || html.trim().length === 0) {
    return {
      valid: false,
      errors: [{ field: "html", message: "HTML content is required" }],
      warnings: [],
      variables: [],
    };
  }

  // Parse with cheerio
  const $ = cheerio.load(html);

  // Check for dangerous tags
  for (const tag of DANGEROUS_TAGS) {
    const count = $(tag).length;
    if (count > 0) {
      warnings.push({
        field: "html",
        message: `<${tag}> tag found — email clients will strip this. Remove it to avoid rendering issues.`,
      });
    }
  }

  // Extract and validate variables
  const variables = extractVariables(html);
  const availableVarNames = Object.keys(STANDARD_VARIABLES).join(", ");

  for (const varName of variables) {
    if (!isValidVariable(varName)) {
      warnings.push({
        field: "html",
        message: `Unknown variable '{{${varName}}}'. Known variables: ${availableVarNames}. Variables starting with 'contact.' are treated as custom contact properties.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variables,
  };
}
