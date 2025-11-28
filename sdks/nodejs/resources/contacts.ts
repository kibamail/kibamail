import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateContactBody = paths["/v1/contacts"]["post"]["requestBody"]["content"]["application/json"];
type UpdateContactBody = paths["/v1/contacts/{contactId}"]["put"]["requestBody"]["content"]["application/json"];
type ListContactsQuery = paths["/v1/contacts"]["get"]["parameters"]["query"];
type SearchContactsBody = paths["/v1/contacts/search"]["post"]["requestBody"]["content"]["application/json"];

/**
 * Contacts Resource
 *
 * Manage contacts in your workspace. Contacts are the core entities that receive your emails
 * and represent your subscribers, users, or customers.
 *
 * **Key Features:**
 * - Create and manage contact profiles with built-in and custom properties
 * - Subscribe contacts to topics for targeted communication
 * - Search contacts using advanced filtering conditions
 * - Track subscription status and preferences
 * - Cursor-based pagination for efficient data retrieval
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a contact
 * const contact = await kibamail.contacts.create({
 *   email: "user@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   properties: {
 *     "Company": "Acme Inc",
 *     "Plan": "Enterprise"
 *   }
 * });
 *
 * // List all contacts
 * const contacts = await kibamail.contacts.list({ limit: 50 });
 *
 * // Search for contacts
 * const results = await kibamail.contacts.search({
 *   filters: {
 *     AND: [
 *       { field: "Company", operator: "equals", value: "Acme Inc" },
 *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
 *     ]
 *   }
 * });
 * ```
 */
