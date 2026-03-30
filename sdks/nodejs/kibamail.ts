import { createHttpClient } from "./client";
import { ApiKeys } from "./resources/api-keys";
import { Automations } from "./resources/automations";
import { Broadcasts } from "./resources/broadcasts";
import { ContactProperties } from "./resources/contact-properties";
import { Contacts } from "./resources/contacts";
import { Domains } from "./resources/domains";
import { Emails } from "./resources/emails";
import { Events } from "./resources/events";
import { Forms } from "./resources/forms";
import { MarketingEmails } from "./resources/marketing-emails";
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
 * - `broadcasts` - Create and schedule email broadcasts
 * - `contacts` - Manage contact records and subscriptions
 * - `emails` - Send transactional emails
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

  public apiKeys: ApiKeys;
  public automations: Automations;
  public broadcasts: Broadcasts;
  public contactProperties: ContactProperties;
  public contacts: Contacts;
  public domains: Domains;
  public emails: Emails;
  public events: Events;
  public forms: Forms;
  public marketingEmails: MarketingEmails;
  public segments: Segments;
  public topics: Topics;

  /**
   * Initialize the Kibamail SDK client.
   *
   * @param apiKey - Your Kibamail API key (starts with 'kb_')
   * @param config - Optional configuration
   * @param config.baseURL - Custom API base URL (defaults to https://api.kibamail.com)
   *
   * @example
   * ```ts
   * // Production usage
   * const kibamail = new Kibamail("kb_live_...");
   *
   * // Development with custom base URL
   * const kibamail = new Kibamail("kb_test_...", {
   *   baseURL: "http://localhost:3000"
   * });
   * ```
   */
  constructor(
    protected apiKey: string,
    protected config?: KibamailConfiguration
  ) {
    this.client =
      config?.client ??
      createHttpClient({
        baseURL: config?.baseURL ?? BASE_URL,
        apiKey,
      });

    this.apiKeys = new ApiKeys(this.client);
    this.automations = new Automations(this.client);
    this.broadcasts = new Broadcasts(this.client);
    this.contactProperties = new ContactProperties(this.client);
    this.contacts = new Contacts(this.client);
    this.domains = new Domains(this.client);
    this.emails = new Emails(this.client);
    this.events = new Events(this.client);
    this.forms = new Forms(this.client);
    this.marketingEmails = new MarketingEmails(this.client);
    this.segments = new Segments(this.client);
    this.topics = new Topics(this.client);
  }
}
