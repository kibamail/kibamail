/**
 * Sending Clusters Configuration
 *
 * Defines the available sending clusters (regions) for email delivery.
 * Each cluster consists of 1-3 bare metal machines with:
 * - A /24 IP subnet (256 IPs) for sending
 * - Redis cluster for KumoMTA TSA traffic shaping
 * - NATS cluster for control plane communication
 * - Email agents for MTA injection and log forwarding
 *
 * Environment variables per cluster:
 * - SENDING_CLUSTER_<REGION>_NATS_URL (e.g., SENDING_CLUSTER_US_EAST_1_NATS_URL)
 * - SENDING_CLUSTER_<REGION>_REDIS_URL (e.g., SENDING_CLUSTER_US_EAST_1_REDIS_URL)
 */

export type SendingClusterStatus =
  | "provisioning"
  | "active"
  | "maintenance"
  | "draining"
  | "offline";

export interface SendingClusterMachine {
  hostname: string;
  privateIp: string;
  status: "healthy" | "unhealthy" | "unknown";
}

export interface SendingClusterConfig {
  id: string;
  name: string;
  region: string;
  status: SendingClusterStatus;
  ipSubnet: string;
  natsUrlEnvVar: string;
  redisUrlEnvVar: string;
  machines: SendingClusterMachine[];
}

export interface SendingCluster extends Omit<SendingClusterConfig, "natsUrlEnvVar" | "redisUrlEnvVar"> {
  natsUrl: string;
  redisUrl: string;
}

const SENDING_CLUSTER_CONFIGS = {
  "us-east-1": {
    id: "cluster_us_east_1",
    name: "US East 1",
    region: "us-east-1",
    status: "active",
    ipSubnet: "", // To be configured
    natsUrlEnvVar: "SENDING_CLUSTER_US_EAST_1_NATS_URL",
    redisUrlEnvVar: "SENDING_CLUSTER_US_EAST_1_REDIS_URL",
    machines: [],
  },
} as const satisfies Record<string, SendingClusterConfig>;

export type SendingClusterId = keyof typeof SENDING_CLUSTER_CONFIGS;

export const DEFAULT_SENDING_CLUSTER: SendingClusterId = "us-east-1";

/**
 * Resolve a cluster config to a full SendingCluster with env vars resolved
 */
function resolveCluster(config: SendingClusterConfig): SendingCluster {
  const { natsUrlEnvVar, redisUrlEnvVar, ...rest } = config;
  return {
    ...rest,
    natsUrl: process.env[natsUrlEnvVar] ?? "",
    redisUrl: process.env[redisUrlEnvVar] ?? "",
  };
}

/**
 * Get a sending cluster by ID
 */
export function getSendingCluster(id: SendingClusterId): SendingCluster {
  return resolveCluster(SENDING_CLUSTER_CONFIGS[id]);
}

/**
 * Get all available sending clusters
 */
export function getAllSendingClusters(): SendingCluster[] {
  return Object.values(SENDING_CLUSTER_CONFIGS).map(resolveCluster);
}

/**
 * Get all active sending clusters (available for new domain assignments)
 */
export function getActiveSendingClusters(): SendingCluster[] {
  return getAllSendingClusters().filter(
    (cluster) => cluster.status === "active"
  );
}

/**
 * Check if a sending cluster ID is valid
 */
export function isValidSendingClusterId(id: string): id is SendingClusterId {
  return id in SENDING_CLUSTER_CONFIGS;
}
