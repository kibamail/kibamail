/**
 * Logto Authentication Service
 *
 * Centralized service for managing authentication and authorization with Logto.
 * Provides a clean API for working with users, organizations, roles, and permissions.
 *
 * @example
 * // Create an organization
 * const org = await logto.workspaces().create({ name: 'Acme Corp' })
 *
 * // Add member to workspace
 * await logto.workspaces().members(workspaceId).add(userId, [roleId])
 *
 * // Assign roles to member
 * await logto.workspaces().members(workspaceId).roles(userId).assign([roleId])
 *
 * // Remove roles from member
 * await logto.workspaces().members(workspaceId).roles(userId).remove([roleId])
 *
 * // List workspace members
 * const members = await logto.workspaces().members(workspaceId).list()
 *
 * // Get user access token
 * const token = await logto.users().accessToken()
 */
import { createManagementApi } from "@logto/api/management";
import { env } from "@/env/schema";
import { InternalServerError } from "@/lib/api/errors";
import type { paths } from "./logto.types";

// Initialize Management API client
const { apiClient } = createManagementApi(env.LOGTO_TENANT_ID, {
  clientId: env.LOGTO_M2M_APP_ID,
  clientSecret: env.LOGTO_M2M_APP_SECRET,
  baseUrl: env.LOGTO_ENDPOINT,
});

// Export Logto API types
export type LogtoOrganizationMember = NonNullable<
  paths["/api/organizations/{id}/users"]["get"]["responses"][200]["content"]["application/json"]
>[number];

export type LogtoOrganizationInvitation = NonNullable<
  paths["/api/organization-invitations"]["get"]["responses"][200]["content"]["application/json"]
>[number];

export type LogtoWorkspace = NonNullable<
  Awaited<ReturnType<WorkspaceManager["get"]>>
>;

/**
 * Workspace Member Roles Manager
 *
 * Handles role assignment and removal for workspace members.
 */
class WorkspaceMemberRolesManager {
  constructor(
    private workspaceId: string,
    private userId: string,
  ) {}

  /**
   * Assign roles to member
   */
  async assign(roleIds: string[]) {
    const response = await apiClient.POST(
      "/api/organizations/{id}/users/roles",
      {
        params: { path: { id: this.workspaceId } },
        body: {
          userIds: [this.userId],
          organizationRoleIds: roleIds,
        },
        parseAs: "text",
      },
    );

    return response;
  }

  /**
   * Update roles for member (replaces all existing roles)
   */
  async update(roleIds: string[]) {
    return apiClient.PUT("/api/organizations/{id}/users/{userId}/roles", {
      params: {
        path: {
          id: this.workspaceId,
          userId: this.userId,
        },
      },
      body: {
        organizationRoleIds: roleIds,
      },
    });
  }

  /**
   * Remove roles from member
   */
  async remove(roleId: string) {
    const response = await apiClient.DELETE(
      "/api/organizations/{id}/users/{userId}/roles/{organizationRoleId}",
      {
        params: {
          path: {
            id: this.workspaceId,
            organizationRoleId: roleId,
            userId: this.userId,
          },
        },
        parseAs: "text",
      },
    );

    return response;
  }
}

/**
 * Workspace Member Management
 *
 * Handles workspace member operations (add, remove, list).
 */
class WorkspaceMemberManager {
  constructor(private workspaceId: string) {}

  /**
   * Add user to workspace
   */
  async add(userId: string, roleIds: string[]) {
    const response = await apiClient.POST("/api/organizations/{id}/users", {
      params: { path: { id: this.workspaceId } },
      body: {
        userIds: [userId],
        organizationRoleIds: roleIds,
      },
      parseAs: "text",
    });

    if (response.error) {
      throw new InternalServerError("Failed to add this user to organization.");
    }

    return this.roles(userId).assign(roleIds);
  }

  /**
   * Remove user from workspace
   */
  async remove(userId: string) {
    const response = await apiClient.DELETE(
      "/api/organizations/{id}/users/{userId}",
      {
        params: { path: { id: this.workspaceId, userId } },
      },
    );

    if (response.error) {
      throw new Error(`Failed to remove member: ${response.error}`);
    }

    return true;
  }

