import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

const prismaBase = new PrismaClient({
  log:
    process.env.NODE_ENV === "development" &&
    process.env.DISABLE_PRISMA_LOGS !== "true"
      ? ["query", "error", "warn"]
      : ["error"],
});

export const prisma = prismaBase.$extends(
  createSoftDeleteExtension({
    models: {
      Tag: true,
      Topic: true,
      Segment: true,
    },
    defaultConfig: {
      field: "deletedAt",
      createValue(deleted) {
        return deleted ? new Date() : null;
      },
    },
  })
);
