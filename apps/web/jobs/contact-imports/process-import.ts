import { prisma } from "@/lib/db";
import { processContactImport } from "@/lib/contact-imports";
import type { JobProcessor } from "@/lib/queue";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ job: "process-import" });

export const processImport: JobProcessor<
  "contact-imports",
  "process-import"
> = async (data, jobId) => {
  const { contactImportId } = data;

  logger.info({ jobId, contactImportId }, "Starting contact import processing");

  const contactImport = await prisma.contactImport.findUnique({
    where: { id: contactImportId },
  });

  if (!contactImport) {
    logger.error({ jobId, contactImportId }, "Contact import not found");
    throw new Error(`Contact import ${contactImportId} not found`);
  }

  if (contactImport.status !== "PENDING") {
    logger.warn(
      { jobId, contactImportId, status: contactImport.status },
      "Contact import is not in PENDING status, skipping"
    );
    return;
  }

  await prisma.contactImport.update({
    where: { id: contactImportId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });

  logger.info({ jobId, contactImportId }, "Updated status to PROCESSING");

  try {
    const result = await processContactImport(contactImport, null, {
      batchSize: 100,
      continueOnError: true,
      onProgress: async (processed, total) => {
        if (processed % 100 === 0 || processed === total) {
          await prisma.contactImport.update({
            where: { id: contactImportId },
            data: { processedRows: processed },
          });
          logger.debug(
            { jobId, contactImportId, processed, total },
            "Progress update"
          );
        }
      },
    });

    if (result.success) {
      await prisma.contactImport.update({
        where: { id: contactImportId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          processedRows: result.processedRows,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors,
        },
      });

      logger.info(
        {
          jobId,
          contactImportId,
          totalRows: result.totalRows,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
        },
        "Contact import processing completed"
      );
    } else {
      await prisma.contactImport.update({
        where: { id: contactImportId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          processedRows: result.processedRows,
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors,
          errorMessage: result.errorMessage,
        },
      });

      logger.error(
        {
          jobId,
          contactImportId,
          errorMessage: result.errorMessage,
          failedCount: result.failedCount,
        },
        "Contact import processing failed"
      );

      throw new Error(result.errorMessage || "Import processing failed");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await prisma.contactImport.update({
      where: { id: contactImportId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
      },
    });

    logger.error(
      { jobId, contactImportId, error: errorMessage },
      "Contact import processing failed with unexpected error"
    );

    throw error;
  }
};
