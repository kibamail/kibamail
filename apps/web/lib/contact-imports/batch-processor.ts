import type { ParsedRow } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { ContactDataBuilder } from "./builder";
import { ContactDataExtractor } from "./extractor";
import type { BatchContext, RowProcessResult, StandardField } from "./types";

export class BatchProcessor {
  private extractor: ContactDataExtractor;
  private builder: ContactDataBuilder;

  constructor(private context: BatchContext) {
    this.extractor = new ContactDataExtractor(
      context.columnMapping,
      context.contactProperties,
    );
    this.builder = new ContactDataBuilder();
  }

  async process(rows: ParsedRow[]): Promise<RowProcessResult[]> {
    const { validRows, invalidResults } = this.categorizeRows(rows);

    if (validRows.size === 0) {
      return invalidResults;
    }

    const existingContacts = await this.fetchExistingContacts([
      ...validRows.keys(),
    ]);
    const processedResults = await this.processValidRows(
      validRows,
      existingContacts,
    );

    return [...invalidResults, ...processedResults];
  }

  private categorizeRows(rows: ParsedRow[]): {
    validRows: Map<string, ParsedRow[]>;
    invalidResults: RowProcessResult[];
  } {
    const validRows = new Map<string, ParsedRow[]>();
    const invalidResults: RowProcessResult[] = [];

    for (const row of rows) {
      const { email, errors } = this.extractor.extract(row);

      if (errors.length > 0 || !email) {
        invalidResults.push(this.createFailedResult(row, errors));
        continue;
      }

      const existing = validRows.get(email) || [];
      existing.push(row);
      validRows.set(email, existing);
    }

    return { validRows, invalidResults };
  }

  private createFailedResult(
    row: ParsedRow,
    errors: string[],
  ): RowProcessResult {
    return {
      rowIndex: row.index,
      lineNumber: row.lineNumber,
      success: false,
      error: errors.length > 0 ? errors.join("; ") : "No valid email found",
    };
  }

  private async fetchExistingContacts(
    emails: string[],
  ): Promise<Map<string, { id: string }>> {
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: this.context.workspaceId, email: { in: emails } },
      select: { id: true, email: true },
    });
    return new Map(contacts.map((c) => [c.email, { id: c.id }]));
  }

  private async processValidRows(
    rowsByEmail: Map<string, ParsedRow[]>,
    existingContacts: Map<string, { id: string }>,
  ): Promise<RowProcessResult[]> {
    const results: RowProcessResult[] = [];

    for (const [email, emailRows] of rowsByEmail) {
      const primaryRow = emailRows[0];
      const duplicateResults = this.createSkippedResults(emailRows.slice(1));

      const result = await this.processContact(
        email,
        primaryRow,
        existingContacts.get(email),
      );
      results.push(result, ...duplicateResults);
    }

    return results;
  }

  private createSkippedResults(rows: ParsedRow[]): RowProcessResult[] {
    return rows.map((row) => ({
      rowIndex: row.index,
      lineNumber: row.lineNumber,
      success: true,
      action: "skipped" as const,
    }));
  }

  private async processContact(
    email: string,
    row: ParsedRow,
    existingContact?: { id: string },
  ): Promise<RowProcessResult> {
    const { standardFields, customProperties, errors } =
      this.extractor.extract(row);

    if (errors.length > 0) {
      return this.createFailedResult(row, errors);
    }

    try {
      if (existingContact) {
        return await this.handleExistingContact(
          row,
          email,
          standardFields,
          customProperties,
          existingContact,
        );
      }
      return await this.createNewContact(
        row,
        email,
        standardFields,
        customProperties,
      );
    } catch (error) {
      return {
        rowIndex: row.index,
        lineNumber: row.lineNumber,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handleExistingContact(
    row: ParsedRow,
    email: string,
    standardFields: Partial<Record<StandardField, string>>,
    customProperties: Record<string, string>,
    existingContact: { id: string },
  ): Promise<RowProcessResult> {
    if (!this.context.updateExisting) {
      return {
        rowIndex: row.index,
        lineNumber: row.lineNumber,
        success: true,
        action: "skipped",
      };
    }

    const updateData = this.builder.build(
      standardFields,
      customProperties,
      this.context.workspaceId,
      email,
      this.context.autoSubscribe,
      this.context.sourceId,
    );

    const {
      workspaceId: _,
      email: __,
      sourceType: ___,
      sourceId: ____,
      ...updateFields
    } = updateData;

    await prisma.contact.update({
      where: { id: existingContact.id },
      data: updateFields,
    });

    return {
      rowIndex: row.index,
      lineNumber: row.lineNumber,
      success: true,
      action: "updated",
      contactId: existingContact.id,
    };
  }

  private async createNewContact(
    row: ParsedRow,
    email: string,
    standardFields: Partial<Record<StandardField, string>>,
    customProperties: Record<string, string>,
  ): Promise<RowProcessResult> {
    const createData = this.builder.build(
      standardFields,
      customProperties,
      this.context.workspaceId,
      email,
      this.context.autoSubscribe,
      this.context.sourceId,
    );

    const newContact = await prisma.contact.create({ data: createData });

    if (this.context.topicIds.length > 0) {
      await this.subscribeToTopics(newContact.id);
    }

    return {
      rowIndex: row.index,
      lineNumber: row.lineNumber,
      success: true,
      action: "created",
      contactId: newContact.id,
    };
  }

  private async subscribeToTopics(contactId: string): Promise<void> {
    await prisma.contactTopic.createMany({
      data: this.context.topicIds.map((topicId) => ({
        contactId,
        topicId,
        status: "SUBSCRIBED",
      })),
      skipDuplicates: true,
    });
  }
}
