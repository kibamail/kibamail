import type { ContactImport, ContactProperty } from "@prisma/client";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/storage/s3-client";
import { parseCsv, type ParsedRow } from "@/lib/csv";
import { BatchProcessor } from "./batch-processor";
import type {
  BatchContext,
  ColumnMapping,
  ImportProcessResult,
  ProcessorOptions,
  RowProcessResult,
} from "./types";

export class ContactImportProcessor {
  private batchSize: number;
  private continueOnError: boolean;
  private onProgress?: (processed: number, total: number) => void;

  constructor(options: ProcessorOptions = {}) {
    this.batchSize = options.batchSize ?? 100;
    this.continueOnError = options.continueOnError ?? true;
    this.onProgress = options.onProgress;
  }

  async process(
    contactImport: ContactImport,
    csvContent: string | null = null
  ): Promise<ImportProcessResult> {
    const result = this.createEmptyResult();

    try {
      const content = await this.getContent(contactImport, csvContent);
      const parsed = parseCsv(content);

      this.validateParsedContent(parsed);
      result.totalRows = parsed.totalRows;

      const context = await this.buildContext(contactImport);
      await this.processBatches(parsed.rows, context, result);

      this.checkForTotalFailure(result);
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    return result;
  }

  private createEmptyResult(): ImportProcessResult {
    return {
      success: true,
      totalRows: 0,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  private async getContent(
    contactImport: ContactImport,
    csvContent: string | null
  ): Promise<string> {
    if (csvContent !== null) return csvContent;

    const file = await downloadFile(contactImport.fileKey);
    if (!file.body) throw new Error("Failed to download CSV file from S3");
    return file.body.transformToString();
  }

  private validateParsedContent(parsed: {
    errors: Array<{ message: string }>;
    rows: unknown[];
  }): void {
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      throw new Error(
        `Failed to parse CSV: ${parsed.errors[0]?.message || "Unknown error"}`
      );
    }
  }

  private async buildContext(contactImport: ContactImport): Promise<BatchContext> {
    const columnMapping = this.validateColumnMapping(
      contactImport.columnMapping as ColumnMapping
    );
    const contactProperties = await this.fetchContactProperties(contactImport.workspaceId);
    const topicIds = await this.validateTopics(contactImport);

    return {
      workspaceId: contactImport.workspaceId,
      columnMapping,
      contactProperties,
      autoSubscribe: contactImport.autoSubscribe,
      updateExisting: contactImport.updateExisting,
      topicIds,
      sourceId: contactImport.id,
    };
  }

  private validateColumnMapping(mapping: ColumnMapping): ColumnMapping {
    if (!mapping || Object.keys(mapping).length === 0) {
      throw new Error("No column mapping configured");
    }

    const hasEmailMapping = Object.values(mapping).includes("email");
    if (!hasEmailMapping) {
      throw new Error("No email column mapped");
    }

    return mapping;
  }

  private async fetchContactProperties(workspaceId: string): Promise<ContactProperty[]> {
    return prisma.contactProperty.findMany({
      where: { workspaceId, deletedAt: null },
    });
  }

  private async validateTopics(contactImport: ContactImport): Promise<string[]> {
    const topicIds = (contactImport.topicIds as string[]) || [];
    if (topicIds.length === 0) return [];

    const existingTopics = await prisma.topic.findMany({
      where: {
        id: { in: topicIds },
        workspaceId: contactImport.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingTopics.map((t) => t.id));
    const invalid = topicIds.filter((id) => !existingIds.has(id));

    if (invalid.length > 0) {
      throw new Error(`Invalid topic IDs: ${invalid.join(", ")}`);
    }

    return topicIds;
  }

  private async processBatches(
    rows: ParsedRow[],
    context: BatchContext,
    result: ImportProcessResult
  ): Promise<void> {
    const batchProcessor = new BatchProcessor(context);

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      const batchResults = await batchProcessor.process(batch);

      const shouldStop = this.aggregateResults(batchResults, result);
      if (shouldStop) return;

      this.onProgress?.(result.processedRows, result.totalRows);
    }
  }

  private aggregateResults(
    batchResults: RowProcessResult[],
    result: ImportProcessResult
  ): boolean {
    for (const rowResult of batchResults) {
      result.processedRows++;

      if (rowResult.success) {
        this.countSuccessfulResult(rowResult, result);
      } else {
        result.failedCount++;
        result.errors.push({
          row: rowResult.lineNumber,
          error: rowResult.error || "Unknown error",
        });

        if (!this.continueOnError) {
          result.success = false;
          result.errorMessage = `Processing stopped at row ${rowResult.lineNumber}: ${rowResult.error}`;
          return true;
        }
      }
    }

    return false;
  }

  private countSuccessfulResult(
    rowResult: RowProcessResult,
    result: ImportProcessResult
  ): void {
    switch (rowResult.action) {
      case "created":
        result.createdCount++;
        break;
      case "updated":
        result.updatedCount++;
        break;
      case "skipped":
        result.skippedCount++;
        break;
    }
  }

  private checkForTotalFailure(result: ImportProcessResult): void {
    if (result.failedCount === result.totalRows && result.totalRows > 0) {
      result.success = false;
      result.errorMessage = "All rows failed to process";
    }
  }
}
