#!/usr/bin/env bun
/**
 * Seed Script
 *
 * Seeds the application with test data for development and testing purposes.
 * Creates a test organization, dummy users with various roles, Outpost tenant,
 * webhook destination, and triggers sample events.
 *
 * @usage
 * ```bash
 * # Run seed script (will prompt for webhook URL)
 * bun run seed
 *
 * # Run with custom webhook URL
 * bun run seed --webhook-url https://webhook.site/your-id
 * ```
 *
 * ============================================================================
 * PREREQUISITES
 * ============================================================================
 *
 * Before running this script, ensure you have run:
 * ```bash
 * bun run rbac:sync
 * ```
 * This ensures that organization roles (owner, admin, member) exist in Logto.
 *
 * ============================================================================
 * STAGES
 * ============================================================================
 *
 * 1. Create test organization on Logto with 100 dummy users
 * 2. Create Outpost tenant for the organization
 * 3. Create webhook destination with provided URL
 * 4. Trigger 50 sample topic events to test webhook delivery
 *
 * ============================================================================
 */

import { createManagementApi } from "@logto/api/management";
import { env } from "@/env/schema";
import { logto } from "@/auth/logto";
import { outpost } from "@/webhooks/client/client";

// ============================================================================
// TYPES
// ============================================================================

interface LogtoUser {
  id: string;
  username: string | null;
  primaryEmail: string | null;
  name: string | null;
}

interface SeedStats {
  organizationId: string | null;
  organizationName: string | null;
  usersCreated: number;
  membersAdded: number;
  tenantId: string | null;
  webhookId: string | null;
  eventsPublished: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

/**
 * Logging utilities with colors
 */
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) =>
    console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg: string) =>
    console.log(
      `\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n${"=".repeat(60)}`,
    ),
  step: (msg: string) =>
    console.log(`${colors.magenta}→${colors.reset} ${msg}`),
  detail: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
};

/**
 * Parse command line arguments
 */
function parseArgs(): { webhookUrl: string | null } {
  const args = process.argv.slice(2);
  const webhookUrlIndex = args.indexOf("--webhook-url");

  if (webhookUrlIndex !== -1 && args[webhookUrlIndex + 1]) {
    return { webhookUrl: args[webhookUrlIndex + 1] };
  }

  return { webhookUrl: null };
}

/**
 * Prompt user for webhook URL using readline
 */
async function promptWebhookUrl(): Promise<string> {
  console.log("\n");
  log.info("Please provide a webhook URL for testing webhook deliveries:");
  log.detail("Example: https://webhook.site/your-unique-id");
  log.detail("You can create a test endpoint at https://webhook.site");
  console.log("\n");

  return new Promise((resolve) => {
    process.stdout.write("Webhook URL: ");
    process.stdin.once("data", (data) => {
      const url = data.toString().trim();

      if (!url || !url.startsWith("http")) {
        log.error("Invalid URL provided. Must start with http:// or https://");
        process.exit(1);
      }

      resolve(url);
    });
  });
}

/**
 * Generate a unique organization identifier
 */
