import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

// Extract types from schema
type CreateFormBody = paths["/v1/forms"]["post"]["requestBody"]["content"]["application/json"];
type UpdateFormBody = paths["/v1/forms/{formId}"]["put"]["requestBody"]["content"]["application/json"];
type ListFormsQuery = paths["/v1/forms"]["get"]["parameters"]["query"];
type CreateFormVersionBody = paths["/v1/forms/{formId}/versions"]["post"]["requestBody"]["content"]["application/json"];

/**
 * Forms Resource
 *
 * Manage forms for collecting contact information and preferences.
 * Forms support versioning, publishing workflows, and flexible field configurations.
 *
 * **Key Features:**
 * - Create forms with custom field definitions
 * - Version control with draft and published states
 * - Publish forms to make them live
 * - Track form submissions and conversions
 * - Manage form settings and appearance
 *
 * **Form States:**
 * - `DRAFT`: Form is being edited and not visible to contacts
 * - `PUBLISHED`: Form is live and accepting submissions
 * - `ARCHIVED`: Form is no longer active
 *
 * **Versioning:**
 * - Forms support multiple versions for A/B testing
 * - Root form contains the current published version
 * - Child versions are drafts or previous versions
 * - Only one version can be published at a time
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a form
 * const form = await kibamail.forms.create({
 *   name: "Newsletter Signup",
 *   description: "Subscribe to our weekly newsletter",
 *   fields: [
 *     { name: "email", type: "email", required: true },
 *     { name: "firstName", type: "text", required: false }
 *   ]
 * });
 *
 * // Publish the form
 * await kibamail.forms.publish(form.data.id);
 * ```
 */
export class Forms {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new form in your workspace.
   *
   * Forms are created in DRAFT status and must be published to become active.
   * Fields define what information will be collected from contacts.
   *
   * **Use Cases:**
   * - Create newsletter signup forms
   * - Build contact preference centers
   * - Design lead capture forms
   * - Create event registration forms
   * - Build survey and feedback forms
   *
   * **Behavior:**
   * - Forms are created in DRAFT status
   * - Form name must be unique within workspace
   * - Fields configuration is validated at creation
   * - Version starts at 1 for new forms
   * - Must be published to accept submissions
   *
   * **Required Scope:** `write:forms`
   *
   * @param params - Form creation parameters
   * @param params.name - Form name (required, must be unique)
   * @param params.description - Description of the form's purpose
   * @param params.fields - Array of field definitions for the form
   *
   * @returns Promise containing the created form ID
   *
   * @throws {BadRequestError} Invalid field configuration or duplicate form name
   * @throws {UnauthorizedError} Invalid API key or missing write:forms scope
   *
   * @example
   * ```ts
   * // Create a simple newsletter form
   * const newsletterForm = await kibamail.forms.create({
   *   name: "Newsletter Signup",
   *   description: "Subscribe to our weekly newsletter",
   *   fields: [
   *     {
   *       name: "email",
   *       type: "email",
   *       label: "Email Address",
   *       required: true,
   *       placeholder: "you@example.com"
   *     },
   *     {
   *       name: "firstName",
   *       type: "text",
   *       label: "First Name",
   *       required: false,
   *       placeholder: "John"
   *     }
   *   ]
   * });
   *
   * // Create a detailed contact form
   * const contactForm = await kibamail.forms.create({
   *   name: "Contact Us",
   *   description: "Get in touch with our team",
   *   fields: [
   *     { name: "email", type: "email", required: true },
   *     { name: "firstName", type: "text", required: true },
   *     { name: "lastName", type: "text", required: true },
   *     { name: "company", type: "text", required: false },
   *     { name: "message", type: "textarea", required: true },
   *     {
   *       name: "interest",
   *       type: "select",
   *       required: true,
   *       options: ["Sales", "Support", "Partnership"]
   *     }
   *   ]
   * });
   * ```
   */
  create(params: CreateFormBody) {
    return this.client.POST("/v1/forms", {
      body: params,
    });
  }

