import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type CreateAndSendBroadcastBody =
  paths["/v1/broadcasts/create-and-send"]["post"]["requestBody"]["content"]["application/json"];
type CreateBroadcastBody =
  paths["/v1/broadcasts"]["post"]["requestBody"]["content"]["application/json"];
type UpdateBroadcastBody =
  paths["/v1/broadcasts/{broadcastId}"]["put"]["requestBody"]["content"]["application/json"];
type ListBroadcastsQuery = paths["/v1/broadcasts"]["get"]["parameters"]["query"];
type ListBroadcastSendsQuery =
  paths["/v1/broadcasts/{broadcastId}/sends"]["get"]["parameters"]["query"];

export class BroadcastSends {
  constructor(protected client: HttpClient) {}

  /** List individual email sends for a broadcast. */
  list(broadcastId: string, params?: ListBroadcastSendsQuery) {
    return this.client.GET("/v1/broadcasts/{broadcastId}/sends", {
      params: {
        path: { broadcastId },
        query: params,
      },
    });
  }
}

export class BroadcastStats {
  constructor(protected client: HttpClient) {}

  /** Get aggregate statistics for a broadcast. */
  get(broadcastId: string) {
    return this.client.GET("/v1/broadcasts/{broadcastId}/stats", {
      params: {
        path: { broadcastId },
      },
    });
  }
}

export class Broadcasts {
  public readonly sends: BroadcastSends;
  public readonly stats: BroadcastStats;

  constructor(protected client: HttpClient) {
    this.sends = new BroadcastSends(client);
    this.stats = new BroadcastStats(client);
  }

  /** List all broadcasts in the workspace. */
  list(params?: ListBroadcastsQuery) {
    return this.client.GET("/v1/broadcasts", {
      params: {
        query: params,
      },
    });
  }

  /** Create a new broadcast draft. */
  create(params: CreateBroadcastBody) {
    return this.client.POST("/v1/broadcasts", {
      body: params,
    });
  }

  /** Get a broadcast by ID. */
  get(broadcastId: string) {
    return this.client.GET("/v1/broadcasts/{broadcastId}", {
      params: {
        path: { broadcastId },
      },
    });
  }

  /** Update an existing broadcast. */
  update(broadcastId: string, params: UpdateBroadcastBody) {
    return this.client.PUT("/v1/broadcasts/{broadcastId}", {
      params: {
        path: { broadcastId },
      },
      body: params,
    });
  }

  /** Delete a broadcast permanently. */
  delete(broadcastId: string) {
    return this.client.DELETE("/v1/broadcasts/{broadcastId}", {
      params: {
        path: { broadcastId },
      },
    });
  }

  /** Schedule a broadcast for sending. */
  send(broadcastId: string) {
    return this.client.POST("/v1/broadcasts/{broadcastId}/send", {
      params: {
        path: { broadcastId },
      },
    });
  }

  /** Create a broadcast with content and schedule it for delivery in one step. */
  createAndSend(params: CreateAndSendBroadcastBody) {
    return this.client.POST("/v1/broadcasts/create-and-send", {
      body: params,
    });
  }
}
