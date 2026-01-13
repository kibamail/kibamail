import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const prismaBase = new PrismaClient({
    log: ["error"],
  });

  return prismaBase.$extends(
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
    })
  );
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
