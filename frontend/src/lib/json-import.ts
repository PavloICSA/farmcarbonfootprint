/**
 * JSON Import with Validation and Error Handling
 * Handles importing previously exported JSON files with comprehensive validation,
 * backward compatibility, and error recovery
 */

import { FarmForm, CropPractice, CropForm, PesticideEntryForm } from '../types/storage';
import { ExportData, validateExportData } from './json-export';

type Lang = 'en' | 'ua';

/**
 * Result of JSON import operation
 */
export interface JSONImportResult {
  success: boolean;
  data?: {
    farmForm: FarmForm;
    practices: CropPractice[];
  };
  error?: string;
  warnings?: string[];
  version?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Parse JSON string with error handling
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null if invalid
 * @throws Error with descriptive message
 */
function parseJSONString(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Provide helpful error message with position info
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const context = jsonString.substring(Math.max(0, position - 20), position + 20);
        throw new Error(`Invalid JSON at position ${position}: ...${context}...`);
      }
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate and normalize a pesticide entry
 */
function validatePesticideEntry(entry: unknown): PesticideEntryForm {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Pesticide entry must be an object');
  }

  const obj = entry as Record<string, unknown>;
  const pesticide_id = String(obj.pesticide_id ?? '-1');
  const rate = String(obj.rate ?? '0');

  return { pesticide_id, rate };
}

/**
 * Validate and normalize a crop form
 */
function validateCropForm(crop: unknown): CropForm {
  if (!crop || typeof crop !== 'object') {
    throw new Error('Crop must be an object');
  }

  const obj = crop as Record<string, unknown>;

  const cropForm: CropForm = {
    crop_id: Number(obj.crop_id ?? 0),
    area: String(obj.area ?? '0'),
    nitrogen: String(obj.nitrogen ?? '0'),
    phosphorus: String(obj.phosphorus ?? '0'),
    potassium: String(obj.potassium ?? '0'),
    manure: String(obj.manure ?? '0'),
    compost: String(obj.compost ?? '0'),
    greenManure: String(obj.greenManure ?? '0'),
    diesel: String(obj.diesel ?? '0'),
    irrigation: String(obj.irrigation ?? '0'),
    yield: String(obj.yield ?? '0'),
    bioPest: String(obj.bioPest ?? '0'),
    season: (obj.season as CropForm['season']) ?? 'spring',
    scheduleMode: (obj.scheduleMode as CropForm['scheduleMode']) ?? 'annual',
    schedule: typeof obj.schedule === 'object' && obj.schedule
      ? {
          fertilizer: Array.isArray((obj.schedule as Record<string, unknown>).fertilizer)
            ? (obj.schedule as Record<string, unknown>).fertilizer as number[]
            : [],
          pesticide: Array.isArray((obj.schedule as Record<string, unknown>).pesticide)
            ? (obj.schedule as Record<string, unknown>).pesticide as number[]
            : [],
          irrigation: Array.isArray((obj.schedule as Record<string, unknown>).irrigation)
            ? (obj.schedule as Record<string, unknown>).irrigation as number[]
            : [],
        }
      : undefined,
    pesticides: Array.isArray(obj.pesticides)
      ? obj.pesticides.map(validatePesticideEntry)
      : [],
  };

  return cropForm;
}

/**
 * Validate and normalize a farm form
 */
function validateFarmForm(data: unknown): FarmForm {
  if (!data || typeof data !== 'object') {
    throw new Error('Farm data must be an object');
  }

  const obj = data as Record<string, unknown>;

  const farmForm: FarmForm = {
    totalArea: String(obj.totalArea ?? '0'),
    dairyCows: String(obj.dairyCows ?? '0'),
    pigs: String(obj.pigs ?? '0'),
    chickens: String(obj.chickens ?? '0'),
    crops: Array.isArray(obj.crops)
      ? obj.crops.map(validateCropForm)
      : [],
  };

  return farmForm;
}

/**
 * Validate and normalize crop practices
 */
function validateCropPractice(practice: unknown): CropPractice {
  if (!practice || typeof practice !== 'object') {
    throw new Error('Practice must be an object');
  }

  const obj = practice as Record<string, unknown>;

  // Define valid enum values
  const validTillage = [
    'moldboard_plowing',
    'disk_tillage',
    'chisel_tillage',
    'strip_till',
    'ridge_till',
    'no_till',
  ];
  const validIrrigationMethod = [
    'none',
    'furrow_surface',
    'basin_flood',
    'sprinkler',
    'center_pivot',
    'drip',
    'subsurface_drip',
  ];
  const validIrrigationEnergy = ['grid', 'diesel_pump', 'solar'];
  const validResidue = ['incorporate', 'retain', 'burn'];

  const tillage = String(obj.tillage ?? 'moldboard_plowing');
  if (!validTillage.includes(tillage)) {
    throw new Error(`Invalid tillage value: ${tillage}`);
  }

  const irrigationMethod = String(obj.irrigationMethod ?? 'furrow_surface');
  if (!validIrrigationMethod.includes(irrigationMethod)) {
    throw new Error(`Invalid irrigation method: ${irrigationMethod}`);
  }

  const irrigationEnergy = String(obj.irrigationEnergy ?? 'grid');
  if (!validIrrigationEnergy.includes(irrigationEnergy)) {
    throw new Error(`Invalid irrigation energy: ${irrigationEnergy}`);
  }

  const residue = String(obj.residue ?? 'incorporate');
  if (!validResidue.includes(residue)) {
    throw new Error(`Invalid residue value: ${residue}`);
  }

  return {
    tillage: tillage as any,
    precisionFertilization: Boolean(obj.precisionFertilization ?? false),
    coverCrop: Boolean(obj.coverCrop ?? false),
    irrigationMethod: irrigationMethod as any,
    irrigationEnergy: irrigationEnergy as any,
    residue: residue as any,
  };
}

