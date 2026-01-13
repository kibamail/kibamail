/**
 * Manual Test: Send Transactional Emails with Template
 *
 * Tests the transactional email sending endpoint with template-based content.
 *
 * Flow:
 * 1. Creates an email template with custom variables (registration confirm code)
 * 2. Creates email content and publishes the template
 * 3. Creates a verified sending domain
 * 4. Creates an API key
 * 5. Sends 10 transactional emails using the template via SDK
 * 6. Verifies emails arrived in Mailpit
 *
 * Usage:
 *   pnpm manual-test:send-with-template              # Send 10 emails
 *   pnpm manual-test:send-with-template --count=5   # Send 5 emails
 *   pnpm manual-test:send-with-template --cleanup   # Clean up test data after
 */

import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { Kibamail } from "kibamail";
import { ManualTest, testConfig } from "../lib";
import {
  createApiKey,
  createVerifiedDomain,
  generateWorkspaceId,
  cleanupWorkspace,
  disconnect,
  type CreatedApiKey,
  type CreatedDomain,
} from "../lib/database";

const prisma = new PrismaClient();
const DEFAULT_EMAIL_COUNT = 10;

interface TemplateInfo {
  id: string;
  uniqueSlug: string;
  publishedVersionId: string;
  emailContentId: string;
}

interface SentEmail {
  id: string;
  recipient: string;
  confirmCode: string;
}

class SendWithTemplateTest extends ManualTest {
  private emailCount: number;
  private template: TemplateInfo | null = null;
  private sentEmails: SentEmail[] = [];
  private testRunId: string;

  constructor(emailCount: number = DEFAULT_EMAIL_COUNT) {
    super();
    this.emailCount = emailCount;
    this.testRunId = faker.string.alphanumeric(8).toLowerCase();
  }

  get name(): string {
    return "Send Transactional Emails with Template";
  }

  get description(): string {
    return `Tests template-based transactional email sending with ${this.emailCount} emails`;
  }

