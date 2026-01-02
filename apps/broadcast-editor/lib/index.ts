// Main component export
export {
  EmailEditor,
  type EmailEditorRef,
  type EmailEditorProps,
  type EditorStylesConfig,
  type EditorFeatureConfig,
} from "@/components/tiptap-templates/email-editor/email-editor"

// Feature config types and presets
export {
  type TextFormattingFeatures,
  type BlockFeatures,
  type MediaFeatures,
  type EmailFeatures,
  type UIFeatures,
  EMAIL_EDITOR_PRESET,
  RICH_TEXT_PRESET,
  MINIMAL_PRESET,
  FORM_BUILDER_PRESET,
  mergeFeatureConfig,
  isFeatureEnabled,
  getEnabledHeadingLevels,
} from "@/types/editor-config"

// Styles - consumers should import '@kibamail/email-editor/styles'
import "@/styles/_variables.scss"
import "@/styles/_keyframe-animations.scss"
import "@/index.css"