  /**
   * List workspace members
   */
  async list() {
    const response = await apiClient.GET("/api/organizations/{id}/users", {
      params: { path: { id: this.workspaceId } },
    });

    if (response.error) {
      throw new Error(`Failed to list members: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Create organization invitation
   *
   * Creates an invitation in Logto. Logto will handle email delivery
   * based on the configured email connector and message template.
   */
  async invite(inviterUserId: string, inviteeEmail: string, roleIds: string[]) {
    return apiClient.POST("/api/organization-invitations", {
      body: {
        inviterId: inviterUserId,
        invitee: inviteeEmail,
        organizationId: this.workspaceId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        organizationRoleIds: roleIds,
        messagePayload: false,
      },
    });
  }

  /**
   * Get role ID by role name
   */
  async getRoleIdByName(roleName: string): Promise<string | null> {
    const response = await apiClient.GET("/api/organization-roles");

    if (response.error) {
      throw new Error(`Failed to fetch roles: ${response.error}`);
    }

    const role = response.data?.find((r) => r.name === roleName);
    return role?.id ?? null;
  }

  /**
   * Get organization invitations for this workspace
   */
  async listInvitations() {
    const response = await apiClient.GET("/api/organization-invitations", {
      params: {
        query: {
          organizationId: this.workspaceId,
        },
      },
    });

    if (response.error) {
      throw new Error(`Failed to fetch invitations: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Cancel an organization invitation
   */
  async cancelInvitation(invitationId: string) {
    const response = await apiClient.DELETE(
      "/api/organization-invitations/{id}",
      {
        params: { path: { id: invitationId } },
      },
    );

    if (response.error) {
      throw new Error(`Failed to cancel invitation: ${response.error}`);
    }

    return true;
  }

  /**
   * Access member roles operations
   */
  roles(userId: string) {
    return new WorkspaceMemberRolesManager(this.workspaceId, userId);
  }
}

/**
 * Workspace Management
 *
 * Handles organization (workspace) operations via Logto Management API.
 */
class WorkspaceManager {
  /**
   * Create a new workspace (organization)
   */
  async create(data: { name: string; description?: string }) {
    const response = await apiClient.POST("/api/organizations", {
      body: {
        name: data.name,
        description: data.description,
      },
    });

    if (response.error || !response.data) {
      throw new Error(`Failed to create workspace: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Get workspace by ID
   */
  async get(workspaceId: string) {
    const response = await apiClient.GET("/api/organizations/{id}", {
      params: { path: { id: workspaceId } },
    });

    if (response.error) {
      throw new Error(`Failed to get workspace: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Update workspace
   */
  async update(
    workspaceId: string,
    data: { name?: string; description?: string },
  ) {
    const response = await apiClient.PATCH("/api/organizations/{id}", {
      params: { path: { id: workspaceId } },
      body: data,
    });

    if (response.error) {
      throw new Error(`Failed to update workspace: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Delete workspace
   */
  async delete(workspaceId: string) {
    const response = await apiClient.DELETE("/api/organizations/{id}", {
      params: { path: { id: workspaceId } },
    });

    if (response.error) {
      throw new Error(`Failed to delete workspace: ${response.error}`);
    }

    return true;
  }

  /**
   * List all workspaces
   */
  async list() {
    const response = await apiClient.GET("/api/organizations");

    if (response.error) {
      throw new Error(`Failed to list workspaces: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Access workspace member operations
   */
  members(workspaceId: string) {
    return new WorkspaceMemberManager(workspaceId);
  }

  /**
   * Check if user has permission in workspace
   */
  async hasPermission(workspaceId: string, permission: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get workspace token with permissions
   */
  async getToken(workspaceId: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }
}

/**
 * User Invitations Manager
 *
 * Handles organization invitation operations.
 */
class UserInvitationsManager {
  /**
   * Get organization invitations for the current user
   */
  async list() {
    const response = await apiClient.GET("/api/organization-invitations");

    if (response.error) {
      throw new Error(`Failed to fetch invitations: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Update organization invitation status
   *
   * @param invitationId - The Logto invitation ID
   * @param data - Status update data
   */
  async update(
    invitationId: string,
    data: {
      status: "Accepted" | "Revoked";
      acceptedUserId: string | null;
    },
  ) {
    const response = await apiClient.PUT(
      "/api/organization-invitations/{id}/status",
      {
        params: { path: { id: invitationId } },
        body: data,
      },
    );

    return {
      data: response.data,
      error: response.error,
    };
  }
}

/**
 * User Management
 *
 * Handles user authentication and profile operations.
 */
class UserManager {
  /**
   * Access user invitations API
   */
  invitations() {
    return new UserInvitationsManager();
  }

  /**
   * Get user by ID
   *
   * @param userId - The user ID
   * @returns User profile data
   */
  async get(userId: string) {
    const response = await apiClient.GET("/api/users/{userId}", {
      params: { path: { userId } },
    });

    if (response.error) {
      throw new Error(`Failed to get user: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Get user's organizations
   *
   * @param userId - The user ID
   * @returns List of organizations with user's roles
   */
  async organizations(userId: string) {
    const response = await apiClient.GET("/api/users/{userId}/organizations", {
      params: { path: { userId } },
    });

    if (response.error) {
      console.error(response.error);
      throw new Error(`Failed to get user organizations: ${response.error}`);
    }

    return response.data;
  }

  /**
   * Get current user's access token
   */
  async accessToken() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get current user's profile
   */
  async profile() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get current user's ID
   */
  async id() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get current user's claims
   */
  async claims() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get user's roles in organization
   */
  async rolesInOrganization(organizationId: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }
}

/**
 * Role Management
 *
 * Handles role and permission operations.
 */
class RoleManager {
  /**
   * Assign role to user in workspace
   */
  async assign(workspaceId: string, userId: string, roleId: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Remove role from user in workspace
   */
  async revoke(workspaceId: string, userId: string, roleId: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * List all available roles
   */
  async list() {
    // TODO: Implementation
    throw new Error("Not implemented");
  }

  /**
   * Get role by ID
   */
  async get(roleId: string) {
    // TODO: Implementation
    throw new Error("Not implemented");
  }
}

/**
 * Logto Service
 *
 * Main service class for Logto authentication and authorization.
 * Provides access to all sub-services.
 */
class Logto {
  private _workspaces: WorkspaceManager;
  private _users: UserManager;
  private _roles: RoleManager;

  constructor() {
    this._workspaces = new WorkspaceManager();
    this._users = new UserManager();
    this._roles = new RoleManager();
  }

  /**
   * Access workspace operations
   */
  workspaces() {
    return this._workspaces;
  }

  /**
   * Access user operations
   */
  users() {
    return this._users;
  }

  /**
   * Access role operations
   */
  roles() {
    return this._roles;
  }
}

/**
 * Singleton instance
 */
export const logto = new Logto();
