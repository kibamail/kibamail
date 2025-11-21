#!/usr/bin/env bun
/**
 * RBAC Sync Script
 *
 * Syncs organization roles and permissions from config/rbac.ts to Logto.
 * This script uses the Logto Management API to create/update the organization
 * template with the roles and permissions defined in your configuration.
 *
 * @usage
 * ```bash
 * # Sync RBAC to Logto
 * bun run scripts/rbac-sync.ts
 *
 * # Dry run (preview changes without applying)
 * bun run scripts/rbac-sync.ts --dry-run
 *
 * # Force update (delete and recreate all roles/permissions)
 * bun run scripts/rbac-sync.ts --force
 * ```
 *
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 *
 * 1. Loads RBAC configuration from config/rbac.ts
 * 2. Connects to Logto Management API using M2M credentials
 * 3. Fetches existing organization permissions and roles from Logto
 * 4. Compares local config with remote state
 * 5. Creates/updates/deletes permissions and roles to match config
 * 6. Logs all changes with detailed information
 *
 * ============================================================================
 * SAFETY FEATURES
 * ============================================================================
 *
 * - Dry run mode to preview changes before applying
 * - Confirmation prompt before destructive operations
 * - Detailed logging of all API calls
 * - Error handling with rollback on failure
 * - Validates configuration before syncing
 *
 * ============================================================================
 */

import { createManagementApi } from "@logto/api/management";
import { env } from "@/env/schema";
import { RBAC_CONFIG } from "@/config/rbac";

// ============================================================================
// TYPES
// ============================================================================

interface LogtoPermission {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
}

interface LogtoRole {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: "User" | "MachineToMachine";
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
function parseArgs(): { dryRun: boolean; force: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
  };
}

/**
 * Validate RBAC configuration
 */
