import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type CreateEventBody =
  paths["/v1/events"]["post"]["requestBody"]["content"]["application/json"];

export class Events {
  constructor(protected client: HttpClient) {}

  /** Fire a custom event to trigger automations and track contact activity. */
  create(params: CreateEventBody) {
    return this.client.POST("/v1/events", {
      body: params,
    });
  }
}
