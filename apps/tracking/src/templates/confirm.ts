/**
 * HTML Templates
 *
 * Loads static HTML files into memory at startup.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const thankYouHtml = readFileSync(
  join(__dirname, "thank-you.html"),
  "utf-8"
);

export const errorHtml = readFileSync(join(__dirname, "error.html"), "utf-8");

export const unsubscribedHtml = readFileSync(
  join(__dirname, "unsubscribed.html"),
  "utf-8"
);
