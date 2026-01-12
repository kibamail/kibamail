/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * This file defines all organization roles and permissions for your application.
 * These definitions serve as the source of truth and are synced to Logto using
 * the `scripts/rbac-sync.ts` script.
 *
 * @example
 * ```bash
 * # Sync RBAC to Logto
 * bun run scripts/rbac-sync.ts
 * ```
 *
 * ============================================================================
 * ARCHITECTURE OVERVIEW
 * ============================================================================
 *
 * Permissions: Fine-grained actions (e.g., "invite:members", "manage:billing")
 * Roles: Collections of permissions (e.g., "owner", "admin", "member")
 * Template: All organizations inherit the same roles and permissions
 *
 * When you update this file and run the sync script, all organizations
 * automatically receive the updated role definitions.
 *
 * ============================================================================
 * PERMISSION NAMING CONVENTIONS
 * ============================================================================
 *
 * Use the format: <action>:<resource>
 *
 * Actions: read, write, create, delete, manage, invite, update
 * Resources: members, projects, billing, settings, analytics, workspace
 *
 * Examples:
 * - read:projects - View projects
 * - manage:members - Full member management (add, remove, update roles)
 * - invite:members - Send member invitations
 * - delete:workspace - Delete the entire workspace
 *
 * ============================================================================
 */

/**
 * Organization Permission Definition
 *
 * Defines a single permission that can be assigned to roles.
 */
export interface PermissionDefinition {
  /**
   * Unique permission identifier
   *
   * Use format: <action>:<resource>
   * @example "manage:members"
   */
  name: string;

  /**
   * Human-readable description
   *
   * Explain what this permission allows users to do.
   * This appears in the Logto Console.
   *
   * @example "Manage workspace members (add, remove, update roles)"
   */
  description: string;
}

/**
 * Organization Role Definition
 *
 * Defines a role with its associated permissions.
 */
export interface Role {
  /**
   * Unique role identifier
   *
   * Use lowercase with underscores for consistency.
   * @example "workspace_owner"
   */
  name: string;

  /**
   * Human-readable role name
   *
   * Displayed in UI and Logto Console.
   * @example "Workspace Owner"
   */
  displayName: string;

  /**
   * Role description
   *
   * Explain what this role is for and what access level it provides.
   *
   * @example "Full access to workspace including billing and deletion"
   */
  description: string;

  /**
   * List of permission names this role grants
   *
   * These must match permission names defined in the permissions array.
   *
   * @example ["manage:members", "invite:members", "delete:workspace"]
   */
  permissions: string[];

  /**
   * Role type
   *
   * - "User": Assigned to human users
   * - "MachineToMachine": Assigned to M2M applications
   */
  type: "User" | "MachineToMachine";
}

/**
 * RBAC Configuration
 *
 * Complete configuration of all permissions and roles.
 */
export interface RBACConfig {
  /**
   * All available organization permissions
   */
  permissions: PermissionDefinition[];

  /**
   * All organization roles
   */
  roles: Role[];
}

/**
 * Organization Permissions
 *
 * All permissions that can be granted within an organization.
 * These are non-API permissions that control UI features and business logic.
 *
 * This is a minimal boilerplate configuration. Extend with additional
 * permissions as your application grows (e.g., project management,
 * analytics, API keys, etc.).
 */
