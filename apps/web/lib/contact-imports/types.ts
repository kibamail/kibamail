import type { ContactProperty } from "@prisma/client";

export const STANDARD_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "city",
] as const;

export type StandardField = (typeof STANDARD_FIELDS)[number];

export interface ColumnMapping {
  [csvColumn: string]: string;
}

export interface RowProcessResult {
  rowIndex: number;
  lineNumber: number;
  success: boolean;
  action?: "created" | "updated" | "skipped";
  contactId?: string;
  error?: string;
}

export interface ImportProcessResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
  errorMessage?: string;
}

export interface ProcessorOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
  continueOnError?: boolean;
}

export interface ExtractedData {
  email: string | null;
  standardFields: Partial<Record<StandardField, string>>;
  customProperties: Record<string, string>;
  errors: string[];
}

export interface BatchContext {
  workspaceId: string;
  columnMapping: ColumnMapping;
  contactProperties: ContactProperty[];
  autoSubscribe: boolean;
  updateExisting: boolean;
  topicIds: string[];
  sourceId: string;
}

export function isStandardField(value: string): value is StandardField {
  return STANDARD_FIELDS.includes(value as StandardField);
}
