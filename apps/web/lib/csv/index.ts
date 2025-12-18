/**
 * CSV Module
 *
 * Utilities for parsing and processing CSV files
 */

export {
  CsvParser,
  parseCsv,
  parseCsvLine,
  splitCsvLines,
  processCsvInBatches,
  isValidEmail,
  normalizeEmail,
  type CsvOptions,
  type ParsedRow,
  type CsvParseResult,
} from "./parser";
