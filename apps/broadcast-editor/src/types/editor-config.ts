import type { CSSProperties } from "react";

/**
 * Heading level type (h1-h4)
 */
export type HeadingLevel = 1 | 2 | 3 | 4;

// =============================================================================
// FEATURE CONFIGURATION
// =============================================================================

/**
 * Text formatting features (marks)
 */
export interface TextFormattingFeatures {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  textColor?: boolean;
  highlight?: boolean;
  textAlign?: boolean;
  link?: boolean;
}

/**
 * Block/node type features
 */
export interface BlockFeatures {
  paragraph?: boolean;
  heading?: boolean;
  headingLevels?: HeadingLevel[];
  bulletList?: boolean;
  numberedList?: boolean;
  taskList?: boolean;
  blockquote?: boolean;
  codeBlock?: boolean;
  horizontalRule?: boolean;
}

/**
 * Media and content insertion features
 */
export interface MediaFeatures {
  image?: boolean;
  emoji?: boolean;
  button?: boolean;
  panel?: boolean;
}

/**
 * Email-specific features
 */
export interface EmailFeatures {
  variables?: boolean;
  emailFooter?: boolean;
  mentions?: boolean;
}

/**
 * UI element visibility configuration
 */
export interface UIFeatures {
  /** Show the left styles/canvas panel */
  leftPanel?: boolean;
  /** Show the right node properties panel */
  rightPanel?: boolean;
  /** Show the floating toolbar on text selection */
  floatingToolbar?: boolean;
  /** Show the mobile toolbar */
  mobileToolbar?: boolean;
  /** Show the slash command menu */
  slashMenu?: boolean;
  /** Show the email wrapper container (body + container styling) */
  emailWrapper?: boolean;
  /** Show drag handles for blocks */
  dragHandles?: boolean;
  /** Allow node style editing */
  nodeStyleEditing?: boolean;
}

/**
 * Complete feature configuration for the editor
 */
export interface EditorFeatureConfig {
  /** Text formatting features */
  textFormatting?: TextFormattingFeatures;
  /** Block/node type features */
  blocks?: BlockFeatures;
  /** Media and content features */
  media?: MediaFeatures;
  /** Email-specific features */
  email?: EmailFeatures;
  /** UI element visibility */
  ui?: UIFeatures;
}

// =============================================================================
// FEATURE PRESETS
// =============================================================================

/**
 * Full email editor with all features enabled
 */
export const EMAIL_EDITOR_PRESET: EditorFeatureConfig = {
  textFormatting: {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    superscript: true,
    subscript: true,
    textColor: true,
    highlight: true,
    textAlign: true,
    link: true,
  },
  blocks: {
    paragraph: true,
    heading: true,
    headingLevels: [1, 2, 3, 4],
    bulletList: true,
    numberedList: true,
    taskList: true,
    blockquote: true,
    codeBlock: true,
    horizontalRule: true,
  },
  media: {
    image: true,
    emoji: true,
    button: true,
    panel: true,
  },
  email: {
    variables: true,
    emailFooter: true,
    mentions: true,
  },
  ui: {
    leftPanel: true,
    rightPanel: true,
    floatingToolbar: true,
    mobileToolbar: true,
    slashMenu: true,
    emailWrapper: true,
    dragHandles: true,
    nodeStyleEditing: true,
  },
};

/**
 * Rich text editor - all formatting, no email-specific features
 */
export const RICH_TEXT_PRESET: EditorFeatureConfig = {
  textFormatting: {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    superscript: true,
    subscript: true,
    textColor: true,
    highlight: true,
    textAlign: true,
    link: true,
  },
  blocks: {
    paragraph: true,
    heading: true,
    headingLevels: [1, 2, 3],
    bulletList: true,
    numberedList: true,
    taskList: false,
    blockquote: true,
    codeBlock: true,
    horizontalRule: true,
  },
  media: {
    image: true,
    emoji: true,
    button: false,
    panel: false,
  },
  email: {
    variables: false,
    emailFooter: false,
    mentions: false,
  },
  ui: {
    leftPanel: false,
    rightPanel: false,
    floatingToolbar: true,
    mobileToolbar: true,
    slashMenu: true,
    emailWrapper: false,
    dragHandles: false,
    nodeStyleEditing: false,
  },
};

/**
 * Minimal text editor - basic formatting only
 */
