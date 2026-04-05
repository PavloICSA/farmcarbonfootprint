# Data Migration System

## Overview

The Data Migration Manager handles schema version detection and data migration for the Farm Carbon Footprint Web App. It ensures that user data is preserved and updated when the application schema changes.

## Key Features

- **Schema Version Detection**: Automatically detects the current schema version stored in localStorage
- **Sequential Migrations**: Applies migrations sequentially from the current version to the target version
- **Data Preservation**: Creates backups before migration and validates data integrity
- **Sensible Defaults**: Fills in missing fields with appropriate default values
- **Error Handling**: Gracefully handles migration failures with detailed error reporting
- **Rollback Support**: Can restore data from backups if migration fails

## Architecture

### Storage Schema Versioning

All data stored in localStorage includes a schema version:

```typescript
// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

// Storage key for schema version
export const SCHEMA_VERSION_KEY = 'carbon-app:schema-version';
```

### Migration Registry

Migrations are registered in a map that associates version numbers with migration functions:

```typescript
const migrations: Record<number, MigrationFunction> = {
  1: migrateV0ToV1,  // Migrates from v0 to v1
  2: migrateV1ToV2,  // Migrates from v1 to v2 (future)
};
```

Each migration function receives data from the previous version and returns migrated data.

## Usage

### Automatic Migration

The storage manager automatically checks for and performs migrations when the app loads:

```typescript
import { storageManager } from './storage-manager';

// In your app initialization
const migrationResult = await storageManager.checkAndMigrate();

if (!migrationResult.success) {
  console.error('Migration errors:', migrationResult.errors);
  // Handle migration errors
}
```

### Manual Migration Check

You can manually check if migration is needed:

```typescript
import { isMigrationNeeded, migrateAllData } from './migration-manager';

if (isMigrationNeeded()) {
  const result = await migrateAllData();
  console.log('Migration result:', result);
}
```

### Schema Version Management

```typescript
import {
  getStoredSchemaVersion,
  setSchemaVersion,
  CURRENT_SCHEMA_VERSION,
} from './migration-manager';

// Get current stored version
const version = getStoredSchemaVersion();

// Set schema version (usually done automatically after migration)
setSchemaVersion(CURRENT_SCHEMA_VERSION);
```

### Adding Schema Version to Data

When saving new data, include the schema version:

```typescript
import { addSchemaVersion } from './migration-manager';

const profile = { /* ... */ };
const profileWithVersion = addSchemaVersion(profile);
// Now includes: { ...profile, schemaVersion: 1 }
```

### Applying Defaults

Fill in missing fields with sensible defaults:

```typescript
import { applyDefaults } from './migration-manager';

const incompleteData = { name: 'Test' };
const defaults = { name: 'Default', age: 0 };
const complete = applyDefaults(incompleteData, defaults);
// Result: { name: 'Test', age: 0 }
```

## Data Structures

### FarmForm Defaults

```typescript
{
  totalArea: '0',
  dairyCows: '0',
  pigs: '0',
  chickens: '0',
  crops: [],
}
```

### CropForm Defaults

```typescript
{
  crop_id: 0,
  area: '0',
  nitrogen: '0',
  phosphorus: '0',
  potassium: '0',
  manure: '0',
  diesel: '0',
  irrigation: '0',
  pesticides: [],
}
```

### CropPractice Defaults

```typescript
{
  tillage: 'moldboard_plowing',
  precisionFertilization: false,
  coverCrop: false,
  irrigationMethod: 'furrow_surface',
  irrigationEnergy: 'grid',
  residue: 'incorporate',
}
```

### UserSettings Defaults

```typescript
{
  theme: 'dark',
  language: 'en',
  fontSize: 'medium',
  highContrast: false,
  autoSaveInterval: 2,
  region: '',
  showTutorial: true,
  analyticsEnabled: false,
}
```

## Migration Process

### Step 1: Version Detection

The system checks the stored schema version:

```typescript
const storedVersion = getStoredSchemaVersion(); // Returns 0 if not set
const currentVersion = CURRENT_SCHEMA_VERSION;  // Returns 1

if (storedVersion < currentVersion) {
  // Migration needed
}
```

### Step 2: Backup Creation

Before migrating each storage item, a backup is created:

```
Original key: carbon-app:profiles
Backup key:   carbon-app:profiles:backup:v0
```

### Step 3: Sequential Migration

Migrations are applied sequentially:

```
v0 → v1 (via migrateV0ToV1)
v1 → v2 (via migrateV1ToV2) [future]
```

### Step 4: Validation

Migrated data is validated to ensure it has the correct structure:

