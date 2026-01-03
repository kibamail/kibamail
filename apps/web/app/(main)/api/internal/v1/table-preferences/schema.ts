/**
 * Table Preferences Schema (Internal API)
 *
 * Validation schemas for table preference operations.
 */

import { z } from "zod";

/**
 * Schema for updating table preferences
 */
export const updateTablePreferencesSchema = z.object({
  tableName: z.string().min(1, "Table name is required"),
  config: z.object({
    columns: z.array(z.string()).optional(),
  }),
});
