/**
 * Contact Properties Configuration
 *
 * Centralized configuration for contact property slots and limits.
 * This ensures consistency across API handlers, validation, and database schema.
 */

/**
 * Maximum number of property slots per type
 */
const PROPERTY_SLOT_LIMITS = {
  FLOAT: 35, // Used for NUMBER and DATE types
  STRING: 50,
} as const;

/**
 * Number of indexed property slots per type
 * These are the first N slots that have database indexes for faster queries
 */
const INDEXED_PROPERTY_SLOTS = {
  FLOAT: 10,
  STRING: 10,
} as const;

/**
 * Property slot prefixes used in database
 */
const PROPERTY_SLOT_PREFIXES = {
  FLOAT: "propertyFloat",
  STRING: "propertyString",
} as const;

/**
 * Get max slots for a given property type
 */
export function getMaxSlots(type: "DATE" | "NUMBER" | "STRING"): number {
  return type === "DATE" || type === "NUMBER"
    ? PROPERTY_SLOT_LIMITS.FLOAT
    : PROPERTY_SLOT_LIMITS.STRING;
}

/**
 * Get slot prefix for a given property type
 */
export function getSlotPrefix(type: "DATE" | "NUMBER" | "STRING"): string {
  return type === "DATE" || type === "NUMBER"
    ? PROPERTY_SLOT_PREFIXES.FLOAT
    : PROPERTY_SLOT_PREFIXES.STRING;
}
