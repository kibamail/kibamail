export interface CsvOptions {
  delimiter?: string;
  quote?: string;
  hasHeaders?: boolean;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  maxFieldLength?: number;
}

export interface ParsedRow {
  index: number;
  lineNumber: number;
  values: string[];
  data: Record<string, string>;
  isValid: boolean;
  error?: string;
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{ lineNumber: number; message: string }>;
}

const DEFAULT_OPTIONS: Required<CsvOptions> = {
  delimiter: ",",
  quote: '"',
  hasHeaders: true,
  skipEmptyRows: true,
  trimValues: true,
  maxFieldLength: 10000,
};

export class CsvParser {
  private options: Required<CsvOptions>;

  constructor(options: CsvOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  parse(content: string): CsvParseResult {
    const lines = this.splitLines(content);

    if (lines.length === 0) {
      return this.emptyResult();
    }

    const headers = this.options.hasHeaders ? this.parseLine(lines[0]) : [];
    const startIndex = this.options.hasHeaders ? 1 : 0;

    return this.parseRows(lines, headers, startIndex);
  }

  parseLine(line: string): string[] {
    const { delimiter, quote, trimValues, maxFieldLength } = this.options;
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const next = line[i + 1];

      if (inQuotes) {
        if (char === quote && next === quote) {
          current += quote;
          i += 2;
        } else if (char === quote) {
          inQuotes = false;
          i++;
        } else {
          current += char;
          i++;
        }
      } else if (char === quote && current === "") {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        values.push(this.finalizeValue(current, trimValues, maxFieldLength));
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    values.push(this.finalizeValue(current, trimValues, maxFieldLength));
    return values;
  }

  splitLines(content: string): string[] {
    const { quote } = this.options;
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const next = content[i + 1];

      if (char === quote && inQuotes && next === quote) {
        current += char + next;
        i++;
      } else if (char === quote) {
        inQuotes = !inQuotes;
        current += char;
      } else if (this.isLineEnd(char, next) && !inQuotes) {
        if (current.trim()) lines.push(current);
        current = "";
        if (char === "\r" && next === "\n") i++;
      } else {
        current += char;
      }
    }

    if (current.trim()) lines.push(current);
    return lines;
  }

  private parseRows(
    lines: string[],
    headers: string[],
    startIndex: number
  ): CsvParseResult {
    const rows: ParsedRow[] = [];
    const errors: Array<{ lineNumber: number; message: string }> = [];
    let validRows = 0;
    let invalidRows = 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (this.options.skipEmptyRows && !line.trim()) continue;

      const lineNumber = i + 1;
      const values = this.parseLine(line);
      const data = this.buildDataObject(headers, values);
      const isValid = !this.options.hasHeaders || values.length === headers.length;

      if (isValid) {
        validRows++;
      } else {
        invalidRows++;
        const error = `Row has ${values.length} columns, expected ${headers.length}`;
        errors.push({ lineNumber, message: error });
      }

      rows.push({
        index: rows.length,
        lineNumber,
        values,
        data,
        isValid,
        error: isValid ? undefined : errors[errors.length - 1]?.message,
      });
    }

    return { headers, rows, totalRows: rows.length, validRows, invalidRows, errors };
  }

  private buildDataObject(headers: string[], values: string[]): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      data[headers[i]] = values[i] ?? "";
    }
    return data;
  }

  private finalizeValue(value: string, trim: boolean, maxLength: number): string {
    const result = trim ? value.trim() : value;
    return result.length > maxLength ? result.substring(0, maxLength) : result;
  }

  private isLineEnd(char: string, next: string): boolean {
    return char === "\n" || char === "\r" || (char === "\r" && next === "\n");
  }

  private emptyResult(): CsvParseResult {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ lineNumber: 0, message: "CSV file is empty" }],
    };
  }
}

// Convenience functions
export function parseCsv(content: string, options?: CsvOptions): CsvParseResult {
  return new CsvParser(options).parse(content);
}

export function parseCsvLine(line: string, options?: CsvOptions): string[] {
  return new CsvParser(options).parseLine(line);
}

export function splitCsvLines(content: string, quote = '"'): string[] {
  return new CsvParser({ quote }).splitLines(content);
}

// Email utilities
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Batch processing
export async function processCsvInBatches<T>(
  content: string,
  batchSize: number,
  processor: (batch: ParsedRow[], batchIndex: number) => Promise<T>,
  options?: CsvOptions
): Promise<{ results: T[]; totalRows: number; totalBatches: number }> {
  const { rows, totalRows } = parseCsv(content, options);
  const results: T[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    results.push(await processor(batch, Math.floor(i / batchSize)));
  }

  return { results, totalRows, totalBatches: Math.ceil(rows.length / batchSize) };
}
