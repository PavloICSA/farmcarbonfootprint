/**
 * CSV Import for Bulk Crop Data Entry
 * Provides functionality to import crop data from CSV files with fuzzy matching
 * and comprehensive error reporting
 */

import { CropForm, PesticideEntryForm } from '../types/storage';
import { parseCSVFile, getFieldValue, CSVParseResult } from './csv-utils';
import { crops, pesticides } from '../../../shared/calculation-core/src/data';
import type { Crop, Pesticide } from '../../../shared/calculation-core/src/types';

/**
 * Result of importing crops from CSV
 */
export interface CropImportResult {
  crops: CropForm[];
  successCount: number;
  errorCount: number;
  errors: Array<{
    rowIndex: number;
    cropName?: string;
    message: string;
  }>;
  warnings: Array<{
    rowIndex: number;
    cropName?: string;
    message: string;
  }>;
}

/**
 * Fuzzy match a crop name to a crop ID
 * Uses Levenshtein distance for matching
 * @param cropName - The crop name to match
 * @returns The crop ID if found, -1 if not found
 */
export function fuzzyMatchCropName(cropName: string): number {
  if (!cropName || cropName.trim() === '') {
    return -1;
  }

  const normalizedInput = cropName.toLowerCase().trim();

  // First try exact match (case-insensitive)
  const exactMatch = crops.findIndex(
    (crop) => crop.name.toLowerCase() === normalizedInput
  );
  if (exactMatch !== -1) {
    return exactMatch;
  }

  // Calculate Levenshtein distance for fuzzy matching
  const calculateDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // Find best match with distance threshold
  let bestMatch = -1;
  let bestDistance = Infinity;
  const threshold = Math.max(3, Math.ceil(normalizedInput.length * 0.3)); // 30% tolerance

  crops.forEach((crop: Crop, index: number) => {
    const distance = calculateDistance(normalizedInput, crop.name.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = index;
    }
  });

  return bestMatch;
}

/**
 * Fuzzy match a pesticide name to a pesticide ID
 * Matches both trade names and active substances
 * @param pesticideName - The pesticide name or substance to match
 * @returns The pesticide ID if found, -1 if not found
 */
export function fuzzyMatchPesticideName(pesticideName: string): number {
  if (!pesticideName || pesticideName.trim() === '') {
    return -1;
  }

  const normalizedInput = pesticideName.toLowerCase().trim();

  // First try exact match on trade name or substance
  const exactMatch = pesticides.findIndex(
    (p: Pesticide) =>
      p.trade_name.toLowerCase() === normalizedInput ||
      p.substance.toLowerCase() === normalizedInput
  );
  if (exactMatch !== -1) {
    return exactMatch;
  }

  // Try partial match on trade name or substance
  const partialMatch = pesticides.findIndex(
    (p: Pesticide) =>
      p.trade_name.toLowerCase().includes(normalizedInput) ||
      p.substance.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(p.trade_name.toLowerCase()) ||
      normalizedInput.includes(p.substance.toLowerCase())
  );

  return partialMatch;
}

/**
 * Validate a numeric field value
 * @param value - The value to validate
 * @param fieldName - The field name for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Error message if invalid, null if valid
 */
