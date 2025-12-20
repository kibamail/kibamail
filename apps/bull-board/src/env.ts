/**
 * Environment Variables Schema for Bull Board
 *
 * Validates required Redis configuration for connecting to BullMQ queues
 */

import { z } from "zod";

const envSchema = z.object({
  REDIS_HOST: z.string().min(1).default("redis"),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default(6379),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_DATABASE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0).max(15))
    .default(0),
  BULL_BOARD_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default(18095),
  BULL_BOARD_USERNAME: z.string().min(1).default("admin"),
  BULL_BOARD_PASSWORD: z.string().min(1).default("admin"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
