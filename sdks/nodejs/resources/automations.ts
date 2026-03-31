import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type CreateAutomationBody =
  paths["/v1/automations"]["post"]["requestBody"]["content"]["application/json"];
type UpdateAutomationBody =
  paths["/v1/automations/{automationId}"]["put"]["requestBody"]["content"]["application/json"];
type ListAutomationsQuery = paths["/v1/automations"]["get"]["parameters"]["query"];

export class Automations {
  constructor(protected client: HttpClient) {}

  /** List all automations in the workspace. */
  list(params?: ListAutomationsQuery) {
    return this.client.GET("/v1/automations", {
      params: {
        query: params,
      },
    });
  }

  /** Create a new automation workflow. */
  create(params: CreateAutomationBody) {
    return this.client.POST("/v1/automations", {
      body: params,
    });
  }

  /** Get an automation by ID. */
  get(automationId: string) {
    return this.client.GET("/v1/automations/{automationId}", {
      params: {
        path: { automationId },
      },
    });
  }

  /** Update an existing automation's configuration. */
  update(automationId: string, params: UpdateAutomationBody) {
    return this.client.PUT("/v1/automations/{automationId}", {
      params: {
        path: { automationId },
      },
      body: params,
    });
  }

  /** Delete an automation permanently. */
  delete(automationId: string) {
    return this.client.DELETE("/v1/automations/{automationId}", {
      params: {
        path: { automationId },
      },
    });
  }

  /** Publish an automation to make it active. */
  publish(automationId: string) {
    return this.client.POST("/v1/automations/{automationId}/publish", {
      params: {
        path: { automationId },
      },
    });
  }

  /** Archive a published automation to stop processing triggers. */
  archive(automationId: string) {
    return this.client.POST("/v1/automations/{automationId}/archive", {
      params: {
        path: { automationId },
      },
    });
  }

  /** Manually trigger an automation for testing or one-off execution. */
  trigger(automationId: string) {
    return this.client.POST("/v1/automations/{automationId}/trigger", {
      params: {
        path: { automationId },
      },
    });
  }

  /** Dry-run simulation showing the path a contact would take. No side effects. */
  simulate(automationId: string, params: paths["/v1/automations/{automationId}/simulate"]["post"]["requestBody"]["content"]["application/json"]) {
    return this.client.POST("/v1/automations/{automationId}/simulate", {
      params: { path: { automationId } },
      body: params,
    });
  }

  /** Retrieve all versions of a specific automation. */
  listVersions(automationId: string) {
    return this.client.GET("/v1/automations/{automationId}/versions", {
      params: { path: { automationId } },
    });
  }

  /** Create a new draft version of an existing automation. */
  createVersion(automationId: string, params?: paths["/v1/automations/{automationId}/versions"]["post"]["requestBody"]["content"]["application/json"]) {
    return this.client.POST("/v1/automations/{automationId}/versions", {
      params: { path: { automationId } },
      body: params ?? {},
    });
  }
}