export class Contacts {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new contact in your workspace.
   *
   * Creates a contact record with optional custom properties and topic subscriptions.
   * If a contact with the same email already exists, this will fail with a conflict error.
   *
   * **Use Cases:**
   * - Add new subscribers from your application signup flow
   * - Import contacts from external systems or CSV files
   * - Create contact records from form submissions
   * - Sync users from your database to Kibamail
   *
   * **Behavior:**
   * - Email must be unique within the workspace
   * - Custom properties are mapped by name (must be pre-defined in workspace)
   * - Topics array automatically subscribes contact to specified topics
   * - Returns the contact ID immediately after creation
   * - Contact status defaults to 'SUBSCRIBED' unless specified
   *
   * **Required Scope:** `write:contacts`
   *
   * @param params - Contact creation parameters
   * @param params.email - Contact's email address (required, must be unique)
   * @param params.firstName - Contact's first name
   * @param params.lastName - Contact's last name
   * @param params.phone - Contact's phone number
   * @param params.country - Contact's country code (ISO 3166-1 alpha-2, e.g., "US", "GB")
   * @param params.city - Contact's city
   * @param params.timezone - Contact's timezone (e.g., "America/New_York", "Europe/London")
   * @param params.properties - Custom properties as key-value pairs (property names must exist in workspace)
   * @param params.topics - Array of topic IDs to subscribe the contact to
   *
   * @returns Promise containing the created contact ID
   *
   * @throws {BadRequestError} Invalid input data or unknown property names
   * @throws {ConflictError} Contact with this email already exists
   * @throws {UnauthorizedError} Invalid API key or missing write:contacts scope
   *
   * @example
   * ```ts
   * // Basic contact creation
   * const contact = await kibamail.contacts.create({
   *   email: "john@example.com",
   *   firstName: "John",
   *   lastName: "Doe"
   * });
   *
   * // Contact with custom properties and topics
   * const advancedContact = await kibamail.contacts.create({
   *   email: "sarah@example.com",
   *   firstName: "Sarah",
   *   lastName: "Smith",
   *   country: "US",
   *   timezone: "America/Los_Angeles",
   *   properties: {
   *     "Company": "Acme Corp",
   *     "Plan": "Enterprise",
   *     "Sign Up Date": Date.now(),
   *     "Monthly Spend": 499.99
   *   },
   *   topics: ["topic_123", "topic_456"] // Subscribe to marketing and product updates
   * });
   * ```
   */
  create(params: CreateContactBody) {
    return this.client.POST("/v1/contacts", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all contacts in your workspace.
   *
   * Returns contacts in reverse chronological order (newest first) with cursor-based pagination
   * for efficient traversal of large contact lists.
   *
   * **Use Cases:**
   * - Export your entire contact database
   * - Build custom contact management dashboards
   * - Sync contacts with external CRM systems
   * - Generate contact reports and analytics
   * - Display contact lists in your application
   *
   * **Behavior:**
   * - Returns contacts in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Includes all contact properties (default and custom)
   * - Includes subscription status and topic memberships
   * - Maximum 100 contacts per request (use 'limit' parameter)
   * - Deleted contacts are not included in results
   *
   * **Required Scope:** `read:contacts`
   *
   * **Pagination:**
   * - Use 'after' cursor to fetch the next page
   * - Use 'before' cursor to fetch the previous page
   * - Response includes 'hasMore' and 'hasPrevious' flags
   * - Cursors are based on contact IDs for stable pagination
   *
   * **Performance Tips:**
   * - Use the maximum limit (100) for bulk exports
   * - Cache results when possible to reduce API calls
   * - For filtered results, use the search() method instead
   *
   * @param params - Pagination parameters
   * @param params.limit - Number of contacts to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination - ID of the last contact from the previous page
   * @param params.before - Cursor for pagination - ID of the first contact from the next page
   *
   * @returns Promise containing paginated contact list
   *
   * @throws {UnauthorizedError} Invalid API key or missing read:contacts scope
   *
   * @example
   * ```ts
   * // Get first page of contacts
   * const firstPage = await kibamail.contacts.list({ limit: 50 });
   * console.log(firstPage.data); // Array of contacts
   * console.log(firstPage.hasMore); // true if more contacts exist
   *
   * // Get next page using cursor
   * if (firstPage.hasMore) {
   *   const lastContact = firstPage.data[firstPage.data.length - 1];
   *   const nextPage = await kibamail.contacts.list({
   *     limit: 50,
   *     after: lastContact.id
   *   });
   * }
   *
   * // Iterate through all contacts
   * let cursor = undefined;
   * let allContacts = [];
   * do {
   *   const page = await kibamail.contacts.list({ limit: 100, after: cursor });
   *   allContacts.push(...page.data);
   *   cursor = page.hasMore ? page.data[page.data.length - 1].id : undefined;
   * } while (cursor);
   * ```
   */
  list(params?: ListContactsQuery) {
    return this.client.GET("/v1/contacts", {
      params: {
        query: params,
      },
    });
  }

  /**
   * Retrieve a specific contact by ID.
   *
   * Returns the full contact record including all built-in fields and custom properties.
   *
   * **Use Cases:**
   * - Fetch contact details for display in your application
   * - Verify contact information before sending emails
   * - Retrieve contact data for analytics or reporting
   * - Get the latest contact status and properties
   *
   * **Behavior:**
   * - Returns contact only if it belongs to the authenticated workspace
   * - Includes all custom properties mapped by name
   * - Returns 404 if contact doesn't exist or belongs to different workspace
   *
   * **Required Scope:** `read:contacts`
   *
   * @param contactId - The unique identifier of the contact
   *
   * @returns Promise containing the contact details
   *
   * @throws {NotFoundError} Contact not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:contacts scope
   *
   * @example
   * ```ts
   * const contact = await kibamail.contacts.get("contact_abc123");
   * console.log(contact.data.email); // "user@example.com"
   * console.log(contact.data.properties); // { "Company": "Acme Inc", ... }
   * console.log(contact.data.status); // "SUBSCRIBED" | "UNSUBSCRIBED"
   * ```
   */
  get(contactId: string) {
    return this.client.GET("/v1/contacts/{contactId}", {
      params: {
        path: { contactId },
      },
    });
  }

  /**
   * Update an existing contact by ID.
   *
   * Updates contact information including built-in fields, custom properties, and topic subscriptions.
   * Only provided fields are updated; omitted fields remain unchanged.
   *
   * **Use Cases:**
   * - Update contact information when users change their profile
   * - Add or modify custom property values
   * - Change contact subscription status
   * - Update topic subscriptions
   * - Sync contact data from your application database
   *
   * **Behavior:**
   * - Only updates fields that are provided in the request
   * - Omitted fields remain unchanged
   * - Properties object merges with existing properties (provide property to update it)
   * - Topics array completely replaces existing subscriptions when provided
   * - Returns the contact ID after successful update
   *
   * **Required Scope:** `write:contacts`
   *
   * @param contactId - The unique identifier of the contact to update
   * @param params - Contact update parameters (all optional, only provided fields are updated)
   * @param params.email - New email address (must be unique)
   * @param params.firstName - Updated first name
   * @param params.lastName - Updated last name
   * @param params.phone - Updated phone number
   * @param params.country - Updated country code
   * @param params.city - Updated city
   * @param params.timezone - Updated timezone
   * @param params.properties - Custom properties to update (property names must exist in workspace)
   * @param params.topics - New topic subscriptions (completely replaces existing subscriptions)
   *
   * @returns Promise containing the updated contact ID
   *
   * @throws {NotFoundError} Contact not found or doesn't belong to your workspace
   * @throws {BadRequestError} Invalid input data or unknown property names
   * @throws {ConflictError} Email already in use by another contact
   * @throws {UnauthorizedError} Invalid API key or missing write:contacts scope
   *
   * @example
   * ```ts
   * // Update basic contact info
   * await kibamail.contacts.update("contact_abc123", {
   *   firstName: "Jane",
   *   lastName: "Smith"
   * });
   *
   * // Update custom properties
   * await kibamail.contacts.update("contact_abc123", {
   *   properties: {
   *     "Plan": "Pro",
   *     "Monthly Spend": 99.99
   *   }
   * });
   *
   * // Update topic subscriptions (replaces all existing subscriptions)
   * await kibamail.contacts.update("contact_abc123", {
   *   topics: ["topic_newsletter", "topic_product_updates"]
   * });
   *
   * // Remove all topic subscriptions
   * await kibamail.contacts.update("contact_abc123", {
   *   topics: []
   * });
   * ```
   */
  update(contactId: string, params: UpdateContactBody) {
    return this.client.PUT("/v1/contacts/{contactId}", {
      params: {
        path: { contactId },
      },
      body: params,
    });
  }

  /**
   * Delete a contact by ID.
   *
   * Permanently removes a contact from your workspace. This action cannot be undone.
   *
   * **Use Cases:**
   * - Process GDPR/privacy deletion requests
   * - Remove invalid or test contacts
   * - Clean up duplicate contacts
   * - Remove contacts who requested account deletion
   *
   * **Behavior:**
   * - Permanently deletes the contact record
   * - Also removes all associated topic subscriptions
   * - Cannot be undone - contact data is permanently lost
   * - Returns 404 if contact doesn't exist
   *
   * **Required Scope:** `write:contacts`
   *
   * **Warning:** This operation is irreversible. Consider unsubscribing contacts instead of
   * deleting them if you may need to restore them later.
   *
   * @param contactId - The unique identifier of the contact to delete
   *
   * @returns Promise containing the deleted contact ID
   *
   * @throws {NotFoundError} Contact not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing write:contacts scope
   *
   * @example
   * ```ts
   * // Delete a contact
   * await kibamail.contacts.delete("contact_abc123");
   *
   * // Delete with error handling
   * try {
   *   await kibamail.contacts.delete("contact_abc123");
   *   console.log("Contact deleted successfully");
   * } catch (error) {
   *   if (error.code === "CONTACT_NOT_FOUND") {
   *     console.log("Contact was already deleted");
   *   }
   * }
   * ```
   */
  delete(contactId: string) {
    return this.client.DELETE("/v1/contacts/{contactId}", {
      params: {
        path: { contactId },
      },
    });
  }

  /**
   * Search contacts using advanced filtering conditions.
   *
   * Search for contacts that match specific criteria using MongoDB-style query conditions.
   * Supports complex queries with AND/OR logic and various comparison operators.
   *
   * **Use Cases:**
   * - Find contacts that match specific criteria (e.g., all Enterprise customers)
   * - Build dynamic segments based on contact properties
   * - Filter contacts for targeted email campaigns
   * - Generate reports based on contact attributes
   * - Find contacts for automation workflows
   *
   * **Behavior:**
   * - Uses MongoDB-style query syntax for filters
   * - Supports AND/OR logical operators for complex queries
   * - Can filter on built-in fields and custom properties
   * - Returns paginated results with cursor-based pagination
   * - Maximum 100 contacts per request
   *
   * **Required Scope:** `read:contacts`
   *
   * **Supported Operators:**
   * - `equals`: Exact match (e.g., status equals "SUBSCRIBED")
   * - `not_equals`: Does not match
   * - `contains`: String contains value (case-insensitive)
   * - `not_contains`: String does not contain value
   * - `greater_than`: Numeric/date comparison (e.g., signup date > timestamp)
   * - `less_than`: Numeric/date comparison
   * - `greater_than_or_equal`: Numeric/date comparison
   * - `less_than_or_equal`: Numeric/date comparison
   * - `in`: Value is in array (e.g., status in ["SUBSCRIBED", "PENDING"])
   * - `not_in`: Value is not in array
   *
   * @param params - Search parameters
   * @param params.filters - Query conditions using AND/OR logic
   * @param params.limit - Number of contacts to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination
   * @param params.before - Cursor for pagination
   *
   * @returns Promise containing paginated search results
   *
   * @throws {BadRequestError} Invalid filter conditions or unknown property names
   * @throws {UnauthorizedError} Invalid API key or missing read:contacts scope
   *
   * @example
   * ```ts
   * // Find all subscribed contacts in the US
   * const usContacts = await kibamail.contacts.search({
   *   filters: {
   *     AND: [
   *       { field: "status", operator: "equals", value: "SUBSCRIBED" },
   *       { field: "country", operator: "equals", value: "US" }
   *     ]
   *   }
   * });
   *
   * // Find Enterprise customers who signed up in the last 30 days
   * const recentEnterpriseCustomers = await kibamail.contacts.search({
   *   filters: {
   *     AND: [
   *       { field: "Plan", operator: "equals", value: "Enterprise" },
   *       { field: "Sign Up Date", operator: "greater_than", value: Date.now() - 30 * 24 * 60 * 60 * 1000 }
   *     ]
   *   },
   *   limit: 100
   * });
   *
   * // Find contacts with complex conditions (Enterprise OR Pro plan, AND subscribed)
   * const premiumContacts = await kibamail.contacts.search({
   *   filters: {
   *     AND: [
   *       {
   *         OR: [
   *           { field: "Plan", operator: "equals", value: "Enterprise" },
   *           { field: "Plan", operator: "equals", value: "Pro" }
   *         ]
   *       },
   *       { field: "status", operator: "equals", value: "SUBSCRIBED" }
   *     ]
   *   }
   * });
   *
   * // Find contacts with email containing specific domain
   * const companyContacts = await kibamail.contacts.search({
   *   filters: {
   *     AND: [
   *       { field: "email", operator: "contains", value: "@acme.com" }
   *     ]
   *   }
   * });
   * ```
   */
  search(params: SearchContactsBody) {
    return this.client.POST("/v1/contacts/search", {
      body: params,
    });
  }
}
