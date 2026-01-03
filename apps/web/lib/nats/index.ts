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

export * from "./client";
export * from "./consumer";
export * from "./event-processor";
export * from "./event-types";
export * from "./instrumentation";
export * from "./publisher";
export * from "./types";

import { env } from "@/env/schema";
import type { NatsConnectionOptions } from "./types";

/**
 * Get NATS connection options from environment variables
 *
 * Supports two authentication methods:
 * - NKey authentication (if NATS_NKEY_SEED is set)
 * - Password authentication (if NATS_USER and NATS_PASSWORD are set)
 */
export function getNatsOptions(): NatsConnectionOptions {
  return {
    url: env.NATS_URL,
    tlsCa: env.NATS_TLS_CA,
    nkeySeed: env.NATS_NKEY_SEED,
    user: env.NATS_USER,
    password: env.NATS_PASSWORD,
  };
}
