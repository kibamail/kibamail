/**
 * Tests for HTML to Plain Text Conversion
 *
 * Tests the htmlToPlainText utility for converting email HTML
 * to plain text for multipart/alternative emails.
 */

import { describe, expect, test } from "vitest";
import {
  htmlToPlainText,
  htmlToPlainTextWithOptions,
} from "@/lib/email/html-to-text";

describe("htmlToPlainText", () => {
  describe("basic conversion", () => {
    test("should convert simple paragraph", () => {
      const html = "<p>Hello, World!</p>";
      const text = htmlToPlainText(html);
      expect(text).toBe("Hello, World!");
    });

    test("should handle multiple paragraphs", () => {
      const html = "<p>First paragraph.</p><p>Second paragraph.</p>";
      const text = htmlToPlainText(html);
      expect(text).toContain("First paragraph.");
      expect(text).toContain("Second paragraph.");
    });

    test("should preserve line breaks between paragraphs", () => {
      const html = "<p>First</p><p>Second</p>";
      const text = htmlToPlainText(html);
      expect(text).toMatch(/First\n+Second/);
    });

    test("should handle empty input", () => {
      expect(htmlToPlainText("")).toBe("");
      expect(htmlToPlainText("   ")).toBe("");
    });

    test("should handle plain text without HTML", () => {
      const text = htmlToPlainText("Just plain text");
      expect(text).toBe("Just plain text");
    });
  });

  describe("link handling", () => {
    test("should preserve link URLs in parentheses", () => {
      const html =
        '<p>Click <a href="https://example.com">here</a> to continue.</p>';
      const text = htmlToPlainText(html);
      expect(text).toContain("Click here (https://example.com) to continue.");
    });

    test("should hide URL if same as text", () => {
      const html = '<a href="https://example.com">https://example.com</a>';
      const text = htmlToPlainText(html);
      // Should not duplicate the URL
      expect(text.match(/https:\/\/example\.com/g)?.length).toBe(1);
    });

    test("should handle mailto links", () => {
      const html = '<a href="mailto:test@example.com">Email us</a>';
      const text = htmlToPlainText(html);
      expect(text).toContain("Email us");
      // Library strips mailto: prefix, showing just the email
      expect(text).toContain("test@example.com");
    });

    test("should handle unsubscribe links", () => {
      const html =
        '<p><a href="https://track.example.com/u/abc123">Unsubscribe</a></p>';
      const text = htmlToPlainText(html);
      expect(text).toContain("Unsubscribe");
      expect(text).toContain("https://track.example.com/u/abc123");
    });
  });

  describe("heading handling", () => {
    test("should uppercase h1 headings", () => {
      const html = "<h1>Important Title</h1>";
      const text = htmlToPlainText(html);
      expect(text).toContain("IMPORTANT TITLE");
    });

    test("should uppercase h2 headings", () => {
      const html = "<h2>Section Title</h2>";
      const text = htmlToPlainText(html);
      expect(text).toContain("SECTION TITLE");
    });

    test("should handle h3 headings", () => {
      const html = "<h3>Subsection</h3>";
      const text = htmlToPlainText(html);
      // h3 is also uppercased by default
      expect(text).toContain("SUBSECTION");
    });
  });

  describe("list handling", () => {
    test("should convert unordered lists with bullet points", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
      const text = htmlToPlainText(html);
      expect(text).toContain("•");
      expect(text).toContain("Item 1");
      expect(text).toContain("Item 2");
      expect(text).toContain("Item 3");
    });

    test("should convert ordered lists", () => {
      const html = "<ol><li>First</li><li>Second</li><li>Third</li></ol>";
      const text = htmlToPlainText(html);
      expect(text).toContain("First");
      expect(text).toContain("Second");
      expect(text).toContain("Third");
    });
  });

  describe("image handling", () => {
    test("should skip images", () => {
      const html = '<p>Before <img src="image.jpg" alt="test"> After</p>';
      const text = htmlToPlainText(html);
      expect(text).not.toContain("test");
      expect(text).not.toContain("image.jpg");
      expect(text).toContain("Before");
      expect(text).toContain("After");
    });

    test("should skip tracking pixels", () => {
      const html =
        '<img src="https://track.example.com/o/pixel.gif" width="1" height="1">';
      const text = htmlToPlainText(html);
      expect(text).toBe("");
    });
  });

  describe("formatting", () => {
    test("should handle bold text", () => {
      const html = "<p>This is <strong>bold</strong> text</p>";
      const text = htmlToPlainText(html);
      expect(text).toContain("This is bold text");
    });

    test("should handle italic text", () => {
      const html = "<p>This is <em>italic</em> text</p>";
      const text = htmlToPlainText(html);
      expect(text).toContain("This is italic text");
    });

    test("should handle line breaks", () => {
      const html = "<p>Line 1<br>Line 2</p>";
      const text = htmlToPlainText(html);
      expect(text).toMatch(/Line 1\n+Line 2/);
    });

    test("should handle horizontal rules", () => {
      const html = "<p>Above</p><hr><p>Below</p>";
      const text = htmlToPlainText(html);
      expect(text).toContain("Above");
      expect(text).toContain("Below");
    });
  });

  describe("table handling", () => {
    test("should convert simple table", () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Email</th></tr>
          <tr><td>John</td><td>john@example.com</td></tr>
        </table>
      `;
      const text = htmlToPlainText(html);
      expect(text).toContain("Name");
      expect(text).toContain("Email");
      expect(text).toContain("John");
      expect(text).toContain("john@example.com");
    });
  });

  describe("script and style removal", () => {
    test("should remove script tags", () => {
      const html = '<p>Content</p><script>alert("test")</script>';
      const text = htmlToPlainText(html);
      expect(text).toBe("Content");
      expect(text).not.toContain("alert");
    });

    test("should remove style tags", () => {
      const html = "<style>body { color: red; }</style><p>Content</p>";
      const text = htmlToPlainText(html);
      expect(text).toBe("Content");
      expect(text).not.toContain("color");
    });

    test("should remove hidden elements", () => {
      const html = '<p>Visible</p><div style="display:none">Hidden</div>';
      const text = htmlToPlainText(html);
      expect(text).toContain("Visible");
      expect(text).not.toContain("Hidden");
    });
  });

  describe("whitespace handling", () => {
    test("should normalize excessive whitespace", () => {
      const html = "<p>Text</p>\n\n\n\n\n<p>More text</p>";
      const text = htmlToPlainText(html);
      // Should not have more than 2 consecutive newlines
      expect(text).not.toMatch(/\n{3,}/);
    });

    test("should remove trailing whitespace from lines", () => {
      const html = "<p>Line with spaces   </p>";
      const text = htmlToPlainText(html);
      expect(text).not.toMatch(/\s+$/);
    });

    test("should trim result", () => {
      const html = "   <p>Content</p>   ";
      const text = htmlToPlainText(html);
      expect(text).toBe("Content");
    });
  });

  describe("email-specific scenarios", () => {
    test("should handle typical email structure", () => {
      const html = `
        <html>
          <body>
            <h1>Welcome!</h1>
            <p>Dear {{first_name}},</p>
            <p>Thank you for subscribing to our newsletter.</p>
            <p>Here's what you can expect:</p>
            <ul>
              <li>Weekly updates</li>
              <li>Exclusive content</li>
              <li>Special offers</li>
            </ul>
            <p>Click <a href="https://example.com/verify">here</a> to verify your email.</p>
            <p>Best regards,<br>The Team</p>
            <hr>
            <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
          </body>
        </html>
      `;
      const text = htmlToPlainText(html);

      expect(text).toContain("WELCOME!");
      expect(text).toContain("Dear {{first_name}},");
      expect(text).toContain("Weekly updates");
      expect(text).toContain("https://example.com/verify");
      expect(text).toContain("{{unsubscribe_url}}");
    });

    test("should handle email with complex layout tables", () => {
      const html = `
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h2>Newsletter</h2>
              <p>Your weekly digest</p>
            </td>
          </tr>
        </table>
      `;
      const text = htmlToPlainText(html);
      expect(text).toContain("NEWSLETTER");
      expect(text).toContain("Your weekly digest");
    });
  });

  describe("performance", () => {
    test("should handle large HTML efficiently", () => {
      // Generate a large HTML document
      const paragraphs = Array.from(
        { length: 1000 },
        (_, i) => `<p>Paragraph ${i + 1} with some content.</p>`,
      ).join("");
      const html = `<html><body>${paragraphs}</body></html>`;

      const start = performance.now();
      const text = htmlToPlainText(html);
      const duration = performance.now() - start;

      // Should complete in under 1 second for 1000 paragraphs
      expect(duration).toBeLessThan(1000);
      expect(text).toContain("Paragraph 1");
      expect(text).toContain("Paragraph 1000");
    });

    test("should respect max input length limit", () => {
      // Create input that exceeds 1MB
      const largeContent = "x".repeat(1_100_000);
      const html = `<p>${largeContent}</p>`;

      // Should not throw, but may truncate
      expect(() => htmlToPlainText(html)).not.toThrow();
    });
  });
});

describe("htmlToPlainTextWithOptions", () => {
  test("should allow custom word wrap", () => {
    const html =
      "<p>This is a longer sentence that might need word wrapping at some point.</p>";
    const text = htmlToPlainTextWithOptions(html, { wordwrap: 40 });
    // With 40 char wrap, lines should be roughly 40 chars or less
    const lines = text.split("\n");
    lines.forEach((line) => {
      // Allow some flexibility for word boundaries
      expect(line.length).toBeLessThanOrEqual(50);
    });
  });

  test("should merge custom selectors with defaults", () => {
    const html = "<p>Text with <custom-tag>custom content</custom-tag></p>";
    const text = htmlToPlainTextWithOptions(html, {
      selectors: [{ selector: "custom-tag", format: "skip" }],
    });
    expect(text).toContain("Text with");
  });
});
