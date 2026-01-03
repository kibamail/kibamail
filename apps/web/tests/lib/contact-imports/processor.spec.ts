import * as fs from "node:fs";
import * as path from "node:path";
import type { ContactImport } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildContactData,
  type ColumnMapping,
  extractContactData,
  isStandardField,
  processBatch,
  processContactImport,
  STANDARD_FIELDS,
} from "@/lib/contact-imports";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import {
  cleanupWorkspace,
  createTestContacts,
  createTestTopics,
  createTestWorkspace,
  type TestWorkspace,
} from "@/tests/utils/workspace";

function loadTestCsv(filename: string): string {
  const filePath = path.join(process.cwd(), "tests/mocks/csv", filename);
  return fs.readFileSync(filePath, "utf-8");
}

async function createTestContactImport(
  workspaceId: string,
  overrides: Partial<{
    columnMapping: ColumnMapping;
    topicIds: string[];
    autoSubscribe: boolean;
    updateExisting: boolean;
    totalRows: number;
  }> = {},
): Promise<ContactImport> {
  return prisma.contactImport.create({
    data: {
      workspaceId,
      fileKey: "test/file.csv",
      fileName: "test.csv",
      fileSize: 1000,
      status: "PENDING",
      columnMapping: overrides.columnMapping ?? {},
      topicIds: overrides.topicIds ?? [],
      autoSubscribe: overrides.autoSubscribe ?? false,
      updateExisting: overrides.updateExisting ?? false,
      totalRows: overrides.totalRows ?? 0,
    },
  });
}

describe("isStandardField", () => {
  it("should return true for standard fields", () => {
    expect(isStandardField("email")).toBe(true);
    expect(isStandardField("firstName")).toBe(true);
    expect(isStandardField("lastName")).toBe(true);
    expect(isStandardField("phone")).toBe(true);
    expect(isStandardField("country")).toBe(true);
    expect(isStandardField("timezone")).toBe(true);
    expect(isStandardField("city")).toBe(true);
  });

  it("should return false for non-standard fields", () => {
    expect(isStandardField("company")).toBe(false);
    expect(isStandardField("customField")).toBe(false);
    expect(isStandardField("propertyString0")).toBe(false);
  });
});

describe("STANDARD_FIELDS", () => {
  it("should contain all standard contact fields", () => {
    expect(STANDARD_FIELDS).toContain("email");
    expect(STANDARD_FIELDS).toContain("firstName");
    expect(STANDARD_FIELDS).toContain("lastName");
    expect(STANDARD_FIELDS).toContain("phone");
    expect(STANDARD_FIELDS).toContain("country");
    expect(STANDARD_FIELDS).toContain("timezone");
    expect(STANDARD_FIELDS).toContain("city");
  });
});

describe("extractContactData", () => {
  const columnMapping: ColumnMapping = {
    email: "email",
    first_name: "firstName",
    last_name: "lastName",
  };

  it("should extract standard fields from row data", () => {
    const content = loadTestCsv("perfect.csv");
    const parsed = parseCsv(content);
    const row = parsed.rows[0];

    const result = extractContactData(row, columnMapping, []);

    expect(result.email).toBe("john@example.com");
    expect(result.standardFields.firstName).toBe("John");
    expect(result.standardFields.lastName).toBe("Doe");
    expect(result.errors).toHaveLength(0);
  });

  it("should report error for invalid email", () => {
    const content = loadTestCsv("invalid-emails.csv");
    const parsed = parseCsv(content);

    const invalidRow = parsed.rows.find((r) => r.data.email === "notanemail");

    const result = extractContactData(invalidRow!, { email: "email" }, []);

    expect(result.email).toBe(null);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Invalid email");
  });

  it("should handle empty values gracefully", () => {
    const mockRow = {
      index: 0,
      lineNumber: 1,
      values: ["", "", ""],
      data: { email: "", first_name: "", last_name: "" },
      isValid: true,
    };

    const result = extractContactData(mockRow, columnMapping, []);

    expect(result.email).toBe(null);
    expect(result.standardFields.firstName).toBeUndefined();
    expect(result.standardFields.lastName).toBeUndefined();
  });

  it("should normalize email to lowercase", () => {
    const mockRow = {
      index: 0,
      lineNumber: 1,
      values: ["TEST@EXAMPLE.COM", "John", "Doe"],
      data: { email: "TEST@EXAMPLE.COM", first_name: "John", last_name: "Doe" },
      isValid: true,
    };

    const result = extractContactData(mockRow, columnMapping, []);

    expect(result.email).toBe("test@example.com");
  });
});

