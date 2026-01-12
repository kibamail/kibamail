import type { SendingDomain } from "@prisma/client";
import type {
  CreatedDomain,
  TransformedSenderIdentity,
} from "@/components/sender-select";
import type { VariableDefinition } from "@/app/(main)/api/internal/v1/email-templates/schema";

export type { TransformedSenderIdentity, CreatedDomain, VariableDefinition };

/**
 * The mode of the email editor determines which features are available.
 *
 * - broadcast: Full editing with recipients, scheduling, analytics
 * - template: Editing for transactional email templates (no recipients/scheduling)
 * - email: Single email editing for automations (no recipients/scheduling)
 */
export type EmailEditorMode = "broadcast" | "template" | "email";

/**
 * Core email content that's common across all modes
 */
export interface EmailContent {
  subject: string;
  previewText: string;
  contentJson?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

/**
 * Email details that are common across all modes
 */
export interface EmailDetails {
  subject: string;
  previewText: string;
  senderIdentityId?: string;
  replyToIdentityId?: string;
  trackClicks?: boolean;
  trackOpens?: boolean;
}

/**
 * Broadcast-specific details (recipients, scheduling)
 */
export interface BroadcastDetails extends EmailDetails {
  topicId?: string;
  segmentId?: string;
  sendAt?: Date;
}

/**
 * Template-specific details
 */
export interface TemplateDetails extends EmailDetails {
  templateName?: string;
  templateDescription?: string;
}

/**
 * Automation email-specific details
 */
export interface AutomationEmailDetails extends EmailDetails {
  // Automation emails might have delay settings, etc.
  // For now, same as base EmailDetails
}

/**
 * Union type for all detail types based on mode
 */
export type EditorDetails<T extends EmailEditorMode> = T extends "broadcast"
  ? BroadcastDetails
  : T extends "template"
    ? TemplateDetails
    : AutomationEmailDetails;

export type Domain = Pick<SendingDomain, "id" | "name">;

/**
 * Tab configuration varies by mode
 */
export type EditorTab = "content" | "details" | "preview" | "analytics";

export interface TabConfig {
  id: EditorTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

/**
 * Get available tabs based on mode
 */
export function getTabsForMode(mode: EmailEditorMode): TabConfig[] {
  const baseTabs: TabConfig[] = [
    { id: "content", label: "Content", enabled: true },
    { id: "details", label: "Details", enabled: true },
    { id: "preview", label: "Preview", enabled: true },
  ];

  if (mode === "broadcast") {
    return [
      ...baseTabs,
      { id: "analytics", label: "Analytics", enabled: true },
    ];
  }

  return baseTabs;
}

/**
 * Mutation handlers that can be customized per mode
 */
export interface EmailEditorMutations<T extends EmailEditorMode> {
  /**
   * Called when user saves the draft
   */
  onSaveDraft: (data: SaveDraftPayload<T>) => Promise<void>;

  /**
   * Called when user publishes/sends (broadcasts) or saves as active (templates/emails)
   */
  onPublish?: (data: SaveDraftPayload<T>) => Promise<void>;

  /**
   * Called when uploading files (images, etc.)
   */
  onUploadFile?: (file: File) => Promise<string>;

  /**
   * Called to get preview HTML
   */
  onGetPreview?: () => Promise<{ html: string; hasContent: boolean }>;

  /**
   * Called to check readiness before publishing (broadcasts only)
   */
  onCheckReadiness?: () => Promise<ReadinessResponse>;
}

/**
 * Payload for saving draft
 */
export interface SaveDraftPayload<T extends EmailEditorMode> {
  emailContent: EmailContent;
  details: EditorDetails<T>;
  senderEmail?: string;
}

/**
 * Link status from the API
 */
export type LinkStatus = "valid" | "invalid" | "pending";

/**
 * Extracted link from email content
 */
export interface ExtractedLink {
  url: string;
  type: "variable" | "url";
  status: LinkStatus;
  reason?: string;
}

/**
 * Links validation result
 */
export interface LinksValidation {
  links: ExtractedLink[];
  allValid: boolean;
  validCount: number;
  invalidCount: number;
}

/**
 * Readiness checklist item
 */
export interface ReadinessChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  reason?: string;
}

/**
 * Readiness check response (used for broadcasts)
 */
export interface ReadinessResponse {
  ready: boolean;
  checklist: ReadinessChecklistItem[];
  linksValidation?: LinksValidation;
}

/**
 * Props for the main EmailEditor component
 */
export interface EmailEditorProps<T extends EmailEditorMode> {
  mode: T;
  entityId: string;
  entityName: string;
  isReadonly?: boolean;

  // Initial data
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
  initialDetails: EditorDetails<T>;

  // Sender configuration
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];

  // Mutation handlers
  mutations: EmailEditorMutations<T>;

  // Navigation
  backUrl: string;
  successRedirectUrl?: string;

  // Labels (customizable per mode)
  labels?: Partial<EmailEditorLabels>;

  // Header customization (e.g., version dropdown)
  headerExtra?: React.ReactNode;

  // Custom variables support
  customVariables?: VariableDefinition[];
  allowCustomVariables?: boolean;
  onVariableCreate?: (variable: VariableDefinition) => void;
  onVariableUpdate?: (variable: VariableDefinition) => void;
  onVariableDelete?: (id: string) => void;
}

/**
 * Customizable labels for the editor UI
 */
export interface EmailEditorLabels {
  saveDraft: string;
  saveDraftPending: string;
  publishTrigger: string;
  publish: string;
  publishPending: string;
  title: string;
}

/**
 * Get default labels for a mode
 */
export function getDefaultLabels(mode: EmailEditorMode): EmailEditorLabels {
  switch (mode) {
    case "broadcast":
      return {
        saveDraft: "Save Draft",
        saveDraftPending: "Saving...",
        publishTrigger: "Send broadcast",
        publish: "Schedule broadcast",
        publishPending: "Scheduling...",
        title: "Broadcast",
      };
    case "template":
      return {
        saveDraft: "Save Draft",
        saveDraftPending: "Saving...",
        publishTrigger: "Publish Template",
        publish: "Publish Template",
        publishPending: "Publishing...",
        title: "Template",
      };
    case "email":
      return {
        saveDraft: "Save",
        saveDraftPending: "Saving...",
        publishTrigger: "Save & Activate",
        publish: "Save & Activate",
        publishPending: "Activating...",
        title: "Email",
      };
  }
}
