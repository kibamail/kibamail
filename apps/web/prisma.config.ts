import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load environment variables from .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL || env("DATABASE_URL"),
  },
});
