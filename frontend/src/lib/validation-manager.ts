/**
 * Validation Manager for Farm Carbon Footprint App
 * 
 * Provides comprehensive validation for form inputs including:
 * - Numeric input validation with range checking
 * - Area matching validation (total vs crop areas)
 * - Minimum data requirement validation
 * - Valid reference ID validation for crops and pesticides
 */

import { crops, pesticides } from '../../../shared/calculation-core/src';
import type { FarmForm, CropForm, PesticideEntryForm, Lang } from '../types/storage';

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
  cropIndex?: number;
  pesticideIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

export interface ValidationManager {
  validateForm(form: FarmForm, language: Lang): ValidationResult;
  validateCrop(crop: CropForm, index: number, language: Lang): ValidationError[];
  validateNumericInput(value: string, min: number, max: number, fieldName: string, language: Lang): ValidationError | null;
  validateAreaMatch(totalArea: string, crops: CropForm[], language: Lang): ValidationError | null;
  validateMinimumData(form: FarmForm, language: Lang): ValidationError[];
  validateReferenceIds(form: FarmForm, language: Lang): ValidationError[];
}

// Validation messages dictionary
const validationMessages = {
  en: {
    notANumber: 'Must be a valid number',
    mustBePositive: 'Must be a positive number',
    mustBeNonNegative: 'Must be zero or greater',
    outOfRange: 'Must be between {min} and {max}',
    areaMismatch: 'Total crop area ({cropTotal} ha) must equal total farm area ({farmTotal} ha)',
    invalidCropId: 'Invalid crop selection',
    invalidPesticideId: 'Invalid pesticide selection',
    minimumDataRequired: 'Enter at least total farm area or one livestock value',
    cropAreaRequired: 'Crop area is required',
    cropSelectionRequired: 'Crop selection is required',
    excessiveValue: 'Value seems unusually high (>{max})',
    totalAreaRequired: 'Total farm area is required when crops are present',
  },
  ua: {
    notANumber: 'Має бути дійсним числом',
    mustBePositive: 'Має бути додатним числом',
    mustBeNonNegative: 'Має бути нулем або більше',
    outOfRange: 'Має бути між {min} та {max}',
    areaMismatch: 'Загальна площа культур ({cropTotal} га) має дорівнювати загальній площі господарства ({farmTotal} га)',
    invalidCropId: 'Невірний вибір культури',
    invalidPesticideId: 'Невірний вибір пестициду',
    minimumDataRequired: 'Введіть принаймні загальну площу господарства або одне значення тваринництва',
    cropAreaRequired: 'Площа культури обов\'язкова',
    cropSelectionRequired: 'Вибір культури обов\'язковий',
    excessiveValue: 'Значення здається незвично високим (>{max})',
    totalAreaRequired: 'Загальна площа господарства обов\'язкова, коли є культури',
  },
};

/**
 * Parse string input to decimal number
 */
