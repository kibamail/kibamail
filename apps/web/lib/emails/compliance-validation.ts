import { extractVariables } from "./variables";

export type EmailComplianceType = "TRANSACTIONAL" | "MARKETING";

interface RequiredVariable {
  name: string;
  label: string;
}

const BUSINESS_ADDRESS: RequiredVariable = {
  name: "business_address",
  label: "Business address ({{business_address}})",
};

const MARKETING_REQUIRED_VARIABLES: RequiredVariable[] = [
  BUSINESS_ADDRESS,
  { name: "unsubscribe_url", label: "Unsubscribe link ({{unsubscribe_url}})" },
  { name: "terms_url", label: "Terms of service link ({{terms_url}})" },
  { name: "privacy_url", label: "Privacy policy link ({{privacy_url}})" },
];

// Transactional mail (password resets, receipts, magic links, OTP, etc.) must
// still carry a physical business address under CAN-SPAM / similar regimes,
// but MUST NOT carry unsubscribe links, and terms/privacy links are optional.
const TRANSACTIONAL_REQUIRED_VARIABLES: RequiredVariable[] = [BUSINESS_ADDRESS];

export interface ComplianceCheckResult {
  valid: boolean;
  missing: string[];
}

export interface ValidateEmailComplianceOptions {
  type?: EmailComplianceType;
}

export function validateEmailCompliance(
  html: string,
  options: ValidateEmailComplianceOptions = {},
): ComplianceCheckResult {
  const type = options.type ?? "MARKETING";
  const required =
    type === "TRANSACTIONAL"
      ? TRANSACTIONAL_REQUIRED_VARIABLES
      : MARKETING_REQUIRED_VARIABLES;

  if (!html) {
    return {
      valid: false,
      missing: required.map((v) => v.label),
    };
  }

  const presentVariables = new Set(extractVariables(html));
  const missing: string[] = [];

  for (const variable of required) {
    if (!presentVariables.has(variable.name)) {
      missing.push(variable.label);
    }
  }

  return { valid: missing.length === 0, missing };
}
