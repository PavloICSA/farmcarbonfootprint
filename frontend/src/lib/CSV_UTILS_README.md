# CSV Utilities Documentation

## Overview

The CSV utilities module provides a clean, type-safe interface for parsing and generating CSV files using PapaParse. It's configured for UTF-8 encoding, proper quote handling, and comprehensive error reporting.

## Features

- **File Parsing**: Parse CSV files from user uploads with detailed error reporting
- **Text Parsing**: Parse CSV content from strings
- **CSV Generation**: Generate CSV from data arrays or headers/rows
- **Structure Validation**: Validate CSV structure against expected headers
- **Error Handling**: Comprehensive error reporting with row-level details
- **Field Access**: Case-insensitive field value retrieval
- **Download Support**: Generate downloadable CSV files
- **Template Creation**: Create CSV templates with example data

## Configuration

The module uses optimized PapaParse configuration:

```typescript
// Parse Configuration
{
  header: true,                    // Use first row as headers
  dynamicTyping: false,            // Keep all values as strings
  skipEmptyLines: true,            // Skip completely empty rows
  encoding: 'UTF-8',               // UTF-8 encoding
  quoteChar: '"',                  // Double quotes for field quoting
  escapeChar: '"',                 // Double quotes for escaping
  transformHeader: (h) => h.trim().toLowerCase(),  // Normalize headers
}

// Unparse Configuration
{
  quotes: true,                    // Quote all fields
  quoteChar: '"',                  // Double quotes
  escapeChar: '"',                 // Double quotes for escaping
  header: true,                    // Include headers
  newline: '\n',                   // Unix line endings
  encoding: 'UTF-8',               // UTF-8 encoding
}
```

## API Reference

### `parseCSVFile(file: File): Promise<CSVParseResult>`

Parse a CSV file from user upload.

**Parameters:**
- `file`: The CSV file to parse

**Returns:** Promise resolving to `CSVParseResult` with parsed rows and error details

**Example:**
```typescript
const file = event.target.files[0];
const result = await parseCSVFile(file);

if (result.errorCount > 0) {
  console.error('Parse errors:', result.errors);
}

result.rows.forEach((row) => {
  if (row.errors.length === 0) {
    console.log('Valid row:', row.data);
  }
});
```

### `parseCSVText(csvText: string): CSVParseResult`

Parse CSV content from a string.

**Parameters:**
- `csvText`: The CSV content as a string

**Returns:** `CSVParseResult` with parsed rows and error details

**Example:**
```typescript
const csvText = `name,age\nJohn,30\nJane,25`;
const result = parseCSVText(csvText);
```

### `generateCSV(data: Record<string, unknown>[]): string`

Generate CSV from an array of objects.

**Parameters:**
- `data`: Array of objects to convert to CSV

**Returns:** CSV formatted string

**Example:**
```typescript
const data = [
  { crop: 'Wheat', area: 100 },
  { crop: 'Corn', area: 80 },
];
const csv = generateCSV(data);
```

### `generateCSVFromRows(headers: string[], rows: (string | number)[][]): string`

Generate CSV from headers and row arrays.

**Parameters:**
- `headers`: Array of column headers
- `rows`: Array of row data arrays

**Returns:** CSV formatted string

**Example:**
```typescript
const headers = ['Crop', 'Area'];
const rows = [
  ['Wheat', '100'],
  ['Corn', '80'],
];
const csv = generateCSVFromRows(headers, rows);
```

### `validateCSVStructure(parseResult: CSVParseResult, expectedHeaders: string[]): ValidationResult`

Validate CSV structure against expected headers.

**Parameters:**
- `parseResult`: Result from `parseCSVFile` or `parseCSVText`
- `expectedHeaders`: Array of required header names (case-insensitive)

**Returns:** Object with validation result and missing/extra headers

**Example:**
```typescript
const result = await parseCSVFile(file);
const validation = validateCSVStructure(result, ['crop_name', 'area', 'nitrogen']);

if (!validation.isValid) {
  console.error('Missing headers:', validation.missingHeaders);
}
```

### `getFieldValue(row: Record<string, string>, fieldName: string): string`

Get a field value from a parsed row with case-insensitive lookup.

**Parameters:**
- `row`: The parsed row data
- `fieldName`: The field name to retrieve

**Returns:** The field value or empty string if not found

**Example:**
```typescript
const cropName = getFieldValue(row.data, 'crop_name');
const area = getFieldValue(row.data, 'area');
```

### `downloadCSV(csvText: string, filename: string): void`

Convert CSV text to a downloadable file.

**Parameters:**
- `csvText`: The CSV content
- `filename`: The filename for download

