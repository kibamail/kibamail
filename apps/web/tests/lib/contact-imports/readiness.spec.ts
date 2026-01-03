import type { ContactImport } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  checkImportReadiness,
  ImportReadinessChecker,
} from "@/lib/contact-imports";

function createMockImport(
  overrides: Partial<ContactImport> = {},
): ContactImport {
  return {
    id: "test-import-id",
    workspaceId: "test-workspace-id",
    fileKey: "test/file.csv",
    fileName: "file.csv",
    fileSize: 1000,
    status: "PENDING",
    columnMapping: null,
    topicIds: [],
    autoSubscribe: false,
    updateExisting: false,
    totalRows: 0,
    processedRows: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errorMessage: null,
    errors: [],
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ImportReadinessChecker", () => {
  describe("check", () => {
    it("should return not ready when columnMapping is null", () => {
      const contactImport = createMockImport({ columnMapping: null });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain("columnMapping");
    });

    it("should return not ready when columnMapping is empty", () => {
      const contactImport = createMockImport({ columnMapping: {} });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain("columnMapping");
    });

    it("should return not ready when no email column is mapped", () => {
      const contactImport = createMockImport({
        columnMapping: { "First Name": "firstName", "Last Name": "lastName" },
        totalRows: 100,
      });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain("emailColumnMapping");
    });

    it("should return not ready when totalRows is 0", () => {
      const contactImport = createMockImport({
        columnMapping: { Email: "email" },
        totalRows: 0,
      });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain("totalRows");
    });

    it("should return ready when all requirements are met", () => {
      const contactImport = createMockImport({
        columnMapping: { Email: "email", "First Name": "firstName" },
        totalRows: 100,
      });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return all missing fields when multiple are missing", () => {
      const contactImport = createMockImport({
        columnMapping: null,
        totalRows: 0,
      });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(false);
      expect(result.missing).toContain("columnMapping");
      expect(result.missing).toContain("emailColumnMapping");
      expect(result.missing).toContain("totalRows");
    });

    it("should accept email mapping with different column names", () => {
      const contactImport = createMockImport({
        columnMapping: { "Email Address": "email" },
        totalRows: 50,
      });
      const result = checkImportReadiness(contactImport);

      expect(result.ready).toBe(true);
    });
  });

  describe("ImportReadinessChecker class", () => {
    it("should be instantiable", () => {
      const checker = new ImportReadinessChecker();
      expect(checker).toBeInstanceOf(ImportReadinessChecker);
    });

    it("should produce same results as convenience function", () => {
      const contactImport = createMockImport({
        columnMapping: { Email: "email" },
        totalRows: 100,
      });

      const checker = new ImportReadinessChecker();
      const classResult = checker.check(contactImport);
      const functionResult = checkImportReadiness(contactImport);

      expect(classResult).toEqual(functionResult);
    });
  });
});
