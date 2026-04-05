/**
 * CSV Utilities Example
 * Demonstrates how to use the CSV parsing and generation functions
 */

import {
  parseCSVFile,
  parseCSVText,
  generateCSV,
  generateCSVFromRows,
  validateCSVStructure,
  getFieldValue,
  downloadCSV,
  createCSVTemplate,
} from './csv-utils';

/**
 * Example 1: Parse a CSV file from user upload
 */
export async function exampleParseCSVFile(file: File) {
  try {
    const result = await parseCSVFile(file);

    console.log(`Total rows: ${result.totalRows}`);
    console.log(`Successful rows: ${result.successCount}`);
    console.log(`Rows with errors: ${result.errorCount}`);

    // Process successful rows
    result.rows.forEach((row) => {
      if (row.errors.length === 0) {
        console.log(`Row ${row.rowIndex}:`, row.data);
      }
    });

    // Report errors
    if (result.errors.length > 0) {
      console.error('Parse errors:');
      result.errors.forEach((error) => {
        console.error(`  Row ${error.rowIndex}: ${error.message}`);
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to parse CSV file:', error);
    throw error;
  }
}

/**
 * Example 2: Parse CSV text content
 */
export function exampleParseCSVText() {
  const csvText = `crop_name,area,nitrogen,phosphorus,potassium
Wheat,100,150,50,40
Corn,80,180,60,50
Barley,60,120,40,30`;

  const result = parseCSVText(csvText);

  console.log('Parsed rows:');
  result.rows.forEach((row) => {
    if (row.errors.length === 0) {
      const cropName = getFieldValue(row.data, 'crop_name');
      const area = getFieldValue(row.data, 'area');
      console.log(`  ${cropName}: ${area} ha`);
    }
  });

  return result;
}

/**
 * Example 3: Validate CSV structure
 */
export function exampleValidateCSVStructure() {
  const csvText = `crop_name,area,nitrogen
Wheat,100,150
Corn,80,180`;

  const parseResult = parseCSVText(csvText);

  const expectedHeaders = ['crop_name', 'area', 'nitrogen', 'phosphorus'];
  const validation = validateCSVStructure(parseResult, expectedHeaders);

  console.log('Validation result:', validation);
  // Output: { isValid: false, missingHeaders: ['phosphorus'], extraHeaders: [] }

  return validation;
}

/**
 * Example 4: Generate CSV from data array
 */
export function exampleGenerateCSV() {
  const data = [
    { crop_name: 'Wheat', area: '100', nitrogen: '150' },
    { crop_name: 'Corn', area: '80', nitrogen: '180' },
    { crop_name: 'Barley', area: '60', nitrogen: '120' },
  ];

  const csvText = generateCSV(data);
  console.log('Generated CSV:');
  console.log(csvText);

  return csvText;
}

/**
 * Example 5: Generate CSV from headers and rows
 */
export function exampleGenerateCSVFromRows() {
  const headers = ['Crop', 'Area (ha)', 'Nitrogen (kg/ha)'];
  const rows = [
    ['Wheat', '100', '150'],
    ['Corn', '80', '180'],
    ['Barley', '60', '120'],
  ];

  const csvText = generateCSVFromRows(headers, rows);
  console.log('Generated CSV from rows:');
  console.log(csvText);

  return csvText;
}

/**
 * Example 6: Create and download CSV template
 */
export function exampleCreateAndDownloadTemplate() {
  const headers = ['crop_name', 'area', 'nitrogen', 'phosphorus', 'potassium', 'manure', 'diesel', 'irrigation'];
  const exampleRows = [
    ['Wheat', '100', '150', '50', '40', '0', '50', '0'],
    ['Corn', '80', '180', '60', '50', '10', '60', '100'],
    ['Barley', '60', '120', '40', '30', '0', '40', '0'],
  ];

  const csvText = createCSVTemplate(headers, exampleRows);

  // Download the template
  downloadCSV(csvText, 'crop-import-template.csv');
}

/**
 * Example 7: Process CSV import with error handling
 */
export async function exampleProcessCSVImport(file: File) {
  try {
    const result = await parseCSVFile(file);

    // Validate structure
    const expectedHeaders = ['crop_name', 'area', 'nitrogen'];
    const validation = validateCSVStructure(result, expectedHeaders);

    if (!validation.isValid) {
      console.error('CSV structure invalid');
      console.error('Missing headers:', validation.missingHeaders);
      return null;
    }

    // Process rows
    const crops = [];
    for (const row of result.rows) {
      if (row.errors.length > 0) {
        console.warn(`Skipping row ${row.rowIndex}: ${row.errors.join('; ')}`);
        continue;
      }

      const cropName = getFieldValue(row.data, 'crop_name');
      const area = getFieldValue(row.data, 'area');
      const nitrogen = getFieldValue(row.data, 'nitrogen');

      // Validate numeric fields
      if (isNaN(Number(area)) || isNaN(Number(nitrogen))) {
        console.warn(`Row ${row.rowIndex}: Invalid numeric values`);
        continue;
      }

      crops.push({
        name: cropName,
        area: Number(area),
        nitrogen: Number(nitrogen),
      });
    }

    console.log(`Successfully imported ${crops.length} crops`);
    return crops;
  } catch (error) {
    console.error('CSV import failed:', error);
    throw error;
  }
}

/**
 * Example 8: Export calculation results to CSV
 */
export function exampleExportResultsToCSV() {
  const headers = ['Category', 'Emissions (tCO2e)', 'Percentage'];
  const rows = [
    ['Fertilizer', '45.2', '35.5%'],
    ['Manure', '28.1', '22.0%'],
    ['Fuel', '32.5', '25.5%'],
    ['Irrigation', '12.3', '9.6%'],
    ['Pesticide', '8.9', '7.0%'],
    ['Livestock', '0.0', '0.0%'],
    ['Poultry', '0.0', '0.0%'],
  ];

  const csvText = generateCSVFromRows(headers, rows);

  // Download the results
  const filename = `farm-emissions-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvText, filename);
}

/**
 * Example 9: Handle CSV parsing errors gracefully
 */
export async function exampleErrorHandling(file: File) {
  try {
    const result = await parseCSVFile(file);

    if (result.errorCount > 0) {
      console.warn(`CSV has ${result.errorCount} rows with errors:`);
      result.errors.forEach((error) => {
        console.warn(`  Row ${error.rowIndex}: ${error.message}`);
      });

      // Decide whether to proceed with partial data
      if (result.successCount === 0) {
        throw new Error('No valid rows found in CSV');
      }

      // Proceed with successful rows
      console.log(`Proceeding with ${result.successCount} valid rows`);
    }

    return result;
  } catch (error) {
    console.error('CSV processing error:', error);
    // Show user-friendly error message
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

/**
 * Example 10: Fuzzy match crop names from CSV
 */
export function exampleFuzzyMatchCropNames() {
  // Simulated crop database
  const cropDatabase = [
    { id: 1, name: 'Wheat', aliases: ['winter wheat', 'spring wheat'] },
    { id: 2, name: 'Corn', aliases: ['maize', 'corn grain'] },
    { id: 3, name: 'Barley', aliases: ['winter barley', 'spring barley'] },
  ];

  function fuzzyMatch(input: string, crops: typeof cropDatabase): typeof cropDatabase[0] | null {
    const inputLower = input.toLowerCase().trim();

    // Exact match
    let match = crops.find((c) => c.name.toLowerCase() === inputLower);
    if (match) return match;

    // Alias match
    match = crops.find((c) => c.aliases.some((a) => a.toLowerCase() === inputLower));
    if (match) return match;

    // Partial match
    match = crops.find((c) => c.name.toLowerCase().includes(inputLower) || inputLower.includes(c.name.toLowerCase()));
    if (match) return match;

    return null;
  }

  // Test fuzzy matching
  const testInputs = ['wheat', 'Corn', 'winter barley', 'maize', 'unknown'];
  testInputs.forEach((input) => {
    const match = fuzzyMatch(input, cropDatabase);
    console.log(`"${input}" -> ${match ? match.name : 'No match'}`);
  });
}