**Example:**
```typescript
const csv = generateCSV(data);
downloadCSV(csv, 'export.csv');
```

### `createCSVTemplate(headers: string[], exampleRows: (string | number)[][]): string`

Create a CSV template with headers and example rows.

**Parameters:**
- `headers`: Column headers
- `exampleRows`: Example data rows

**Returns:** CSV formatted template string

**Example:**
```typescript
const headers = ['crop_name', 'area', 'nitrogen'];
const examples = [
  ['Wheat', '100', '150'],
  ['Corn', '80', '180'],
];
const template = createCSVTemplate(headers, examples);
downloadCSV(template, 'crop-template.csv');
```

## Data Types

### `ParsedCSVRow`

```typescript
interface ParsedCSVRow {
  data: Record<string, string>;      // Row data as key-value pairs
  rowIndex: number;                  // 1-indexed row number
  errors: string[];                  // Array of validation errors
}
```

### `CSVParseResult`

```typescript
interface CSVParseResult {
  rows: ParsedCSVRow[];              // All parsed rows
  totalRows: number;                 // Total number of rows
  successCount: number;              // Number of valid rows
  errorCount: number;                // Number of rows with errors
  errors: Array<{                    // Detailed error information
    rowIndex: number;
    message: string;
  }>;
}
```

## Usage Patterns

### Pattern 1: Import Crops from CSV

```typescript
async function importCrops(file: File) {
  const result = await parseCSVFile(file);

  // Validate structure
  const validation = validateCSVStructure(result, ['crop_name', 'area', 'nitrogen']);
  if (!validation.isValid) {
    throw new Error(`Missing headers: ${validation.missingHeaders.join(', ')}`);
  }

  // Process valid rows
  const crops = [];
  for (const row of result.rows) {
    if (row.errors.length > 0) continue;

    crops.push({
      name: getFieldValue(row.data, 'crop_name'),
      area: Number(getFieldValue(row.data, 'area')),
      nitrogen: Number(getFieldValue(row.data, 'nitrogen')),
    });
  }

  return crops;
}
```

### Pattern 2: Export Results to CSV

```typescript
function exportResults(results: EmissionResults) {
  const headers = ['Category', 'Emissions (tCO2e)', 'Percentage'];
  const rows = [
    ['Fertilizer', results.fertilizer_emissions.toFixed(2), '...'],
    ['Manure', results.manure_emissions.toFixed(2), '...'],
    // ... more categories
  ];

  const csv = generateCSVFromRows(headers, rows);
  const filename = `farm-emissions-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
}
```

### Pattern 3: Provide CSV Template

```typescript
function downloadTemplate() {
  const headers = ['crop_name', 'area', 'nitrogen', 'phosphorus', 'potassium'];
  const examples = [
    ['Wheat', '100', '150', '50', '40'],
    ['Corn', '80', '180', '60', '50'],
  ];

  const template = createCSVTemplate(headers, examples);
  downloadCSV(template, 'crop-import-template.csv');
}
```

### Pattern 4: Handle Errors Gracefully

```typescript
async function importWithErrorHandling(file: File) {
  try {
    const result = await parseCSVFile(file);

    if (result.errorCount > 0) {
      console.warn(`${result.errorCount} rows have errors:`);
      result.errors.forEach((error) => {
        console.warn(`  Row ${error.rowIndex}: ${error.message}`);
      });
    }

    if (result.successCount === 0) {
      throw new Error('No valid rows found in CSV');
    }

    // Process successful rows
    return result.rows.filter((r) => r.errors.length === 0);
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
```

## Error Handling

The CSV utilities provide detailed error information at multiple levels:

1. **File-level errors**: Parsing failures, encoding issues
2. **Row-level errors**: Empty rows, missing data
3. **Field-level errors**: Invalid values, type mismatches

All errors are collected and returned in the `CSVParseResult.errors` array with row indices for easy identification.

## Performance Considerations

- **Large files**: PapaParse handles files up to several MB efficiently
- **Memory**: Streaming mode available for very large files (not currently exposed)
- **Encoding**: UTF-8 encoding ensures compatibility with international characters

## Browser Compatibility

- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11+ with polyfills
- Mobile browsers (iOS Safari, Chrome Mobile)

## Requirements Mapping

This module implements the following requirements:

- **63.1**: CSV parser library integration
- **63.2**: UTF-8 encoding support
- **63.3**: Quoted field handling
- **63.4**: Error reporting
- **63.5**: Configuration for parser
- **63.6**: Utility wrapper functions
- **63.7**: Comprehensive error details

## See Also

- `csv-example.ts` - Comprehensive usage examples
- `storage-manager.ts` - Data persistence
- `validation-manager.ts` - Input validation
