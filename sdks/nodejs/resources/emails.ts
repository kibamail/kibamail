import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type SendEmailBody =
  paths["/v1/emails/send"]["post"]["requestBody"]["content"]["application/json"];
type ListEmailsQuery = paths["/v1/emails"]["get"]["parameters"]["query"];

export class Emails {
  constructor(protected client: HttpClient) {}

  /** Send a transactional email. */
  send(params: SendEmailBody) {
    return this.client.POST("/v1/emails/send", {
      body: params,
    });
  }

  /** List transactional emails in the workspace. */
  list(params?: ListEmailsQuery) {
    return this.client.GET("/v1/emails", {
      params: {
        query: params,
      },
    });
  }

  /** Get a transactional email by ID. */
  get(emailId: string) {
    return this.client.GET("/v1/emails/{emailId}", {
      params: {
        path: { emailId },
      },
    });
  }

  /** Get the event timeline for a transactional email. */
  events(emailId: string) {
    return this.client.GET("/v1/emails/{emailId}/events", {
      params: {
        path: { emailId },
      },
    });
  }

  /** Get the HTML and plain text content of a transactional email. */
  content(emailId: string) {
    return this.client.GET("/v1/emails/{emailId}/content", {
      params: {
        path: { emailId },
      },
    });
  }
}
