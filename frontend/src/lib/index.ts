/**
 * Main exports for storage functionality
 */

export { storageManager, LocalStorageManager, STORAGE_KEYS } from './storage-manager';
export type { StorageManager } from './storage-manager';

export { profileManager, FarmProfileManager, ProfileValidationError } from './profile-manager';
export type { ProfileManager } from './profile-manager';

export {
  generateId,
  formatDate,
  formatBytes,
  getStorageUsagePercent,
  isLocalStorageAvailable,
  getValueSize,
  validateProfileName,
  sanitizeProfileName,
} from './storage-utils';

export { validationManager, createValidationManager } from './validation-manager';
export type { ValidationManager, ValidationError, ValidationResult } from './validation-manager';

export {
  parseCSVFile,
  parseCSVText,
  generateCSV,
  generateCSVFromRows,
  validateCSVStructure,
  getFieldValue,
  downloadCSV,
  createCSVTemplate,
} from './csv-utils';
export type { ParsedCSVRow, CSVParseResult } from './csv-utils';

export {
  exportToJSON,
  downloadAsJSON,
  createExportData,
  validateExportData,
} from './json-export';
export type { ExportData } from './json-export';

export {
  importFromJSON,
  importFromJSONFile,
  triggerFileUpload,
  createFileUploadInput,
} from './json-import';
export type { JSONImportResult, ValidationError as JSONImportValidationError } from './json-import';

export {
  importCropsFromCSV,
  fuzzyMatchCropName,
  fuzzyMatchPesticideName,
  generateCropImportTemplate,
  downloadCropImportTemplate,
} from './csv-import';
export type { CropImportResult } from './csv-import';

export {
  encodeToURL,
  decodeFromURL,
  canEncodeToURL,
  getEncodedURLLength,
  getCompressionRatio,
  getStateFromURL,
  createShareableURL,
  copyShareableURLToClipboard,
} from './url-encoder';

export {
  exportResultsToCSV,
  downloadResultsAsCSV,
} from './export-results';

export {
  exportHistoryToCSV,
  downloadHistoryAsCSV,
} from './export-history';
