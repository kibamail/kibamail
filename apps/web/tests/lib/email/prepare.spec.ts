/**
 * Tests for Email Preparation
 *
 * Tests that broadcast styles are correctly passed through the email
 * preparation pipeline and applied to the final rendered HTML.
 */

import { describe, expect, test } from "vitest";
import type {
  BroadcastDocument,
  BroadcastStyles,
} from "@/lib/broadcast-renderer";
import { prepareEmailBatch, type EmailBroadcast } from "@/lib/email/prepare";
import type { SenderIdentity, SendingDomain } from "@prisma/client";

// Minimal sending domain for testing (uses type assertion for optional fields)
const testSendingDomain = {
  id: "domain_test123",
  workspaceId: "workspace_test123",
  name: "example.com",
  returnPathSubDomain: "bounce",
  trackingSubDomain: "e",
  inboxEnabled: false,
} as unknown as SendingDomain;

// Minimal sender identity for testing
const testSenderIdentity = {
  id: "identity_test123",
  email: "sender",
  name: "Test Sender",
  workspaceId: "workspace_test123",
  sendingDomainId: "domain_test123",
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  sendingDomain: testSendingDomain,
} as unknown as SenderIdentity & { sendingDomain: SendingDomain };

// Helper to create a minimal broadcast for testing
function createTestBroadcast(
  overrides: Partial<EmailBroadcast> = {},
): EmailBroadcast {
  return {
    id: "broadcast_test123",
    workspaceId: "workspace_test123",
    emailContent: {
      subject: "Test Subject",
      previewText: "Test preview",
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello World" }],
          },
        ],
      } as BroadcastDocument,
      contentHtml: null,
      contentText: null,
      styles: null,
      ...overrides.emailContent,
    },
    senderIdentity: testSenderIdentity,
    sendingDomain: testSendingDomain,
    trackOpens: true,
    trackClicks: true,
    replyToLocalPart: "reply",
    replyToDomain: "example.com",
    inboxEnabled: false,
    ...overrides,
  };
}

describe("prepareEmailBatch", () => {
  describe("styles application", () => {
    test("should apply body styles to rendered HTML", async () => {
      const styles: BroadcastStyles = {
        body: {
          backgroundColor: "#f0f0f0",
          fontFamily: "Arial, sans-serif",
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Test content" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      expect(result[0].htmlBody).toContain("background-color:#f0f0f0");
      expect(result[0].htmlBody).toContain("Arial, sans-serif");
    });

    test("should apply container styles to rendered HTML", async () => {
      const styles: BroadcastStyles = {
        container: {
          maxWidth: "600px",
          backgroundColor: "#ffffff",
          padding: "20px",
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Test content" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      expect(result[0].htmlBody).toContain("max-width:600px");
      expect(result[0].htmlBody).toContain("padding:20px");
    });

    test("should apply paragraph styles to rendered HTML", async () => {
      const styles: BroadcastStyles = {
        paragraph: {
          fontSize: "16px",
          lineHeight: "1.6",
          color: "#333333",
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Styled paragraph" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      expect(result[0].htmlBody).toContain("font-size:16px");
      expect(result[0].htmlBody).toContain("line-height:1.6");
      expect(result[0].htmlBody).toContain("color:#333333");
    });

    test("should apply heading styles to rendered HTML", async () => {
      const styles: BroadcastStyles = {
        heading: {
          h1: {
            fontSize: "32px",
            fontWeight: "bold",
            color: "#111111",
          },
          h2: {
            fontSize: "24px",
            fontWeight: "600",
            color: "#222222",
          },
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: "Main Heading" }],
              },
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Sub Heading" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      // H1 styles
      expect(result[0].htmlBody).toContain("font-size:32px");
      expect(result[0].htmlBody).toContain("color:#111111");
      // H2 styles
      expect(result[0].htmlBody).toContain("font-size:24px");
      expect(result[0].htmlBody).toContain("color:#222222");
    });

    test("should apply button styles to rendered HTML", async () => {
      const styles: BroadcastStyles = {
        button: {
          backgroundColor: "#007bff",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "4px",
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "button",
                attrs: { href: "https://example.com" },
                content: [{ type: "text", text: "Click Me" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      expect(result[0].htmlBody).toContain("background-color:#007bff");
      expect(result[0].htmlBody).toContain("color:#ffffff");
      expect(result[0].htmlBody).toContain("border-radius:4px");
    });

    test("should render with default styles when no styles provided", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Default styling" }],
              },
            ],
          } as BroadcastDocument,
          styles: null,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      // Should contain default font-family from renderer
      expect(result[0].htmlBody).toContain("font-family");
    });

    test("should apply multiple style categories together", async () => {
      const styles: BroadcastStyles = {
        body: {
          backgroundColor: "#fafafa",
        },
        container: {
          backgroundColor: "#ffffff",
          maxWidth: "640px",
        },
        paragraph: {
          fontSize: "15px",
          color: "#444444",
        },
        heading: {
          h1: {
            fontSize: "28px",
            color: "#000000",
          },
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: "Welcome" }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Hello there!" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [{ id: "contact_1", email: "test@example.com" }];
      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      const html = result[0].htmlBody;

      // Body styles
      expect(html).toContain("background-color:#fafafa");
      // Container styles
      expect(html).toContain("max-width:640px");
      // Paragraph styles
      expect(html).toContain("font-size:15px");
      expect(html).toContain("color:#444444");
      // Heading styles
      expect(html).toContain("font-size:28px");
    });

    test("should apply styles consistently across multiple contacts", async () => {
      const styles: BroadcastStyles = {
        body: {
          backgroundColor: "#e0e0e0",
        },
        paragraph: {
          fontSize: "14px",
        },
      };

      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Test",
          contentJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Consistent styling" }],
              },
            ],
          } as BroadcastDocument,
          styles,
        },
      });

      const contacts = [
        { id: "contact_1", email: "user1@example.com" },
        { id: "contact_2", email: "user2@example.com" },
        { id: "contact_3", email: "user3@example.com" },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(3);

      // All emails should have the same styles applied
      for (const prepared of result) {
        expect(prepared.htmlBody).toContain("background-color:#e0e0e0");
        expect(prepared.htmlBody).toContain("font-size:14px");
      }
    });
  });
});