```typescript
// Validates that profiles array contains valid profile objects
// Validates that each profile has required fields: id, name, data, practices
```

### Step 5: Version Update

If all migrations succeed, the schema version is updated:

```typescript
setSchemaVersion(CURRENT_SCHEMA_VERSION);
```

## Error Handling

### Migration Failures

If a migration fails, the system:

1. Logs the error with details
2. Continues with other storage items
3. Does NOT update the schema version
4. Returns error information for handling

```typescript
const result = await migrateAllData();

if (!result.success) {
  console.error('Errors:', result.errors);
  console.log('Migrated keys:', result.migratedKeys);
  // Handle errors - user data is preserved in backups
}
```

### Data Restoration

If migration fails, you can restore from backup:

```typescript
import { restoreFromBackup } from './migration-manager';

const success = restoreFromBackup('carbon-app:profiles', 0);
if (success) {
  console.log('Data restored from backup');
}
```

## Adding New Migrations

When the schema changes, add a new migration function:

### 1. Create the Migration Function

```typescript
function migrateV1ToV2(data: any): any {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      // Add new fields with defaults
      newField: 'defaultValue',
      // Transform existing fields if needed
      oldField: transformOldField(item.oldField),
    }));
  }
  
  return {
    ...data,
    newField: 'defaultValue',
  };
}
```

### 2. Register the Migration

```typescript
const migrations: Record<number, MigrationFunction> = {
  1: migrateV0ToV1,
  2: migrateV1ToV2,  // Add new migration
};
```

### 3. Update Schema Version

```typescript
export const CURRENT_SCHEMA_VERSION = 2;  // Increment version
```

### 4. Add Tests

```typescript
test('should migrate from v1 to v2', async () => {
  const data = { /* v1 data */ };
  localStorage.setItem('carbon-app:profiles', JSON.stringify([data]));
  setSchemaVersion(1);

  const result = await migrateAllData();
  expect(result.success).toBe(true);

  const migrated = JSON.parse(localStorage.getItem('carbon-app:profiles') || '[]');
  expect(migrated[0].newField).toBe('defaultValue');
});
```

## Best Practices

### 1. Always Create Backups

Backups are automatically created before migration. Never delete backup keys manually.

### 2. Validate Data After Migration

Always validate that migrated data has the correct structure:

```typescript
function validateMigratedData(data: any, key: string): boolean {
  // Check required fields
  // Check data types
  // Check array lengths
  return true;
}
```

### 3. Provide Sensible Defaults

When adding new fields, provide defaults that make sense:

```typescript
// Good: Sensible default
newField: 'default_value'

// Bad: Undefined or null
newField: undefined
```

### 4. Test Migrations Thoroughly

Test migrations with:

- Empty data
- Partial data (missing fields)
- Complete data
- Invalid data
- Large datasets

### 5. Document Schema Changes

When changing the schema, document:

- What fields were added/removed/changed
- Why the change was made
- How old data is migrated
- What defaults are used

## Troubleshooting

### Migration Fails with "Failed to parse"

**Cause**: Corrupted JSON in localStorage

**Solution**: 
1. Check the backup: `localStorage.getItem('carbon-app:profiles:backup:v0')`
2. Restore from backup: `restoreFromBackup('carbon-app:profiles', 0)`
3. Clear corrupted data if backup is also corrupted

### Migration Fails with "Validation failed"

**Cause**: Migrated data doesn't match expected structure

**Solution**:
1. Check the migration function for bugs
2. Verify defaults are being applied correctly
3. Add more detailed validation logging
4. Restore from backup and retry

### Schema Version Not Updating

**Cause**: Migration succeeded but version wasn't updated

**Solution**:
1. Check for errors in the migration result
2. Manually set version: `setSchemaVersion(CURRENT_SCHEMA_VERSION)`
3. Verify all storage items migrated successfully

## Testing

Run the migration tests:

```bash
npm test -- migration-manager.test.ts
```

Tests cover:

- Schema version detection and storage
- Data preservation during migration
- Sensible defaults for missing fields
- Schema version storage in migrated data
- Error handling and recovery
- Backup creation and restoration
- Multiple storage items
- No migration needed scenarios

## Performance Considerations

- Migrations run synchronously on app load
- Large datasets (50+ history entries) may take a few milliseconds
- Backups are stored in localStorage (counts toward quota)
- Consider clearing old backups periodically

## Future Enhancements

- Async migration for large datasets
- Migration progress tracking
- Automatic backup cleanup
- Migration rollback UI
- Schema validation with Zod
- Migration dry-run mode
