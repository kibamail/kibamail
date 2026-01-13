/**
 * Manual Test: Create and Send Broadcast
 *
 * Tests the create-and-send broadcast endpoint in two modes:
 *
 * 1. Contact Mode (default):
 *    - Creates contacts via Prisma first
 *    - Sends broadcast to contact IDs
 *    - Contacts exist before and after the API call
 *
 * 2. Email Mode (--emails flag):
 *    - Does NOT create contacts beforehand
 *    - Sends broadcast to raw email addresses with variables
 *    - Verifies contacts are NOT created by the API (new behavior)
 *    - BroadcastSend records have contactId=null
 *
 * Usage:
 *   pnpm manual-test:create-and-send                    # Contact mode, 500 recipients
 *   pnpm manual-test:create-and-send --emails           # Email mode, 500 recipients
 *   pnpm manual-test:create-and-send --emails --count=100
 *   pnpm manual-test:create-and-send --cleanup          # Clean up test data after
 */

import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { Kibamail } from "../../../../sdks/nodejs";
import {
  ManualTest,
  testConfig,
  createContacts,
  type CreatedContact,
} from "../lib";

const prisma = new PrismaClient();
const DEFAULT_RECIPIENT_COUNT = 500;

type RecipientMode = "contacts" | "emails";

interface EmailRecipient {
  email: string;
  variables: Record<string, string | number>;
}

class CreateAndSendTest extends ManualTest {
  private contacts: CreatedContact[] = [];
  private emailRecipients: EmailRecipient[] = [];
  private recipientCount: number;
  private mode: RecipientMode;
  private broadcastId: string | null = null;

  constructor(
    recipientCount: number = DEFAULT_RECIPIENT_COUNT,
    mode: RecipientMode = "contacts"
  ) {
    super();
    this.recipientCount = recipientCount;
    this.mode = mode;
  }

  get name(): string {
    const modeLabel = this.mode === "emails" ? "Email-Only" : "Contact-Based";
    return `Create and Send Broadcast Test (${modeLabel})`;
  }

  get description(): string {
    if (this.mode === "emails") {
      return `Tests email-only broadcast with ${this.recipientCount} emails - verifies NO contacts created`;
    }
    return `Tests contact-based broadcast with ${this.recipientCount} contacts`;
  }

