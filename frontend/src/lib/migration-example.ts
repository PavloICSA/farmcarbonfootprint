/**
 * Migration System Usage Examples
 * Demonstrates how to use the data migration system in practice
 */

import {
  CURRENT_SCHEMA_VERSION,
  getStoredSchemaVersion,
  setSchemaVersion,
  isMigrationNeeded,
  migrateAllData,
  restoreFromBackup,
  addSchemaVersion,
  applyDefaults,
} from './migration-manager';
import { storageManager } from './storage-manager';
import type {
  FarmProfile,
  UserSettings,
  CropForm,
  CropPractice,
} from '../types/storage';

/**
 * Example 1: Initialize app with automatic migration
 * 
 * This is typically called in your app's initialization code
 */
export async function initializeAppWithMigration(): Promise<void> {
  console.log('Initializing app...');
  
  // Check and perform migration if needed
  const migrationResult = await storageManager.checkAndMigrate();
  
  if (!migrationResult.success) {
    console.error('Migration errors:', migrationResult.errors);
    // Show error UI to user
    // Optionally offer to restore from backup
  } else {
    console.log('Migration completed successfully');
    console.log('Migrated keys:', migrationResult.migratedKeys);
  }
  
  // Continue with app initialization
  const settings = await storageManager.loadSettings();
  console.log('Loaded settings:', settings);
}

/**
 * Example 2: Save a farm profile with schema version
 */
export async function saveFarmProfileWithVersion(
  profile: FarmProfile
): Promise<void> {
  // Add schema version to profile metadata
  const profileWithVersion: FarmProfile = {
    ...profile,
    metadata: {
      ...profile.metadata,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
  };
  
  await storageManager.saveProfile(profileWithVersion);
  console.log(`Saved profile "${profile.name}" with schema v${CURRENT_SCHEMA_VERSION}`);
}

/**
 * Example 3: Load a profile and handle version mismatch
 */
export async function loadProfileWithVersionCheck(
  profileId: string
): Promise<FarmProfile | null> {
  const profile = await storageManager.loadProfile(profileId);
  
  if (!profile) {
    return null;
  }
  
  const profileVersion = profile.metadata?.schemaVersion || 0;
  const currentVersion = CURRENT_SCHEMA_VERSION;
  
  if (profileVersion < currentVersion) {
    console.warn(
      `Profile was created with schema v${profileVersion}, ` +
      `current version is v${currentVersion}`
    );
    // Profile will be automatically migrated on next app load
  }
  
  return profile;
}

/**
 * Example 4: Check if migration is needed before performing operations
 */
export function checkMigrationStatus(): void {
  const storedVersion = getStoredSchemaVersion();
  const currentVersion = CURRENT_SCHEMA_VERSION;
  
  console.log(`Stored schema version: ${storedVersion}`);
  console.log(`Current schema version: ${currentVersion}`);
  
  if (isMigrationNeeded()) {
    console.log('Migration is needed');
  } else {
    console.log('No migration needed');
  }
}

/**
 * Example 5: Manually trigger migration
 */
export async function manuallyTriggerMigration(): Promise<void> {
  if (!isMigrationNeeded()) {
    console.log('No migration needed');
    return;
  }
  
  console.log('Starting manual migration...');
  const result = await migrateAllData();
  
  if (result.success) {
    console.log('Migration successful');
    console.log('Migrated keys:', result.migratedKeys);
  } else {
    console.error('Migration failed');
    console.error('Errors:', result.errors);
    
    // Offer to restore from backup
    const restored = restoreFromBackup('carbon-app:profiles', 0);
    if (restored) {
      console.log('Data restored from backup');
    }
  }
}

/**
 * Example 6: Apply defaults to incomplete data
 */
export function completeIncompleteProfile(
  incompleteProfile: Partial<FarmProfile>
): FarmProfile {
  const defaults: FarmProfile = {
    id: 'new-profile',
    name: 'New Profile',
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      totalArea: '0',
      dairyCows: '0',
      pigs: '0',
      chickens: '0',
      crops: [],
    },
    practices: [],
  };
  
  return applyDefaults(incompleteProfile, defaults);
}

/**
 * Example 7: Create a new profile with schema version
 */
export async function createNewProfile(
  name: string,
  farmArea: string
): Promise<FarmProfile> {
  const profile: FarmProfile = {
    id: `profile-${Date.now()}`,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      totalArea: farmArea,
      dairyCows: '0',
      pigs: '0',
      chickens: '0',
      crops: [],
    },
    practices: [],
    metadata: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
  };
  
  await storageManager.saveProfile(profile);
  return profile;
}

/**
 * Example 8: Handle migration errors gracefully
 */
