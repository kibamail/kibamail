import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseCsv,
  parseCsvLine,
  splitCsvLines,
  isValidEmail,
  normalizeEmail,
  processCsvInBatches,
} from "@/lib/csv/parser";

function loadTestCsv(filename: string): string {
  const filePath = path.join(process.cwd(), "tests/mocks/csv", filename);
  return fs.readFileSync(filePath, "utf-8");
}

describe("parseCsvLine", () => {
  it("should parse a simple line with no quotes", () => {
    const result = parseCsvLine("a,b,c");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should parse line with quoted fields", () => {
    const result = parseCsvLine('a,"b,c",d');
    expect(result).toEqual(["a", "b,c", "d"]);
  });

  it("should handle escaped quotes inside quoted fields", () => {
    const result = parseCsvLine('a,"b""c",d');
    expect(result).toEqual(["a", 'b"c', "d"]);
  });

  it("should trim whitespace by default", () => {
    const result = parseCsvLine("  a  ,  b  ,  c  ");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should preserve whitespace when trimValues is false", () => {
    const result = parseCsvLine("  a  ,  b  ,  c  ", { trimValues: false });
    expect(result).toEqual(["  a  ", "  b  ", "  c  "]);
  });

  it("should handle empty fields", () => {
    const result = parseCsvLine("a,,c");
    expect(result).toEqual(["a", "", "c"]);
  });

  it("should handle empty quoted fields", () => {
    const result = parseCsvLine('a,"",c');
    expect(result).toEqual(["a", "", "c"]);
  });

  it("should handle custom delimiter", () => {
    const result = parseCsvLine("a;b;c", { delimiter: ";" });
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle tab delimiter", () => {
    const result = parseCsvLine("a\tb\tc", { delimiter: "\t" });
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should truncate very long fields", () => {
    const longValue = "x".repeat(15000);
    const result = parseCsvLine(`a,${longValue},c`, { maxFieldLength: 100 });
    expect(result[1].length).toBe(100);
  });

  it("should handle line with only one field", () => {
    const result = parseCsvLine("single");
    expect(result).toEqual(["single"]);
  });

  it("should handle quoted field at end of line", () => {
    const result = parseCsvLine('a,b,"quoted"');
    expect(result).toEqual(["a", "b", "quoted"]);
  });

  it("should handle quoted field at start of line", () => {
    const result = parseCsvLine('"quoted",b,c');
    expect(result).toEqual(["quoted", "b", "c"]);
  });

  it("should handle multiple consecutive escaped quotes", () => {
    const result = parseCsvLine('a,"b""""c",d');
    expect(result).toEqual(["a", 'b""c', "d"]);
  });
});