describe("buildContactData", () => {
  it("should build contact data with standard fields", () => {
    const standardFields = {
      firstName: "John",
      lastName: "Doe",
      phone: "555-1234",
    };

    const result = buildContactData(
      standardFields,
      {},
      "workspace-123",
      "john@example.com",
      { autoSubscribe: false, sourceId: "import-123" },
    );

    expect(result.email).toBe("john@example.com");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.phone).toBe("555-1234");
    expect(result.workspaceId).toBe("workspace-123");
    expect(result.sourceType).toBe("IMPORT");
    expect(result.sourceId).toBe("import-123");
    expect(result.status).toBe("UNCONFIRMED");
  });

  it("should set SUBSCRIBED status when autoSubscribe is true", () => {
    const result = buildContactData(
      {},
      {},
      "workspace-123",
      "john@example.com",
      { autoSubscribe: true, sourceId: "import-123" },
    );

    expect(result.status).toBe("SUBSCRIBED");
    expect(result.subscribedAt).toBeDefined();
  });

  it("should add custom properties by slot", () => {
    const customProperties = {
      propertyString0: "Custom Value",
      propertyFloat0: "123.45",
    };

    const result = buildContactData(
      {},
      customProperties,
      "workspace-123",
      "john@example.com",
      { autoSubscribe: false, sourceId: "import-123" },
    );

    expect((result as Record<string, unknown>).propertyString0).toBe(
      "Custom Value",
    );
    expect((result as Record<string, unknown>).propertyFloat0).toBe(123.45);
  });

  it("should truncate long string properties to 255 chars", () => {
    const longValue = "x".repeat(300);
    const customProperties = {
      propertyString0: longValue,
    };

    const result = buildContactData(
      {},
      customProperties,
      "workspace-123",
      "john@example.com",
      { autoSubscribe: false, sourceId: "import-123" },
    );

    expect(
      ((result as Record<string, unknown>).propertyString0 as string).length,
    ).toBe(255);
  });

  it("should handle invalid numeric values gracefully", () => {
    const customProperties = {
      propertyFloat0: "not-a-number",
    };

    const result = buildContactData(
      {},
      customProperties,
      "workspace-123",
      "john@example.com",
      { autoSubscribe: false, sourceId: "import-123" },
    );

    expect((result as Record<string, unknown>).propertyFloat0).toBeUndefined();
  });
});