const PERMISSIONS: PermissionDefinition[] = [
  // ============================================================================
  // WORKSPACE MANAGEMENT
  // ============================================================================
  {
    name: "read:workspace",
    description: "View workspace details and settings",
  },
  {
    name: "manage:workspace",
    description: "Update workspace name, description, and settings",
  },
  {
    name: "delete:workspace",
    description:
      "Permanently delete the workspace and all associated data (destructive)",
  },

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================
  {
    name: "read:members",
    description: "View workspace members and their roles",
  },
  {
    name: "invite:members",
    description: "Send invitations to new members",
  },
  {
    name: "manage:members",
    description:
      "Full member management including adding, removing, and updating member roles",
  },

  // ============================================================================
  // BILLING & SUBSCRIPTION
  // ============================================================================
  {
    name: "read:billing",
    description: "View billing information, invoices, and subscription details",
  },
  {
    name: "manage:billing",
    description:
      "Manage billing, update payment methods, change subscription plans",
  },

  // ============================================================================
  // API KEYS
  // ============================================================================
  {
    name: "read:api-keys",
    description: "View API keys and their details",
  },
  {
    name: "manage:api-keys",
    description: "Create, update, and delete API keys",
  },

  // ============================================================================
  // CONTACT MANAGEMENT
  // ============================================================================
  {
    name: "read:contacts",
    description: "View contacts and their details",
  },
  {
    name: "manage:contacts",
    description: "Full contact management (create, update, delete contacts)",
  },

  // ============================================================================
  // TAGS MANAGEMENT
  // ============================================================================
  {
    name: "read:tags",
    description: "View tags and their details",
  },
  {
    name: "manage:tags",
    description: "Full tag management (create, update, delete tags)",
  },

  // ============================================================================
  // TOPICS MANAGEMENT
  // ============================================================================
  {
    name: "read:topics",
    description: "View topics and their details",
  },
  {
    name: "manage:topics",
    description: "Full topic management (create, update, delete topics)",
  },

  // ============================================================================
  // SEGMENTS MANAGEMENT
  // ============================================================================
  {
    name: "read:segments",
    description: "View segments and their details",
  },
  {
    name: "manage:segments",
    description: "Full segment management (create, update, delete segments)",
  },

  // ============================================================================
  // SUPPRESSION LIST MANAGEMENT
  // ============================================================================
  {
    name: "read:suppression-list",
    description: "View suppression list entries",
  },
  {
    name: "manage:suppression-list",
    description:
      "Full suppression list management (add, update, remove entries)",
  },

  // ============================================================================
  // FORMS MANAGEMENT
  // ============================================================================
  {
    name: "read:forms",
    description: "View forms and their details",
  },
  {
    name: "manage:forms",
    description:
      "Full form management (create, update, delete forms and versions)",
  },

  // ============================================================================
  // EMAIL TEMPLATES MANAGEMENT
  // ============================================================================
  {
    name: "read:templates",
    description: "View email templates and their details",
  },
  {
    name: "manage:templates",
    description:
      "Full email template management (create, update, delete templates and versions)",
  },

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  {
    name: "read:webhooks",
    description: "View webhook destinations and their details",
  },
  {
    name: "manage:webhooks",
    description:
      "Create, update, delete, enable, and disable webhook destinations",
  },

  // ============================================================================
  // AUTOMATIONS
  // ============================================================================
  {
    name: "read:automations",
    description: "View automations and their details",
  },
  {
    name: "manage:automations",
    description:
      "Full automation management (create, update, delete, publish, archive automations)",
  },

  // ============================================================================
  // BROADCASTS
  // ============================================================================
  {
    name: "read:broadcasts",
    description: "View broadcasts and their details",
  },
  {
    name: "write:broadcasts",
    description:
      "Create and schedule broadcasts (create-and-send, schedule for delivery)",
  },
];

/**
 * Organization Roles
 *
 * Role hierarchy (from highest to lowest access):
 * 1. Owner - Full control including billing and destructive actions
 * 2. Admin - Administrative access to workspace and members
 * 3. Member - Basic access to view workspace and members
 *
 * This is a minimal boilerplate configuration. Extend with additional
 * roles as your application grows (e.g., viewer, developer, analyst).
 */