  /**
   * Generate the registration confirmation email HTML template.
   */
  private generateConfirmCodeTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Registration</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #4f46e5; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
    .message { color: #666; line-height: 1.6; margin-bottom: 20px; }
    .code-box { background: #f8f9fa; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; font-family: monospace; }
    .expiry { color: #999; font-size: 14px; margin-top: 10px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Confirm Your Registration</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello {{firstName}},</p>
      <p class="message">
        Thank you for registering with us! To complete your registration, please use the confirmation code below.
      </p>
      <div class="code-box">
        <div class="code">{{confirmCode}}</div>
        <p class="expiry">This code expires in {{expiryMinutes}} minutes</p>
      </div>
      <p class="message">
        If you didn't request this code, you can safely ignore this email.
      </p>
      <p class="message">
        Best regards,<br>
        The {{appName}} Team
      </p>
    </div>
    <div class="footer">
      <p>This is an automated message from {{appName}}.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`.trim();
  }

  /**
   * Create and publish an email template with custom variables.
   */
  private async createAndPublishTemplate(
    workspaceId: string
  ): Promise<TemplateInfo> {
    this.printSection("Creating Email Template");

    const uniqueSlug = `confirm_registration_${this.testRunId}`;

    // 1. Create the email content first
    const emailContent = await prisma.emailContent.create({
      data: {
        subject: "Confirm your registration, {{firstName}}",
        previewText: "Your confirmation code: {{confirmCode}}",
        contentHtml: this.generateConfirmCodeTemplate(),
        contentText: `Hello {{firstName}},\n\nYour confirmation code is: {{confirmCode}}\n\nThis code expires in {{expiryMinutes}} minutes.\n\nBest regards,\nThe {{appName}} Team`,
        variables: [
          { name: "firstName", type: "text", description: "User's first name" },
          {
            name: "confirmCode",
            type: "text",
            description: "6-digit confirmation code",
          },
          {
            name: "expiryMinutes",
            type: "number",
            description: "Minutes until code expires",
          },
          { name: "appName", type: "text", description: "Application name" },
        ],
      },
    });

    this.printField("Email content ID", emailContent.id);

    // 2. Create the parent template
    const parentTemplate = await prisma.emailTemplate.create({
      data: {
        workspaceId,
        name: `Registration Confirmation - ${this.testRunId}`,
        uniqueSlug,
        description: "Template for sending registration confirmation codes",
        status: "DRAFT",
        version: 1,
        trackClicks: false,
        trackOpens: true,
      },
    });

    this.printField("Parent template ID", parentTemplate.id);
    this.printField("Unique slug", uniqueSlug);

    // 3. Create a published version (child template)
    const publishedVersion = await prisma.emailTemplate.create({
      data: {
        workspaceId,
        name: `Registration Confirmation - ${this.testRunId}`,
        description: "Template for sending registration confirmation codes",
        status: "PUBLISHED",
        version: 1,
        parentId: parentTemplate.id,
        emailContentId: emailContent.id,
        trackClicks: false,
        trackOpens: true,
        publishedAt: new Date(),
      },
    });

    this.printField("Published version ID", publishedVersion.id);

    // 4. Update parent template to point to published version
    await prisma.emailTemplate.update({
      where: { id: parentTemplate.id },
      data: { publishedVersionId: publishedVersion.id },
    });

    this.printSuccess("Template created and published!");

    return {
      id: parentTemplate.id,
      uniqueSlug,
      publishedVersionId: publishedVersion.id,
      emailContentId: emailContent.id,
    };
  }

  /**
   * Generate a 6-digit confirmation code.
   */
  private generateConfirmCode(): string {
    return faker.string.numeric(6);
  }

  /**
   * Send transactional emails using the template.
   */
  private async sendEmails(
    apiKey: CreatedApiKey,
    domain: CreatedDomain
  ): Promise<void> {
    if (!this.template) throw new Error("Template not created");

    this.printSection(`Sending ${this.emailCount} Transactional Emails`);

    const kibamail = new Kibamail(apiKey.key, {
      baseURL: testConfig.apiBaseUrl,
    });

    this.printField("API Base URL", testConfig.apiBaseUrl);
    this.printField("Template slug", this.template.uniqueSlug);
    console.log("");

    for (let i = 0; i < this.emailCount; i++) {
      const firstName = faker.person.firstName();
      const confirmCode = this.generateConfirmCode();
      // Use sandbox email addresses for testing
      const recipient = `delivered+${this.testRunId}-${i}@gmail.com`;

      const { data, error } = await kibamail.emails.send({
        from: domain.fullFromAddress,
        to: recipient,
        template: {
          id: this.template.uniqueSlug,
          variables: {
            firstName,
            confirmCode,
            expiryMinutes: 15,
            appName: "TestApp",
          },
        },
      });

      if (error) {
        this.printError(`Failed to send email ${i + 1}`, error);
        continue;
      }

      this.sentEmails.push({
        id: data?.id || "unknown",
        recipient,
        confirmCode,
      });

      console.log(
        `  [${i + 1}/${
          this.emailCount
        }] Sent to ${recipient} (code: ${confirmCode})`
      );
    }

    this.printSuccess(
      `Sent ${this.sentEmails.length}/${this.emailCount} emails successfully!`
    );
  }

  /**
   * Query Mailpit API to verify emails were received.
   */
  private async verifyEmailsInMailpit(): Promise<void> {
    this.printSection("Verifying Emails in Mailpit");

    const mailpitApiUrl = testConfig.mailpitUrl.replace(":8025", ":8025");

    try {
      // Search for emails with our test run ID
      const searchQuery = encodeURIComponent(this.testRunId);
      const response = await fetch(
        `${mailpitApiUrl}/api/v1/search?query=${searchQuery}`
      );

      if (!response.ok) {
        this.printError(`Mailpit API returned ${response.status}`);
        return;
      }

      const data = await response.json();
      const messageCount = data.messages?.length || data.total || 0;

      this.printField("Test run ID", this.testRunId);
      this.printField("Emails sent", this.sentEmails.length);
      this.printField("Emails found in Mailpit", messageCount);

      if (messageCount >= this.sentEmails.length) {
        this.printSuccess("All emails found in Mailpit!");
      } else if (messageCount > 0) {
        console.log(
          `\n  Note: Only ${messageCount}/${this.sentEmails.length} emails found.`
        );
        console.log(
          "  Some emails may still be processing. Check Mailpit manually.\n"
        );
      } else {
        console.log(
          "\n  Note: No emails found yet. They may still be processing."
        );
        console.log("  Check Mailpit manually in a few seconds.\n");
      }

      // Show sample message details if available
      if (data.messages && data.messages.length > 0) {
        const sample = data.messages[0];
        console.log("\n  Sample email found:");
        this.printField("    Subject", sample.Subject || "N/A");
        this.printField("    To", sample.To?.[0]?.Address || "N/A");
        this.printField("    From", sample.From?.Address || "N/A");
      }
    } catch (error) {
      this.printError("Failed to query Mailpit API", error);
      console.log(`  Make sure Mailpit is running at ${mailpitApiUrl}\n`);
    }
  }

  /**
   * Custom setup that also creates the template.
   */
  protected async setup(): Promise<void> {
    this.printSection("Setting Up Test Infrastructure");

    const workspaceId = generateWorkspaceId();
    this.printField("Workspace ID", workspaceId);

    // Create template first
    this.template = await this.createAndPublishTemplate(workspaceId);

    // Then create domain and API key
    const domain = await createVerifiedDomain(workspaceId);
    this.printField("Domain", domain.name);
    this.printField("From Address", domain.fullFromAddress);

    const apiKey = await createApiKey(workspaceId);
    this.printField("API Key", apiKey.key);

    this.context = {
      workspaceId,
      apiKey,
      domain,
    };

    console.log("\n  Infrastructure ready.\n");
  }

  /**
   * Run the test.
   */
  protected async runTest(): Promise<void> {
    if (!this.context || !this.template) {
      throw new Error("Test context not initialized");
    }

    const { apiKey, domain } = this.context;

    // Send emails
    await this.sendEmails(apiKey, domain);

    // Give emails a moment to process
    console.log("\n  Waiting 2 seconds for emails to process...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify in Mailpit
    await this.verifyEmailsInMailpit();

    // Print results
    this.printResults();
  }

  /**
   * Print test results and useful commands.
   */
  private printResults(): void {
    if (!this.context || !this.template) return;

    const { domain, apiKey, workspaceId } = this.context;

    this.printSection("Test Results");

    console.log("  Generated Resources:");
    this.printField("  - Workspace ID", workspaceId);
    this.printField("  - Domain", domain.name);
    this.printField("  - API Key", apiKey.key);
    this.printField("  - Template slug", this.template.uniqueSlug);
    this.printField("  - Test run ID", this.testRunId);
    this.printField("  - Emails sent", this.sentEmails.length);

    this.printSection("Sample Sent Emails");
    const samples = this.sentEmails.slice(0, 3);
    for (const email of samples) {
      console.log(`  - ${email.recipient}`);
      console.log(`    ID: ${email.id}`);
      console.log(`    Code: ${email.confirmCode}`);
    }
    if (this.sentEmails.length > 3) {
      console.log(`  ... and ${this.sentEmails.length - 3} more`);
    }

    this.printInstructions([
      `Open Mailpit to view emails: ${testConfig.mailpitUrl}`,
      `Search for test run ID: ${this.testRunId}`,
      "Verify confirmation codes appear correctly in emails",
      "Check that variable substitution worked for firstName, confirmCode, etc.",
    ]);

    this.printSection("Useful Commands");
    console.log(`
  # Check Mailpit for emails
  curl "${testConfig.mailpitUrl}/api/v1/search?query=${this.testRunId}" | jq

  # View template in database
  psql "$DATABASE_URL" -c "SELECT id, name, unique_slug, published_version_id FROM email_templates WHERE unique_slug = '${this.template.uniqueSlug}'"

  # Open Mailpit UI
  open ${testConfig.mailpitUrl}
`);
  }

  /**
   * Clean up test data.
   */
  protected async cleanup(): Promise<void> {
    if (this.context) {
      this.printSection("Cleaning Up");

      // Clean up template-specific data
      if (this.template) {
        // Delete email templates (versions and parent)
        await prisma.emailTemplate.deleteMany({
          where: {
            OR: [{ id: this.template.id }, { parentId: this.template.id }],
          },
        });

        // Delete email content
        await prisma.emailContent
          .delete({
            where: { id: this.template.emailContentId },
          })
          .catch(() => {
            // Ignore if already deleted
          });
      }

      await cleanupWorkspace(this.context.workspaceId);
      console.log("  Test data cleaned up.\n");
    }
    await disconnect();
  }
}

/**
 * Parse command line arguments.
 */
function parseArgs(): { cleanup: boolean; count: number } {
  const args = process.argv.slice(2);
  let cleanup = false;
  let count = DEFAULT_EMAIL_COUNT;

  for (const arg of args) {
    if (arg === "--cleanup") {
      cleanup = true;
    } else if (arg.startsWith("--count=")) {
      count = parseInt(arg.split("=")[1], 10);
      if (isNaN(count) || count < 1) {
        console.error("Invalid --count value. Using default.");
        count = DEFAULT_EMAIL_COUNT;
      }
    }
  }

  return { cleanup, count };
}

/**
 * Print usage help.
 */
function printUsage(): void {
  console.log(`
Usage: pnpm manual-test:send-with-template [options]

Options:
  --count=N       Number of emails to send (default: 10)
  --cleanup       Remove test data after completion

Examples:
  pnpm manual-test:send-with-template              # Send 10 emails
  pnpm manual-test:send-with-template --count=5   # Send 5 emails
  pnpm manual-test:send-with-template --cleanup   # Clean up after test
`);
}

/**
 * Run the test.
 */
async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const { cleanup, count } = parseArgs();

  const test = new SendWithTemplateTest(count);
  await test.run({ cleanup });
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
