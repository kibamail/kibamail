import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Emails Resource", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("send", () => {
    it("should send a simple transactional email", async () => {
      const result = await kibamail.emails.send({
        from: "noreply@example.com",
        to: "customer@example.com",
        subject: "Order Confirmation",
        html: "<h1>Thank you for your order!</h1>",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(201);
    });

    it("should send an email with plain text fallback", async () => {
      const result = await kibamail.emails.send({
        from: "noreply@example.com",
        to: "customer@example.com",
        subject: "Welcome!",
        html: "<h1>Welcome to our platform!</h1>",
        text: "Welcome to our platform!",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should send an email with custom reply-to", async () => {
      const result = await kibamail.emails.send({
        from: "noreply@example.com",
        to: "customer@example.com",
        subject: "Support Ticket Update",
        html: "<p>Your ticket has been updated.</p>",
        replyTo: {
          email: "support@example.com",
          name: "Support Team",
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should send an email with metadata", async () => {
      const result = await kibamail.emails.send({
        from: "orders@example.com",
        to: "customer@example.com",
        subject: "Order Shipped",
        html: "<p>Your order has shipped!</p>",
        metadata: {
          orderId: "order_12345",
          customerId: "cust_67890",
        },
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should send an email to multiple recipients", async () => {
      const result = await kibamail.emails.send({
        from: "team@example.com",
        to: ["user1@example.com", "user2@example.com"],
        subject: "Team Update",
        html: "<p>Important team announcement.</p>",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should send an email with attachments", async () => {
      const result = await kibamail.emails.send({
        from: "billing@example.com",
        to: "customer@example.com",
        subject: "Your Invoice",
        html: "<p>Please find your invoice attached.</p>",
        attachments: [
          {
            filename: "invoice.pdf",
            content: "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdl",
            contentType: "application/pdf",
          },
        ],
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should send an email with preview text", async () => {
      const result = await kibamail.emails.send({
        from: "newsletter@example.com",
        to: "subscriber@example.com",
        subject: "Weekly Newsletter",
        html: "<h1>This week's highlights</h1>",
        previewText: "Check out what's new this week...",
      });

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });
});