export async function robustMigration(): Promise<boolean> {
  try {
    const result = await migrateAllData();
    
    if (result.success) {
      console.log('Migration successful');
      return true;
    }
    
    // Partial success - some keys migrated, some failed
    if (result.migratedKeys.length > 0) {
      console.warn('Partial migration success');
      console.warn('Migrated keys:', result.migratedKeys);
      console.warn('Errors:', result.errors);
      
      // Try to restore failed keys from backup
      const failedKeys = [
        'carbon-app:profiles',
        'carbon-app:history',
        'carbon-app:draft',
        'carbon-app:settings',
      ].filter(key => !result.migratedKeys.includes(key));
      
      for (const key of failedKeys) {
        const restored = restoreFromBackup(key, 0);
        if (restored) {
          console.log(`Restored ${key} from backup`);
        }
      }
      
      return false;
    }
    
    // Complete failure
    console.error('Migration failed completely');
    console.error('Errors:', result.errors);
    return false;
  } catch (error) {
    console.error('Unexpected error during migration:', error);
    return false;
  }
}

/**
 * Example 9: Validate data after loading
 */
export async function loadAndValidateProfile(
  profileId: string
): Promise<FarmProfile | null> {
  const profile = await storageManager.loadProfile(profileId);
  
  if (!profile) {
    return null;
  }
  
  // Validate required fields
  if (!profile.id || !profile.name || !profile.data) {
    console.error('Profile validation failed: missing required fields');
    return null;
  }
  
  // Validate data structure
  if (!profile.data.totalArea || !Array.isArray(profile.data.crops)) {
    console.error('Profile data validation failed: invalid structure');
    return null;
  }
  
  // Validate practices
  if (!Array.isArray(profile.practices)) {
    console.error('Profile practices validation failed: not an array');
    return null;
  }
  
  return profile;
}

/**
 * Example 10: Prepare data for export with schema version
 */
export function prepareDataForExport(profile: FarmProfile): string {
  const exportData = {
    ...profile,
    exportDate: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Example 11: Import data and handle version mismatch
 */
export async function importDataWithVersionHandling(
  jsonString: string
): Promise<FarmProfile | null> {
  try {
    const imported = JSON.parse(jsonString);
    
    const importedVersion = imported.schemaVersion || 0;
    const currentVersion = CURRENT_SCHEMA_VERSION;
    
    if (importedVersion > currentVersion) {
      console.warn(
        `Imported data is from a newer version (v${importedVersion}). ` +
        `Current version is v${currentVersion}. ` +
        `Some features may not work correctly.`
      );
    } else if (importedVersion < currentVersion) {
      console.log(
        `Imported data is from an older version (v${importedVersion}). ` +
        `It will be automatically migrated.`
      );
    }
    
    // Ensure all required fields exist
    const profile = completeIncompleteProfile(imported);
    
    // Save with current schema version
    await saveFarmProfileWithVersion(profile);
    
    return profile;
  } catch (error) {
    console.error('Failed to import data:', error);
    return null;
  }
}

/**
 * Example 12: Monitor storage quota and migration
 */
export async function monitorStorageAndMigration(): Promise<void> {
  // Check migration status
  const storedVersion = getStoredSchemaVersion();
  console.log(`Current schema version: ${storedVersion}`);
  
  if (isMigrationNeeded()) {
    console.log('Migration needed - performing migration...');
    const result = await migrateAllData();
    if (!result.success) {
      console.error('Migration failed:', result.errors);
    }
  }
  
  // Check storage quota
  const quota = await storageManager.getQuotaInfo();
  const usagePercent = (quota.used / quota.available) * 100;
  
  console.log(`Storage usage: ${usagePercent.toFixed(1)}%`);
  console.log(`Used: ${(quota.used / 1024).toFixed(1)} KB`);
  console.log(`Available: ${(quota.available / 1024 / 1024).toFixed(1)} MB`);
  
  if (usagePercent > 80) {
    console.warn('Storage usage is high - consider cleaning up old data');
  }
}

/**
 * Example 13: Create a migration report
 */
export async function generateMigrationReport(): Promise<string> {
  const storedVersion = getStoredSchemaVersion();
  const currentVersion = CURRENT_SCHEMA_VERSION;
  const needsMigration = isMigrationNeeded();
  
  const profiles = await storageManager.listProfiles();
  const history = await storageManager.loadHistory();
  const draft = await storageManager.loadDraft();
  const settings = await storageManager.loadSettings();
  
  const report = `
Migration Report
================

Schema Version:
  Stored: v${storedVersion}
  Current: v${currentVersion}
  Migration needed: ${needsMigration}

Data Summary:
  Profiles: ${profiles.length}
  History entries: ${history.length}
  Draft: ${draft ? 'Yes' : 'No'}
  Settings: ${settings ? 'Yes' : 'No'}

Profile Details:
${profiles.map(p => `  - ${p.name} (v${p.metadata?.schemaVersion || 0})`).join('\n')}

History Details:
${history.slice(0, 5).map(h => `  - ${h.timestamp} (v${h.metadata?.schemaVersion || 0})`).join('\n')}
${history.length > 5 ? `  ... and ${history.length - 5} more` : ''}
  `.trim();
  
  return report;
}