export const ROLES: Role[] = [
  // ============================================================================
  // OWNER - Full Control
  // ============================================================================
  {
    name: "owner",
    displayName: "Owner",
    description:
      "Full access to all workspace features including billing, member management, and workspace deletion. Only owners can delete the workspace or manage billing.",
    type: "User",
    permissions: [
      "read:workspace",
      "manage:workspace",
      "delete:workspace",
      "read:members",
      "invite:members",
      "manage:members",
      "read:billing",
      "manage:billing",
      "read:api-keys",
      "manage:api-keys",
      "read:webhooks",
      "manage:webhooks",
      // Contact Management - Full Access
      "read:contacts",
      "manage:contacts",
      // Tags Management - Full Access
      "read:tags",
      "manage:tags",
      // Topics Management - Full Access
      "read:topics",
      "manage:topics",
      // Segments Management - Full Access
      "read:segments",
      "manage:segments",
      // Suppression List - Full Access
      "read:suppression-list",
      "manage:suppression-list",
      // Forms Management - Full Access
      "read:forms",
      "manage:forms",
      // Email Templates Management - Full Access
      "read:templates",
      "manage:templates",
      // Automations Management - Full Access
      "read:automations",
      "manage:automations",
      // Broadcasts Management - Full Access
      "read:broadcasts",
      "write:broadcasts",
    ],
  },

  // ============================================================================
  // ADMIN - Administrative Access
  // ============================================================================
  {
    name: "admin",
    displayName: "Admin",
    description:
      "Administrative access including member management and workspace settings. Cannot manage billing or delete the workspace.",
    type: "User",
    permissions: [
      "read:workspace",
      "manage:workspace",
      "read:members",
      "invite:members",
      "manage:members",
      "read:billing",
      "read:api-keys",
      "manage:api-keys",
      "read:webhooks",
      "manage:webhooks",
      // Contact Management - Full Access
      "read:contacts",
      "manage:contacts",
      // Tags Management - Full Access
      "read:tags",
      "manage:tags",
      // Topics Management - Full Access
      "read:topics",
      "manage:topics",
      // Segments Management - Full Access
      "read:segments",
      "manage:segments",
      // Suppression List - Full Access
      "read:suppression-list",
      "manage:suppression-list",
      // Forms Management - Full Access
      "read:forms",
      "manage:forms",
      // Email Templates Management - Full Access
      "read:templates",
      "manage:templates",
      // Automations Management - Full Access
      "read:automations",
      "manage:automations",
      // Broadcasts Management - Full Access
      "read:broadcasts",
      "write:broadcasts",
    ],
  },

  // ============================================================================
  // MEMBER - Basic Access
  // ============================================================================
  {
    name: "member",
    displayName: "Member",
    description:
      "Basic access to view workspace information and members. Can invite new members but cannot manage existing members or settings.",
    type: "User",
    permissions: [
      "read:workspace",
      "read:members",
      // Contact Management - Read Only
      "read:contacts",
      "read:tags",
      "read:topics",
      "read:segments",
      "read:suppression-list",
      // Automations - Read Only
      "read:automations",
    ],
  },
];

/**
 * Complete RBAC Configuration
 *
 * Export the full configuration for use by the sync script.
 */
export const RBAC_CONFIG: RBACConfig = {
  permissions: PERMISSIONS,
  roles: ROLES,
};

/**
 * Helper: Get default role for new workspace members
 *
 * When a user accepts an invitation without a specific role assignment,
 * they are assigned this default role.
 */
const _DEFAULT_MEMBER_ROLE = "member";

/**
 * Helper: Get owner role name
 *
 * Used when creating a new workspace to assign the creator as owner.
 */
export const OWNER_ROLE = "owner";

/**
 * Helper: Get all permission names
 *
 * Useful for validation and autocomplete.
 */
const _PERMISSION_NAMES = PERMISSIONS.map((p) => p.name);

/**
 * Helper: Get all role names
 *
 * Useful for validation and autocomplete.
 */
export const ROLE_NAMES = ROLES.map((r) => r.name);

/**
 * Type: Union of all available permissions
 *
 * This is a union type of all permission strings for type-safe permission checking.
 *
 * @example
 * ```typescript
 * const permission: Permission = "read:workspace"; // ✓ Valid
 * const invalid: Permission = "invalid:permission"; // ✗ TypeScript error
 * ```
 */
export type Permission =
  | "read:workspace"
  | "manage:workspace"
  | "delete:workspace"
  | "read:members"
  | "invite:members"
  | "manage:members"
  | "read:billing"
  | "manage:billing"
  | "read:api-keys"
  | "manage:api-keys"
  | "read:webhooks"
  | "manage:webhooks"
  // Contact Management
  | "read:contacts"
  | "manage:contacts"
  // Tags Management
  | "read:tags"
  | "manage:tags"
  // Topics Management
  | "read:topics"
  | "manage:topics"
  // Segments Management
  | "read:segments"
  | "manage:segments"
  // Suppression List Management
  | "read:suppression-list"
  | "manage:suppression-list"
  // Forms Management
  | "read:forms"
  | "manage:forms"
  // Email Templates Management
  | "read:templates"
  | "manage:templates"
  // Automations Management
  | "read:automations"
  | "manage:automations"
  // Broadcasts Management
  | "read:broadcasts"
  | "write:broadcasts";
