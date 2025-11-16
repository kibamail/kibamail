import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

const prismaBase = new PrismaClient({
  log: ["query", "error", "warn"],
});

export const prisma = prismaBase.$extends(
  createSoftDeleteExtension({
    models: {
      Topic: true,
      Segment: true,
      ContactProperty: true,
    },
    defaultConfig: {
      field: "deletedAt",
      createValue(deleted) {
        return deleted ? new Date() : null;
      },
    },
  })
);
