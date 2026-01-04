/**
 * HTML to Plain Text Conversion
 *
 * Converts HTML email content to plain text for multipart/alternative emails.
 * Optimized for email content with special handling for:
 * - Links (preserves URLs inline)
 * - Lists (converts to readable format)
 * - Tables (converts to text layout)
 * - Images (uses alt text or removes)
 * - Tracking pixels (removes)
 */

import { convert, type HtmlToTextOptions } from "html-to-text";

/**
 * Default options optimized for email content conversion.
 * Tuned for performance and readability.
 */
const EMAIL_CONVERSION_OPTIONS: HtmlToTextOptions = {
  // Word wrapping
  wordwrap: 80,

  // Preserve whitespace structure
  preserveNewlines: false,

  // Selectors to handle specific elements
  selectors: [
    // Links: Show text with URL in parentheses
    {
      selector: "a",
      options: {
        linkBrackets: ["(", ")"],
        hideLinkHrefIfSameAsText: true,
      },
    },

    // Images: Use alt text or skip
    {
      selector: "img",
      format: "skip", // Skip images entirely (including tracking pixels)
    },

    // Headings: Add emphasis with line breaks
    {
      selector: "h1",
      options: {
        uppercase: true,
        leadingLineBreaks: 2,
        trailingLineBreaks: 1,
      },
    },
    {
      selector: "h2",
      options: {
        uppercase: true,
        leadingLineBreaks: 2,
        trailingLineBreaks: 1,
      },
    },
    {
      selector: "h3",
      options: {
        leadingLineBreaks: 2,
        trailingLineBreaks: 1,
      },
    },

    // Paragraphs: Standard spacing
    {
      selector: "p",
      options: {
        leadingLineBreaks: 1,
        trailingLineBreaks: 1,
      },
    },

    // Unordered lists
    {
      selector: "ul",
      options: {
        itemPrefix: "  • ",
      },
    },

    // Ordered lists
    {
      selector: "ol",
      options: {
        itemPrefix: "  ",
      },
    },

    // Block quotes
    {
      selector: "blockquote",
      options: {
        leadingLineBreaks: 1,
        trailingLineBreaks: 1,
      },
      format: "blockquote",
    },

    // Tables: Convert to readable format
    {
      selector: "table",
      options: {
        uppercaseHeaderCells: false,
      },
    },

    // Horizontal rules
    {
      selector: "hr",
      format: "horizontalLine",
    },

    // Skip style and script tags
    { selector: "style", format: "skip" },
    { selector: "script", format: "skip" },

    // Skip hidden elements
    { selector: "[style*='display:none']", format: "skip" },
    { selector: "[style*='display: none']", format: "skip" },
    { selector: "[hidden]", format: "skip" },
  ],

  // Decode HTML entities
  decodeEntities: true,

  // Limits for performance (prevent DoS on malformed HTML)
  limits: {
    maxInputLength: 1_000_000, // 1MB max input
    maxBaseElements: 10_000, // Max elements to process
    maxChildNodes: 1_000, // Max children per element
    ellipsis: "...",
  },
};

/**
 * Converts HTML content to plain text optimized for email.
 *
 * @param html - The HTML content to convert
 * @returns Plain text version of the HTML
 *
 * @example
 * ```ts
 * const html = '<h1>Hello</h1><p>Click <a href="https://example.com">here</a></p>';
 * const text = htmlToPlainText(html);
 * // Result:
 * // HELLO
 * //
 * // Click here (https://example.com)
 * ```
 */
export function htmlToPlainText(html: string): string {
  if (!html || html.trim() === "") {
    return "";
  }

  const text = convert(html, EMAIL_CONVERSION_OPTIONS);

  // Clean up excessive whitespace while preserving intentional line breaks
  return text
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .replace(/[ \t]+$/gm, "") // Remove trailing whitespace per line
    .trim();
}

/**
 * Converts HTML to plain text with custom options.
 * Use this when you need to override default behavior.
 *
 * @param html - The HTML content to convert
 * @param options - Custom html-to-text options (merged with defaults)
 * @returns Plain text version of the HTML
 */
export function htmlToPlainTextWithOptions(
  html: string,
  options: Partial<HtmlToTextOptions>,
): string {
  if (!html || html.trim() === "") {
    return "";
  }

  const mergedOptions = {
    ...EMAIL_CONVERSION_OPTIONS,
    ...options,
    selectors: [
      ...(EMAIL_CONVERSION_OPTIONS.selectors || []),
      ...(options.selectors || []),
    ],
  };

  const text = convert(html, mergedOptions);

  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
