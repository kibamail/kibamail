/**
 * NATS Library
 *
 * Provides NATS JetStream integration for the control plane.
 * Used to publish email messages to MTA nodes via email-agents.
 *
 * @example
 * ```typescript
 * import { publishEmail, getNatsOptions } from "@/lib/nats";
 *
 * const options = getNatsOptions();
 * await publishEmail(options, {
 *   id: "msg-123",
 *   tenant_id: "workspace-456",
 *   broadcast_id: "broadcast-789",
 *   // ... other fields
 * });
 * ```
 */

export * from "./types";
export * from "./event-types";
export * from "./client";
export * from "./publisher";
export * from "./consumer";
export * from "./event-processor";
export * from "./instrumentation";

import { env } from "@/env/schema";
import type { NatsConnectionOptions } from "./types";

/**
 * Get NATS connection options from environment variables
 */
export function getNatsOptions(): NatsConnectionOptions {
  return {
    url: env.NATS_URL,
    user: env.NATS_USER,
    password: env.NATS_PASSWORD,
    tlsCa: env.NATS_TLS_CA,
  };
}