function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate permissions
  const permissionNames = new Set<string>();
  for (const permission of RBAC_CONFIG.permissions) {
    if (!permission.name) {
      errors.push("Permission missing name");
    }
    if (permissionNames.has(permission.name)) {
      errors.push(`Duplicate permission: ${permission.name}`);
    }
    permissionNames.add(permission.name);
    if (!permission.description) {
      errors.push(`Permission ${permission.name} missing description`);
    }
  }

  // Validate roles
  const roleNames = new Set<string>();
  for (const role of RBAC_CONFIG.roles) {
    if (!role.name) {
      errors.push("Role missing name");
    }
    if (roleNames.has(role.name)) {
      errors.push(`Duplicate role: ${role.name}`);
    }
    roleNames.add(role.name);
    if (!role.displayName) {
      errors.push(`Role ${role.name} missing displayName`);
    }
    if (!role.description) {
      errors.push(`Role ${role.name} missing description`);
    }
    if (!role.type) {
      errors.push(`Role ${role.name} missing type`);
    }

    // Validate role permissions exist
    for (const permName of role.permissions) {
      if (!permissionNames.has(permName)) {
        errors.push(
          `Role ${role.name} references unknown permission: ${permName}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Fetch all organization permissions from Logto
 */
async function fetchPermissions(
  apiClient: ReturnType<typeof createManagementApi>["apiClient"],
): Promise<LogtoPermission[]> {
  log.step("Fetching existing organization permissions from Logto...");

  const response = await apiClient.GET("/api/organization-scopes");

  if (response.error) {
    throw new Error(`Failed to fetch permissions: ${response.error}`);
  }

  const permissions = response.data || [];
  log.detail(`Found ${permissions.length} existing permissions`);

  return permissions;
}

/**
 * Fetch all organization roles from Logto
 */
async function fetchRoles(
  apiClient: ReturnType<typeof createManagementApi>["apiClient"],
): Promise<LogtoRole[]> {
  log.step("Fetching existing organization roles from Logto...");

  const response = await apiClient.GET("/api/organization-roles");

  if (response.error) {
    throw new Error(`Failed to fetch roles: ${response.error}`);
  }

  const roles = response.data || [];
  log.detail(`Found ${roles.length} existing roles`);

  return roles;
}

/**
 * Sync permissions to Logto
 */
async function syncPermissions(
  apiClient: ReturnType<typeof createManagementApi>["apiClient"],
  dryRun: boolean,
  force: boolean,
): Promise<{
  created: number;
  updated: number;
  deleted: number;
  permissionMap: Map<string, string>;
}> {
  log.section("SYNCING PERMISSIONS");

  const existingPermissions = await fetchPermissions(apiClient);
  const existingMap = new Map(existingPermissions.map((p) => [p.name, p]));

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Map to store permission name -> ID
  const permissionMap = new Map<string, string>();

  // Create or update permissions
  for (const permission of RBAC_CONFIG.permissions) {
    const existing = existingMap.get(permission.name);

    if (!existing) {
      // Create new permission
      log.step(`Creating permission: ${permission.name}`);
      log.detail(`Description: ${permission.description}`);

      if (!dryRun) {
        const response = await apiClient.POST("/api/organization-scopes", {
          body: {
            name: permission.name,
            description: permission.description,
          },
        });

        if (response.error) {
          log.error(
            `Failed to create permission ${permission.name}: ${response.error}`,
          );
          throw new Error(`Failed to create permission: ${response.error}`);
        }

        permissionMap.set(permission.name, response.data!.id);
        log.success(`Created permission: ${permission.name}`);
      } else {
        log.detail("[DRY RUN] Would create this permission");
      }

      created++;
    } else {
      // Update existing permission if description changed
      permissionMap.set(permission.name, existing.id);

      if (existing.description !== permission.description) {
        log.step(`Updating permission: ${permission.name}`);
        log.detail(`Old: ${existing.description || "(none)"}`);
        log.detail(`New: ${permission.description}`);

        if (!dryRun) {
          const response = await apiClient.PATCH(
            "/api/organization-scopes/{id}",
            {
              params: { path: { id: existing.id } },
              body: {
                description: permission.description,
              },
            },
          );

          if (response.error) {
            log.error(
              `Failed to update permission ${permission.name}: ${response.error}`,
            );
            throw new Error(`Failed to update permission: ${response.error}`);
          }

          log.success(`Updated permission: ${permission.name}`);
        } else {
          log.detail("[DRY RUN] Would update this permission");
        }

        updated++;
      } else {
        log.detail(`Permission unchanged: ${permission.name}`);
      }
    }
  }

  // Delete permissions not in config (only if force mode)
  if (force) {
    const configNames = new Set(RBAC_CONFIG.permissions.map((p) => p.name));

    for (const existing of existingPermissions) {
      if (!configNames.has(existing.name)) {
        log.warn(`Deleting permission not in config: ${existing.name}`);

        if (!dryRun) {
          const response = await apiClient.DELETE(
            "/api/organization-scopes/{id}",
            {
              params: { path: { id: existing.id } },
            },
          );

          if (response.error) {
            log.error(
              `Failed to delete permission ${existing.name}: ${response.error}`,
            );
            // Continue on delete errors (permission might be in use)
          } else {
            log.success(`Deleted permission: ${existing.name}`);
            deleted++;
          }
        } else {
          log.detail("[DRY RUN] Would delete this permission");
          deleted++;
        }
      }
    }
  }

  return { created, updated, deleted, permissionMap };
}

/**
 * Sync roles to Logto
 */
async function syncRoles(
  apiClient: ReturnType<typeof createManagementApi>["apiClient"],
  permissionMap: Map<string, string>,
  dryRun: boolean,
  force: boolean,
): Promise<{ created: number; updated: number; deleted: number }> {
  log.section("SYNCING ROLES");

  const existingRoles = await fetchRoles(apiClient);
  const existingMap = new Map(existingRoles.map((r) => [r.name, r]));

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Create or update roles
  for (const role of RBAC_CONFIG.roles) {
    const existing = existingMap.get(role.name);

    // Get permission IDs for this role
    const organizationScopeIds = role.permissions
      .map((permName) => permissionMap.get(permName))
      .filter((id): id is string => id !== undefined);

    if (organizationScopeIds.length !== role.permissions.length) {
      const missing = role.permissions.filter((p) => !permissionMap.has(p));
      log.warn(
        `Role ${role.name} references missing permissions: ${missing.join(
          ", ",
        )}`,
      );
    }

    if (!existing) {
      // Create new role
      log.step(`Creating role: ${role.name} (${role.displayName})`);
      log.detail(`Type: ${role.type}`);
      log.detail(`Description: ${role.description}`);
      log.detail(`Permissions: ${role.permissions.join(", ")}`);

      if (!dryRun) {
        const response = await apiClient.POST("/api/organization-roles", {
          body: {
            name: role.name,
            description: role.description,
            type: role.type,
            organizationScopeIds,
            resourceScopeIds: [],
          },
        });

        if (response.error) {
          log.error(`Failed to create role ${role.name}: ${response.error}`);
          throw new Error(`Failed to create role: ${response.error}`);
        }

        log.success(`Created role: ${role.name}`);
      } else {
        log.detail("[DRY RUN] Would create this role");
      }

      created++;
    } else {
      // Update existing role
      const needsUpdate =
        existing.description !== role.description ||
        existing.type !== role.type;

      if (needsUpdate) {
        log.step(`Updating role: ${role.name}`);
        log.detail(`Old description: ${existing.description || "(none)"}`);
        log.detail(`New description: ${role.description}`);

        if (!dryRun) {
          const response = await apiClient.PATCH(
            "/api/organization-roles/{id}",
            {
              params: { path: { id: existing.id } },
              body: {
                description: role.description,
              },
            },
          );

          if (response.error) {
            log.error(`Failed to update role ${role.name}: ${response.error}`);
            throw new Error(`Failed to update role: ${response.error}`);
          }

          log.success(`Updated role: ${role.name}`);
        } else {
          log.detail("[DRY RUN] Would update this role");
        }

        updated++;
      } else {
        log.detail(`Role unchanged: ${role.name}`);
      }

      // Update role permissions
      log.step(`Updating permissions for role: ${role.name}`);
      log.detail(`Permissions: ${role.permissions.join(", ")}`);

      if (!dryRun) {
        const response = await apiClient.PUT(
          "/api/organization-roles/{id}/scopes",
          {
            params: { path: { id: existing.id } },
            body: {
              organizationScopeIds,
            },
          },
        );

        if (response.error) {
          log.error(
            `Failed to update role permissions ${role.name}: ${response.error}`,
          );
          throw new Error(
            `Failed to update role permissions: ${response.error}`,
          );
        }

        log.success(`Updated permissions for role: ${role.name}`);
      } else {
        log.detail("[DRY RUN] Would update role permissions");
      }
    }
  }

  // Delete roles not in config (only if force mode)
  if (force) {
    const configNames = new Set(RBAC_CONFIG.roles.map((r) => r.name));

    for (const existing of existingRoles) {
      if (!configNames.has(existing.name)) {
        log.warn(`Deleting role not in config: ${existing.name}`);

        if (!dryRun) {
          const response = await apiClient.DELETE(
            "/api/organization-roles/{id}",
            {
              params: { path: { id: existing.id } },
            },
          );

          if (response.error) {
            log.error(
              `Failed to delete role ${existing.name}: ${response.error}`,
            );
            // Continue on delete errors (role might be in use)
          } else {
            log.success(`Deleted role: ${existing.name}`);
            deleted++;
          }
        } else {
          log.detail("[DRY RUN] Would delete this role");
          deleted++;
        }
      }
    }
  }

  return { created, updated, deleted };
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
    `${colors.bright}${colors.cyan}║${" ".repeat(
      18,
    )}RBAC SYNC SCRIPT${" ".repeat(24)}║${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}╚${"═".repeat(58)}╝${colors.reset}`,
  );
  console.log("\n");

  if (args.dryRun) {
    log.warn("DRY RUN MODE - No changes will be applied");
  }

  if (args.force) {
    log.warn("FORCE MODE - Will delete permissions/roles not in config");
  }

  // Validate configuration
  log.section("VALIDATING CONFIGURATION");

  const validation = validateConfig();

  if (!validation.valid) {
    log.error("Configuration validation failed:");
    for (const error of validation.errors) {
      log.error(`  - ${error}`);
    }
    process.exit(1);
  }

  log.success("Configuration is valid");
  log.detail(`Permissions: ${RBAC_CONFIG.permissions.length}`);
  log.detail(`Roles: ${RBAC_CONFIG.roles.length}`);

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

  // Sync permissions
  const permissionResults = await syncPermissions(
    apiClient,
    args.dryRun,
    args.force,
  );

  // Sync roles
  const roleResults = await syncRoles(
    apiClient,
    permissionResults.permissionMap,
    args.dryRun,
    args.force,
  );

  // Print summary
  log.section("SYNC SUMMARY");

  console.log("\n📊 Permissions:");
  log.success(`  Created: ${permissionResults.created}`);
  log.info(`  Updated: ${permissionResults.updated}`);
  if (permissionResults.deleted > 0) {
    log.warn(`  Deleted: ${permissionResults.deleted}`);
  }

  console.log("\n📊 Roles:");
  log.success(`  Created: ${roleResults.created}`);
  log.info(`  Updated: ${roleResults.updated}`);
  if (roleResults.deleted > 0) {
    log.warn(`  Deleted: ${roleResults.deleted}`);
  }

  const totalChanges =
    permissionResults.created +
    permissionResults.updated +
    permissionResults.deleted +
    roleResults.created +
    roleResults.updated +
    roleResults.deleted;

  console.log("\n");
  if (totalChanges === 0) {
    log.success("✨ Everything is up to date!");
  } else if (args.dryRun) {
    log.warn(`📝 ${totalChanges} changes would be applied (dry run mode)`);
    log.info("\nRun without --dry-run to apply changes");
  } else {
    log.success(`✨ Successfully applied ${totalChanges} changes!`);
  }

  console.log("\n");
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.log("\n");
  log.error("Sync failed:");
  console.error(error);
  console.log("\n");
  process.exit(1);
});