describe("processContactImport", () => {
  let testWorkspace: TestWorkspace;

  beforeAll(() => {
    testWorkspace = createTestWorkspace();
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

  describe("with perfect CSV", () => {
    it("should successfully import all contacts", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: {
          email: "email",
          first_name: "firstName",
          last_name: "lastName",
        },
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(5);
      expect(result.createdCount).toBe(5);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });
      expect(contacts.length).toBe(5);
    });

    it("should set correct source type and ID", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 5,
      });

      await processContactImport(contactImport, csvContent);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });

      for (const contact of contacts) {
        expect(contact.sourceType).toBe("IMPORT");
        expect(contact.sourceId).toBe(contactImport.id);
      }
    });

    it("should auto-subscribe contacts when autoSubscribe is true", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        autoSubscribe: true,
        totalRows: 5,
      });

      await processContactImport(contactImport, csvContent);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });

      for (const contact of contacts) {
        expect(contact.status).toBe("SUBSCRIBED");
        expect(contact.subscribedAt).not.toBeNull();
      }
    });

    it("should set UNCONFIRMED status when autoSubscribe is false", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        autoSubscribe: false,
        totalRows: 5,
      });

      await processContactImport(contactImport, csvContent);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });

      for (const contact of contacts) {
        expect(contact.status).toBe("UNCONFIRMED");
      }
    });
  });

  describe("with existing contacts", () => {
    beforeEach(async () => {
      await createTestContacts(testWorkspace.id, [
        { email: "john@example.com", firstName: "Existing", lastName: "John" },
        { email: "jane@example.com", firstName: "Existing", lastName: "Jane" },
      ]);
    });

    it("should skip existing contacts when updateExisting is false", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: {
          email: "email",
          first_name: "firstName",
          last_name: "lastName",
        },
        updateExisting: false,
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(3);
      expect(result.skippedCount).toBe(2);

      const john = await prisma.contact.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: "john@example.com",
        },
      });
      expect(john?.firstName).toBe("Existing");
    });

    it("should update existing contacts when updateExisting is true", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: {
          email: "email",
          first_name: "firstName",
          last_name: "lastName",
        },
        updateExisting: true,
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(3);
      expect(result.updatedCount).toBe(2);

      const john = await prisma.contact.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: "john@example.com",
        },
      });
      expect(john?.firstName).toBe("John");
    });
  });

  describe("with topics", () => {
    let topics: Awaited<ReturnType<typeof createTestTopics>>;

    beforeEach(async () => {
      topics = await createTestTopics(testWorkspace.id, [
        { name: "Newsletter" },
        { name: "Updates" },
      ]);
    });

    it("should subscribe new contacts to specified topics", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const topicIds = topics.map((t) => t.id);
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        topicIds,
        totalRows: 5,
      });

      await processContactImport(contactImport, csvContent);

      const subscriptions = await prisma.contactTopic.findMany({
        where: {
          contact: { workspaceId: testWorkspace.id },
        },
      });

      expect(subscriptions.length).toBe(10);
    });

    it("should fail with invalid topic IDs", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        topicIds: ["invalid-topic-id"],
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("Invalid topic IDs");
    });
  });

  describe("with malformed CSV", () => {
    it("should handle rows with invalid emails", async () => {
      const csvContent = loadTestCsv("invalid-emails.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email", first_name: "firstName" },
        totalRows: 10,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.createdCount).toBeGreaterThan(0);
      expect(result.failedCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should continue processing after row errors", async () => {
      const csvContent = loadTestCsv("malformed.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 8,
      });

      const result = await processContactImport(contactImport, csvContent, {
        continueOnError: true,
      });

      expect(result.processedRows).toBeGreaterThan(0);
    });
  });

  describe("with inconsistent data", () => {
    it("should handle duplicate emails in the same import", async () => {
      const csvContent = loadTestCsv("inconsistent.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email", first_name: "firstName" },
        totalRows: 10,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.skippedCount).toBeGreaterThan(0);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });
      const emails = contacts.map((c) => c.email);
      const uniqueEmails = [...new Set(emails)];
      expect(emails.length).toBe(uniqueEmails.length);
    });

    it("should normalize email case", async () => {
      const csvContent = loadTestCsv("inconsistent.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 10,
      });

      await processContactImport(contactImport, csvContent);

      const contacts = await prisma.contact.findMany({
        where: { workspaceId: testWorkspace.id },
      });

      for (const contact of contacts) {
        expect(contact.email).toBe(contact.email.toLowerCase());
      }
    });
  });

  describe("with special characters", () => {
    it("should handle Unicode characters in names", async () => {
      const csvContent = loadTestCsv("special-chars.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: {
          email: "email",
          first_name: "firstName",
          last_name: "lastName",
        },
        totalRows: 7,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);

      const jose = await prisma.contact.findFirst({
        where: {
          workspaceId: testWorkspace.id,
          email: "unicode@example.com",
        },
      });
      expect(jose?.firstName).toBe("José");
      expect(jose?.lastName).toBe("García");
    });

    it("should handle emojis", async () => {
      const csvContent = loadTestCsv("special-chars.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 7,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBeGreaterThan(0);
    });
  });

  describe("with empty CSV", () => {
    it("should handle empty file gracefully", async () => {
      const csvContent = loadTestCsv("empty.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 0,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("empty");
    });
  });

  describe("with headers only", () => {
    it("should handle CSV with only headers", async () => {
      const csvContent = loadTestCsv("headers-only.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 0,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.totalRows).toBe(0);
      expect(result.createdCount).toBe(0);
    });
  });

  describe("with no column mapping", () => {
    it("should fail when no column mapping is provided", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: {},
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("No column mapping");
    });

    it("should fail when no email column is mapped", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { first_name: "firstName" },
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("No email column mapped");
    });
  });

  describe("with batch processing", () => {
    it("should process in batches and call progress callback", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 5,
      });

      const progressCalls: Array<{ processed: number; total: number }> = [];

      await processContactImport(contactImport, csvContent, {
        batchSize: 2,
        onProgress: (processed, total) => {
          progressCalls.push({ processed, total });
        },
      });

      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it("should handle large batch sizes", async () => {
      const csvContent = loadTestCsv("perfect.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email" },
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent, {
        batchSize: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(5);
    });
  });

  describe("with quoted fields CSV", () => {
    it("should correctly parse fields with commas inside quotes", async () => {
      const csvContent = loadTestCsv("quoted-fields.csv");
      const contactImport = await createTestContactImport(testWorkspace.id, {
        columnMapping: { email: "email", first_name: "firstName" },
        totalRows: 5,
      });

      const result = await processContactImport(contactImport, csvContent);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(5);
    });
  });
});

