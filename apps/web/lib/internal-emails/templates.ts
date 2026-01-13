/**
 * Logto Email Templates Configuration
 *
 * This file defines all email template types supported by Logto's email connector.
 * These templates are used for authentication flows, account management,
 * and organization-related communications.
 *
 * @see https://docs.logto.io/connectors/email-connectors/email-templates
 */

/**
 * Template variable types for verification code emails
 */
export interface VerificationCodeVariables {
  code: string;
  application?: string;
  organization?: string;
}

/**
 * Template variable types for organization invitation emails
 */
export interface OrganizationInvitationVariables {
  link: string;
  organization: string;
  inviter?: string;
}

/**
 * Template variable types for user-related verification emails
 */
export interface UserVerificationVariables {
  code: string;
  user: string;
  application?: string;
}

/**
 * Template variable types for MFA emails
 */
export interface MfaVariables {
  code: string;
  user?: string;
  application?: string;
  organization?: string;
}

/**
 * Template variable types for generic emails
 */
export interface GenericVariables {
  code: string;
}

/**
 * All supported Logto email template types
 */
export const LogtoEmailTemplateType = {
  /**
   * Sign In Verification
   *
   * Sent when users sign in using their email and need to verify
   * by entering a verification code.
   *
   * Variables: code, application, organization (optional)
   */
  SignIn: "SignIn",

  /**
   * Registration Verification
   *
   * Sent when users create an account using their email address.
   * Contains a verification code to confirm their email ownership.
   *
   * Variables: code, application, organization (optional)
   */
  Register: "Register",

  /**
   * Forgot Password
   *
   * Sent when users forget their password during login and request
   * a password reset. Contains a verification code.
   *
   * Variables: code, application, organization (optional)
   */
  ForgotPassword: "ForgotPassword",

  /**
   * Generic
   *
   * A general backup template for various scenarios, including
   * testing connector configurations. Use when no specific
   * template type applies.
   *
   * Variables: code
   */
  Generic: "Generic",

  /**
   * Organization Invitation
   *
   * Sent to invite users to join an organization. Contains an
   * invitation link rather than a verification code.
   *
   * Variables: link, organization, inviter (optional)
   */
  OrganizationInvitation: "OrganizationInvitation",

  /**
   * User Permission Validation
   *
   * Sent when users perform high-risk operations that require
   * additional verification. Used for sensitive actions that
   * need extra security confirmation.
   *
   * Variables: code, user, application (optional)
   */
  UserPermissionValidation: "UserPermissionValidation",

  /**
   * Bind New Identifier
   *
   * Sent when users bind a new email address to their existing
   * account. Contains a verification code to confirm ownership
   * of the new email.
   *
   * Variables: code, user, application (optional)
   */
  BindNewIdentifier: "BindNewIdentifier",

  /**
   * Bind MFA
   *
   * Sent when users set up email-based multi-factor authentication
   * for the first time. Contains a verification code to confirm
   * the MFA binding.
   *
   * Variables: code, user, application (optional)
   */
  BindMfa: "BindMfa",

  /**
   * MFA Verification
   *
   * Sent during MFA verification when users need to authenticate
   * using their email as a second factor.
   *
   * Variables: code, user, application (optional), organization (optional)
   */
  MfaVerification: "MfaVerification",
} as const;

export type LogtoEmailTemplateType =
  (typeof LogtoEmailTemplateType)[keyof typeof LogtoEmailTemplateType];

/**
 * Template metadata for each email type
 */
export interface LogtoEmailTemplateConfig {
  type: LogtoEmailTemplateType;
  description: string;
  purpose: string;
  hasVerificationCode: boolean;
  hasInvitationLink: boolean;
  variables: string[];
}

/**
 * Configuration for all Logto email templates
 */
export const LogtoEmailTemplates: Record<
  LogtoEmailTemplateType,
  LogtoEmailTemplateConfig
> = {
  [LogtoEmailTemplateType.SignIn]: {
    type: LogtoEmailTemplateType.SignIn,
    description: "Sign-in verification email",
    purpose: "Verify user identity during email-based sign in",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "application", "organization"],
  },

  [LogtoEmailTemplateType.Register]: {
    type: LogtoEmailTemplateType.Register,
    description: "Registration verification email",
    purpose: "Verify email ownership during account creation",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "application", "organization"],
  },

  [LogtoEmailTemplateType.ForgotPassword]: {
    type: LogtoEmailTemplateType.ForgotPassword,
    description: "Password reset verification email",
    purpose: "Allow users to reset their forgotten password",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "application", "organization"],
  },

  [LogtoEmailTemplateType.Generic]: {
    type: LogtoEmailTemplateType.Generic,
    description: "Generic verification email",
    purpose: "General-purpose email for testing or fallback scenarios",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code"],
  },

  [LogtoEmailTemplateType.OrganizationInvitation]: {
    type: LogtoEmailTemplateType.OrganizationInvitation,
    description: "Organization invitation email",
    purpose: "Invite users to join an organization",
    hasVerificationCode: false,
    hasInvitationLink: true,
    variables: ["link", "organization", "inviter"],
  },

  [LogtoEmailTemplateType.UserPermissionValidation]: {
    type: LogtoEmailTemplateType.UserPermissionValidation,
    description: "High-risk operation verification email",
    purpose: "Verify user identity for sensitive operations",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "user", "application"],
  },

  [LogtoEmailTemplateType.BindNewIdentifier]: {
    type: LogtoEmailTemplateType.BindNewIdentifier,
    description: "New email binding verification",
    purpose: "Verify ownership when binding a new email to an account",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "user", "application"],
  },

  [LogtoEmailTemplateType.BindMfa]: {
    type: LogtoEmailTemplateType.BindMfa,
    description: "MFA setup verification email",
    purpose: "Verify email during MFA setup",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "user", "application"],
  },

  [LogtoEmailTemplateType.MfaVerification]: {
    type: LogtoEmailTemplateType.MfaVerification,
    description: "MFA authentication email",
    purpose: "Provide verification code for MFA during login",
    hasVerificationCode: true,
    hasInvitationLink: false,
    variables: ["code", "user", "application", "organization"],
  },
};

/**
 * List of all template types that use verification codes
 */
export const VerificationCodeTemplates: LogtoEmailTemplateType[] = [
  LogtoEmailTemplateType.SignIn,
  LogtoEmailTemplateType.Register,
  LogtoEmailTemplateType.ForgotPassword,
  LogtoEmailTemplateType.Generic,
  LogtoEmailTemplateType.UserPermissionValidation,
  LogtoEmailTemplateType.BindNewIdentifier,
  LogtoEmailTemplateType.BindMfa,
  LogtoEmailTemplateType.MfaVerification,
];

/**
 * List of all template types that use invitation links
 */
export const InvitationLinkTemplates: LogtoEmailTemplateType[] = [
  LogtoEmailTemplateType.OrganizationInvitation,
];
