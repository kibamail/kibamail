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

  describe("custom property variables", () => {
    test("should substitute custom property variables in HTML", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Welcome {{contact.company}}",
          contentHtml: "<p>Hello {{first_name}} from {{contact.company}}!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "john@example.com",
          firstName: "John",
          properties: { company: "Acme Inc" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe("Welcome Acme Inc");
      expect(result[0].htmlBody).toContain("Hello John from Acme Inc!");
    });

    test("should substitute custom property variables in subject", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Your bonus at {{contact.company}}",
          contentHtml: "<p>Congratulations!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "employee@example.com",
          properties: { company: "TechCorp" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Your bonus at TechCorp");
    });

    test("should handle missing custom properties as empty string", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Welcome",
          contentHtml: "<p>Company: {{contact.company}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "new@example.com",
          properties: {},
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Company:");
      expect(result[0].htmlBody).not.toContain("{{contact.company}}");
    });

    test("should substitute multiple custom properties", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Update for {{first_name}}",
          contentHtml: "<p>{{first_name}} {{last_name}} works at {{contact.company}} as {{contact.job_title}}.</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "jane@example.com",
          firstName: "Jane",
          lastName: "Doe",
          properties: {
            company: "Global Corp",
            job_title: "Senior Engineer",
          },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Jane Doe works at Global Corp as Senior Engineer.");
    });

    test("should preserve standard variables alongside custom properties", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Hello {{first_name}}",
          contentHtml: "<p>Welcome {{first_name}}!</p><p>Your company: {{contact.company}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          firstName: "Alice",
          properties: { company: "Wonderland Inc" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Hello Alice");
      expect(result[0].htmlBody).toContain("Welcome Alice!");
      expect(result[0].htmlBody).toContain("Your company: Wonderland Inc");
    });

    test("should handle numeric custom properties", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Your order #{{contact.order_id}}",
          contentHtml: "<p>Order total: ${{contact.total}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "customer@example.com",
          properties: {
            order_id: 12345,
            total: 99.99,
          },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Your order #12345");
      expect(result[0].htmlBody).toContain("Order total: $99.99");
    });

    test("should handle null custom property values", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Info",
          contentHtml: "<p>Phone: {{contact.phone}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "test@example.com",
          properties: { phone: null as unknown as string },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Phone:");
      expect(result[0].htmlBody).not.toContain("{{contact.phone}}");
    });
  });

  describe("transient variables (per-email)", () => {
    test("should substitute transient variables in subject", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order #{{orderNumber}} confirmed",
          contentHtml: "<p>Thank you for your order!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "customer@example.com",
          transientVariables: { orderNumber: "ORD-12345" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Order #ORD-12345 confirmed");
    });

    test("should substitute transient variables in HTML body", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Your Order",
          contentHtml: "<p>Hi {{firstName}}, your order #{{orderNumber}} is ready!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "customer@example.com",
          transientVariables: { firstName: "John", orderNumber: "ORD-99999" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Hi John, your order #ORD-99999 is ready!");
    });

    test("should override contact properties with transient variables", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Hello {{firstName}}",
          contentHtml: "<p>Welcome, {{firstName}}!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          firstName: "OriginalName",
          transientVariables: { firstName: "OverriddenName" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Hello OverriddenName");
      expect(result[0].htmlBody).toContain("Welcome, OverriddenName!");
    });

    test("should override contact.X properties with transient variables", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Welcome",
          contentHtml: "<p>Company: {{contact.company}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          properties: { company: "OldCompany" },
          transientVariables: { company: "NewCompany" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Company: NewCompany");
    });

    test("should make transient variables accessible with contact. prefix", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order Update",
          contentHtml: "<p>Order: {{contact.orderNumber}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          transientVariables: { orderNumber: "ORD-PREFIXED" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].htmlBody).toContain("Order: ORD-PREFIXED");
    });

    test("should support numeric transient variable values", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "You have {{points}} points",
          contentHtml: "<p>Balance: ${{balance}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          transientVariables: { points: 1500, balance: 99.99 },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("You have 1500 points");
      expect(result[0].htmlBody).toContain("Balance: $99.99");
    });

    test("should preserve built-in variables when using transient variables", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Welcome {{customName}}",
          contentHtml: "<p>Email: {{email}}, Custom: {{customField}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "real@example.com",
          transientVariables: { customName: "Friend", customField: "Value" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Welcome Friend");
      expect(result[0].htmlBody).toContain("Email: real@example.com");
      expect(result[0].htmlBody).toContain("Custom: Value");
    });

    test("should handle contacts without transient variables", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Hello {{firstName}}",
          contentHtml: "<p>Hi {{firstName}}!</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          firstName: "Alice",
          // No transientVariables
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Hello Alice");
      expect(result[0].htmlBody).toContain("Hi Alice!");
    });

    test("should apply different transient variables to different contacts", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order #{{orderNumber}}",
          contentHtml: "<p>Hi {{customerName}}, your order is confirmed.</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user1@example.com",
          transientVariables: { orderNumber: "ORD-001", customerName: "Alice" },
        },
        {
          id: "contact_2",
          email: "user2@example.com",
          transientVariables: { orderNumber: "ORD-002", customerName: "Bob" },
        },
        {
          id: "contact_3",
          email: "user3@example.com",
          transientVariables: { orderNumber: "ORD-003", customerName: "Charlie" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result).toHaveLength(3);
      expect(result[0].subject).toBe("Order #ORD-001");
      expect(result[0].htmlBody).toContain("Hi Alice");
      expect(result[1].subject).toBe("Order #ORD-002");
      expect(result[1].htmlBody).toContain("Hi Bob");
      expect(result[2].subject).toBe("Order #ORD-003");
      expect(result[2].htmlBody).toContain("Hi Charlie");
    });

    test("should handle missing transient variables as empty string", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order {{orderNumber}}",
          contentHtml: "<p>Status: {{status}}</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          transientVariables: { orderNumber: "ORD-123" },
          // No 'status' variable
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].subject).toBe("Order ORD-123");
      expect(result[0].htmlBody).toContain("Status:");
      expect(result[0].htmlBody).not.toContain("{{status}}");
    });

    test("should substitute transient variables in preview text", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order Update",
          previewText: "Your order #{{orderNumber}} has shipped!",
          contentHtml: "<p>Details inside.</p>",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          transientVariables: { orderNumber: "ORD-PREVIEW" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].previewText).toBe("Your order #ORD-PREVIEW has shipped!");
    });

    test("should substitute transient variables in plain text body", async () => {
      const broadcast = createTestBroadcast({
        emailContent: {
          subject: "Order Update",
          contentHtml: "<p>HTML content</p>",
          contentText: "Hi {{customerName}}, your order #{{orderNumber}} is ready.",
          contentJson: null,
        },
      });

      const contacts = [
        {
          id: "contact_1",
          email: "user@example.com",
          transientVariables: { customerName: "TextUser", orderNumber: "ORD-TEXT" },
        },
      ];

      const result = await prepareEmailBatch(contacts, broadcast);

      expect(result[0].textBody).toContain("Hi TextUser, your order #ORD-TEXT is ready.");
    });
  });
});
