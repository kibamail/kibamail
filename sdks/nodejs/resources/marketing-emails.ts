import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type CreateMarketingEmailBody = paths["/v1/marketing-emails"]["post"]["requestBody"]["content"]["application/json"];
type UpdateMarketingEmailBody = paths["/v1/marketing-emails/{emailId}"]["put"]["requestBody"]["content"]["application/json"];
type ListMarketingEmailsQuery = paths["/v1/marketing-emails"]["get"]["parameters"]["query"];

/**
 * Marketing Emails Resource
 *
 * Manage reusable HTML email templates for double opt-in and automations.
 *
 * @example
 * ```ts
 * const email = await kibamail.marketingEmails.create({
 *   name: "Confirm Subscription",
 *   subject: "Please confirm, {{firstName}}",
 *   html: '<html><body><a href="{{confirmation_url}}">Confirm</a></body></html>',
 * });
 * ```
 */
export class MarketingEmails {
  constructor(protected client: HttpClient) {}

  /**
   * Create a new marketing email template.
   *
   * **Required Scope:** `write:emails`
   */
  create(params: CreateMarketingEmailBody) {
    return this.client.POST("/v1/marketing-emails", {
      body: params,
    });
  }

  /**
   * List marketing emails.
   *
   * **Required Scope:** `read:emails`
   */
  list(params?: ListMarketingEmailsQuery) {
    return this.client.GET("/v1/marketing-emails", {
      params: { query: params },
    });
  }

  /**
   * Get a specific marketing email by ID.
   *
   * **Required Scope:** `read:emails`
   */
  get(emailId: string) {
    return this.client.GET("/v1/marketing-emails/{emailId}", {
      params: { path: { emailId } },
    });
  }

  /**
   * Update a marketing email.
   *
   * **Required Scope:** `write:emails`
   */
  update(emailId: string, params: UpdateMarketingEmailBody) {
    return this.client.PUT("/v1/marketing-emails/{emailId}", {
      params: { path: { emailId } },
      body: params,
    });
  }

  /**
   * Delete a marketing email.
   *
   * **Required Scope:** `write:emails`
   */
  delete(emailId: string) {
    return this.client.DELETE("/v1/marketing-emails/{emailId}", {
      params: { path: { emailId } },
    });
  }

  /**
   * Get HTML preview with sample variables substituted.
   *
   * **Required Scope:** `read:emails`
   */
  preview(emailId: string) {
    return this.client.GET("/v1/marketing-emails/{emailId}/preview", {
      params: { path: { emailId } },
    });
  }

  /**
   * Get analytics stats for a marketing email.
   *
   * **Required Scope:** `read:emails`
   */
  stats(emailId: string) {
    return this.client.GET("/v1/marketing-emails/{emailId}/stats", {
      params: { path: { emailId } },
    });
  }
}
