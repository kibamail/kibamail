import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type CreateDomainBody =
  paths["/v1/domains"]["post"]["requestBody"]["content"]["application/json"];
type UpdateDomainBody =
  paths["/v1/domains/{domainId}"]["put"]["requestBody"]["content"]["application/json"];
type ListDomainsQuery = paths["/v1/domains"]["get"]["parameters"]["query"];

export class Domains {
  constructor(protected client: HttpClient) {}

  /** List all sending domains in the workspace. */
  list(params?: ListDomainsQuery) {
    return this.client.GET("/v1/domains", {
      params: {
        query: params,
      },
    });
  }

  /** Add a new sending domain. */
  create(params: CreateDomainBody) {
    return this.client.POST("/v1/domains", {
      body: params,
    });
  }

  /** Get a sending domain by ID. */
  get(domainId: string) {
    return this.client.GET("/v1/domains/{domainId}", {
      params: {
        path: { domainId },
      },
    });
  }

  /** Update settings for a sending domain. */
  update(domainId: string, params: UpdateDomainBody) {
    return this.client.PUT("/v1/domains/{domainId}", {
      params: {
        path: { domainId },
      },
      body: params,
    });
  }

  /** Delete a sending domain permanently. */
  delete(domainId: string) {
    return this.client.DELETE("/v1/domains/{domainId}", {
      params: {
        path: { domainId },
      },
    });
  }

  /** Verify DNS configuration for a sending domain. */
  verify(domainId: string) {
    return this.client.POST("/v1/domains/{domainId}/verify", {
      params: {
        path: { domainId },
      },
    });
  }
}
