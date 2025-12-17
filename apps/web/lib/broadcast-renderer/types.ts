/**
 * Types for the Broadcast JSON to React Email Renderer
 */

import type { CSSProperties } from "react";

export interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: Mark[];
  text?: string;
}

export interface BroadcastDocument {
  type: "doc";
  content: Node[];
}

/**
 * Heading styles configuration for different levels
 */
export interface HeadingStyles {
  h1?: CSSProperties;
  h2?: CSSProperties;
  h3?: CSSProperties;
  h4?: CSSProperties;
  h5?: CSSProperties;
  h6?: CSSProperties;
}

/**
 * Styles configuration for rendering broadcast emails
 * Matches the EditorStylesConfig from broadcast-editor
 */
export interface BroadcastStyles {
  body?: CSSProperties;
  container?: CSSProperties;
  paragraph?: CSSProperties;
  heading?: HeadingStyles;
  button?: CSSProperties;
  link?: CSSProperties;
  image?: CSSProperties;
  panel?: CSSProperties;
  horizontalRule?: CSSProperties;
  blockquote?: CSSProperties;
  codeBlock?: CSSProperties;
  bulletList?: CSSProperties;
  orderedList?: CSSProperties;
}

export interface RenderContext {
  /**
   * Variables to replace in the content (e.g., contact.first_name)
   */
  variables?: Record<string, string>;
}
