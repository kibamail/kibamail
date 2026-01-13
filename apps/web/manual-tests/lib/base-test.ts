/**
 * Base Manual Test Class
 *
 * Provides common functionality for all manual tests including:
 * - Workspace and API key management
 * - Domain creation
 * - Console output formatting
 * - Cleanup utilities
 */

import { testConfig } from "./config";
import {
  createApiKey,
  createVerifiedDomain,
  generateWorkspaceId,
  cleanupWorkspace,
  disconnect,
  type CreatedApiKey,
  type CreatedDomain,
} from "./database";

export interface TestContext {
  workspaceId: string;
  apiKey: CreatedApiKey;
  domain: CreatedDomain;
}

/**
 * Base class for manual tests.
 *
 * Extend this class to create specific test scenarios. The base class
 * handles setup and teardown of test infrastructure.
 */
export abstract class ManualTest {
  protected context: TestContext | null = null;
  protected startTime: number = 0;

  /**
   * Display name for the test.
   */
  abstract get name(): string;

  /**
   * Brief description of what the test does.
   */
  abstract get description(): string;

  /**
   * Run the actual test logic.
   */
  protected abstract runTest(): Promise<void>;

  /**
   * Print the test header.
   */
  protected printHeader(): void {
    const separator = "=".repeat(60);
    console.log(`\n${separator}`);
    console.log(`  ${this.name.toUpperCase()}`);
    console.log(`  ${this.description}`);
    console.log(`${separator}\n`);
  }

  /**
   * Print a section header.
   */
  protected printSection(title: string): void {
    console.log(`\n--- ${title} ---\n`);
  }

  /**
   * Print a key-value pair.
   */
  protected printField(label: string, value: string | number): void {
    console.log(`  ${label}: ${value}`);
  }

  /**
   * Print a success message.
   */
  protected printSuccess(message: string): void {
    console.log(`\n  [SUCCESS] ${message}\n`);
  }

  /**
   * Print an error message.
   */
  protected printError(message: string, error?: unknown): void {
    console.error(`\n  [ERROR] ${message}`);
    if (error) {
      console.error(`  Details: ${JSON.stringify(error, null, 2)}`);
    }
    console.log("");
  }

  /**
   * Print instructions for manual verification.
   */
  protected printInstructions(instructions: string[]): void {
    this.printSection("Manual Verification Steps");
    instructions.forEach((instruction, index) => {
      console.log(`  ${index + 1}. ${instruction}`);
    });
    console.log("");
  }

  /**
   * Set up test infrastructure.
   */
  protected async setup(): Promise<void> {
    this.printSection("Setting Up Test Infrastructure");

    const workspaceId = generateWorkspaceId();
    this.printField("Workspace ID", workspaceId);

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
   * Clean up test infrastructure.
   */
  protected async cleanup(): Promise<void> {
    if (this.context) {
      this.printSection("Cleaning Up");
      await cleanupWorkspace(this.context.workspaceId);
      console.log("  Test data cleaned up.\n");
    }
    await disconnect();
  }

  /**
   * Print test summary with timing.
   */
  protected printSummary(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.printSection("Test Summary");
    this.printField("Duration", `${duration}s`);
    this.printField("API Base URL", testConfig.apiBaseUrl);
    this.printField("Mailpit URL", testConfig.mailpitUrl);
  }

  /**
   * Execute the test.
   */
  async run(options: { cleanup?: boolean } = {}): Promise<void> {
    const { cleanup = false } = options;

    this.startTime = Date.now();

    try {
      this.printHeader();
      await this.setup();
      await this.runTest();
      this.printSummary();
    } catch (error) {
      this.printError("Test failed", error);
      throw error;
    } finally {
      if (cleanup) {
        await this.cleanup();
      } else {
        console.log("\n  Note: Run with --cleanup flag to remove test data.\n");
        await disconnect();
      }
    }
  }
}
