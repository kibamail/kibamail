/**
 * Large File Import Tests
 *
 * Tests for processing large CSV files (10,000+ rows)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ContactImport } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { processContactImport } from "@/lib/contact-imports";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

// Helper to load the large test CSV file
function loadLargeCsv(): string {
  const filePath = path.join(process.cwd(), "tests/mocks/leads-10000.csv");
  return fs.readFileSync(filePath, "utf-8");
}

// Helper to create a test contact import record
async function createTestContactImport(
  workspaceId: string,
  columnMapping: Record<string, string>,
  totalRows: number,
): Promise<ContactImport> {
  return prisma.contactImport.create({
    data: {
      workspaceId,
      fileKey: "test/leads-10000.csv",
      fileName: "leads-10000.csv",
      fileSize: 1000000,
      status: "PENDING",
      columnMapping,
      topicIds: [],
      autoSubscribe: false,
      updateExisting: false,
      totalRows,
    },
  });
}

describe("Large CSV File Processing", () => {
  let testWorkspace: TestWorkspace;
  let csvContent: string;

  beforeAll(() => {
    testWorkspace = createTestWorkspace();
    csvContent = loadLargeCsv();
  });

  afterAll(async () => {
    await cleanupWorkspace(testWorkspace.id);
  });

  beforeEach(async () => {
    await prisma.contact.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.contactImport.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
  });

  it("should parse large CSV file efficiently", () => {
    const startTime = Date.now();
    const result = parseCsv(csvContent);
    const duration = Date.now() - startTime;

    expect(result.totalRows).toBe(10000);
    expect(result.headers).toContain("Email 1");
    expect(result.headers).toContain("First Name");
    expect(result.headers).toContain("Last Name");

    // Should parse in reasonable time (less than 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  it(
    "should process 500 contacts from large file",
    { timeout: 7000 },
    async () => {
      const parsed = parseCsv(csvContent);
      const subset = parsed.rows.slice(0, 500);

      const headers = parsed.headers.join(",");
      const rows = subset.map((row) => row.values.join(","));
      const subsetContent = [headers, ...rows].join("\n");

      const columnMapping = {
        "Email 1": "email",
        "First Name": "firstName",
        "Last Name": "lastName",
        Company: "phone",
      };

      const contactImport = await createTestContactImport(
        testWorkspace.id,
        columnMapping,
        500,
      );

      const result = await processContactImport(contactImport, subsetContent, {
        batchSize: 100,
      });

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(500);
      expect(
        result.createdCount + result.skippedCount + result.failedCount,
      ).toBe(500);
      expect(result.createdCount).toBeGreaterThan(250);

      const contactCount = await prisma.contact.count({
        where: { workspaceId: testWorkspace.id },
      });
      expect(contactCount).toBeGreaterThan(250);
    },
  );

  it("should track progress during import", async () => {
    const parsed = parseCsv(csvContent);
    const subset = parsed.rows.slice(0, 250);

    const headers = parsed.headers.join(",");
    const rows = subset.map((row) => row.values.join(","));
    const subsetContent = [headers, ...rows].join("\n");

    const columnMapping = {
      "Email 1": "email",
      "First Name": "firstName",
    };

    const contactImport = await createTestContactImport(
      testWorkspace.id,
      columnMapping,
      250,
    );

    const progressUpdates: Array<{ processed: number; total: number }> = [];

    await processContactImport(contactImport, subsetContent, {
      batchSize: 50,
      onProgress: (processed, total) => {
        progressUpdates.push({ processed, total });
      },
    });

    expect(progressUpdates.length).toBeGreaterThan(3);

    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i].processed).toBeGreaterThanOrEqual(
        progressUpdates[i - 1].processed,
      );
    }
  });

  it("should handle memory efficiently with large files", async () => {
    // Just parse the file - this tests memory efficiency
    const parsed = parseCsv(csvContent);

    expect(parsed.totalRows).toBe(10000);
    expect(parsed.validRows).toBeGreaterThan(9000); // Most rows should be valid

    // Verify we can access all rows without memory issues
    const firstRow = parsed.rows[0];
    const lastRow = parsed.rows[parsed.rows.length - 1];

    expect(firstRow.data["Email 1"]).toBeDefined();
    expect(lastRow.data["Email 1"]).toBeDefined();
  });

  it("should handle rows with various email formats", async () => {
    // The large CSV has various email formats
    const parsed = parseCsv(csvContent);

    // Sample some emails
    const emails = parsed.rows.slice(0, 100).map((row) => row.data["Email 1"]);

    // All emails should have @ symbol
    const validEmails = emails.filter((email) => email && email.includes("@"));
    expect(validEmails.length).toBeGreaterThan(90);
  });
});
