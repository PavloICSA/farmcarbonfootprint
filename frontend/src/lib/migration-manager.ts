/**
 * Data Migration Manager for Farm Carbon Footprint App
 * Handles schema version detection and data migration with validation and recovery
 */

import type {
  FarmProfile,
  CalculationHistory,
  Draft,
  UserSettings,
  CropForm,
  CropPractice,
  FarmForm,
} from '../types/storage';

// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

// Storage key for schema version
export const SCHEMA_VERSION_KEY = 'carbon-app:schema-version';

/**
 * Migration function type
 */
type MigrationFunction = (data: any) => any;

/**
 * Migration registry mapping version numbers to migration functions
 * Each function migrates from (version - 1) to version
 */
const migrations: Record<number, MigrationFunction> = {
  // Migration from v0 to v1: Add schemaVersion field and validate data
  1: migrateV0ToV1,
};

/**
 * Get the current schema version from localStorage
 */
export function getStoredSchemaVersion(): number {
  try {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    if (!version) return 0;
    const parsed = parseInt(version, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Failed to get schema version:', error);
    return 0;
  }
}

/**
 * Set the schema version in localStorage
 */
export function setSchemaVersion(version: number): void {
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, version.toString());
    console.log(`Schema version set to ${version}`);
  } catch (error) {
    console.error('Failed to set schema version:', error);
  }
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const storedVersion = getStoredSchemaVersion();
  return storedVersion < CURRENT_SCHEMA_VERSION;
}

/**
 * Validate migrated data structure
 */
function validateMigratedData(data: any, key: string): boolean {
  try {
    if (!data) return true; // Empty data is valid
    
    switch (key) {
      case 'carbon-app:profiles':
        if (!Array.isArray(data)) return false;
        return data.every(profile => 
          profile.id && 
          profile.name && 
          profile.data && 
          profile.practices !== undefined
        );
      
      case 'carbon-app:history':
        if (!Array.isArray(data)) return false;
        return data.every(calc => 
          calc.id && 
          calc.timestamp && 
          calc.data && 
          calc.practices !== undefined &&
          calc.results !== undefined
        );
      
      case 'carbon-app:draft':
        return data.timestamp && data.data && data.practices !== undefined;
      
      case 'carbon-app:settings':
        return data.theme && data.language && data.fontSize !== undefined;
      
      default:
        return true;
    }
  } catch (error) {
    console.error(`Validation failed for ${key}:`, error);
    return false;
  }
}

/**
 * Migrate data from one version to another
 */
function migrateData(data: any, fromVersion: number, toVersion: number): any {
  let migratedData = data;
  
  // Apply migrations sequentially
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    const migrationFn = migrations[version];
    if (migrationFn) {
      console.log(`Applying migration to version ${version}`);
      try {
        migratedData = migrationFn(migratedData);
      } catch (error) {
        console.error(`Migration to v${version} failed:`, error);
        throw error;
      }
    }
  }
  
  return migratedData;
}

/**
 * Migrate a single storage item with validation and rollback
 */