  /**
   * Retrieve a paginated list of all root forms in your workspace.
   *
   * Returns only top-level forms (not versions) in reverse chronological order.
   * Use listVersions() to get all versions of a specific form.
   *
   * **Use Cases:**
   * - Display available forms in management UI
   * - Export form configurations for backup
   * - Audit form usage across workspace
   * - Build custom form management dashboards
   *
   * **Behavior:**
   * - Returns only root forms (parentId is null)
   * - Returns forms in reverse chronological order (newest first)
   * - Uses cursor-based pagination for efficient data retrieval
   * - Does not include form field definitions (use get() for full details)
   * - Maximum 100 forms per request
   *
   * **Required Scope:** `read:forms`
   *
   * @param params - Pagination parameters
   * @param params.limit - Number of forms to return (default: 20, max: 100)
   * @param params.after - Cursor for pagination
   * @param params.before - Cursor for pagination
   *
   * @returns Promise containing paginated form list
   *
   * @throws {UnauthorizedError} Invalid API key or missing read:forms scope
   *
   * @example
   * ```ts
   * // Get all forms
   * const forms = await kibamail.forms.list({ limit: 100 });
   *
   * // Filter published forms
   * const publishedForms = forms.data.filter(form => form.status === "PUBLISHED");
   * ```
   */
  list(params?: ListFormsQuery) {
    return this.client.GET("/v1/forms", {
      params: {
        query: params,
      },
    });
  }

  /**
   * Retrieve a specific form by ID.
   *
   * Returns the complete form record including fields, settings, and version information.
   *
   * **Use Cases:**
   * - Fetch form details for rendering
   * - Get form configuration for embedding
   * - Verify form settings before publishing
   * - Retrieve form schema for validation
   *
   * **Behavior:**
   * - Returns form only if it belongs to the authenticated workspace
   * - Includes complete field definitions and settings
   * - Returns 404 if form doesn't exist or belongs to different workspace
   * - Includes timestamps (createdAt, updatedAt, publishedAt)
   *
   * **Required Scope:** `read:forms`
   *
   * @param formId - The unique identifier of the form
   *
   * @returns Promise containing the complete form details
   *
   * @throws {NotFoundError} Form not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing read:forms scope
   *
   * @example
   * ```ts
   * const form = await kibamail.forms.get("form_abc123");
   * console.log(form.data.name); // "Newsletter Signup"
   * console.log(form.data.status); // "PUBLISHED"
   * console.log(form.data.version); // 2
   * console.log(form.data.fields); // [{ name: "email", ... }]
   * ```
   */
  get(formId: string) {
    return this.client.GET("/v1/forms/{formId}", {
      params: {
        path: { formId },
      },
    });
  }

  /**
   * List all versions of a specific form.
   *
   * Returns the root form and all its child versions ordered by version number.
   * Useful for managing form iterations and A/B testing different versions.
   *
   * **Use Cases:**
   * - View form version history
   * - Compare different form iterations
   * - Manage A/B test variants
   * - Track form evolution over time
   *
   * **Behavior:**
   * - Returns root form and all child versions
   * - Ordered by version number (ascending)
   * - Only works with root forms (parentId is null)
   * - Returns 404 if form is not a root form
   *
   * **Required Scope:** `read:forms`
   *
   * @param formId - The unique identifier of the root form
   *
   * @returns Promise containing all versions of the form
   *
   * @throws {NotFoundError} Form not found or is not a root form
   * @throws {UnauthorizedError} Invalid API key or missing read:forms scope
   *
   * @example
   * ```ts
   * const versions = await kibamail.forms.listVersions("form_abc123");
   * console.log(versions.data); // Array of form versions
   * console.log(versions.data[0].version); // 1 (original)
   * console.log(versions.data[1].version); // 2 (updated version)
   * ```
   */
  listVersions(formId: string) {
    return this.client.GET("/v1/forms/{formId}/versions", {
      params: {
        path: { formId },
      },
    });
  }