function validateNumericField(
  value: string,
  fieldName: string,
  min: number = 0,
  max: number = 100000
): string | null {
  if (!value || value.trim() === '') {
    return null; // Empty is allowed, will use default
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }

  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (num > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Import crops from a CSV file
 * Supports columns: crop_name, area, nitrogen, phosphorus, potassium, manure, diesel, irrigation, pesticide
 * @param file - The CSV file to import
 * @returns Promise resolving to import results with errors and warnings
 */
export async function importCropsFromCSV(file: File): Promise<CropImportResult> {
  try {
    const parseResult = await parseCSVFile(file);
    const importedCrops: CropForm[] = [];
    const errors: CropImportResult['errors'] = [];
    const warnings: CropImportResult['warnings'] = [];

    // Process each row
    parseResult.rows.forEach((row) => {
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Skip rows with existing parse errors
      if (row.errors.length > 0) {
        errors.push({
          rowIndex: row.rowIndex,
          message: row.errors.join('; '),
        });
        return;
      }

      // Get crop name
      const cropNameRaw = getFieldValue(row.data, 'crop_name');
      if (!cropNameRaw) {
        rowErrors.push('Crop name is required');
      }

      // Match crop name to ID
      let cropId = -1;
      if (cropNameRaw) {
        cropId = fuzzyMatchCropName(cropNameRaw);
        if (cropId === -1) {
          rowErrors.push(`Crop "${cropNameRaw}" not found in database`);
        } else if (cropNameRaw.toLowerCase() !== crops[cropId].name.toLowerCase()) {
          rowWarnings.push(
            `Crop name "${cropNameRaw}" matched to "${crops[cropId].name}"`
          );
        }
      }

      // Validate area
      const areaRaw = getFieldValue(row.data, 'area');
      const areaError = validateNumericField(areaRaw, 'Area', 0.01, 100000);
      if (areaError) {
        rowErrors.push(areaError);
      }

      // Validate numeric fields
      const nitrogenError = validateNumericField(
        getFieldValue(row.data, 'nitrogen'),
        'Nitrogen',
        0,
        500
      );
      if (nitrogenError) {
        rowErrors.push(nitrogenError);
      }

      const phosphorusError = validateNumericField(
        getFieldValue(row.data, 'phosphorus'),
        'Phosphorus',
        0,
        300
      );
      if (phosphorusError) {
        rowErrors.push(phosphorusError);
      }

      const potassiumError = validateNumericField(
        getFieldValue(row.data, 'potassium'),
        'Potassium',
        0,
        300
      );
      if (potassiumError) {
        rowErrors.push(potassiumError);
      }

      const manureError = validateNumericField(
        getFieldValue(row.data, 'manure'),
        'Manure',
        0,
        500
      );
      if (manureError) {
        rowErrors.push(manureError);
      }

      const dieselError = validateNumericField(
        getFieldValue(row.data, 'diesel'),
        'Diesel',
        0,
        200
      );
      if (dieselError) {
        rowErrors.push(dieselError);
      }

      const irrigationError = validateNumericField(
        getFieldValue(row.data, 'irrigation'),
        'Irrigation',
        0,
        2000
      );
      if (irrigationError) {
        rowErrors.push(irrigationError);
      }

      // If there are errors, don't add this crop
      if (rowErrors.length > 0) {
        errors.push({
          rowIndex: row.rowIndex,
          cropName: cropNameRaw,
          message: rowErrors.join('; '),
        });
        return;
      }

      // Build pesticide entries
      const pesticideEntries: PesticideEntryForm[] = [];
      const pesticideRaw = getFieldValue(row.data, 'pesticide');
      if (pesticideRaw) {
        const pesticideId = fuzzyMatchPesticideName(pesticideRaw);
        if (pesticideId !== -1) {
          pesticideEntries.push({
            pesticide_id: pesticideId.toString(),
            rate: '1', // Default rate
          });
          if (pesticideRaw.toLowerCase() !== pesticides[pesticideId].trade_name.toLowerCase()) {
            rowWarnings.push(
              `Pesticide "${pesticideRaw}" matched to "${pesticides[pesticideId].trade_name}"`
            );
          }
        } else {
          rowWarnings.push(`Pesticide "${pesticideRaw}" not found in database`);
        }
      }

      // Create crop form entry
      const cropForm: CropForm = {
        crop_id: cropId,
        area: areaRaw || '0',
        nitrogen: getFieldValue(row.data, 'nitrogen') || '0',
        phosphorus: getFieldValue(row.data, 'phosphorus') || '0',
        potassium: getFieldValue(row.data, 'potassium') || '0',
        manure: getFieldValue(row.data, 'manure') || '0',
        diesel: getFieldValue(row.data, 'diesel') || '0',
        irrigation: getFieldValue(row.data, 'irrigation') || '0',
        pesticides: pesticideEntries.length > 0 ? pesticideEntries : [{ pesticide_id: '-1', rate: '0' }],
      };

      importedCrops.push(cropForm);

      // Add warnings if any
      if (rowWarnings.length > 0) {
        warnings.push({
          rowIndex: row.rowIndex,
          cropName: cropNameRaw,
          message: rowWarnings.join('; '),
        });
      }
    });

    return {
      crops: importedCrops,
      successCount: importedCrops.length,
      errorCount: errors.length,
      errors,
      warnings,
    };
  } catch (error) {
    throw new Error(
      `Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a CSV template for crop import
 * @returns CSV formatted template string
 */
export function generateCropImportTemplate(): string {
  const headers = [
    'crop_name',
    'area',
    'nitrogen',
    'phosphorus',
    'potassium',
    'manure',
    'diesel',
    'irrigation',
    'pesticide',
  ];

  const examples = [
    ['Wheat', '50', '120', '60', '30', '10', '15', '450', 'Roundup'],
    ['Maize', '75', '150', '70', '40', '15', '20', '500', 'Atrazine'],
    ['Soybean', '40', '20', '50', '30', '5', '10', '400', ''],
  ];

  const rows = [headers, ...examples];

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Download the crop import template
 */
export function downloadCropImportTemplate(): void {
  const template = generateCropImportTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'crop-import-template.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
