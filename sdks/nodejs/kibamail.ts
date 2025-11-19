import { createHttpClient } from "./client";
import { ApiKeys } from "./resources/api-keys";
import { ContactProperties } from "./resources/contact-properties";
import { Contacts } from "./resources/contacts";
import { Forms } from "./resources/forms";
import { Segments } from "./resources/segments";
import { Topics } from "./resources/topics";

type KibamailConfiguration = {
  client?: ReturnType<typeof createHttpClient>;
  baseURL?: string;
};

const BASE_URL = "https://api.kibamail.com";

/**
 * Kibamail SDK
 *
 * Official Node.js SDK for the Kibamail API.
 * Provides a type-safe interface for managing contacts, topics, segments, forms, and more.
 *
 * **Key Features:**
 * - Full TypeScript support with auto-completion
 * - Comprehensive error handling
 * - Resource-based API organization
 * - Built-in request authentication
 *
 * **Resources:**
 * - `apiKeys` - Manage API keys for workspace access
 * - `contacts` - Manage contact records and subscriptions
 * - `topics` - Organize email communications by topic
 * - `segments` - Create dynamic contact groups with filtering
 * - `contactProperties` - Define custom contact properties
 * - `forms` - Build and manage signup/contact forms
 *
 * @example
 * ```ts
 * import { Kibamail } from "@kibamail/sdk";
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
 * // List all topics
 * const topics = await kibamail.topics.list();
 *
 * // Create a segment
 * const segment = await kibamail.segments.create({
 *   name: "Active Users",
 *   conditions: {
 *     AND: [
 *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
 *     ]
 *   }
 * });
 * ```
 */
export class Kibamail {
  protected client: ReturnType<typeof createHttpClient>;

  /**
   * API Keys resource for managing workspace access keys.
   *
   * @example
   * ```ts
   * const apiKey = await kibamail.apiKeys.create({
   *   name: "Production Server",
   *   scopes: ["read:contacts", "write:contacts"]
   * });
   * ```
   */
  public apiKeys: ApiKeys;

  /**
   * Contacts resource for managing contact records.
   *
   * @example
   * ```ts
   * const contacts = await kibamail.contacts.list({ limit: 50 });
   * const contact = await kibamail.contacts.get("contact_123");
   * ```
   */
  public contacts: Contacts;

  /**
   * Topics resource for organizing email communications.
   *
   * @example
   * ```ts
   * const topic = await kibamail.topics.create({
   *   name: "Product Updates",
   *   visibility: "PUBLIC"
   * });
   * ```
   */
  public topics: Topics;

  /**
   * Segments resource for creating dynamic contact groups.
   *
   * @example
   * ```ts
   * const segment = await kibamail.segments.create({
   *   name: "Premium Customers",
   *   conditions: {
   *     AND: [{ field: "Plan", operator: "equals", value: "Premium" }]
   *   }
   * });
   * ```
   */
  public segments: Segments;

  /**
   * Contact Properties resource for defining custom contact fields.
   *
   * @example
   * ```ts
   * const property = await kibamail.contactProperties.create({
   *   name: "Company",
   *   type: "TEXT"
   * });
   * ```
   */
  public contactProperties: ContactProperties;

  /**
   * Forms resource for building signup and contact forms.
   *
   * @example
   * ```ts
   * const form = await kibamail.forms.create({
   *   name: "Newsletter Signup",
   *   fields: [
   *     { name: "email", type: "email", required: true }
   *   ]
   * });
   * ```
   */
  public forms: Forms;

  /**
   * Initialize the Kibamail SDK client.
   *
   * @param apiKey - Your Kibamail API key (starts with 'sk_')
   * @param config - Optional configuration
   * @param config.baseURL - Custom API base URL (defaults to https://api.kibamail.com)
   *
   * @example
   * ```ts
   * // Production usage
   * const kibamail = new Kibamail("sk_live_...");
   *
   * // Development with custom base URL
   * const kibamail = new Kibamail("sk_test_...", {
   *   baseURL: "http://localhost:3000"
   * });
   * ```
   */
  constructor(
    protected apiKey: string,
    protected config?: KibamailConfiguration
  ) {
    this.client = config?.client ?? createHttpClient({
      baseURL: config?.baseURL ?? BASE_URL,
      apiKey,
    });

    // Initialize all resource instances
    this.apiKeys = new ApiKeys(this.client);
    this.contacts = new Contacts(this.client);
    this.topics = new Topics(this.client);
    this.segments = new Segments(this.client);
    this.contactProperties = new ContactProperties(this.client);
    this.forms = new Forms(this.client);
  }
}
