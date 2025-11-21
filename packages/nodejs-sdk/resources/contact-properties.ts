import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateContactPropertyBody = paths["/v1/contact-properties"]["post"]["requestBody"]["content"]["application/json"];
type UpdateContactPropertyBody = paths["/v1/contact-properties/{contactPropertyId}"]["put"]["requestBody"]["content"]["application/json"];
type ListContactPropertiesQuery = paths["/v1/contact-properties"]["get"]["parameters"]["query"];

/**
 * Contact Properties Resource
 *
 * Manage custom properties for contact records in your workspace.
 * Contact properties allow you to store additional information beyond the built-in fields.
 *
 * **Key Features:**
 * - Create custom properties with different data types (text, number, date, boolean)
 * - Properties are automatically assigned to internal storage slots
 * - Use properties in segments, filters, and personalizations
 * - Track property-specific limits per type
 *
 * **Property Types:**
 * - `TEXT`: String values (names, labels, notes)
 * - `NUMBER`: Numeric values (age, score, quantity)
 * - `DATE`: Timestamps (signup date, last purchase)
 * - `BOOLEAN`: True/false values (is_premium, email_verified)
 *
 * **Slot System:**
 * Properties are stored in predefined database slots based on their type.
 * Each type has a maximum number of available slots (managed automatically).
 * You cannot create more properties of a type than available slots.
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a text property
 * const companyProp = await kibamail.contactProperties.create({
 *   name: "Company",
 *   type: "TEXT",
 *   description: "Company name"
 * });
 *
 * // Create a number property
 * const ageProp = await kibamail.contactProperties.create({
 *   name: "Age",
 *   type: "NUMBER",
 *   description: "Customer age"
 * });
 *
 * // Use property when creating contact
 * await kibamail.contacts.create({
 *   email: "user@example.com",
 *   properties: {
 *     "Company": "Acme Corp",
 *     "Age": 35
 *   }
 * });
 * ```
 */