describe("standard field normalization", () => {
  let testWorkspace: TestWorkspace;

  beforeAll(() => {
    testWorkspace = createTestWorkspace();
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

  it("should normalize phone numbers to E.164 format", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        last_name: "lastName",
        phone: "phone",
        country: "country",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const valid1 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid1@example.com" },
    });
    expect(valid1?.phone).toBe("+14155552671");

    const valid2 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid2@example.com" },
    });
    expect(valid2?.phone).toBe("+14155551234");

    const valid3 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid3@example.com" },
    });
    expect(valid3?.phone).toBe("+442079460958");
  });

  it("should skip invalid phone numbers but still import the contact", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        phone: "phone",
        country: "country",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const invalidPhone = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "invalid-phone@example.com",
      },
    });
    expect(invalidPhone).not.toBeNull();
    expect(invalidPhone?.firstName).toBe("Tom");
    expect(invalidPhone?.phone).toBeNull();
  });

  it("should normalize country names to ISO alpha-2 codes", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        country: "country",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const valid1 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid1@example.com" },
    });
    expect(valid1?.country).toBe("US");

    const valid3 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid3@example.com" },
    });
    expect(valid3?.country).toBe("GB");

    const valid4 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid4@example.com" },
    });
    expect(valid4?.country).toBe("DE");

    const valid5 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid5@example.com" },
    });
    expect(valid5?.country).toBe("ES");

    const mixedCase = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "mixed-case@example.com" },
    });
    expect(mixedCase?.country).toBe("DE");
  });

  it("should skip invalid country values but still import the contact", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        country: "country",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const invalidCountry = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "invalid-country@example.com",
      },
    });
    expect(invalidCountry).not.toBeNull();
    expect(invalidCountry?.firstName).toBe("Sarah");
    expect(invalidCountry?.country).toBeNull();
  });

  it("should normalize timezone values to IANA format", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        timezone: "timezone",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const valid1 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid1@example.com" },
    });
    expect(valid1?.timezone).toBe("America/New_York");

    const valid2 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid2@example.com" },
    });
    expect(valid2?.timezone).toBe("America/New_York");

    const mixedCase = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "mixed-case@example.com" },
    });
    expect(mixedCase?.timezone).toBe("America/Los_Angeles");
  });

  it("should skip invalid timezone values but still import the contact", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        timezone: "timezone",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const invalidTimezone = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "invalid-timezone@example.com",
      },
    });
    expect(invalidTimezone).not.toBeNull();
    expect(invalidTimezone?.firstName).toBe("Mike");
    expect(invalidTimezone?.timezone).toBeNull();
  });

  it("should normalize city values to title case", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        city: "city",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const valid2 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid2@example.com" },
    });
    expect(valid2?.city).toBe("San Francisco");

    const valid3 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid3@example.com" },
    });
    expect(valid3?.city).toBe("London");

    const mixedCase = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "mixed-case@example.com" },
    });
    expect(mixedCase?.city).toBe("München");
  });

  it("should skip numeric-only city values but still import the contact", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        city: "city",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const invalidCity = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "invalid-city-numbers@example.com",
      },
    });
    expect(invalidCity).not.toBeNull();
    expect(invalidCity?.firstName).toBe("Lisa");
    expect(invalidCity?.city).toBeNull();
  });

  it("should use country hint for phone number parsing", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        phone: "phone",
        country: "country",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const valid2 = await prisma.contact.findFirst({
      where: { workspaceId: testWorkspace.id, email: "valid2@example.com" },
    });
    expect(valid2?.phone).toBe("+14155551234");
    expect(valid2?.country).toBe("US");
  });

  it("should import all 13 contacts even with invalid field values", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        last_name: "lastName",
        phone: "phone",
        country: "country",
        timezone: "timezone",
        city: "city",
      },
      totalRows: 13,
    });

    const result = await processContactImport(contactImport, csvContent);

    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(13);
    expect(result.failedCount).toBe(0);

    const contacts = await prisma.contact.findMany({
      where: { workspaceId: testWorkspace.id },
    });
    expect(contacts.length).toBe(13);
  });

  it("should handle contacts with all invalid optional fields", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        first_name: "firstName",
        phone: "phone",
        country: "country",
        timezone: "timezone",
        city: "city",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const allInvalid = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "all-invalid@example.com",
      },
    });
    expect(allInvalid).not.toBeNull();
    expect(allInvalid?.firstName).toBe("Empty");
    expect(allInvalid?.phone).toBeNull();
    expect(allInvalid?.country).toBeNull();
    expect(allInvalid?.timezone).toBeNull();
    expect(allInvalid?.city).toBeNull();
  });

  it("should trim whitespace from field values before normalizing", async () => {
    const csvContent = loadTestCsv("standard-fields-mixed.csv");
    const contactImport = await createTestContactImport(testWorkspace.id, {
      columnMapping: {
        email: "email",
        country: "country",
        city: "city",
      },
      totalRows: 13,
    });

    await processContactImport(contactImport, csvContent);

    const validWithSpaces = await prisma.contact.findFirst({
      where: {
        workspaceId: testWorkspace.id,
        email: "valid-with-spaces@example.com",
      },
    });
    expect(validWithSpaces?.country).toBe("FR");
    expect(validWithSpaces?.city).toBe("Paris");
  });
});