function decimalValue(input: string): number {
  const n = Number(input.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Parse string input to integer
 */
function intValue(input: string): number {
  const n = decimalValue(input);
  return Number.isNaN(n) ? NaN : Math.round(n);
}

/**
 * Check if a string represents a valid number
 */
function isValidNumber(value: string): boolean {
  const n = decimalValue(value);
  return !Number.isNaN(n) && Number.isFinite(n);
}

/**
 * Format message with placeholders
 */
function formatMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

/**
 * Create validation manager instance
 */
export function createValidationManager(): ValidationManager {
  return {
    validateForm(form: FarmForm, language: Lang): ValidationResult {
      const errors: ValidationError[] = [];

      // Validate farm-level fields
      const totalAreaError = this.validateNumericInput(
        form.totalArea,
        0,
        1000000,
        'totalArea',
        language
      );
      if (totalAreaError) {
        errors.push(totalAreaError);
      }

      const dairyError = this.validateNumericInput(
        form.dairyCows,
        0,
        100000,
        'dairyCows',
        language
      );
      if (dairyError) {
        errors.push(dairyError);
      }

      const pigsError = this.validateNumericInput(
        form.pigs,
        0,
        1000000,
        'pigs',
        language
      );
      if (pigsError) {
        errors.push(pigsError);
      }

      const chickensError = this.validateNumericInput(
        form.chickens,
        0,
        10000000,
        'chickens',
        language
      );
      if (chickensError) {
        errors.push(chickensError);
      }

      // Validate each crop
      form.crops.forEach((crop, index) => {
        const cropErrors = this.validateCrop(crop, index, language);
        errors.push(...cropErrors);
      });

      // Validate area matching
      const areaMatchError = this.validateAreaMatch(form.totalArea, form.crops, language);
      if (areaMatchError) {
        errors.push(areaMatchError);
      }

      // Validate minimum data requirements
      const minDataErrors = this.validateMinimumData(form, language);
      errors.push(...minDataErrors);

      // Validate reference IDs
      const refIdErrors = this.validateReferenceIds(form, language);
      errors.push(...refIdErrors);

      const hasErrors = errors.some(e => e.type === 'error');
      const hasWarnings = errors.some(e => e.type === 'warning');

      return {
        isValid: !hasErrors,
        errors,
        hasErrors,
        hasWarnings,
      };
    },

    validateCrop(crop: CropForm, index: number, language: Lang): ValidationError[] {
      const errors: ValidationError[] = [];
      const t = validationMessages[language];

      // Validate crop area
      const areaError = this.validateNumericInput(
        crop.area,
        0,
        1000000,
        'area',
        language
      );
      if (areaError) {
        errors.push({ ...areaError, cropIndex: index });
      }

      // Validate nitrogen
      const nitrogenError = this.validateNumericInput(
        crop.nitrogen,
        0,
        1000,
        'nitrogen',
        language
      );
      if (nitrogenError) {
        errors.push({ ...nitrogenError, cropIndex: index });
      }

      // Validate phosphorus
      const phosphorusError = this.validateNumericInput(
        crop.phosphorus,
        0,
        500,
        'phosphorus',
        language
      );
      if (phosphorusError) {
        errors.push({ ...phosphorusError, cropIndex: index });
      }

      // Validate potassium
      const potassiumError = this.validateNumericInput(
        crop.potassium,
        0,
        500,
        'potassium',
        language
      );
      if (potassiumError) {
        errors.push({ ...potassiumError, cropIndex: index });
      }

      // Validate manure
      const manureError = this.validateNumericInput(
        crop.manure,
        0,
        200,
        'manure',
        language
      );
      if (manureError) {
        errors.push({ ...manureError, cropIndex: index });
      }

      // Validate diesel
      const dieselError = this.validateNumericInput(
        crop.diesel,
        0,
        500,
        'diesel',
        language
      );
      if (dieselError) {
        errors.push({ ...dieselError, cropIndex: index });
      }

      // Validate irrigation
      const irrigationError = this.validateNumericInput(
        crop.irrigation,
        0,
        2000,
        'irrigation',
        language
      );
      if (irrigationError) {
        errors.push({ ...irrigationError, cropIndex: index });
      }

      // Validate pesticides
      crop.pesticides.forEach((pesticide, pestIndex) => {
        const rateError = this.validateNumericInput(
          pesticide.rate,
          0,
          100,
          'pesticideRate',
          language
        );
        if (rateError) {
          errors.push({
            ...rateError,
            cropIndex: index,
            pesticideIndex: pestIndex,
          });
        }
      });

      return errors;
    },

    validateNumericInput(
      value: string,
      min: number,
      max: number,
      fieldName: string,
      language: Lang
    ): ValidationError | null {
      const t = validationMessages[language];

      // Check if it's a valid number
      if (!isValidNumber(value)) {
        return {
          field: fieldName,
          message: t.notANumber,
          type: 'error',
        };
      }

      const numValue = decimalValue(value);

      // Check if it's non-negative
      if (numValue < 0) {
        return {
          field: fieldName,
          message: t.mustBeNonNegative,
          type: 'error',
        };
      }

      // Check range
      if (numValue < min || numValue > max) {
        return {
          field: fieldName,
          message: formatMessage(t.outOfRange, { min, max }),
          type: 'error',
        };
      }

      // Warning for excessive values (80% of max)
      if (numValue > max * 0.8) {
        return {
          field: fieldName,
          message: formatMessage(t.excessiveValue, { max }),
          type: 'warning',
        };
      }

      return null;
    },

    validateAreaMatch(
      totalArea: string,
      cropList: CropForm[],
      language: Lang
    ): ValidationError | null {
      const t = validationMessages[language];

      if (!isValidNumber(totalArea)) {
        return null; // Already handled by numeric validation
      }

      const farmTotal = decimalValue(totalArea);
      
      // Skip validation if farm area is 0 (livestock-only farm)
      if (farmTotal === 0) {
        return null;
      }

      const cropTotal = cropList.reduce((sum, crop) => {
        const area = isValidNumber(crop.area) ? decimalValue(crop.area) : 0;
        return sum + area;
      }, 0);

      // Allow small floating-point differences (0.01 ha tolerance)
      const tolerance = 0.01;
      if (Math.abs(cropTotal - farmTotal) > tolerance) {
        return {
          field: 'areaMatch',
          message: formatMessage(t.areaMismatch, {
            cropTotal: cropTotal.toFixed(2),
            farmTotal: farmTotal.toFixed(2),
          }),
          type: 'error',
        };
      }

      return null;
    },

    validateMinimumData(form: FarmForm, language: Lang): ValidationError[] {
      const errors: ValidationError[] = [];
      const t = validationMessages[language];

      const totalArea = isValidNumber(form.totalArea) ? decimalValue(form.totalArea) : 0;
      const dairyCows = isValidNumber(form.dairyCows) ? intValue(form.dairyCows) : 0;
      const pigs = isValidNumber(form.pigs) ? intValue(form.pigs) : 0;
      const chickens = isValidNumber(form.chickens) ? intValue(form.chickens) : 0;

      const hasLivestock = dairyCows > 0 || pigs > 0 || chickens > 0;
      const hasCropArea = totalArea > 0;

      // Must have either crop area or livestock
      if (!hasCropArea && !hasLivestock) {
        errors.push({
          field: 'minimumData',
          message: t.minimumDataRequired,
          type: 'error',
        });
      }

      // If crops are defined, must have total area
      const hasCropsWithArea = form.crops.some(crop => {
        const area = isValidNumber(crop.area) ? decimalValue(crop.area) : 0;
        return area > 0;
      });

      if (hasCropsWithArea && totalArea === 0) {
        errors.push({
          field: 'totalArea',
          message: t.totalAreaRequired,
          type: 'error',
        });
      }

      return errors;
    },

    validateReferenceIds(form: FarmForm, language: Lang): ValidationError[] {
      const errors: ValidationError[] = [];
      const t = validationMessages[language];

      form.crops.forEach((crop, cropIndex) => {
        // Validate crop ID
        if (crop.crop_id < 0 || crop.crop_id >= crops.length) {
          errors.push({
            field: 'cropId',
            message: t.invalidCropId,
            type: 'error',
            cropIndex,
          });
        }

        // Validate pesticide IDs
        crop.pesticides.forEach((pesticide, pestIndex) => {
          const pesticideId = Number(pesticide.pesticide_id);
          
          // -1 is valid (means "no pesticide")
          if (pesticideId === -1) {
            return;
          }

          if (pesticideId < 0 || pesticideId >= pesticides.length) {
            errors.push({
              field: 'pesticideId',
              message: t.invalidPesticideId,
              type: 'error',
              cropIndex,
              pesticideIndex: pestIndex,
            });
          }
        });
      });

      return errors;
    },
  };
}

/**
 * Default validation manager instance
 */
export const validationManager = createValidationManager();