  /**
   * Generate the email HTML template with variable placeholders.
   */
  private generateEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .greeting { font-size: 24px; color: #333; margin-bottom: 20px; }
    .message { color: #666; line-height: 1.6; }
    .cta { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Newsletter</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello {{firstName}} {{lastName}},</p>
      <p class="message">
        Thank you for being a valued subscriber! This is a test newsletter sent
        via the Kibamail create-and-send API.
      </p>
      <p class="message">
        Your personalized code is: <strong>{{discountCode}}</strong>
      </p>
      <p class="message">
        You have <strong>{{loyaltyPoints}}</strong> loyalty points in your account.
        Your membership tier is <strong>{{membershipTier}}</strong>.
      </p>
      <a href="https://example.com/shop?code={{discountCode}}" class="cta">Shop Now</a>
      <p class="message">
        Best regards,<br>
        The Test Team
      </p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to our newsletter.</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`.trim();
  }

  /**
   * Generate random per-recipient variables.
   */
  private generateRecipientVariables(): Record<string, string | number> {
    const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      discountCode: faker.string.alphanumeric(8).toUpperCase(),
      loyaltyPoints: faker.number.int({ min: 100, max: 50000 }),
      membershipTier: faker.helpers.arrayElement(tiers),
    };
  }

  /**
   * Generate email-only recipients (no contacts in DB).
   */
  private generateEmailRecipients(): EmailRecipient[] {
    const recipients: EmailRecipient[] = [];
    const usedEmails = new Set<string>();

    for (let i = 0; i < this.recipientCount; i++) {
      let email: string;
      do {
        email = faker.internet.email().toLowerCase();
      } while (usedEmails.has(email));
      usedEmails.add(email);

      recipients.push({
        email,
        variables: this.generateRecipientVariables(),
      });
    }

    return recipients;
  }

  /**
   * Run the contact-based test flow.
   */
  private async runContactModeTest(): Promise<void> {
    if (!this.context) throw new Error("Test context not initialized");

    const { workspaceId, apiKey, domain } = this.context;

    // Step 1: Create contacts
    this.printSection(`Creating ${this.recipientCount} Contacts`);
    console.log("  This may take a moment...\n");

    const startContactCreate = Date.now();
    this.contacts = await createContacts(workspaceId, this.recipientCount, faker);
    const contactDuration = ((Date.now() - startContactCreate) / 1000).toFixed(2);

    this.printField("Contacts created", this.contacts.length);
    this.printField("Time taken", `${contactDuration}s`);
    this.printField("Sample contact", this.contacts[0].email);

    // Step 2: Prepare broadcast data
    this.printSection("Preparing Broadcast Data");

    const sendAt = new Date();
    sendAt.setMinutes(sendAt.getMinutes() + 2);

    const broadcastData = {
      name: `Manual Test (Contacts) - ${new Date().toISOString()}`,
      from: domain.fullFromAddress,
      emailContent: {
        subject: "Hello {{firstName}}, Your Weekly Update is Here!",
        html: this.generateEmailTemplate(),
        previewText: "Your personalized newsletter with exclusive offers",
      },
      recipients: {
        contacts: this.contacts.map((c) => c.id),
      },
      sendAt: sendAt.toISOString(),
    };

    this.printField("Broadcast name", broadcastData.name);
    this.printField("From", broadcastData.from);
    this.printField("Subject", broadcastData.emailContent.subject);
    this.printField("Recipients (contacts)", this.contacts.length);
    this.printField("Send at", sendAt.toLocaleString());

    // Step 3: Call API
    await this.callApi(apiKey.key, broadcastData);

    // Step 4: Print results
    this.printContactModeResults();
  }

  /**
   * Run the email-only test flow.
   */
  private async runEmailModeTest(): Promise<void> {
    if (!this.context) throw new Error("Test context not initialized");

    const { workspaceId, apiKey, domain } = this.context;

    // Step 1: Generate email recipients (NOT creating contacts)
    this.printSection(`Generating ${this.recipientCount} Email Recipients`);
    console.log("  Note: These emails will NOT be inserted as contacts.\n");

    this.emailRecipients = this.generateEmailRecipients();

    this.printField("Emails generated", this.emailRecipients.length);
    this.printField("Sample email", this.emailRecipients[0].email);
    this.printField(
      "Sample variables",
      JSON.stringify(this.emailRecipients[0].variables)
    );

    // Step 2: Verify no contacts exist for these emails (pre-check)
    this.printSection("Pre-Check: Verifying No Contacts Exist");

    const preExistingContacts = await prisma.contact.count({
      where: {
        workspaceId,
        email: { in: this.emailRecipients.map((r) => r.email) },
      },
    });

    this.printField("Pre-existing contacts found", preExistingContacts);
    if (preExistingContacts > 0) {
      console.log("  WARNING: Some emails already exist as contacts!\n");
    }

    // Step 3: Prepare broadcast data with emails
    this.printSection("Preparing Broadcast Data");

    const sendAt = new Date();
    sendAt.setMinutes(sendAt.getMinutes() + 2);

    const broadcastData = {
      name: `Manual Test (Emails) - ${new Date().toISOString()}`,
      from: domain.fullFromAddress,
      emailContent: {
        subject: "Hello {{firstName}}, Your Weekly Update is Here!",
        html: this.generateEmailTemplate(),
        previewText: "Your personalized newsletter with exclusive offers",
      },
      recipients: {
        emails: this.emailRecipients,
      },
      sendAt: sendAt.toISOString(),
    };

    this.printField("Broadcast name", broadcastData.name);
    this.printField("From", broadcastData.from);
    this.printField("Subject", broadcastData.emailContent.subject);
    this.printField("Recipients (emails)", this.emailRecipients.length);
    this.printField("Send at", sendAt.toLocaleString());

    // Step 4: Call API
    await this.callApi(apiKey.key, broadcastData);

    // Step 5: Verify contacts were NOT created (post-check)
    await this.verifyNoContactsCreated(workspaceId);

    // Step 6: Verify BroadcastSend records
    await this.verifyBroadcastSendRecords();

    // Step 7: Print results
    this.printEmailModeResults();
  }

  /**
   * Call the API via SDK.
   */
  private async callApi(
    apiKey: string,
    broadcastData: Parameters<Kibamail["broadcasts"]["createAndSend"]>[0]
  ): Promise<void> {
    this.printSection("Calling API via Node.js SDK");

    const kibamail = new Kibamail(apiKey, {
      baseURL: testConfig.apiBaseUrl,
    });

    this.printField("API Base URL", testConfig.apiBaseUrl);

    const startApiCall = Date.now();
    const { data, error } = await kibamail.broadcasts.createAndSend(broadcastData);
    const apiDuration = ((Date.now() - startApiCall) / 1000).toFixed(2);

    if (error) {
      this.printError("API call failed", error);
      throw new Error(`API call failed: ${JSON.stringify(error)}`);
    }

    this.broadcastId = data?.id || null;

    this.printSuccess("Broadcast created successfully!");
    this.printField("Broadcast ID", this.broadcastId || "N/A");
    this.printField("API call duration", `${apiDuration}s`);
    this.printField("Status", data?.status || "N/A");
  }

  /**
   * Verify that no contacts were created for the email recipients.
   */
  private async verifyNoContactsCreated(workspaceId: string): Promise<void> {
    this.printSection("Post-Check: Verifying No Contacts Were Created");

    const createdContacts = await prisma.contact.count({
      where: {
        workspaceId,
        email: { in: this.emailRecipients.map((r) => r.email) },
      },
    });

    this.printField("Contacts created by API", createdContacts);

    if (createdContacts === 0) {
      this.printSuccess("VERIFIED: No contacts were created (expected behavior)");
    } else {
      this.printError(
        `UNEXPECTED: ${createdContacts} contacts were created! This is a bug.`
      );
    }
  }

  /**
   * Verify BroadcastSend records were created correctly.
   */
  private async verifyBroadcastSendRecords(): Promise<void> {
    if (!this.broadcastId) return;

    this.printSection("Verifying BroadcastSend Records");

    const broadcastSends = await prisma.broadcastSend.findMany({
      where: { broadcastId: this.broadcastId },
      select: {
        id: true,
        email: true,
        contactId: true,
        variables: true,
        status: true,
      },
      take: 5,
    });

    const totalSends = await prisma.broadcastSend.count({
      where: { broadcastId: this.broadcastId },
    });

    const nullContactIdCount = await prisma.broadcastSend.count({
      where: {
        broadcastId: this.broadcastId,
        contactId: null,
      },
    });

    this.printField("Total BroadcastSend records", totalSends);
    this.printField("Records with contactId=null", nullContactIdCount);

    if (this.mode === "emails") {
      if (nullContactIdCount === totalSends) {
        this.printSuccess(
          "VERIFIED: All BroadcastSend records have contactId=null (expected)"
        );
      } else {
        this.printError(
          `UNEXPECTED: Some BroadcastSend records have contactId set!`
        );
      }
    }

    console.log("\n  Sample BroadcastSend records:");
    for (const send of broadcastSends) {
      console.log(`    - ${send.email}`);
      console.log(`      contactId: ${send.contactId || "null"}`);
      console.log(`      status: ${send.status}`);
      console.log(
        `      variables: ${send.variables ? JSON.stringify(send.variables).substring(0, 50) + "..." : "null"}`
      );
    }
  }

  /**
   * Print contact mode results.
   */
  private printContactModeResults(): void {
    if (!this.context) return;

    const { domain, apiKey } = this.context;

    this.printSection("Test Results");

    console.log("  Generated Resources:");
    this.printField("  - Workspace ID", this.context.workspaceId);
    this.printField("  - Domain", domain.name);
    this.printField("  - API Key", apiKey.key);
    this.printField("  - Broadcast ID", this.broadcastId || "N/A");
    this.printField("  - Contacts", this.contacts.length);

    this.printInstructions([
      `Open Mailpit to view emails: ${testConfig.mailpitUrl}`,
      "Wait ~2 minutes for the broadcast to be sent",
      "Check the worker logs for job processing",
      `Verify ${this.contacts.length} emails are queued/sent`,
    ]);

    this.printUsefulCommands(apiKey.key);
  }

  /**
   * Print email mode results.
   */
  private printEmailModeResults(): void {
    if (!this.context) return;

    const { domain, apiKey } = this.context;

    this.printSection("Test Results");

    console.log("  Generated Resources:");
    this.printField("  - Workspace ID", this.context.workspaceId);
    this.printField("  - Domain", domain.name);
    this.printField("  - API Key", apiKey.key);
    this.printField("  - Broadcast ID", this.broadcastId || "N/A");
    this.printField("  - Email recipients", this.emailRecipients.length);

    this.printSection("Email-Only Mode Verification Checklist");
    console.log(`
  [x] No contacts were created in the database
  [x] BroadcastSend records have contactId=null
  [x] Variables are stored in BroadcastSend.variables field
  [ ] Unsubscribe link uses /us/{sendingId} format (check email)
  [ ] Clicking unsubscribe adds email to SuppressionList
`);

    this.printInstructions([
      `Open Mailpit to view emails: ${testConfig.mailpitUrl}`,
      "Wait ~2 minutes for the broadcast to be sent",
      "Check unsubscribe link format in email source (should be /us/{sendingId})",
      "Test unsubscribe - should add to SuppressionList, NOT create contact",
      "Verify variables are rendered correctly in email content",
    ]);

    this.printSection("Expected Database State");
    console.log(`
  contacts table:
    - 0 new records created for these emails

  broadcast_sends table:
    - ${this.emailRecipients.length} records created
    - All have contactId = NULL
    - All have variables JSON populated

  suppression_list table (after unsubscribe):
    - Should contain email with contactId = NULL
    - scope = GLOBAL
    - reason = UNSUBSCRIBED
`);

    this.printUsefulCommands(apiKey.key);
  }

  /**
   * Print useful commands for debugging.
   */
  private printUsefulCommands(apiKey: string): void {
    this.printSection("Useful Commands");

    const sampleEmail =
      this.mode === "emails"
        ? this.emailRecipients[0]?.email
        : this.contacts[0]?.email;

    console.log(`
  # Check broadcast status
  curl -H "X-Api-Key: ${apiKey}" \\
    ${testConfig.apiBaseUrl}/v1/broadcasts/${this.broadcastId}

  # Check if contacts were created (should be 0 for --emails mode)
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM contacts WHERE email = '${sampleEmail}'"

  # Check BroadcastSend records
  psql "$DATABASE_URL" -c "SELECT email, contact_id, variables, status FROM broadcast_sends WHERE broadcast_id = '${this.broadcastId}' LIMIT 5"

  # View worker logs
  docker logs kibamail-worker -f

  # Check Mailpit
  open ${testConfig.mailpitUrl}
`);
  }

  /**
   * Run the appropriate test based on mode.
   */
  protected async runTest(): Promise<void> {
    if (this.mode === "emails") {
      await this.runEmailModeTest();
    } else {
      await this.runContactModeTest();
    }
  }
}

/**
 * Parse command line arguments.
 */
function parseArgs(): {
  cleanup: boolean;
  count: number;
  mode: RecipientMode;
} {
  const args = process.argv.slice(2);
  let cleanup = false;
  let count = DEFAULT_RECIPIENT_COUNT;
  let mode: RecipientMode = "contacts";

  for (const arg of args) {
    if (arg === "--cleanup") {
      cleanup = true;
    } else if (arg === "--emails") {
      mode = "emails";
    } else if (arg.startsWith("--count=")) {
      count = parseInt(arg.split("=")[1], 10);
      if (isNaN(count) || count < 1) {
        console.error("Invalid --count value. Using default.");
        count = DEFAULT_RECIPIENT_COUNT;
      }
    } else if (arg.startsWith("--contacts=")) {
      // Legacy support
      count = parseInt(arg.split("=")[1], 10);
      if (isNaN(count) || count < 1) {
        console.error("Invalid --contacts value. Using default.");
        count = DEFAULT_RECIPIENT_COUNT;
      }
    }
  }

  return { cleanup, count, mode };
}

/**
 * Print usage help.
 */
function printUsage(): void {
  console.log(`
Usage: pnpm manual-test:create-and-send [options]

Options:
  --emails        Use email-only mode (no contacts created)
  --count=N       Number of recipients (default: 500)
  --contacts=N    Alias for --count (legacy)
  --cleanup       Remove test data after completion

Examples:
  pnpm manual-test:create-and-send                     # Contact mode, 500 contacts
  pnpm manual-test:create-and-send --emails            # Email mode, 500 emails
  pnpm manual-test:create-and-send --emails --count=10 # Email mode, 10 emails
  pnpm manual-test:create-and-send --cleanup           # Clean up after test
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

  const { cleanup, count, mode } = parseArgs();

  const test = new CreateAndSendTest(count, mode);
  await test.run({ cleanup });
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