/**
 * Validate numeric string values
 */
function validateNumericString(value: string, fieldName: string): void {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number, got: ${value}`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} must be non-negative, got: ${value}`);
  }
}

/**
 * Validate all numeric fields in farm form
 */
function validateFarmFormNumbers(farmForm: FarmForm): void {
  validateNumericString(farmForm.totalArea, 'Total area');
  validateNumericString(farmForm.dairyCows, 'Dairy cows');
  validateNumericString(farmForm.pigs, 'Pigs');
  validateNumericString(farmForm.chickens, 'Chickens');

  farmForm.crops.forEach((crop, index) => {
    validateNumericString(crop.area, `Crop ${index + 1} area`);
    validateNumericString(crop.nitrogen, `Crop ${index + 1} nitrogen`);
    validateNumericString(crop.phosphorus, `Crop ${index + 1} phosphorus`);
    validateNumericString(crop.potassium, `Crop ${index + 1} potassium`);
    validateNumericString(crop.manure, `Crop ${index + 1} manure`);
    validateNumericString(crop.diesel, `Crop ${index + 1} diesel`);
    validateNumericString(crop.irrigation, `Crop ${index + 1} irrigation`);

    crop.pesticides.forEach((pesticide, pIndex) => {
      validateNumericString(pesticide.rate, `Crop ${index + 1} pesticide ${pIndex + 1} rate`);
    });
  });
}

/**
 * Validate practices array length matches crops
 */
function validatePracticesLength(
  farmForm: FarmForm,
  practices: CropPractice[]
): void {
  if (practices.length !== farmForm.crops.length) {
    throw new Error(
      `Number of practices (${practices.length}) must match number of crops (${farmForm.crops.length})`
    );
  }
}

/**
 * Import JSON data with comprehensive validation
 * Supports backward compatibility with previous versions
 *
 * @param jsonString - JSON string to import
 * @returns Import result with data or error information
 */
export function importFromJSON(jsonString: string): JSONImportResult {
  const warnings: string[] = [];

  try {
    // Step 1: Parse JSON
    const parsed = parseJSONString(jsonString);

    // Step 2: Validate against schema
    let exportData: ExportData;
    try {
      exportData = validateExportData(parsed);
    } catch (error) {
      // If strict validation fails, try lenient parsing for backward compatibility
      if (error instanceof Error && 'issues' in error) {
        console.warn('Strict validation failed, attempting lenient parsing:', (error as any).issues);
        warnings.push('File format is not fully compatible, attempting to recover data...');

        // Try lenient parsing
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !('data' in parsed) ||
          !('practices' in parsed)
        ) {
          throw new Error(
            'Invalid export format: missing required fields (data, practices)'
          );
        }

        exportData = parsed as ExportData;
      } else {
        throw error;
      }
    }

    // Step 3: Validate and normalize farm form
    let farmForm: FarmForm;
    try {
      farmForm = validateFarmForm(exportData.data);
      validateFarmFormNumbers(farmForm);
    } catch (error) {
      throw new Error(
        `Invalid farm data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 4: Validate and normalize practices
    let practices: CropPractice[];
    try {
      if (!Array.isArray(exportData.practices)) {
        throw new Error('Practices must be an array');
      }

      practices = exportData.practices.map((practice: unknown, index: number) => {
        try {
          return validateCropPractice(practice);
        } catch (error) {
          throw new Error(
            `Invalid practice at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });
    } catch (error) {
      throw new Error(
        `Invalid practices data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 5: Validate practices length matches crops
    try {
      validatePracticesLength(farmForm, practices);
    } catch (error) {
      throw new Error(
        `Data mismatch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 6: Check version compatibility
    const version = exportData.version || 'unknown';
    if (version !== '1.0.0') {
      warnings.push(`File was exported from version ${version}, current version is 1.0.0`);
    }

    return {
      success: true,
      data: { farmForm, practices },
      warnings: warnings.length > 0 ? warnings : undefined,
      version,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Import JSON from file
 * @param file - File object to import
 * @returns Promise resolving to import result
 */
export function importFromJSONFile(file: File): Promise<JSONImportResult> {
  return new Promise((resolve) => {
    // Validate file type
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      resolve({
        success: false,
        error: 'File must be a JSON file (.json)',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      resolve({
        success: false,
        error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`,
      });
      return;
    }

    // Read file
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          resolve({
            success: false,
            error: 'Failed to read file content',
          });
          return;
        }

        const result = importFromJSON(content);
        resolve(result);
      } catch (err) {
        resolve({
          success: false,
          error: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Create a file upload input element
 * @param onFile - Callback when file is selected
 * @returns HTMLInputElement
 */
export function createFileUploadInput(onFile: (file: File) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';

  input.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (files && files.length > 0) {
      onFile(files[0]);
    }

    // Reset input so same file can be selected again
    input.value = '';
  });

  return input;
}

/**
 * Trigger file upload dialog
 * @param onFile - Callback when file is selected
 */
export function triggerFileUpload(onFile: (file: File) => void): void {
  const input = createFileUploadInput(onFile);
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}