  /**
   * Update an existing form by ID.
   *
   * Updates form information including name, description, fields, and settings.
   * Only DRAFT forms can be edited; published or archived forms cannot be modified.
   *
   * **Use Cases:**
   * - Edit form fields before publishing
   * - Update form copy and descriptions
   * - Modify field configurations
   * - Adjust form settings
   *
   * **Behavior:**
   * - Only DRAFT forms can be edited
   * - Published or archived forms cannot be modified
   * - Only provided fields are updated; omitted fields remain unchanged
   * - Name must still be unique if changed
   * - Field changes are validated before saving
   *
   * **Required Scope:** `write:forms`
   *
   * **Important:** To edit a published form, create a new version instead of
   * updating the published one. This preserves the original for submissions
   * that are in progress.
   *
   * @param formId - The unique identifier of the form to update
   * @param params - Form update parameters (all optional, only provided fields are updated)
   * @param params.name - New form name (must be unique)
   * @param params.description - Updated description
   * @param params.fields - Updated field definitions
   * @param params.settings - Updated form settings
   *
   * @returns Promise containing the updated form ID
   *
   * @throws {NotFoundError} Form not found or doesn't belong to your workspace
   * @throws {BadRequestError} Form is not in DRAFT status or invalid field configuration
   * @throws {UnauthorizedError} Invalid API key or missing write:forms scope
   *
   * @example
   * ```ts
   * // Update form name and description
   * await kibamail.forms.update("form_abc123", {
   *   name: "Weekly Newsletter Signup",
   *   description: "Get our latest updates every week"
   * });
   *
   * // Add a new field to the form
   * const form = await kibamail.forms.get("form_abc123");
   * await kibamail.forms.update("form_abc123", {
   *   fields: [
   *     ...form.data.fields,
   *     { name: "phone", type: "tel", required: false }
   *   ]
   * });
   * ```
   */
  update(formId: string, params: UpdateFormBody) {
    return this.client.PUT("/v1/forms/{formId}", {
      params: {
        path: { formId },
      },
      body: params,
    });
  }

  /**
   * Publish a form to make it live and accepting submissions.
   *
   * Publishing a form changes its status from DRAFT to PUBLISHED and makes it
   * accessible to contacts. Only one version can be published at a time.
   *
   * **Use Cases:**
   * - Make a new form live
   * - Deploy an updated form version
   * - Switch between form variants for A/B testing
   * - Activate a form after review
   *
   * **Behavior:**
   * - Changes form status from DRAFT to PUBLISHED
   * - If publishing a child version, unpublishes current version
   * - Sets publishedAt timestamp to current time
   * - Form becomes immediately available for submissions
   * - Previous published version (if any) is unpublished
   *
   * **Required Scope:** `write:forms`
   *
   * @param formId - The unique identifier of the form to publish
   *
   * @returns Promise containing the published form ID
   *
   * @throws {NotFoundError} Form not found or doesn't belong to your workspace
   * @throws {BadRequestError} Form is already published or cannot be published
   * @throws {UnauthorizedError} Invalid API key or missing write:forms scope
   *
   * @example
   * ```ts
   * // Create and publish a form
   * const form = await kibamail.forms.create({
   *   name: "Contact Form",
   *   fields: [
   *     { name: "email", type: "email", required: true }
   *   ]
   * });
   * await kibamail.forms.publish(form.data.id);
   *
   * // Publish a new version (unpublishes current version)
   * const newVersion = await kibamail.forms.create({
   *   name: "Contact Form v2",
   *   fields: [
   *     { name: "email", type: "email", required: true },
   *     { name: "phone", type: "tel", required: false }
   *   ]
   * });
   * await kibamail.forms.publish(newVersion.data.id);
   * ```
   */
  publish(formId: string) {
    return this.client.POST("/v1/forms/{formId}/publish", {
      params: {
        path: { formId },
      },
    });
  }

