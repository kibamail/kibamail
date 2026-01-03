import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

const prismaBase = new PrismaClient({
  log: ["error"],
});

export const prisma = prismaBase.$extends(
  createSoftDeleteExtension({
    models: {
      Form: true,
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
  }),
);
