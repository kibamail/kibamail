// Main component
export { EmailEditorClient } from "./email-editor-client";

// Adapters for specific use cases
export {
  BroadcastEditorAdapter,
  TemplateEditorAdapter,
  AutomationEmailEditorAdapter,
} from "./adapters";

// Sub-components
export { ContentEditor, type ContentEditorRef } from "./content-editor";
export { EmailPreview } from "./email-preview";
export { EmailDetailsTab } from "./email-details-tab";
export { PublishButton } from "./publish-button";

// Detail sections
export {
  SectionHeader,
  SectionDivider,
  SectionSaveButton,
  ChecklistItem,
  EmailSubjectSection,
  SenderDetailsSection,
  TrackingSection,
  RecipientsSection,
  SendTimeSection,
  useSendTime,
} from "./details-sections";

// Types
export type {
  EmailEditorMode,
  EmailContent,
  EmailDetails,
  BroadcastDetails,
  TemplateDetails,
  AutomationEmailDetails,
  EditorDetails,
  Domain,
  SenderSelectState,
  SenderSelectActions,
  EditorTab,
  TabConfig,
  EmailEditorMutations,
  SaveDraftPayload,
  ReadinessResponse,
  ReadinessChecklistItem,
  LinksValidation,
  LinkStatus,
  ExtractedLink,
  EmailEditorProps,
  EmailEditorLabels,
  TransformedSenderIdentity,
  CreatedDomain,
} from "./types";

// Utilities
export { getTabsForMode, getDefaultLabels } from "./types";
