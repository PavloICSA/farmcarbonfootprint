/**
 * JSON Export for Complete Farm Data
 * Exports all form inputs, practices, and results to JSON format with Zod schema validation
 * Supports bilingual output and data backup/sharing
 */

import { z } from 'zod';
import { FarmForm, CropPractice, CropForm, PesticideEntryForm } from '../types/storage';
import { EmissionResults } from '../../../shared/calculation-core/src';

type Lang = 'en' | 'ua';

/**
 * Zod schema for validating pesticide entries
 */
const PesticideEntrySchema = z.object({
  pesticide_id: z.string(),
  rate: z.string(),
});

/**
 * Zod schema for validating crop form data
 */
const CropFormSchema = z.object({
  crop_id: z.number().int().min(0),
  area: z.string(),
  nitrogen: z.string(),
  phosphorus: z.string(),
  potassium: z.string(),
  manure: z.string(),
  compost: z.string().optional(),
  greenManure: z.string().optional(),
  diesel: z.string(),
  irrigation: z.string(),
  yield: z.string().optional(),
  bioPest: z.string().optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  scheduleMode: z.enum(['annual', 'monthly']).optional(),
  schedule: z.object({
    fertilizer: z.array(z.number()),
    pesticide: z.array(z.number()),
    irrigation: z.array(z.number()),
  }).optional(),
  pesticides: z.array(PesticideEntrySchema),
});

/**
 * Zod schema for validating farm form data
 */
const FarmFormSchema = z.object({
  totalArea: z.string(),
  dairyCows: z.string(),
  pigs: z.string(),
  chickens: z.string(),
  crops: z.array(CropFormSchema),
});

/**
 * Zod schema for validating crop practices
 */
const CropPracticeSchema = z.object({
  tillage: z.enum([
    'moldboard_plowing',
    'disk_tillage',
    'chisel_tillage',
    'strip_till',
    'ridge_till',
    'no_till',
  ]),
  precisionFertilization: z.boolean(),
  coverCrop: z.boolean(),
  irrigationMethod: z.enum([
    'none',
    'furrow_surface',
    'basin_flood',
    'sprinkler',
    'center_pivot',
    'drip',
    'subsurface_drip',
  ]),
  irrigationEnergy: z.enum(['grid', 'diesel_pump', 'solar']),
  residue: z.enum(['incorporate', 'retain', 'burn']),
});

/**
 * Zod schema for emission results
 */
const EmissionResultsSchema = z.object({
  total_emissions: z.number(),
  per_hectare_emissions: z.number(),
  num_crops: z.number(),
  fertilizer_emissions: z.number(),
  manure_emissions: z.number(),
  fuel_emissions: z.number(),
  irrigation_emissions: z.number(),
  pesticide_emissions: z.number(),
  livestock_emissions: z.number(),
  crop_results: z.array(
    z.object({
      crop_id: z.number(),
      area: z.number(),
      fertilizer_emissions: z.number(),
      manure_emissions: z.number(),
      fuel_emissions: z.number(),
      irrigation_emissions: z.number(),
      pesticide_emissions: z.number(),
      livestock_emissions: z.number(),
      total_emissions: z.number(),
    })
  ),
});

/**
 * Zod schema for export metadata
 */
const ExportMetadataSchema = z.object({
  version: z.string().optional(),
  customFactors: z.boolean().optional(),
}).optional();

/**
 * Zod schema for complete export data
 */
const ExportDataSchema = z.object({
  version: z.string(),
  exportDate: z.string().datetime(),
  appVersion: z.string(),
  language: z.enum(['en', 'ua']),
  data: FarmFormSchema,
  practices: z.array(CropPracticeSchema),
  results: EmissionResultsSchema.optional(),
  metadata: ExportMetadataSchema,
});

/**
 * TypeScript type derived from Zod schema
 */
export type ExportData = z.infer<typeof ExportDataSchema>;

/**
 * Validate export data against schema
 * Throws error if validation fails
 *
 * @param data - Data to validate
 * @returns Validated data
 * @throws Error if validation fails
 */
export function validateExportData(data: unknown): ExportData {
  return ExportDataSchema.parse(data);
}

/**
 * Create export data object with all required fields
 *
 * @param farmForm - The farm form data
 * @param practices - The crop practices
 * @param results - Optional emission results
 * @param language - Language setting
 * @returns Export data object
 */
export function createExportData(
  farmForm: FarmForm,
  practices: CropPractice[],
  results?: EmissionResults,
  language: Lang = 'en'
): ExportData {
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    appVersion: '0.1.0',
    language,
    data: farmForm,
    practices,
    results,
    metadata: {
      version: '1.0.0',
      customFactors: false,
    },
  };

  // Validate before returning
  return validateExportData(exportData);
}

/**
 * Export farm data to JSON string
 *
 * @param farmForm - The farm form data
 * @param practices - The crop practices
 * @param results - Optional emission results
 * @param language - Language setting
 * @returns JSON string
 * @throws Error if validation fails
 */
export function exportToJSON(
  farmForm: FarmForm,
  practices: CropPractice[],
  results?: EmissionResults,
  language: Lang = 'en'
): string {
  const exportData = createExportData(farmForm, practices, results, language);
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import JSON data and validate against schema
 *
 * @param jsonString - JSON string to import
 * @returns Validated export data
 * @throws Error if JSON is invalid or validation fails
 */
export function importFromJSON(jsonString: string): ExportData {
  try {
    const parsed = JSON.parse(jsonString);
    return validateExportData(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Validation failed: ${issues}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error during import');
  }
}

/**
 * Download JSON data as a file
 *
 * @param farmForm - The farm form data
 * @param practices - The crop practices
 * @param results - Optional emission results
 * @param language - Language setting
 */
export function downloadAsJSON(
  farmForm: FarmForm,
  practices: CropPractice[],
  results?: EmissionResults,
  language: Lang = 'en'
): void {
  try {
    const jsonContent = exportToJSON(farmForm, practices, results, language);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
