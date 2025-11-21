import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./schema";

import { env } from "@/env/schema";

const client = createClient<paths>({
  baseUrl: `${env.OUTPOST_API_URL}/api/v1`,
  headers: {
    Authorization: `Bearer ${env.OUTPOST_API_KEY}`,
    "Content-Type": "application/json",
  },
});

function throwIfError(response: { error?: never }) {
  if (response?.error) {
    throw response.error;
  }
}

class EventDeliveriesManager {
  constructor(
    protected tenant: string,
    protected eventId: string,
  ) {}

  async list() {
    const response = await client.GET(
      "/{tenant_id}/events/{event_id}/deliveries",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            event_id: this.eventId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }
}

class EventManager {
  constructor(protected tenant: string) {}

  async list() {
    const response = await client.GET("/{tenant_id}/events", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async get(eventId: string) {
    const response = await client.GET("/{tenant_id}/events/{event_id}", {
      params: {
        path: {
          tenant_id: this.tenant,
          event_id: eventId,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  deliveries(eventId: string) {
    return new EventDeliveriesManager(this.tenant, eventId);
  }
}

class DestinationEventManager {
  constructor(
    protected tenant: string,
    protected destinationId: string,
  ) {}

  async list(options?: {
    next?: string;
    prev?: string;
    limit?: number;
    start?: string;
    status?: "success" | "failed";
  }) {
    const response = await client.GET(
      "/{tenant_id}/destinations/{destination_id}/events",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: this.destinationId,
          },
          query: {
            next: options?.next,
            prev: options?.prev,
            limit: options?.limit,
            start: options?.start,
            status: options?.status,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async get(eventId: string) {
    const response = await client.GET(
      "/{tenant_id}/destinations/{destination_id}/events/{event_id}",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: this.destinationId,
            event_id: eventId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async retry(eventId: string) {
    const response = await client.POST(
      "/{tenant_id}/destinations/{destination_id}/events/{event_id}/retry",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: this.destinationId,
            event_id: eventId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }
}

class DestinationManager {
  constructor(protected tenant: string) {}

  async list() {
    const response = await client.GET("/{tenant_id}/destinations", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async get(destinationId: string) {
    const response = await client.GET(
      "/{tenant_id}/destinations/{destination_id}",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: destinationId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async create(
    data: paths["/{tenant_id}/destinations"]["post"]["requestBody"]["content"]["application/json"],
  ) {
    const response = await client.POST("/{tenant_id}/destinations", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
      body: data,
    });

    throwIfError(response);

    return response.data;
  }

  async update(
    destinationId: string,
    data: paths["/{tenant_id}/destinations/{destination_id}"]["patch"]["requestBody"]["content"]["application/json"],
  ) {
    const response = await client.PATCH(
      "/{tenant_id}/destinations/{destination_id}",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: destinationId,
          },
        },
        body: data,
      },
    );

    throwIfError(response);

    return response.data;
  }

  async delete(destinationId: string) {
    const response = await client.DELETE(
      "/{tenant_id}/destinations/{destination_id}",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: destinationId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async enable(destinationId: string) {
    const response = await client.PUT(
      "/{tenant_id}/destinations/{destination_id}/enable",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: destinationId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async disable(destinationId: string) {
    const response = await client.PUT(
      "/{tenant_id}/destinations/{destination_id}/disable",
      {
        params: {
          path: {
            tenant_id: this.tenant,
            destination_id: destinationId,
          },
        },
      },
    );

    throwIfError(response);

    return response.data;
  }

  async types() {
    const response = await client.GET("/destination-types");

    throwIfError(response);

    return response.data;
  }

  async getType(
    type: paths["/destination-types/{type}"]["get"]["parameters"]["path"]["type"],
  ) {
    const response = await client.GET("/destination-types/{type}", {
      params: {
        path: {
          type,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  events(destinationId: string) {
    return new DestinationEventManager(this.tenant, destinationId);
  }
}

class TopicManager {
  constructor(protected tenant: string) {}

  async list() {
    const response = await client.GET("/{tenant_id}/topics", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }
}

class TenantManager {
  constructor(protected tenant: string) {}

  async get() {
    const response = await client.GET("/{tenant_id}", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async upsert() {
    const response = await client.PUT("/{tenant_id}", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async delete() {
    const response = await client.DELETE("/{tenant_id}", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async portalUrl() {
    const response = await client.GET("/{tenant_id}/portal", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  async token() {
    const response = await client.GET("/{tenant_id}/token", {
      params: {
        path: {
          tenant_id: this.tenant,
        },
      },
    });

    throwIfError(response);

    return response.data;
  }

  destinations() {
    return new DestinationManager(this.tenant);
  }

  events() {
    return new EventManager(this.tenant);
  }

  topics() {
    return new TopicManager(this.tenant);
  }
}

class GlobalTopicManager {
  async list() {
    const response = await client.GET("/topics");

    throwIfError(response);

    return response.data;
  }
}

class HealthManager {
  async check() {
    const response = await client.GET("/healthz");

    throwIfError(response);

    return response.data;
  }
}

class WebhooksClient {
  client = client;

  health() {
    return new HealthManager();
  }

  async publish(
    data: paths["/publish"]["post"]["requestBody"]["content"]["application/json"],
  ) {
    const response = await client.POST("/publish", {
      body: data,
    });

    throwIfError(response);

    return response.data;
  }

  topics() {
    return new GlobalTopicManager();
  }

  tenants(tenant: string) {
    return new TenantManager(tenant);
  }
}

export const outpost = new WebhooksClient();
