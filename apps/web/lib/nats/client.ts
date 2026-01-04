/**
 * NATS Client
 *
 * Manages NATS connection and JetStream context for the control plane.
 * Handles TLS, authentication, and connection lifecycle.
 *
 * Supports two authentication methods:
 * - NKey authentication (preferred for production)
 * - Password authentication (for development)
 */

import {
  connect,
  type JetStreamClient,
  type JetStreamManager,
  type NatsConnection,
  nkeyAuthenticator,
} from "nats";
import { queueLogger } from "@/lib/queue";
import type { NatsConnectionOptions } from "./types";

const logger = queueLogger.child({ module: "nats-client" });

let connection: NatsConnection | null = null;
let jetStream: JetStreamClient | null = null;
let jetStreamManager: JetStreamManager | null = null;

/**
 * Get or create the NATS connection
 */
export async function getNatsConnection(
  options: NatsConnectionOptions,
): Promise<NatsConnection> {
  if (connection && !connection.isClosed()) {
    return connection;
  }

  logger.info({ url: options.url }, "Connecting to NATS");

  const servers = options.url;

  // TLS is required - CA certificate must be provided
  if (!options.tlsCa) {
    throw new Error("NATS_TLS_CA is required for TLS connection");
  }

  const tls: {
    ca: string;
    cert?: string;
    key?: string;
  } = {
    ca: Buffer.from(options.tlsCa, "base64").toString("utf-8"),
  };

  // Add client certificate for mTLS if provided
  if (options.tlsCert && options.tlsKey) {
    tls.cert = Buffer.from(options.tlsCert, "base64").toString("utf-8");
    tls.key = Buffer.from(options.tlsKey, "base64").toString("utf-8");
  }

  // Build connection options based on authentication method
  const connectionOptions: Parameters<typeof connect>[0] = {
    servers,
    tls,
    maxReconnectAttempts: options.maxReconnectAttempts ?? -1,
    reconnectTimeWait: options.reconnectTimeWait ?? 2000,
  };

  // Use NKey authentication if seed is provided, otherwise fall back to password
  if (options.nkeySeed) {
    logger.info("Using NKey authentication");
    const seed = new TextEncoder().encode(options.nkeySeed);
    connectionOptions.authenticator = nkeyAuthenticator(seed);
  } else if (options.user && options.password) {
    logger.info("Using password authentication");
    connectionOptions.user = options.user;
    connectionOptions.pass = options.password;
  } else {
    throw new Error(
      "NATS authentication required: provide either nkeySeed or user/password",
    );
  }

  connection = await connect(connectionOptions);

  // Set up connection event handlers
  (async () => {
    if (!connection) return;
    for await (const status of connection.status()) {
      switch (status.type) {
        case "disconnect":
          logger.warn({ data: status.data }, "NATS disconnected");
          break;
        case "reconnect":
          logger.info({ data: status.data }, "NATS reconnected");
          break;
        case "error":
          logger.error({ error: status.data }, "NATS error");
          break;
        case "update":
          logger.debug({ data: status.data }, "NATS cluster update");
          break;
      }
    }
  })().catch((err) => {
    logger.error({ error: err }, "NATS status iterator error");
  });

  logger.info("NATS connected successfully");
  return connection;
}

/**
 * Get or create the JetStream client
 */
export async function getJetStream(
  options: NatsConnectionOptions,
): Promise<JetStreamClient> {
  if (jetStream) {
    return jetStream;
  }

  const nc = await getNatsConnection(options);
  jetStream = nc.jetstream();

  logger.info("JetStream client created");
  return jetStream;
}

/**
 * Get or create the JetStream manager (for stream/consumer management)
 */
export async function getJetStreamManager(
  options: NatsConnectionOptions,
): Promise<JetStreamManager> {
  if (jetStreamManager) {
    return jetStreamManager;
  }

  const nc = await getNatsConnection(options);
  jetStreamManager = await nc.jetstreamManager();

  logger.info("JetStream manager created");
  return jetStreamManager;
}

/**
 * Close the NATS connection
 */
export async function closeNatsConnection(): Promise<void> {
  if (connection && !connection.isClosed()) {
    logger.info("Closing NATS connection");
    await connection.drain();
    connection = null;
    jetStream = null;
    jetStreamManager = null;
    logger.info("NATS connection closed");
  }
}

/**
 * Check if NATS is connected
 */
function _isNatsConnected(): boolean {
  return connection !== null && !connection.isClosed();
}
