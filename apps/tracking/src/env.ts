/**
 * Environment Variables Schema for Tracking Server
 *
 * Validates required configuration for the tracking/asset serving application.
 */

import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .default("3100")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535)),

  // App secret for HMAC signing (must match apps/web)
  APP_KEY: z.string().min(32),

  // Redis configuration for BullMQ - connects to the same instance as apps/web
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z
    .string()
    .default("6379")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535)),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DATABASE: z
    .string()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0).max(15)),

  // Internal API configuration for ACME challenges
  INTERNAL_API_URL: z.string().url().default("http://localhost:3000"),
  INTERNAL_SERVICE_KEY: z.string().min(32),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
