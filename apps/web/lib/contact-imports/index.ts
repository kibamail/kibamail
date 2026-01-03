/**
 * Contact Imports Module
 *
 * Utilities for processing CSV contact imports.
 */

import type { ContactImport, ContactProperty, Prisma } from "@prisma/client";
import type { ParsedRow } from "@/lib/csv";
import { BatchProcessor } from "./batch-processor";
import { ContactImportProcessor } from "./processor";
import type {
  ColumnMapping,
  ExtractedData,
  ImportProcessResult,
  ProcessorOptions,
  RowProcessResult,
  StandardField,
} from "./types";

// Re-export types
export {
  type BatchContext,
  type ColumnMapping,
  type ExtractedData,
  type ImportProcessResult,
  isStandardField,
  type ProcessorOptions,
  type RowProcessResult,
  STANDARD_FIELDS,
  type StandardField,
} from "./types";

import { ContactDataBuilder } from "./builder";
// Import classes for use in convenience functions
import { ContactDataExtractor } from "./extractor";

// Re-export readiness checker
export {
  checkImportReadiness,
  ImportReadinessChecker,
  type ReadinessResult,
} from "./readiness";

// Convenience functions
export function extractContactData(
  row: ParsedRow,
  columnMapping: ColumnMapping,
  contactProperties: ContactProperty[],
): ExtractedData {
  return new ContactDataExtractor(columnMapping, contactProperties).extract(
    row,
  );
}

export function buildContactData(
  standardFields: Partial<Record<StandardField, string>>,
  customProperties: Record<string, string>,
  workspaceId: string,
  email: string,
  options: { autoSubscribe: boolean; sourceId: string },
): Prisma.ContactCreateInput {
  return new ContactDataBuilder().build(
    standardFields,
    customProperties,
    workspaceId,
    email,
    options.autoSubscribe,
    options.sourceId,
  );
}

export async function processBatch(
  rows: ParsedRow[],
  workspaceId: string,
  columnMapping: ColumnMapping,
  contactProperties: ContactProperty[],
  options: {
    autoSubscribe: boolean;
    updateExisting: boolean;
    topicIds: string[];
    sourceId: string;
  },
): Promise<RowProcessResult[]> {
  return new BatchProcessor({
    workspaceId,
    columnMapping,
    contactProperties,
    ...options,
  }).process(rows);
}

export async function processContactImport(
  contactImport: ContactImport,
  csvContent: string | null = null,
  options: ProcessorOptions = {},
): Promise<ImportProcessResult> {
  return new ContactImportProcessor(options).process(contactImport, csvContent);
}
