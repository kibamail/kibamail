import { extractVariables } from "./variables";

const REQUIRED_COMPLIANCE_VARIABLES = [
  { name: "business_address", label: "Business address ({{business_address}})" },
  { name: "unsubscribe_url", label: "Unsubscribe link ({{unsubscribe_url}})" },
  { name: "terms_url", label: "Terms of service link ({{terms_url}})" },
  { name: "privacy_url", label: "Privacy policy link ({{privacy_url}})" },
];

export interface ComplianceCheckResult {
  valid: boolean;
  missing: string[];
}

export function validateEmailCompliance(html: string): ComplianceCheckResult {
  if (!html) {
    return {
      valid: false,
      missing: REQUIRED_COMPLIANCE_VARIABLES.map((v) => v.label),
    };
  }

  const presentVariables = new Set(extractVariables(html));
  const missing: string[] = [];

  for (const required of REQUIRED_COMPLIANCE_VARIABLES) {
    if (!presentVariables.has(required.name)) {
      missing.push(required.label);
    }
  }

  return { valid: missing.length === 0, missing };
}