  /**
   * Delete a form by ID.
   *
   * Permanently removes a form from your workspace. For root forms, this also
   * deletes all child versions and associated submissions. This action cannot be undone.
   *
   * **Use Cases:**
   * - Remove unused or test forms
   * - Clean up deprecated forms
   * - Delete forms with incorrect configuration
   * - Remove forms that are no longer needed
   *
   * **Behavior:**
   * - Permanently deletes the form record
   * - For root forms: deletes all child versions and submissions
   * - For child versions: only deletes that specific version
   * - Cannot be undone - all data is permanently lost
   * - Returns 404 if form doesn't exist
   *
   * **Required Scope:** `write:forms`
   *
   * **Warning:** Deleting a root form will remove all versions and submissions.
   * Make sure you have backups if you might need this data later.
   *
   * @param formId - The unique identifier of the form to delete
   *
   * @returns Promise containing the deleted form ID
   *
   * @throws {NotFoundError} Form not found or doesn't belong to your workspace
   * @throws {UnauthorizedError} Invalid API key or missing write:forms scope
   *
   * @example
   * ```ts
   * // Delete a form
   * await kibamail.forms.delete("form_abc123");
   *
   * // Delete with error handling
   * try {
   *   await kibamail.forms.delete("form_abc123");
   *   console.log("Form and all versions deleted");
   * } catch (error) {
   *   if (error.code === "FORM_NOT_FOUND") {
   *     console.log("Form was already deleted");
   *   }
   * }
   * ```
   */
  delete(formId: string) {
    return this.client.DELETE("/v1/forms/{formId}", {
      params: {
        path: { formId },
      },
    });
  }

  /**
   * Create a new version of an existing form.
   *
   * Creates a new DRAFT version that inherits configuration from the parent form.
   * This enables zero-downtime form updates - edit in draft, test, then publish when ready.
   *
   * **Use Cases:**
   * - Update a published form without breaking the live version
   * - Test changes before deploying to production
   * - Create A/B test variants
   * - Roll back to previous versions
   * - Maintain form version history
   *
   * **Behavior:**
   * - New version inherits all fields from parent if not provided
   * - Created in DRAFT status (can be edited)
   * - Parent can be root form or any existing version
   * - Only one DRAFT version allowed per root form
   * - All fields are optional (defaults to parent values)
   * - New version gets unique ID but shares root form lineage
   *
   * **Required Scope:** `write:forms`
   *
   * **Version Inheritance:**
   * - If no fields provided, copies all from parent
   * - Specify only fields you want to change
   * - Omitted fields default to parent values
   * - Creates independent copy (changes don't affect parent)
   *
   * **Versioning Workflow:**
   * 1. Published form is live on website
   * 2. Create new version (inherits configuration)
   * 3. Modify new DRAFT version as needed
   * 4. Test new version
   * 5. Publish new version
   * 6. Previous published version becomes ARCHIVED
   * 7. Form URL remains constant across versions
   *
   * **Important:**
   * - Cannot create version if DRAFT already exists for this root form
   * - Only one DRAFT version per form family
   * - Publish or delete existing DRAFT before creating new version
   * - Versions share the same root form ID
   *
   * @param formId - The unique identifier of the form (can be root or any version)
   * @param params - Optional version parameters (defaults to parent values)
   * @param params.name - Override the form name for this version
   * @param params.description - Override the form description for this version
   * @param params.fields - Override the form fields for this version
   *
   * @returns Promise containing the created version ID
   *
   * @throws {NotFoundError} Form not found or doesn't belong to your workspace
   * @throws {BadRequestError} A DRAFT version already exists for this form's root
   * @throws {UnauthorizedError} Invalid API key or missing write:forms scope
   *
   * @example
   * ```ts
   * // Create a new version of a form (inherits all settings)
   * const { data, error } = await kibamail.forms.createVersion("form_abc123");
   *
   * // Create a version with modified name
   * const { data, error } = await kibamail.forms.createVersion("form_abc123", {
   *   name: "Newsletter Signup v2"
   * });
   *
   * // Create a version with updated fields
   * const { data, error } = await kibamail.forms.createVersion("form_abc123", {
   *   name: "Newsletter Signup v2",
   *   fields: [
   *     { name: "email", type: "email", required: true },
   *     { name: "firstName", type: "text", required: false },
   *     { name: "phone", type: "tel", required: false } // New field
   *   ]
   * });
   *
   * // Then publish the new version when ready
   * await kibamail.forms.publish(data.id);
   * ```
   */
  createVersion(formId: string, params: CreateFormVersionBody = {}) {
    return this.client.POST("/v1/forms/{formId}/versions", {
      params: { path: { formId } },
      body: params,
    });
  }
}