export const MINIMAL_PRESET: EditorFeatureConfig = {
  textFormatting: {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: false,
    code: false,
    superscript: false,
    subscript: false,
    textColor: false,
    highlight: false,
    textAlign: false,
    link: true,
  },
  blocks: {
    paragraph: true,
    heading: false,
    headingLevels: [],
    bulletList: true,
    numberedList: true,
    taskList: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
  },
  media: {
    image: false,
    emoji: true,
    button: false,
    panel: false,
  },
  email: {
    variables: false,
    emailFooter: false,
    mentions: false,
  },
  ui: {
    leftPanel: false,
    rightPanel: false,
    floatingToolbar: true,
    mobileToolbar: true,
    slashMenu: true,
    emailWrapper: false,
    dragHandles: false,
    nodeStyleEditing: false,
  },
};

/**
 * Form builder rich text - for form descriptions and content
 */
export const FORM_BUILDER_PRESET: EditorFeatureConfig = {
  textFormatting: {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: false,
    superscript: false,
    subscript: false,
    textColor: true,
    highlight: true,
    textAlign: true,
    link: true,
  },
  blocks: {
    paragraph: true,
    heading: true,
    headingLevels: [1, 2, 3],
    bulletList: true,
    numberedList: true,
    taskList: false,
    blockquote: true,
    codeBlock: false,
    horizontalRule: true,
  },
  media: {
    image: true,
    emoji: true,
    button: false,
    panel: false,
  },
  email: {
    variables: false,
    emailFooter: false,
    mentions: false,
  },
  ui: {
    leftPanel: false,
    rightPanel: false,
    floatingToolbar: true,
    mobileToolbar: true,
    slashMenu: true,
    emailWrapper: false,
    dragHandles: true,
    nodeStyleEditing: false,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Deep merge feature configs, with overrides taking precedence
 */
export function mergeFeatureConfig(
  base: EditorFeatureConfig,
  overrides: Partial<EditorFeatureConfig>
): EditorFeatureConfig {
  return {
    textFormatting: { ...base.textFormatting, ...overrides.textFormatting },
    blocks: { ...base.blocks, ...overrides.blocks },
    media: { ...base.media, ...overrides.media },
    email: { ...base.email, ...overrides.email },
    ui: { ...base.ui, ...overrides.ui },
  };
}

/**
 * Check if a feature is enabled in the config
 * Returns true if not explicitly set to false (default enabled)
 */
export function isFeatureEnabled(
  config: EditorFeatureConfig | undefined,
  category: keyof EditorFeatureConfig,
  feature: string
): boolean {
  if (!config) return true;
  const categoryConfig = config[category];
  if (!categoryConfig) return true;
  const value = (categoryConfig as Record<string, unknown>)[feature];
  return value !== false;
}

/**
 * Get enabled heading levels from config
 */
export function getEnabledHeadingLevels(
  config: EditorFeatureConfig | undefined
): HeadingLevel[] {
  if (!config?.blocks?.heading) return [];
  return config.blocks.headingLevels ?? [1, 2, 3, 4];
}

/**
 * Heading styles configuration for h1-h4 elements
 */
export interface HeadingStylesConfig {
  h1?: CSSProperties;
  h2?: CSSProperties;
  h3?: CSSProperties;
  h4?: CSSProperties;
}

/**
 * Global styles configuration for the email editor.
 * All style categories use React CSSProperties for type safety.
 */
export interface EditorStylesConfig {
  /**
   * Body/document-level styles
   */
  body?: CSSProperties;

  /**
   * Container/wrapper styles
   */
  container?: CSSProperties;

  /**
   * Side panel styles (left and right panels)
   */
  panel?: CSSProperties;

  /**
   * Button element styles
   */
  button?: CSSProperties;

  /**
   * Typography styles (paragraphs, headings, text)
   */
  typography?: CSSProperties;

  /**
   * Paragraph element styles
   */
  paragraph?: CSSProperties;

  /**
   * Link/anchor styles
   */
  link?: CSSProperties;

  /**
   * Image element styles
   */
  image?: CSSProperties;

  /**
   * Code block styles
   */
  codeblock?: CSSProperties;

  /**
   * Horizontal rule styles (marginTop, marginBottom, backgroundColor)
   */
  horizontalRule?: CSSProperties;

  /**
   * Heading styles (h1-h4)
   */
  heading?: HeadingStylesConfig;
}

/**
 * Complete editor configuration
 */
export interface EditorConfig {
  /**
   * Global styles configuration
   */
  styles: EditorStylesConfig;
}