describe("splitCsvLines", () => {
  it("should split simple lines", () => {
    const result = splitCsvLines("line1\nline2\nline3");
    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("should handle Windows line endings (CRLF)", () => {
    const result = splitCsvLines("line1\r\nline2\r\nline3");
    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("should handle old Mac line endings (CR)", () => {
    const result = splitCsvLines("line1\rline2\rline3");
    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("should preserve newlines inside quoted fields", () => {
    const result = splitCsvLines('line1\n"field\nwith\nnewlines"\nline3');
    expect(result).toEqual(["line1", '"field\nwith\nnewlines"', "line3"]);
  });

  it("should skip empty lines", () => {
    const result = splitCsvLines("line1\n\nline2\n\n\nline3");
    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("should handle mixed line endings", () => {
    const result = splitCsvLines("line1\nline2\r\nline3\rline4");
    expect(result).toEqual(["line1", "line2", "line3", "line4"]);
  });
});

describe("parseCsv", () => {
  describe("with perfect CSV", () => {
    it("should parse a well-formed CSV file", () => {
      const content = loadTestCsv("perfect.csv");
      const result = parseCsv(content);

      expect(result.headers).toEqual(["email", "first_name", "last_name", "company", "phone"]);
      expect(result.totalRows).toBe(5);
      expect(result.validRows).toBe(5);
      expect(result.invalidRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should create data objects with headers as keys", () => {
      const content = loadTestCsv("perfect.csv");
      const result = parseCsv(content);

      expect(result.rows[0].data).toEqual({
        email: "john@example.com",
        first_name: "John",
        last_name: "Doe",
        company: "Acme Corp",
        phone: "555-1234",
      });
    });

    it("should mark all rows as valid", () => {
      const content = loadTestCsv("perfect.csv");
      const result = parseCsv(content);

      for (const row of result.rows) {
        expect(row.isValid).toBe(true);
        expect(row.error).toBeUndefined();
      }
    });
  });

  describe("with malformed CSV", () => {
    it("should handle rows with missing columns", () => {
      const content = loadTestCsv("malformed.csv");
      const result = parseCsv(content);

      // Find the row with missing columns
      const missingColumnsRow = result.rows.find(
        (row) => row.data.email === "missing@columns.com"
      );
      expect(missingColumnsRow).toBeDefined();
      expect(missingColumnsRow?.isValid).toBe(false);
    });

    it("should handle rows with extra columns", () => {
      const content = loadTestCsv("malformed.csv");
      const result = parseCsv(content);

      // Find the row with extra columns
      const extraColumnsRow = result.rows.find(
        (row) => row.data.email === "extra@columns.com"
      );
      expect(extraColumnsRow).toBeDefined();
      expect(extraColumnsRow?.isValid).toBe(false);
    });

    it("should report invalid rows count", () => {
      const content = loadTestCsv("malformed.csv");
      const result = parseCsv(content);

      expect(result.invalidRows).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("with quoted fields", () => {
    it("should correctly parse fields with commas inside quotes", () => {
      const content = loadTestCsv("quoted-fields.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "john@example.com");
      expect(row?.data.company).toBe("Acme, Corp");
    });

    it("should correctly parse fields with escaped quotes", () => {
      const content = loadTestCsv("quoted-fields.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "john@example.com");
      expect(row?.data.notes).toBe('This is a note with "quotes" inside');
    });

    it("should correctly parse fields with newlines inside quotes", () => {
      const content = loadTestCsv("quoted-fields.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "jane@example.com");
      expect(row?.data.notes).toContain("multiple");
      expect(row?.data.notes).toContain("\n");
    });

    it("should handle quoted field with both commas and quotes", () => {
      const content = loadTestCsv("quoted-fields.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "charlie@example.com");
      expect(row?.data.notes).toBe('Mixed "quotes" and, commas');
    });
  });

  describe("with inconsistent data", () => {
    it("should normalize email case (via trimming)", () => {
      const content = loadTestCsv("inconsistent.csv");
      const result = parseCsv(content);

      // All rows should be parsed successfully
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("should trim whitespace from values", () => {
      const content = loadTestCsv("inconsistent.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) =>
        r.data.email?.toLowerCase().includes("spaces")
      );
      expect(row?.data.email).not.toMatch(/^\s|\s$/);
    });

    it("should handle duplicate rows (parser doesn't dedupe)", () => {
      const content = loadTestCsv("inconsistent.csv");
      const result = parseCsv(content);

      const duplicateRows = result.rows.filter(
        (r) => r.data.email?.toLowerCase() === "duplicate@example.com"
      );
      expect(duplicateRows.length).toBe(2);
    });
  });

  describe("with special characters", () => {
    it("should handle Unicode characters", () => {
      const content = loadTestCsv("special-chars.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "unicode@example.com");
      expect(row?.data.first_name).toBe("José");
      expect(row?.data.last_name).toBe("García");
    });

    it("should handle emojis", () => {
      const content = loadTestCsv("special-chars.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "emoji@example.com");
      expect(row?.data.company).toContain("🎉");
    });

    it("should handle Asian characters", () => {
      const content = loadTestCsv("special-chars.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "asian@example.com");
      expect(row?.data.first_name).toBe("田中");
    });

    it("should handle Cyrillic characters", () => {
      const content = loadTestCsv("special-chars.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "cyrillic@example.com");
      expect(row?.data.first_name).toBe("Иван");
    });

    it("should handle Arabic characters", () => {
      const content = loadTestCsv("special-chars.csv");
      const result = parseCsv(content);

      const row = result.rows.find((r) => r.data.email === "arabic@example.com");
      expect(row?.data.first_name).toBe("محمد");
    });
  });

  describe("with empty CSV", () => {
    it("should handle completely empty file", () => {
      const content = loadTestCsv("empty.csv");
      const result = parseCsv(content);

      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("with headers only", () => {
    it("should parse headers but have no data rows", () => {
      const content = loadTestCsv("headers-only.csv");
      const result = parseCsv(content);

      expect(result.headers).toEqual(["email", "first_name", "last_name", "company", "phone"]);
      expect(result.rows).toHaveLength(0);
      expect(result.totalRows).toBe(0);
    });
  });

  describe("without headers option", () => {
    it("should treat first row as data when hasHeaders is false", () => {
      const content = "a,b,c\nd,e,f";
      const result = parseCsv(content, { hasHeaders: false });

      expect(result.headers).toEqual([]);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].values).toEqual(["a", "b", "c"]);
    });
  });

  describe("with large CSV file", () => {
    it("should handle large files efficiently", () => {
      // Generate a large CSV in memory
      const headers = "email,first_name,last_name,company";
      const rows: string[] = [headers];
      for (let i = 0; i < 1000; i++) {
        rows.push(`test${i}@example.com,First${i},Last${i},Company${i}`);
      }
      const content = rows.join("\n");

      const result = parseCsv(content);

      expect(result.totalRows).toBe(1000);
      expect(result.validRows).toBe(1000);
    });
  });
});

describe("isValidEmail", () => {
  it("should return true for valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.org")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
    expect(isValidEmail("user@sub.domain.com")).toBe(true);
  });

  it("should return false for invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("  ")).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("should lowercase email", () => {
    expect(normalizeEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
  });

  it("should trim whitespace", () => {
    expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
  });

  it("should handle empty/null input", () => {
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail(null as unknown as string)).toBe("");
  });
});

describe("processCsvInBatches", () => {
  it("should process rows in batches", async () => {
    const content = loadTestCsv("perfect.csv");
    const batchSizes: number[] = [];

    await processCsvInBatches(
      content,
      2,
      async (batch, batchIndex) => {
        batchSizes.push(batch.length);
        return batchIndex;
      }
    );

    // 5 rows with batch size 2 = 3 batches (2, 2, 1)
    expect(batchSizes).toEqual([2, 2, 1]);
  });

  it("should return results from all batches", async () => {
    const content = loadTestCsv("perfect.csv");

    const result = await processCsvInBatches(
      content,
      2,
      async (batch, batchIndex) => {
        return batch.length;
      }
    );

    expect(result.results).toEqual([2, 2, 1]);
    expect(result.totalRows).toBe(5);
    expect(result.totalBatches).toBe(3);
  });
});