function generateOrgIdentifier(): string {
  const adjectives = [
    "swift",
    "bright",
    "cosmic",
    "digital",
    "quantum",
    "nexus",
    "apex",
    "stellar",
    "prime",
    "vertex",
  ];

  const nouns = [
    "labs",
    "systems",
    "tech",
    "solutions",
    "ventures",
    "dynamics",
    "innovations",
    "group",
    "industries",
    "collective",
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp

  return `${adjective}-${noun}-${timestamp}`;
}

/**
 * Generate fake user data
 */
function generateUserData(index: number, orgSlug: string) {
  const firstNames = [
    "Emma",
    "Liam",
    "Olivia",
    "Noah",
    "Ava",
    "Ethan",
    "Sophia",
    "Mason",
    "Isabella",
    "William",
    "Mia",
    "James",
    "Charlotte",
    "Benjamin",
    "Amelia",
    "Lucas",
    "Harper",
    "Henry",
    "Evelyn",
    "Alexander",
  ];

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName =
    lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`;
  const email = `${username}@${orgSlug}.dev`;
  const name = `${firstName} ${lastName}`;

  return { username, email, name };
}

/**
 * Distribute users across roles
 */
function getUserRole(index: number, totalUsers: number): string {
  // 10% owners, 30% admins, 60% members
  const ownerCount = Math.ceil(totalUsers * 0.1);
  const adminCount = Math.ceil(totalUsers * 0.3);

  if (index < ownerCount) {
    return "owner";
  }
  if (index < ownerCount + adminCount) {
    return "admin";
  }
  return "member";
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Stage 1: Create test organization and users on Logto
 */
async function createOrganizationAndUsers(
  apiClient: ReturnType<typeof createManagementApi>["apiClient"],
): Promise<{
  organizationId: string;
  organizationName: string;
  orgSlug: string;
  users: LogtoUser[];
}> {
  log.section("STAGE 1: CREATE ORGANIZATION AND USERS");

  // Generate unique organization identifier
  const orgSlug = generateOrgIdentifier();
  const orgName = orgSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Create organization using logto client
  log.step("Creating test organization...");
  log.detail(`Organization: ${orgName} (${orgSlug})`);

  const organization = await logto.workspaces().create({
    name: orgName,
    description: `Test organization for development and testing (${orgSlug})`,
  });

  log.success(
    `Created organization: ${organization.name} (ID: ${organization.id})`,
  );

  // Get role IDs - assumes rbac:sync has been run
  log.step("Fetching role IDs...");

  const rolesResponse = await apiClient.GET("/api/organization-roles");
  if (rolesResponse.error) {
    throw new Error(`Failed to fetch roles: ${rolesResponse.error}`);
  }

  const roles = rolesResponse.data || [];
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  if (
    !roleMap.has("owner") ||
    !roleMap.has("admin") ||
    !roleMap.has("member")
  ) {
    log.error(
      "Required roles (owner, admin, member) not found. Please run 'bun run rbac:sync' first.",
    );
    throw new Error("Missing required roles");
  }

  log.detail(`Found ${roles.length} roles`);

  // Create 100 users
  log.step("Creating 100 dummy users...");
  log.detail(`Email domain: @${orgSlug}.dev`);

  const users: LogtoUser[] = [];
  const userCount = 100;

  for (let i = 0; i < userCount; i++) {
    const userData = generateUserData(i, orgSlug);

    // Create user via Logto API (using email only, not username)
    const userResponse = await apiClient.POST("/api/users", {
      body: {
        primaryEmail: userData.email,
        password: "TestPassword123!",
      },
    });

    if (userResponse.error) {
      log.error(`Failed to create user ${userData.username}:`);
      console.error(JSON.stringify(userResponse.error, null, 2));
      continue;
    }

    if (!userResponse.data) {
      log.warn(`No data returned when creating user ${userData.username}`);
      continue;
    }

    const user = userResponse.data;

    // Update user profile (name)
    const updateResponse = await apiClient.PATCH("/api/users/{userId}", {
      params: { path: { userId: user.id } },
      body: {
        name: userData.name,
      },
    });

    if (updateResponse.error) {
      log.warn(
        `Failed to update name for user ${userData.username}: ${updateResponse.error}`,
      );
    }

    users.push(user);

    // Add user to organization with role
    const roleName = getUserRole(i, userCount);
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      log.warn(
        `Role ${roleName} not found, skipping user ${userData.username}`,
      );
      continue;
    }

    try {
      const addResult = await logto
        .workspaces()
        .members(organization.id)
        .add(user.id, [roleId]);

      if (addResult.error) {
        log.error(`Failed to add user ${userData.username} to organization:`);
        console.error(JSON.stringify(addResult.error, null, 2));
      }
    } catch (error) {
      log.error(`Exception adding user ${userData.username} to organization:`);
      console.error(error);
    }

    // Log progress every 10 users
    if ((i + 1) % 10 === 0) {
      log.detail(`Created ${i + 1}/${userCount} users...`);
    }
  }

  log.success(`Created ${users.length} users and added them to organization`);
  log.detail(`Owners: ${Math.ceil(userCount * 0.1)}`);
  log.detail(`Admins: ${Math.ceil(userCount * 0.3)}`);
  log.detail(`Members: ${Math.ceil(userCount * 0.6)}`);

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    orgSlug,
    users,
  };
}

/**
 * Stage 2: Create Outpost tenant
 */
async function createOutpostTenant(organizationId: string): Promise<string> {
  log.section("STAGE 2: CREATE OUTPOST TENANT");

  log.step(`Creating Outpost tenant for organization ${organizationId}...`);

  const tenant = await outpost.tenants(organizationId).upsert();

  if (!tenant || !tenant.id) {
    throw new Error("Failed to create Outpost tenant");
  }

  log.success(`Created Outpost tenant: ${tenant.id}`);

  return tenant.id;
}

/**
 * Stage 3: Create webhook destination
 */
async function createWebhookDestination(
  tenantId: string,
  webhookUrl: string,
): Promise<string> {
  log.section("STAGE 3: CREATE WEBHOOK DESTINATION");

  log.step(`Creating webhook destination for URL: ${webhookUrl}...`);

  // Get available topics
  const topics = await outpost.topics().list();

  if (!topics || topics.length === 0) {
    log.warn("No topics available, creating webhook without topic filter");
  } else {
    log.detail(`Available topics: ${topics.join(", ")}`);
  }

  const destination = await outpost
    .tenants(tenantId)
    .destinations()
    .create({
      type: "webhook",
      config: {
        url: webhookUrl,
      },
      topics: "*", // Subscribe to all topics
    });

  if (!destination || !destination.id) {
    throw new Error("Failed to create webhook destination");
  }

  log.success(`Created webhook destination: ${destination.id}`);
  log.detail(`Subscribed to all topics`);

  return destination.id;
}

/**
 * Stage 4: Trigger sample events
 */
async function triggerSampleEvents(tenantId: string): Promise<number> {
  log.section("STAGE 4: TRIGGER SAMPLE EVENTS");

  // Get available topics from config.yaml
  const availableTopics = ["user.created", "user.updated", "user.deleted"];

  log.step(
    `Triggering 50 sample events across ${availableTopics.length} topics...`,
  );
  log.detail(`Topics: ${availableTopics.join(", ")}`);

  let eventsPublished = 0;
  const eventCount = 50;

  for (let i = 0; i < eventCount; i++) {
    const topic = availableTopics[i % availableTopics.length];

    // Generate sample payload based on topic
    let data: Record<string, unknown> = {};

    switch (topic) {
      case "user.created":
        data = {
          user_id: `user_${Date.now()}_${i}`,
          email: `user${i}@example.com`,
          name: `Test User ${i}`,
          created_at: new Date().toISOString(),
        };
        break;
      case "user.updated":
        data = {
          user_id: `user_${Date.now()}_${i}`,
          email: `user${i}@example.com`,
          name: `Updated User ${i}`,
          updated_at: new Date().toISOString(),
        };
        break;
      case "user.deleted":
        data = {
          user_id: `user_${Date.now()}_${i}`,
          deleted_at: new Date().toISOString(),
        };
        break;
    }

    try {
      await outpost.publish({
        tenant_id: tenantId,
        topic,
        data,
      });

      eventsPublished++;

      // Log progress every 10 events
      if ((i + 1) % 10 === 0) {
        log.detail(`Published ${i + 1}/${eventCount} events...`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      log.warn(`Failed to publish event ${i + 1}: ${error}`);
    }
  }

  log.success(`Published ${eventsPublished} events successfully`);
  log.detail(`user.created: ${Math.ceil(eventCount / 3)}`);
  log.detail(`user.updated: ${Math.ceil(eventCount / 3)}`);
  log.detail(`user.deleted: ${Math.floor(eventCount / 3)}`);

  return eventsPublished;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const args = parseArgs();

  // Print header
  console.log("\n");
  console.log(
    `${colors.bright}${colors.cyan}╔${"═".repeat(58)}╗${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}║${" ".repeat(22)}SEED SCRIPT${" ".repeat(25)}║${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}╚${"═".repeat(58)}╝${colors.reset}`,
  );
  console.log("\n");

  const stats: SeedStats = {
    organizationId: null,
    organizationName: null,
    usersCreated: 0,
    membersAdded: 0,
    tenantId: null,
    webhookId: null,
    eventsPublished: 0,
  };

  // Get webhook URL
  const webhookUrl = args.webhookUrl || (await promptWebhookUrl());

  log.info(`Using webhook URL: ${webhookUrl}`);

  // Initialize Management API client
  log.section("CONNECTING TO LOGTO");

  log.step("Initializing Management API client...");
  log.detail(`Endpoint: ${env.LOGTO_ENDPOINT}`);
  log.detail(`Tenant ID: ${env.LOGTO_TENANT_ID}`);

  const { apiClient } = createManagementApi(env.LOGTO_TENANT_ID, {
    clientId: env.LOGTO_M2M_APP_ID,
    clientSecret: env.LOGTO_M2M_APP_SECRET,
    baseUrl: env.LOGTO_ENDPOINT,
  });

  log.success("Connected to Logto Management API");

  try {
    // Stage 1: Create organization and users
    const { organizationId, organizationName, orgSlug, users } =
      await createOrganizationAndUsers(apiClient);
    stats.organizationId = organizationId;
    stats.organizationName = organizationName;
    stats.usersCreated = users.length;
    stats.membersAdded = users.length;

    // Stage 2: Create Outpost tenant
    const tenantId = await createOutpostTenant(organizationId);
    stats.tenantId = tenantId;

    // Stage 3: Create webhook destination
    const webhookId = await createWebhookDestination(tenantId, webhookUrl);
    stats.webhookId = webhookId;

    // Stage 4: Trigger sample events
    const eventsPublished = await triggerSampleEvents(tenantId);
    stats.eventsPublished = eventsPublished;

    // Print summary
    log.section("SEED SUMMARY");

    console.log("\n📊 Organization:");
    log.success(`  Name: ${stats.organizationName}`);
    log.info(`  ID: ${stats.organizationId}`);

    console.log("\n📊 Users:");
    log.success(`  Created: ${stats.usersCreated}`);
    log.success(`  Added to organization: ${stats.membersAdded}`);

    console.log("\n📊 Outpost:");
    log.success(`  Tenant ID: ${stats.tenantId}`);
    log.success(`  Webhook ID: ${stats.webhookId}`);
    log.success(`  Events published: ${stats.eventsPublished}`);

    console.log("\n");
    log.success("✨ Seed completed successfully!");
    log.info(`\nYou can now sign in with any of the created users:`);
    log.detail(
      `Email: emma.smith0@${orgSlug}.dev, liam.johnson1@${orgSlug}.dev, etc.`,
    );
    log.detail(`Password: TestPassword123!`);
    log.info(`\nCheck your webhook URL to see the delivered events:`);
    log.detail(webhookUrl);

    console.log("\n");
    process.exit(0);
  } catch (error) {
    console.log("\n");
    log.error("Seed failed:");
    console.error(error);
    console.log("\n");

    // Cleanup info
    if (stats.organizationId) {
      log.warn(
        `Organization ${stats.organizationId} was created but seeding failed.`,
      );
      log.info("You may want to manually delete it from Logto console.");
    }

    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.log("\n");
  log.error("Unexpected error:");
  console.error(error);
  console.log("\n");
  process.exit(1);
});