describe("processBatch", () => {
  let testWorkspace: TestWorkspace;

  beforeAll(() => {
    testWorkspace = createTestWorkspace();
  });

  afterAll(async () => {
    await cleanupWorkspace(testWorkspace.id);
  });

  beforeEach(async () => {
    await prisma.contact.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
  });

  it("should process a batch of rows", async () => {
    const csvContent = loadTestCsv("perfect.csv");
    const parsed = parseCsv(csvContent);

    const columnMapping: ColumnMapping = {
      email: "email",
      first_name: "firstName",
    };

    const results = await processBatch(
      parsed.rows.slice(0, 2),
      testWorkspace.id,
      columnMapping,
      [],
      {
        autoSubscribe: false,
        updateExisting: false,
        topicIds: [],
        sourceId: "test-import",
      },
    );

    expect(results.length).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("should handle duplicate emails in batch", async () => {
    const mockRows = [
      {
        index: 0,
        lineNumber: 2,
        values: ["test@example.com", "First"],
        data: { email: "test@example.com", first_name: "First" },
        isValid: true,
      },
      {
        index: 1,
        lineNumber: 3,
        values: ["test@example.com", "Second"],
        data: { email: "test@example.com", first_name: "Second" },
        isValid: true,
      },
    ];

    const columnMapping: ColumnMapping = { email: "email" };

    const results = await processBatch(
      mockRows,
      testWorkspace.id,
      columnMapping,
      [],
      {
        autoSubscribe: false,
        updateExisting: false,
        topicIds: [],
        sourceId: "test-import",
      },
    );

    const created = results.filter((r) => r.action === "created");
    const skipped = results.filter((r) => r.action === "skipped");

    expect(created.length).toBe(1);
    expect(skipped.length).toBe(1);
  });
});