export class ContactProperties {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new contact property in your workspace.
   *
   * Properties must have a unique name and are automatically assigned to an available
   * storage slot based on their type. If all slots for a type are occupied, creation will fail.
   *
   * **Use Cases:**
   * - Store customer attributes (company, job title, department)
   * - Track behavioral data (last login, signup date, trial end date)
   * - Record business metrics (lifetime value, monthly spend, plan tier)
   * - Save preferences (notification settings, communication frequency)
   *
   * **Behavior:**
   * - Property name must be unique within workspace
   * - Automatically assigns available slot based on type
   * - Each property type has a maximum number of slots
   * - Returns error if all slots for the type are occupied
   * - Slot assignment is handled internally and not exposed via API
   *
   * **Required Scope:** `write:contact-properties`
   *
   * **Slot Limits:**
   * Different property types have different maximum slot counts (managed automatically).
   * If you hit the limit, you'll need to delete unused properties before creating new ones.
   *
   * @param params - Contact property creation parameters
   * @param params.name - Property name (required, must be unique, used when setting contact values)
   * @param params.type - Property data type: "TEXT", "NUMBER", "DATE", or "BOOLEAN"
   * @param params.description - Description of what this property represents
   *
   * @returns Promise containing the created contact property details
   *
   * @throws {BadRequestError} Invalid input or maximum slots reached for this type
   * @throws {ConflictError} Property with this name already exists
   * @throws {UnauthorizedError} Invalid API key or missing write:contact-properties scope
   *
   * @example
   * ```ts
   * // Create text property for company name
   * const company = await kibamail.contactProperties.create({
   *   name: "Company",
   *   type: "TEXT",
   *   description: "Customer's company name"
   * });
   *
   * // Create number property for monthly spend
   * const monthlySpend = await kibamail.contactProperties.create({
   *   name: "Monthly Spend",
   *   type: "NUMBER",
   *   description: "Average monthly spend in USD"
   * });
   *
   * // Create date property for signup
   * const signupDate = await kibamail.contactProperties.create({
   *   name: "Sign Up Date",
   *   type: "DATE",
   *   description: "When the customer signed up"
   * });
   *
   * // Create boolean property for premium status
   * const isPremium = await kibamail.contactProperties.create({
   *   name: "Is Premium",
   *   type: "BOOLEAN",
   *   description: "Whether the customer has a premium subscription"
   * });
   * ```
   */
  create(params: CreateContactPropertyBody) {
    return this.client.POST("/v1/contact-properties", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all contact properties in your workspace.
   *
   * Returns properties in reverse chronological order (newest first) with cursor-based pagination.
   *
   * **Use Cases:**
   * - Display available properties in form builders
   * - Export property schema for documentation
   * - Audit property usage across workspace
   * - Build custom property management interfaces
   *
   * **Behavior:**
   * - Returns properties in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Includes property name, type, description, and assigned slot
   * - Maximum 100 properties per request
   *
   * **Required Scope:** `read:contact-properties`
   *
   * @param params - Pagination parameters
   * @param params.limit - Number of properties to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination
   * @param params.before - Cursor for pagination
   *
   * @returns Promise containing paginated contact property list
   *
   * @throws {UnauthorizedError} Invalid API key or missing read:contact-properties scope
   *
   * @example
   * ```ts
   * // Get all contact properties
   * const properties = await kibamail.contactProperties.list({ limit: 100 });
   *
   * // Group properties by type
   * const propertiesByType = {};
   * for (const prop of properties.data) {
   *   if (!propertiesByType[prop.type]) {
   *     propertiesByType[prop.type] = [];
   *   }
   *   propertiesByType[prop.type].push(prop.name);
   * }
   * ```
   */
  list(params?: ListContactPropertiesQuery) {
    return this.client.GET("/v1/contact-properties", {
      params: {
        query: params,
      },
    });
  }

  /**
   * Retrieve a specific contact property by ID.
   *
   * Returns the full property record including name, type, description, and assigned slot.
   *
   * **Use Cases:**
   * - Fetch property details for display
   * - Verify property type and configuration
   * - Get property metadata for validation
   *
   * **Behavior:**
   * - Returns property only if it belongs to the authenticated workspace
   * - Returns 404 if property doesn't exist or belongs to different workspace
   * - Includes internal slot assignment for debugging
   *
   * **Required Scope:** `read:contact-properties`
   *
   * @param contactPropertyId - The unique identifier of the contact property
   *
   * @returns Promise containing the contact property details
   *
   * @throws {NotFoundError} Property not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:contact-properties scope
   *
   * @example
   * ```ts
   * const property = await kibamail.contactProperties.get("prop_abc123");
   * console.log(property.data.name); // "Company"
   * console.log(property.data.type); // "TEXT"
   * console.log(property.data.slot); // "propertyString0" (internal storage slot)
   * ```
   */
  get(contactPropertyId: string) {
    return this.client.GET("/v1/contact-properties/{contactPropertyId}", {
      params: {
        path: { contactPropertyId },
      },
    });
  }

  /**
   * Update an existing contact property by ID.
   *
   * Updates property information including name and description.
   * Property type cannot be changed after creation.
   *
   * **Use Cases:**
   * - Rename properties for clarity
   * - Update property descriptions
   * - Fix typos in property names
   *
   * **Behavior:**
   * - Only updates fields that are provided in the request
   * - Omitted fields remain unchanged
   * - Name must still be unique if changed
   * - Property type CANNOT be changed after creation
   * - Updating name affects all contact records using this property
   *
   * **Required Scope:** `write:contact-properties`
   *
   * **Important:** Changing a property name will affect all contacts that use this property.
   * The stored values remain the same, but you'll need to use the new name when querying.
   *
   * @param contactPropertyId - The unique identifier of the contact property to update
   * @param params - Property update parameters (all optional, only provided fields are updated)
   * @param params.name - New property name (must be unique)
   * @param params.description - Updated description
   *
   * @returns Promise containing the updated contact property details
   *
   * @throws {NotFoundError} Property not found or doesn't belong to your workspace
   * @throws {BadRequestError} Invalid input data or duplicate property name
   * @throws {UnauthorizedError} Invalid API key or missing write:contact-properties scope
   *
   * @example
   * ```ts
   * // Update property name
   * await kibamail.contactProperties.update("prop_abc123", {
   *   name: "Company Name"
   * });
   *
   * // Update description only
   * await kibamail.contactProperties.update("prop_abc123", {
   *   description: "Full legal company name"
   * });
   * ```
   */
  update(contactPropertyId: string, params: UpdateContactPropertyBody) {
    return this.client.PUT("/v1/contact-properties/{contactPropertyId}", {
      params: {
        path: { contactPropertyId },
      },
      body: params,
    });
  }

  /**
   * Delete a contact property by ID.
   *
   * Permanently removes a contact property from your workspace and all associated contact values.
   * This action cannot be undone.
   *
   * **Use Cases:**
   * - Remove unused or deprecated properties
   * - Clean up test properties
   * - Free up slots for new properties of the same type
   * - Remove properties that contain incorrect data
   *
   * **Behavior:**
   * - Permanently deletes the property definition
   * - Also removes all stored values for this property from all contacts
   * - Frees up the slot for reuse by a new property of the same type
   * - Cannot be undone - all data is permanently lost
   * - Returns 404 if property doesn't exist
   *
   * **Required Scope:** `write:contact-properties`
   *
   * **Warning:** This operation permanently deletes the property values for ALL contacts.
   * Make sure you have a backup if you might need this data later.
   *
   * @param contactPropertyId - The unique identifier of the contact property to delete
   *
   * @returns Promise containing the deleted contact property ID
   *
   * @throws {NotFoundError} Property not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing write:contact-properties scope
   *
   * @example
   * ```ts
   * // Delete a property
   * await kibamail.contactProperties.delete("prop_abc123");
   *
   * // Delete with error handling
   * try {
   *   await kibamail.contactProperties.delete("prop_abc123");
   *   console.log("Property and all associated values deleted");
   * } catch (error) {
   *   if (error.code === "CONTACT_PROPERTY_NOT_FOUND") {
   *     console.log("Property was already deleted");
   *   }
   * }
   * ```
   */
  delete(contactPropertyId: string) {
    return this.client.DELETE("/v1/contact-properties/{contactPropertyId}", {
      params: {
        path: { contactPropertyId },
      },
    });
  }
}
