/**
 * Kibamail Node.js SDK
 *
 * Official TypeScript/JavaScript SDK for the Kibamail API.
 *
 * @packageDocumentation
 */

// Main SDK class
export { Kibamail } from "./kibamail";

// Resource classes (for advanced usage)
export { ApiKeys } from "./resources/api-keys";
export { Automations } from "./resources/automations";
export { Broadcasts } from "./resources/broadcasts";
export { ContactProperties } from "./resources/contact-properties";
export { Contacts } from "./resources/contacts";
export { Domains } from "./resources/domains";
export { Emails } from "./resources/emails";
export { Events } from "./resources/events";
export { Forms } from "./resources/forms";
export { Segments } from "./resources/segments";
export { Topics } from "./resources/topics";

// Type exports from schema
export type { paths, components } from "./schema";

/**
 * Quick Start
 *
 * @example
 * ```ts
 * import { Kibamail } from "kibamail";
 *
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a contact
 * const contact = await kibamail.contacts.create({
 *   email: "user@example.com",
 *   firstName: "John",
 *   lastName: "Doe"
 * });
 *
 * // List contacts
 * const contacts = await kibamail.contacts.list({ limit: 50 });
 *
 * // Create a topic
 * const topic = await kibamail.topics.create({
 *   name: "Product Updates",
 *   visibility: "PUBLIC"
 * });
 * ```
 */
