/**
 * Contact Properties Helpers
 *
 * Utilities for working with contact custom properties.
 * Properties are stored in slot-based columns (propertyFloat0-34, propertyString0-49)
 * and mapped to user-defined property names via the ContactProperty model.
 */

/** Property value types supported in contact properties */
export type ContactPropertyValue = string | number | Date | null;

/**
 * Build properties object for a contact from contact property definitions
 * Maps property names to their values from the contact's slot columns
 *
 * @param contact - The contact record with slot columns (propertyFloat0, propertyString5, etc.)
 * @param properties - Array of contact property definitions for the workspace
 * @returns Object with property names as keys and contact values from slots
 *
 * @example
 * ```ts
 * const properties = [
 *   { name: "Age", slot: "propertyFloat0", type: "NUMBER" },
 *   { name: "Join Date", slot: "propertyFloat1", type: "DATE" }
 * ];
 * const result = buildContactProperties(contact, properties);
 * // Returns: { "Age": 25, "Join Date": 1699564800000 }
 * ```
 */
export function buildContactProperties(
  contact: Record<string, unknown>,
  properties: Array<{ name: string; slot: string }>,
): Record<string, ContactPropertyValue> {
  const result: Record<string, ContactPropertyValue> = {};

  for (const property of properties) {
    const value = contact[property.slot] as ContactPropertyValue | undefined;

    if (value !== null && value !== undefined) {
      result[property.name] = value;
    }
  }

  return result;
}

/**
 * Contact property definition with name and slot
 */
export interface ContactPropertyDefinition {
  name: string;
  slot: string;
}