function migrateStorageItem<T>(
  key: string,
  fromVersion: number,
  toVersion: number
): { success: boolean; data: T | null; error?: string } {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return { success: true, data: null };
    }
    
    // Backup original data before migration
    const backupKey = `${key}:backup:v${fromVersion}`;
    try {
      localStorage.setItem(backupKey, item);
      console.log(`Backed up ${key} to ${backupKey}`);
    } catch (backupError) {
      console.warn(`Failed to create backup for ${key}:`, backupError);
      // Continue anyway - backup failure shouldn't block migration
    }
    
    // Parse original data
    let parsed: any;
    try {
      parsed = JSON.parse(item);
    } catch (parseError) {
      const error = `Failed to parse ${key}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      console.error(error);
      return { success: false, data: null, error };
    }
    
    // Apply migrations
    let migrated: any;
    try {
      migrated = migrateData(parsed, fromVersion, toVersion);
    } catch (migrationError) {
      const error = `Migration failed for ${key}: ${migrationError instanceof Error ? migrationError.message : 'Unknown error'}`;
      console.error(error);
      return { success: false, data: null, error };
    }
    
    // Validate migrated data
    if (!validateMigratedData(migrated, key)) {
      const error = `Validation failed for migrated ${key}`;
      console.error(error);
      return { success: false, data: null, error };
    }
    
    // Save migrated data
    try {
      localStorage.setItem(key, JSON.stringify(migrated));
      console.log(`Successfully migrated ${key} from v${fromVersion} to v${toVersion}`);
      return { success: true, data: migrated };
    } catch (saveError) {
      const error = `Failed to save migrated ${key}: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
      console.error(error);
      return { success: false, data: null, error };
    }
  } catch (error) {
    const errorMsg = `Unexpected error migrating ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    return { success: false, data: null, error: errorMsg };
  }
}

/**
 * Migrate all storage data to current schema version
 */
export async function migrateAllData(): Promise<{
  success: boolean;
  errors: string[];
  migratedKeys: string[];
}> {
  const errors: string[] = [];
  const migratedKeys: string[] = [];
  const storedVersion = getStoredSchemaVersion();
  
  if (storedVersion >= CURRENT_SCHEMA_VERSION) {
    console.log('No migration needed');
    return { success: true, errors: [], migratedKeys: [] };
  }
  
  console.log(`Starting migration from v${storedVersion} to v${CURRENT_SCHEMA_VERSION}`);
  
  try {
    // Migrate each storage key
    const keysToMigrate = [
      'carbon-app:profiles',
      'carbon-app:history',
      'carbon-app:draft',
      'carbon-app:settings',
    ];
    
    for (const key of keysToMigrate) {
      const result = migrateStorageItem(key, storedVersion, CURRENT_SCHEMA_VERSION);
      
      if (result.success) {
        migratedKeys.push(key);
      } else if (result.error) {
        errors.push(result.error);
      }
    }
    
    // Update schema version only if all migrations succeeded
    if (errors.length === 0) {
      setSchemaVersion(CURRENT_SCHEMA_VERSION);
      console.log('Migration completed successfully');
      return { success: true, errors: [], migratedKeys };
    } else {
      console.error('Migration completed with errors:', errors);
      return { success: false, errors, migratedKeys };
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    return { success: false, errors: [errorMsg], migratedKeys };
  }
}

/**
 * Restore data from backup
 */
export function restoreFromBackup(key: string, version: number): boolean {
  try {
    const backupKey = `${key}:backup:v${version}`;
    const backup = localStorage.getItem(backupKey);
    
    if (!backup) {
      console.error(`No backup found for ${key} v${version}`);
      return false;
    }
    
    localStorage.setItem(key, backup);
    console.log(`Restored ${key} from backup v${version}`);
    return true;
  } catch (error) {
    console.error(`Failed to restore ${key} from backup:`, error);
    return false;
  }
}

/**
 * Add schema version to data when saving
 */
export function addSchemaVersion<T extends object>(data: T): T & { schemaVersion: number } {
  return {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Provide sensible defaults for missing fields in CropForm
 */
function getDefaultCropForm(): CropForm {
  return {
    crop_id: 0,
    area: '0',
    nitrogen: '0',
    phosphorus: '0',
    potassium: '0',
    manure: '0',
    compost: '0',
    greenManure: '0',
    diesel: '0',
    irrigation: '0',
    yield: '0',
    bioPest: '0',
    season: 'spring',
    pesticides: [],
  };
}

/**
 * Provide sensible defaults for missing fields in CropPractice
 */
function getDefaultCropPractice(): CropPractice {
  return {
    tillage: 'moldboard_plowing',
    precisionFertilization: false,
    coverCrop: false,
    irrigationMethod: 'furrow_surface',
    irrigationEnergy: 'grid',
    residue: 'incorporate',
  };
}

/**
 * Provide sensible defaults for missing fields in FarmForm
 */
function getDefaultFarmForm(): FarmForm {
  return {
    totalArea: '0',
    dairyCows: '0',
    pigs: '0',
    chickens: '0',
    crops: [],
  };
}

/**
 * Provide sensible defaults for missing fields in UserSettings
 */
function getDefaultUserSettings(): UserSettings {
  return {
    theme: 'dark',
    language: 'en',
    fontSize: 'medium',
    highContrast: false,
    autoSaveInterval: 2,
    region: '',
    showTutorial: true,
    analyticsEnabled: false,
  };
}

/**
 * Apply defaults to an object, filling in missing fields
 */
export function applyDefaults<T extends object>(data: Partial<T>, defaults: T): T {
  return {
    ...defaults,
    ...data,
  };
}

/**
 * Ensure all required fields exist in a FarmForm with defaults
 */
function ensureFarmFormDefaults(form: Partial<FarmForm>): FarmForm {
  const defaults = getDefaultFarmForm();
  const result = applyDefaults(form, defaults);
  
  // Ensure crops array has proper structure
  if (Array.isArray(result.crops)) {
    result.crops = result.crops.map(crop => 
      applyDefaults(crop, getDefaultCropForm())
    );
  }
  
  return result;
}

/**
 * Ensure all required fields exist in CropPractice array with defaults
 */
function ensurePracticesDefaults(practices: Partial<CropPractice>[]): CropPractice[] {
  const defaults = getDefaultCropPractice();
  return practices.map(practice => applyDefaults(practice, defaults));
}

/**
 * Ensure all required fields exist in UserSettings with defaults
 */
function ensureSettingsDefaults(settings: Partial<UserSettings>): UserSettings {
  return applyDefaults(settings, getDefaultUserSettings());
}

// ===== Migration Functions =====

/**
 * Migration from v0 to v1
 * - Adds schemaVersion field to all data structures
 * - Validates and fills in missing fields with sensible defaults
 * - Ensures data integrity
 */
function migrateV0ToV1(data: any): any {
  if (!data) return data;
  
  // Handle array data (profiles, history)
  if (Array.isArray(data)) {
    return data.map(item => {
      if (!item) return item;
      
      // Ensure required fields exist
      const migrated: any = {
        ...item,
        schemaVersion: 1,
      };
      
      // Validate and fix FarmForm
      if (migrated.data) {
        migrated.data = ensureFarmFormDefaults(migrated.data);
      }
      
      // Validate and fix practices
      if (Array.isArray(migrated.practices)) {
        migrated.practices = ensurePracticesDefaults(migrated.practices);
      } else {
        migrated.practices = [];
      }
      
      // Ensure timestamps are valid
      if (migrated.timestamp && typeof migrated.timestamp === 'string') {
        migrated.timestamp = new Date(migrated.timestamp);
      }
      if (migrated.createdAt && typeof migrated.createdAt === 'string') {
        migrated.createdAt = new Date(migrated.createdAt);
      }
      if (migrated.updatedAt && typeof migrated.updatedAt === 'string') {
        migrated.updatedAt = new Date(migrated.updatedAt);
      }
      
      return migrated;
    });
  }
  
  // Handle single object data (draft, settings)
  let migrated: any = {
    ...data,
    schemaVersion: 1,
  };
  
  // Handle draft
  if (migrated.data) {
    migrated.data = ensureFarmFormDefaults(migrated.data);
  }
  if (Array.isArray(migrated.practices)) {
    migrated.practices = ensurePracticesDefaults(migrated.practices);
  }
  if (migrated.timestamp && typeof migrated.timestamp === 'string') {
    migrated.timestamp = new Date(migrated.timestamp);
  }
  
  // Handle settings
  if (migrated.theme !== undefined) {
    migrated = ensureSettingsDefaults(migrated);
  }
  
  return migrated;
}
