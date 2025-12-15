import type { CSSProperties } from "react";

/**
 * Heading level type (h1-h4)
 */
export type HeadingLevel = 1 | 2 | 3 | 4;

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
