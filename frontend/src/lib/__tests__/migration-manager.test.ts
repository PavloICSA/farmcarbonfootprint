/**
 * Tests for Data Migration Manager
 * Validates schema version detection, migration functions, and data preservation
 */

import {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  getStoredSchemaVersion,
  setSchemaVersion,
  isMigrationNeeded,
  migrateAllData,
  restoreFromBackup,
  addSchemaVersion,
  applyDefaults,
} from '../migration-manager';
import type {
  FarmProfile,
  CalculationHistory,
  Draft,
  UserSettings,
  CropForm,
  CropPractice,
  FarmForm,
} from '../../types/storage';

describe('Migration Manager', () => {
  // Setup and teardown
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Schema Version Management', () => {
    test('should return 0 when no schema version is stored', () => {
      expect(getStoredSchemaVersion()).toBe(0);
    });

    test('should store and retrieve schema version', () => {
      setSchemaVersion(1);
      expect(getStoredSchemaVersion()).toBe(1);
    });

    test('should detect when migration is needed', () => {
      setSchemaVersion(0);
      expect(isMigrationNeeded()).toBe(true);

      setSchemaVersion(CURRENT_SCHEMA_VERSION);
      expect(isMigrationNeeded()).toBe(false);
    });

    test('should handle invalid schema version gracefully', () => {
      localStorage.setItem(SCHEMA_VERSION_KEY, 'invalid');
      expect(getStoredSchemaVersion()).toBe(0);
    });
  });

  describe('Data Preservation', () => {
    test('should preserve farm profile data during migration', async () => {
      const profile: FarmProfile = {
        id: 'test-1',
        name: 'Test Farm',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        data: {
          totalArea: '100',
          dairyCows: '50',
          pigs: '0',
          chickens: '0',
          crops: [
            {
              crop_id: 1,
              area: '50',
              nitrogen: '150',
              phosphorus: '50',
              potassium: '50',
              manure: '10',
              diesel: '5',
              irrigation: '0',
              pesticides: [],
            },
          ],
        },
        practices: [
          {
            tillage: 'no_till',
            precisionFertilization: true,
            coverCrop: true,
            irrigationMethod: 'drip',
            irrigationEnergy: 'solar',
            residue: 'retain',
          },
        ],
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([profile]));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      expect(migrated).toHaveLength(1);
      expect(migrated[0].id).toBe('test-1');
      expect(migrated[0].name).toBe('Test Farm');
      expect(migrated[0].data.totalArea).toBe('100');
      expect(migrated[0].practices[0].tillage).toBe('no_till');
    });

    test('should preserve calculation history during migration', async () => {
      const history: CalculationHistory = {
        id: 'calc-1',
        timestamp: new Date('2024-01-01'),
        farmName: 'Test Farm',
        data: {
          totalArea: '100',
          dairyCows: '50',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [],
        results: {
          total_emissions: 100,
          fertilizer_emissions: 50,
        },
      };

      localStorage.setItem('carbon-app:history', JSON.stringify([history]));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:history') || '[]');
      expect(migrated).toHaveLength(1);
      expect(migrated[0].id).toBe('calc-1');
      expect(migrated[0].results.total_emissions).toBe(100);
    });

    test('should preserve draft data during migration', async () => {
      const draft: Draft = {
        timestamp: new Date('2024-01-01'),
        data: {
          totalArea: '50',
          dairyCows: '25',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [],
      };

      localStorage.setItem('carbon-app:draft', JSON.stringify(draft));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:draft') || 'null');
      expect(migrated.data.totalArea).toBe('50');
      expect(migrated.data.dairyCows).toBe('25');
    });

    test('should preserve user settings during migration', async () => {
      const settings: UserSettings = {
        theme: 'light',
        language: 'ua',
        fontSize: 'large',
        highContrast: true,
        autoSaveInterval: 5,
        region: 'Ukraine',
        showTutorial: false,
        analyticsEnabled: true,
      };

      localStorage.setItem('carbon-app:settings', JSON.stringify(settings));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:settings') || '{}');
      expect(migrated.theme).toBe('light');
      expect(migrated.language).toBe('ua');
      expect(migrated.fontSize).toBe('large');
      expect(migrated.highContrast).toBe(true);
    });
  });

  describe('Sensible Defaults', () => {
    test('should add missing fields to farm form with defaults', async () => {
      const incompleteProfile: Partial<FarmProfile> = {
        id: 'test-1',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          totalArea: '100',
          // Missing other fields
        } as any,
        practices: [],
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([incompleteProfile]));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      expect(migrated[0].data.dairyCows).toBe('0');
      expect(migrated[0].data.pigs).toBe('0');
      expect(migrated[0].data.chickens).toBe('0');
    });

    test('should add missing fields to crop with defaults', async () => {
      const profile: Partial<FarmProfile> = {
        id: 'test-1',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          totalArea: '100',
          dairyCows: '0',
          pigs: '0',
          chickens: '0',
          crops: [
            {
              crop_id: 1,
              area: '50',
              // Missing other fields
            } as any,
          ],
        },
        practices: [],
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([profile]));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      const crop = migrated[0].data.crops[0];
      expect(crop.nitrogen).toBe('0');
      expect(crop.phosphorus).toBe('0');
      expect(crop.potassium).toBe('0');
      expect(crop.manure).toBe('0');
      expect(crop.diesel).toBe('0');
      expect(crop.irrigation).toBe('0');
      expect(crop.pesticides).toEqual([]);
    });

    test('should add missing fields to practices with defaults', async () => {
      const profile: Partial<FarmProfile> = {
        id: 'test-1',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          totalArea: '100',
          dairyCows: '0',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [
          {
            tillage: 'no_till',
            // Missing other fields
          } as any,
        ],
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([profile]));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      const practice = migrated[0].practices[0];
      expect(practice.precisionFertilization).toBe(false);
      expect(practice.coverCrop).toBe(false);
      expect(practice.irrigationMethod).toBe('furrow_surface');
      expect(practice.irrigationEnergy).toBe('grid');
      expect(practice.residue).toBe('incorporate');
    });

    test('should add missing fields to settings with defaults', async () => {
      const incompleteSettings: Partial<UserSettings> = {
        theme: 'dark',
        language: 'en',
        // Missing other fields
      };

      localStorage.setItem('carbon-app:settings', JSON.stringify(incompleteSettings));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);

      const migrated = JSON.parse(localStorage.getItem('carbon-app:settings') || '{}');
      expect(migrated.fontSize).toBe('medium');
      expect(migrated.highContrast).toBe(false);
      expect(migrated.autoSaveInterval).toBe(2);
      expect(migrated.showTutorial).toBe(true);
    });
  });

  describe('Schema Version Storage', () => {
    test('should add schema version to data', () => {
      const data = { name: 'Test' };
      const withVersion = addSchemaVersion(data);
      expect(withVersion.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(withVersion.name).toBe('Test');
    });

    test('should store schema version after successful migration', async () => {
      localStorage.setItem('carbon-app:profiles', JSON.stringify([]));
      setSchemaVersion(0);

      await migrateAllData();
      expect(getStoredSchemaVersion()).toBe(CURRENT_SCHEMA_VERSION);
    });

    test('should not update schema version if migration fails', async () => {
      // Store invalid JSON to cause migration failure
      localStorage.setItem('carbon-app:profiles', 'invalid json');
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(false);
      expect(getStoredSchemaVersion()).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle corrupted JSON gracefully', async () => {
      localStorage.setItem('carbon-app:profiles', 'not valid json');
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should create backup before migration', async () => {
      const profile: FarmProfile = {
        id: 'test-1',
        name: 'Test Farm',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          totalArea: '100',
          dairyCows: '50',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [],
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([profile]));
      setSchemaVersion(0);

      await migrateAllData();

      const backup = localStorage.getItem('carbon-app:profiles:backup:v0');
      expect(backup).not.toBeNull();
      expect(JSON.parse(backup!)[0].id).toBe('test-1');
    });

    test('should restore from backup', async () => {
      const originalData = [{ id: 'test-1', name: 'Test' }];
      const backupKey = 'carbon-app:profiles:backup:v0';
      localStorage.setItem(backupKey, JSON.stringify(originalData));

      const success = restoreFromBackup('carbon-app:profiles', 0);
      expect(success).toBe(true);

      const restored = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      expect(restored).toEqual(originalData);
    });

    test('should handle missing backup gracefully', () => {
      const success = restoreFromBackup('carbon-app:profiles', 0);
      expect(success).toBe(false);
    });

    test('should continue migration even if one key fails', async () => {
      // Valid profiles
      localStorage.setItem('carbon-app:profiles', JSON.stringify([]));
      // Invalid history
      localStorage.setItem('carbon-app:history', 'invalid json');
      // Valid draft
      localStorage.setItem('carbon-app:draft', JSON.stringify(null));
      // Valid settings
      localStorage.setItem('carbon-app:settings', JSON.stringify({
        theme: 'dark',
        language: 'en',
      }));

      setSchemaVersion(0);

      const result = await migrateAllData();
      // Should have errors but still migrate other keys
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.migratedKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Apply Defaults Utility', () => {
    test('should merge data with defaults', () => {
      const data = { name: 'Test' };
      const defaults = { name: 'Default', age: 0 };
      const result = applyDefaults(data, defaults);
      expect(result.name).toBe('Test');
      expect(result.age).toBe(0);
    });

    test('should prefer provided data over defaults', () => {
      const data = { value: 'custom' };
      const defaults = { value: 'default', other: 'value' };
      const result = applyDefaults(data, defaults);
      expect(result.value).toBe('custom');
      expect(result.other).toBe('value');
    });
  });

  describe('Multiple Storage Items', () => {
    test('should migrate all storage items together', async () => {
      const profile: FarmProfile = {
        id: 'p1',
        name: 'Profile 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          totalArea: '100',
          dairyCows: '0',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [],
      };

      const history: CalculationHistory = {
        id: 'h1',
        timestamp: new Date(),
        data: {
          totalArea: '50',
          dairyCows: '0',
          pigs: '0',
          chickens: '0',
          crops: [],
        },
        practices: [],
        results: {},
      };

      const settings: UserSettings = {
        theme: 'dark',
        language: 'en',
        fontSize: 'medium',
        highContrast: false,
        autoSaveInterval: 2,
        region: '',
        showTutorial: true,
        analyticsEnabled: false,
      };

      localStorage.setItem('carbon-app:profiles', JSON.stringify([profile]));
      localStorage.setItem('carbon-app:history', JSON.stringify([history]));
      localStorage.setItem('carbon-app:settings', JSON.stringify(settings));
      setSchemaVersion(0);

      const result = await migrateAllData();
      expect(result.success).toBe(true);
      expect(result.migratedKeys).toContain('carbon-app:profiles');
      expect(result.migratedKeys).toContain('carbon-app:history');
      expect(result.migratedKeys).toContain('carbon-app:settings');
    });
  });

  describe('No Migration Needed', () => {
    test('should skip migration if already at current version', async () => {
      setSchemaVersion(CURRENT_SCHEMA_VERSION);

      const result = await migrateAllData();
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should not modify data if no migration needed', async () => {
      const originalData = [{ id: 'test-1', name: 'Test' }];
      localStorage.setItem('carbon-app:profiles', JSON.stringify(originalData));
      setSchemaVersion(CURRENT_SCHEMA_VERSION);

      await migrateAllData();

      const stored = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
      expect(stored).toEqual(originalData);
    });
  });
});
