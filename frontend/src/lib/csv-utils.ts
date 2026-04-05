/**
 * CSV Utility Wrapper Functions
 * Provides a clean interface for CSV parsing and generation using PapaParse
 * Configured for UTF-8, quoted fields, and comprehensive error reporting
 */

import Papa, { ParseConfig, UnparseConfig, ParseError } from 'papaparse';

/**
 * Configuration for CSV parsing
 * Optimized for UTF-8, quoted fields, and error handling
 */
const CSV_PARSE_CONFIG: ParseConfig = {
  header: true,
  dynamicTyping: false,
  skipEmptyLines: true,
  quoteChar: '"',
  escapeChar: '"',
  transformHeader: (header: string) => header.trim().toLowerCase(),
};

/**
 * Configuration for CSV unparsing (generation)
 * Ensures proper quoting and UTF-8 encoding
 */
const CSV_UNPARSE_CONFIG: UnparseConfig = {
  quotes: true,
  quoteChar: '"',
  escapeChar: '"',
  header: true,
  newline: '\n',
};

/**
 * Represents a parsed CSV row with error information
 */
export interface ParsedCSVRow {
  data: Record<string, string>;
  rowIndex: number;
  errors: string[];
}

/**
 * Result of CSV parsing operation
 */
export interface CSVParseResult {
  rows: ParsedCSVRow[];
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ rowIndex: number; message: string }>;
}

/**
 * Parse a CSV file with comprehensive error reporting
 * @param file - The CSV file to parse
 * @returns Promise resolving to parse results with error details
 */
export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...CSV_PARSE_CONFIG,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const rows: ParsedCSVRow[] = [];
        const errors: Array<{ rowIndex: number; message: string }> = [];
        let successCount = 0;

        // Process each row
        results.data.forEach((row: Record<string, string>, index: number) => {
          const rowErrors: string[] = [];

          // Skip completely empty rows
          if (Object.values(row).every((val: string) => !val || val.trim() === '')) {
            return;
          }

          // Validate row has required fields (at minimum, not completely empty)
          if (Object.keys(row).length === 0) {
            rowErrors.push('Row is empty');
          }

          // Check for missing critical fields based on context
          const hasData = Object.values(row).some((val: string) => val && val.trim() !== '');
          if (!hasData) {
            rowErrors.push('Row contains no data');
          }

          if (rowErrors.length === 0) {
            successCount++;
          } else {
            errors.push({
              rowIndex: index + 1, // 1-indexed for user display
              message: rowErrors.join('; '),
            });
          }

          rows.push({
            data: row,
            rowIndex: index + 1,
            errors: rowErrors,
          });
        });

        // Include any parsing errors from PapaParse
        if (results.errors && results.errors.length > 0) {
          results.errors.forEach((error: ParseError) => {
            errors.push({
              rowIndex: error.row ? error.row + 1 : 0,
              message: `${error.type}: ${error.message}`,
            });
          });
        }

        resolve({
          rows,
          totalRows: results.data.length,
          successCount,
          errorCount: errors.length,
          errors,
        });
      },
    });
  });
}

/**
 * Parse CSV text content with comprehensive error reporting
 * @param csvText - The CSV content as string
 * @returns Parse results with error details
 */
export function parseCSVText(csvText: string): CSVParseResult {
  const results = Papa.parse(csvText, CSV_PARSE_CONFIG);
  const rows: ParsedCSVRow[] = [];
  const errors: Array<{ rowIndex: number; message: string }> = [];
  let successCount = 0;

  results.data.forEach((row: Record<string, string>, index: number) => {
    const rowErrors: string[] = [];

    // Skip completely empty rows
    if (Object.values(row).every((val: string) => !val || val.trim() === '')) {
      return;
    }

    const hasData = Object.values(row).some((val: string) => val && val.trim() !== '');
    if (!hasData) {
      rowErrors.push('Row contains no data');
    }

    if (rowErrors.length === 0) {
      successCount++;
    } else {
      errors.push({
        rowIndex: index + 1,
        message: rowErrors.join('; '),
      });
    }

    rows.push({
      data: row,
      rowIndex: index + 1,
      errors: rowErrors,
    });
  });

  // Include any parsing errors
  if (results.errors && results.errors.length > 0) {
    results.errors.forEach((error: ParseError) => {
      errors.push({
        rowIndex: error.row ? error.row + 1 : 0,
        message: `${error.type}: ${error.message}`,
      });
    });
  }

  return {
    rows,
    totalRows: results.data.length,
    successCount,
    errorCount: errors.length,
    errors,
  };
}

/**
 * Generate CSV text from data array
 * @param data - Array of objects to convert to CSV
 * @returns CSV formatted string
 */
export function generateCSV(data: Record<string, unknown>[]): string {
  return Papa.unparse(data, CSV_UNPARSE_CONFIG);
}

/**
 * Generate CSV text from headers and rows
 * @param headers - Array of column headers
 * @param rows - Array of row data arrays
 * @returns CSV formatted string
 */
export function generateCSVFromRows(headers: string[], rows: (string | number)[][]): string {
  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? '';
    });
    return obj;
  });

  return Papa.unparse(data, CSV_UNPARSE_CONFIG);
}

/**
 * Validate CSV structure against expected headers
 * @param parseResult - Result from parseCSVFile or parseCSVText
 * @param expectedHeaders - Array of required header names (case-insensitive)
 * @returns Object with validation result and missing headers
 */
export function validateCSVStructure(
  parseResult: CSVParseResult,
  expectedHeaders: string[]
): {
  isValid: boolean;
  missingHeaders: string[];
  extraHeaders: string[];
} {
  if (parseResult.rows.length === 0) {
    return {
      isValid: false,
      missingHeaders: expectedHeaders,
      extraHeaders: [],
    };
  }

  const firstRow = parseResult.rows[0].data;
  const actualHeaders = Object.keys(firstRow).map((h) => h.toLowerCase());
  const expectedHeadersLower = expectedHeaders.map((h) => h.toLowerCase());

  const missingHeaders = expectedHeadersLower.filter((h) => !actualHeaders.includes(h));
  const extraHeaders = actualHeaders.filter((h) => !expectedHeadersLower.includes(h));

  return {
    isValid: missingHeaders.length === 0,
    missingHeaders: missingHeaders.map((h) => expectedHeaders[expectedHeadersLower.indexOf(h)]),
    extraHeaders,
  };
}

/**
 * Get a field value from a parsed row, with case-insensitive lookup
 * @param row - The parsed row data
 * @param fieldName - The field name to retrieve
 * @returns The field value or empty string if not found
 */
export function getFieldValue(row: Record<string, string>, fieldName: string): string {
  const lowerFieldName = fieldName.toLowerCase();
  const key = Object.keys(row).find((k) => k.toLowerCase() === lowerFieldName);
  return key ? (row[key] ?? '').trim() : '';
}

/**
 * Convert CSV parse result to downloadable file
 * @param csvText - The CSV content
 * @param filename - The filename for download
 */
export function downloadCSV(csvText: string, filename: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Create a CSV template with headers and example rows
 * @param headers - Column headers
 * @param exampleRows - Example data rows
 * @returns CSV formatted template string
 */
export function createCSVTemplate(headers: string[], exampleRows: (string | number)[][]): string {
  return generateCSVFromRows(headers, exampleRows);
}
