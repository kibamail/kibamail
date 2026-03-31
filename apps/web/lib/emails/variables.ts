/**
 * Marketing Email Template Variables
 *
 * Defines all available {{variable}} placeholders for email templates.
 * Used by HTML validation and API documentation.
 */

/**
 * Standard variables available in all marketing emails.
 */
export const STANDARD_VARIABLES: Record<string, string> = {
  email: "Contact email address",
  firstName: "Contact first name",
  first_name: "Contact first name (alias)",
  lastName: "Contact last name",
  last_name: "Contact last name (alias)",
  phone: "Contact phone number",
  country: "Contact country",
  timezone: "Contact timezone",
  city: "Contact city",
  "contact.email": "Contact email (prefixed)",
  "contact.first_name": "Contact first name (prefixed)",
  "contact.last_name": "Contact last name (prefixed)",
  "contact.phone": "Contact phone (prefixed)",
  "contact.country": "Contact country (prefixed)",
  "contact.timezone": "Contact timezone (prefixed)",
  "contact.city": "Contact city (prefixed)",
  confirmation_url: "Double opt-in confirmation link",
  unsubscribe_url: "One-click unsubscribe link",
  preferences_url: "Email preferences page link",
  business_address: "Formatted business postal address",
  terms_url: "Terms of service link",
  privacy_url: "Privacy policy link",
};

/**
 * Sample variable values for email previews.
 * Shared across all preview endpoints to avoid duplication.
 */
export const SAMPLE_VARIABLES: Record<string, string> = {
  email: "preview@example.com",
  firstName: "John",
  first_name: "John",
  lastName: "Doe",
  last_name: "Doe",
  "contact.email": "preview@example.com",
  "contact.first_name": "John",
  "contact.last_name": "Doe",
  phone: "+1 555 0100",
  country: "United States",
  timezone: "America/New_York",
  city: "New York",
  confirmation_url: "#confirm-subscription",
  unsubscribe_url: "#unsubscribe",
  preferences_url: "#preferences",
  business_address:
    "Kibamail Messaging Systems Ltd\n63 N. Burritt Ave, Room 100 East PMB1247\nBuffalo, WY 82834\nUnited States",
  terms_url: "https://kibamail.com/legal/terms-of-service",
  privacy_url: "https://kibamail.com/legal/privacy-policy",
};

/**
 * Variable names that are always available (not dynamically resolved).
 */
export const KNOWN_VARIABLE_NAMES = new Set(Object.keys(STANDARD_VARIABLES));

/**
 * Prefix for custom contact properties (e.g., contact.company_name).
 * Variables starting with "contact." that aren't in STANDARD_VARIABLES
 * are treated as custom property references.
 */
export const CUSTOM_PROPERTY_PREFIX = "contact.";

/**
 * Check if a variable name is valid (known standard or custom property pattern).
 */
export function isValidVariable(name: string): boolean {
  if (KNOWN_VARIABLE_NAMES.has(name)) return true;
  if (name.startsWith(CUSTOM_PROPERTY_PREFIX)) return true;
  return false;
}

/**
 * Extract all {{variable}} names from text.
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+(?:\.\w+)*)\}\}/g);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}
