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
 * Manage forms for collecting contact information.
 * Forms use a deploy-based workflow: create the form with metadata,
 * deploy a site bundle (HTML + CSS + JS + assets), then publish.
 *
 * **Form Lifecycle:**
 * 1. Create form with name + fieldMapping
 * 2. Deploy site bundle (index.html + assets)
 * 3. Publish to go live
 * 4. Create versions for updates
 *
 * @example
 * ```ts
 * const kibamail = new Kibamail("your-api-key");
 *
 * // Create a form
 * const form = await kibamail.forms.create({
 *   name: "Newsletter Signup",
 *   fieldMapping: {
 *     email: { contactPropertyId: "email", contactPropertyType: "standard", fieldType: "string" }
 *   }
 * });
 *
 * // Deploy content via the deploy endpoint (multipart upload)
 * // Then publish
 * await kibamail.forms.publish(form.data.id);
 * ```
 */
export class Forms {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new form in your workspace.
   *
   * Forms are created in DRAFT status. Content (HTML) is uploaded
   * separately via the deploy endpoint.
   *
   * **Required Scope:** `write:forms`
   *
   * @param params - Form creation parameters
   * @param params.name - Form name (required)
   * @param params.fieldMapping - Maps field names to contact properties (required)
   * @param params.description - Form description (optional)
   * @param params.settings - Behavioral settings (optional)
   *
   * @returns Promise containing the created form ID
   *
   * @example
   * ```ts
   * const form = await kibamail.forms.create({
   *   name: "Newsletter Signup",
   *   fieldMapping: {
   *     email: { contactPropertyId: "email", contactPropertyType: "standard", fieldType: "string" },
   *     first_name: { contactPropertyId: "firstName", contactPropertyType: "standard", fieldType: "string" }
   *   }
   * });
   * ```
   */
  create(params: CreateFormBody) {
    return this.client.POST("/v1/forms", {
      body: params,
    });
  }

  /**
   * List all root forms in your workspace.
   *
   * **Required Scope:** `read:forms`
   *
   * @param params - Pagination parameters
   *
   * @example
   * ```ts
   * const forms = await kibamail.forms.list({ limit: 100 });
   * ```
   */
  list(params?: ListFormsQuery) {
    return this.client.GET("/v1/forms", {
      params: { query: params },
    });
  }

  /**
   * Retrieve a specific form by ID.
   *
   * **Required Scope:** `read:forms`
   *
   * @param formId - The form ID
   *
   * @example
   * ```ts
   * const form = await kibamail.forms.get("form_abc123");
   * console.log(form.data.html);         // deployed HTML
   * console.log(form.data.fieldMapping);  // field-to-property mapping
   * ```
   */
  get(formId: string) {
    return this.client.GET("/v1/forms/{formId}", {
      params: { path: { formId } },
    });
  }

  /**
   * List all versions of a specific form.
   *
   * **Required Scope:** `read:forms`
   *
   * @param formId - The root form ID
   *
   * @example
   * ```ts
   * const versions = await kibamail.forms.listVersions("form_abc123");
   * ```
   */
  listVersions(formId: string) {
    return this.client.GET("/v1/forms/{formId}/versions", {
      params: { path: { formId } },
    });
  }

  /**
   * Update an existing form (DRAFT only).
   *
   * **Required Scope:** `write:forms`
   *
   * @param formId - The form ID
   * @param params - Fields to update (all optional)
   *
   * @example
   * ```ts
   * await kibamail.forms.update("form_abc123", {
   *   name: "Updated Form Name"
   * });
   * ```
   */
  update(formId: string, params: UpdateFormBody) {
    return this.client.PUT("/v1/forms/{formId}", {
      params: { path: { formId } },
      body: params,
    });
  }

  /**
   * Publish a form. Requires deployed content.
   *
   * **Required Scope:** `write:forms`
   *
   * @param formId - The form ID
   *
   * @example
   * ```ts
   * await kibamail.forms.publish(form.data.id);
   * ```
   */
  publish(formId: string) {
    return this.client.POST("/v1/forms/{formId}/publish", {
      params: { path: { formId } },
    });
  }

  /**
   * Delete a form (DRAFT only).
   *
   * **Required Scope:** `write:forms`
   *
   * @param formId - The form ID
   *
   * @example
   * ```ts
   * await kibamail.forms.delete("form_abc123");
   * ```
   */
  delete(formId: string) {
    return this.client.DELETE("/v1/forms/{formId}", {
      params: { path: { formId } },
    });
  }

  /**
   * Create a new version of a form. Inherits content from the parent.
   *
   * **Required Scope:** `write:forms`
   *
   * @param formId - The form ID
   * @param params - Optional overrides
   *
   * @example
   * ```ts
   * const version = await kibamail.forms.createVersion("form_abc123");
   * // Deploy new content to the version, then publish
   * await kibamail.forms.publish(version.data.id);
   * ```
   */
  createVersion(formId: string, params: CreateFormVersionBody = {}) {
    return this.client.POST("/v1/forms/{formId}/versions", {
      params: { path: { formId } },
      body: params,
    });
  }
}
