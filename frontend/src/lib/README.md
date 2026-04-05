# Storage Manager

This directory contains the localStorage management system for the Farm Carbon Footprint App.

## Overview

The storage manager provides a complete solution for persisting farm data, user settings, calculation history, and drafts to the browser's localStorage. It includes:

- **Auto-save functionality** with configurable debouncing
- **Quota monitoring** and automatic space management
- **LRU eviction** for history entries when storage is full
- **Error handling** for quota exceeded scenarios
- **Type-safe interfaces** for all storage operations
- **Profile management** with validation and operations

## Files

- `storage-manager.ts` - Core storage manager implementation
- `profile-manager.ts` - Farm profile management with validation
- `storage-utils.ts` - Utility functions for storage operations
- `storage-example.ts` - Storage usage examples
- `profile-example.ts` - Profile management usage examples
- `draft-example.ts` - Draft auto-save usage examples (NEW - Task 1.7)
- `index.ts` - Main exports

## Features

### 1. Farm Profile Management (NEW)

The profile manager provides high-level operations for managing farm profiles with comprehensive validation:

```typescript
import { profileManager, ProfileValidationError } from './lib';

// Save a new profile
try {
  const profile = await profileManager.save(
    'My Farm 2024',
    farmFormData,
    practicesData,
    {
      region: 'North America',
      farmType: 'Mixed Grain',
      notes: 'Transitioning to regenerative practices',
    }
  );
  console.log('Profile saved:', profile.id);
} catch (error) {
  if (error instanceof ProfileValidationError) {
    console.error('Validation error:', error.message);
  }
}

// Update an existing profile
await profileManager.update(
  profileId,
  'My Farm 2024 - Updated',
  updatedFormData,
  updatedPractices,
  metadata
);

// Load a profile
const profile = await profileManager.load(profileId);

// List all profiles (sorted by update date, most recent first)
const profiles = await profileManager.list();

// Rename a profile
await profileManager.rename(profileId, 'New Farm Name');

// Delete a profile
await profileManager.delete(profileId);

// Check if profile limit is reached
const isLimitReached = await profileManager.isLimitReached();
const count = await profileManager.getCount();

// Check if a name already exists
const exists = await profileManager.nameExists('My Farm');

// Validate profile data before saving
const errors = profileManager.validateProfileData(farmFormData);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

**Profile Validation:**

The profile manager validates:
- Profile name (required, max 100 characters)
- Total farm area (non-negative, reasonable limits)
- Livestock counts (non-negative, reasonable limits)
- Crop data (crop_id, area, fertilizer rates, etc.)
- Practices array (must match crops array length)
- Pesticide entries (valid IDs and rates)

**Limits:**
- Maximum 20 profiles
- Profile names are automatically sanitized
- Duplicate names are allowed (but can be checked with `nameExists()`)

**Error Handling:**

```typescript
try {
  await profileManager.save(name, data, practices);
} catch (error) {
  if (error instanceof ProfileValidationError) {
    // Validation error - show to user
    alert(error.message);
  } else if (error.message.includes('Maximum')) {
    // Profile limit reached
    alert('You have reached the maximum of 20 profiles.');
  } else {
    // Other error
    console.error('Failed to save profile:', error);
  }
}
```

### 2. Farm Profiles (Low-Level)

Save and manage multiple farm configurations:

```typescript
import { storageManager, generateId } from './lib';

// Save a profile
const profile: FarmProfile = {
  id: generateId(),
  name: 'My Farm',
  createdAt: new Date(),
  updatedAt: new Date(),
  data: farmFormData,
  practices: practicesData,
};

await storageManager.saveProfile(profile);

// Load a profile
const loaded = await storageManager.loadProfile(profileId);

// List all profiles
const profiles = await storageManager.listProfiles();

// Delete a profile
await storageManager.deleteProfile(profileId);
```

**Limits:**
- Maximum 20 profiles
- Attempting to save more will throw an error

### 2. Calculation History

Store calculation results with timestamps:

```typescript
// Save a calculation
const calculation: CalculationHistory = {
  id: generateId(),
  timestamp: new Date(),
  farmName: 'My Farm',
  data: farmFormData,
  practices: practicesData,
  results: emissionResults,
};

await storageManager.saveCalculation(calculation);

// Load history
const history = await storageManager.loadHistory();

// Delete a calculation
await storageManager.deleteCalculation(calculationId);

// Clean up old entries (keep only 20 most recent)
await storageManager.clearOldHistory(20);
```

**Limits:**
- Maximum 50 calculations
- Oldest entries are automatically removed when limit is reached
- History is sorted by timestamp (most recent first)

### 3. Draft Auto-Save (NEW - Task 1.7)

Automatically save incomplete work and recover it on app reload:

**Using the Hook (Recommended):**

```typescript
import { useDraftAutoSave, useDraftRecovery } from '../hooks';

function MyComponent() {
  const [formData, setFormData] = useState(initialData);
  const [practices, setPractices] = useState(initialPractices);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save draft every 30 seconds when there are unsaved changes
  const { clearDraft } = useDraftAutoSave(
    formData,
    practices,
    isDirty,
    {
      interval: 30000, // 30 seconds
      enabled: true,
      onSave: () => console.log('Draft saved'),
      onError: (error) => console.error('Draft save failed:', error),
    }
  );

  // Check for draft on mount
  const { draftExists, draft, isChecking, acceptDraft, rejectDraft } = useDraftRecovery();

  // Show recovery notification
  useEffect(() => {
    if (!isChecking && draftExists && draft) {
      // Show notification UI
      setShowDraftNotification(true);
    }
  }, [isChecking, draftExists, draft]);

  // Handle draft recovery
  const handleRecoverDraft = () => {
    if (draft) {
      setFormData(draft.data);
      setPractices(draft.practices);
      setIsDirty(false);
    }
  };

  // Handle draft dismissal
  const handleDismissDraft = async () => {
    await rejectDraft();
  };

  // Clear draft on successful calculation
  const handleCalculate = async () => {
    // ... perform calculation ...
    await clearDraft();
    setIsDirty(false);
  };

  return <div>...</div>;
}
```

**Manual Draft Operations:**

```typescript
// Save a draft
const draft: Draft = {
  timestamp: new Date(),
  data: farmFormData,
  practices: practicesData,
};

await storageManager.saveDraft(draft);

// Load draft
const draft = await storageManager.loadDraft();

// Clear draft (e.g., after completing calculation)
await storageManager.clearDraft();
```

**Behavior:**
- Auto-saves every 30 seconds when there are unsaved changes (configurable)
- Only one draft is stored at a time (per session)
- New drafts overwrite previous ones
- Drafts are automatically cleared when calculations are completed
- Draft recovery notification shown on app load if draft exists
- Includes timestamp for display in recovery notification

**Requirements Satisfied:**
- **Requirement 3.1**: Auto-save after 30 seconds of unsaved changes
- **Requirement 3.2**: Draft recovery notification on app load
- **Requirement 3.3**: Only one draft per session
- **Requirement 3.4**: Clear draft on calculation completion
- **Requirement 3.5**: Include timestamp with draft

### 4. User Settings

Persist user preferences:

```typescript
// Save settings
const settings: UserSettings = {
  theme: 'dark',
  language: 'en',
  fontSize: 'medium',
  highContrast: false,
  autoSaveInterval: 2,
  region: 'UA',
  showTutorial: true,
  analyticsEnabled: false,
};

await storageManager.saveSettings(settings);

// Load settings (returns defaults if none saved)
const settings = await storageManager.loadSettings();
```

### 5. Quota Management

Monitor and manage storage space:

```typescript
// Check quota
const quota = await storageManager.getQuotaInfo();
console.log(`Used: ${quota.used} bytes`);
console.log(`Available: ${quota.available} bytes`);

// Free space (automatic LRU eviction)
await storageManager.freeSpace(targetBytes);
```

**Automatic Space Management:**
- Monitors storage usage
- Automatically removes oldest history entries when space is low
- Clears draft if more space is needed
- Throws error if unable to free enough space

## Hooks

### useDraftAutoSave (NEW - Task 1.7)

Automatically save drafts with configurable interval and recovery:

```typescript
import { useDraftAutoSave } from '../hooks';

function MyComponent() {
  const [formData, setFormData] = useState(initialData);
  const [practices, setPractices] = useState(initialPractices);
  const [isDirty, setIsDirty] = useState(false);

  const { saveDraft, loadDraft, clearDraft, hasDraft, lastSaveTime } = useDraftAutoSave(
    formData,
    practices,
    isDirty,
    {
      interval: 30000, // 30 seconds (default)
      enabled: true,
      onSave: () => console.log('Draft auto-saved'),
      onError: (error) => console.error('Auto-save failed:', error),
    }
  );

  // Manually trigger save if needed
  const handleManualSave = async () => {
    await saveDraft();
  };

  // Check if draft exists
  const checkDraft = async () => {
    const exists = await hasDraft();
    console.log('Draft exists:', exists);
  };

  return <div>...</div>;
}
```

**Configuration Options:**
- `interval`: Auto-save delay in milliseconds (default: 30000)
- `enabled`: Enable/disable auto-save (default: true)
- `onSave`: Callback when draft is saved
- `onError`: Callback when save fails

**Returns:**
- `saveDraft`: Manually trigger draft save
- `loadDraft`: Load existing draft
- `clearDraft`: Clear draft from storage
- `hasDraft`: Check if draft exists
- `lastSaveTime`: Timestamp of last save

### useDraftRecovery (NEW - Task 1.7)

Check for and recover drafts on app load:

```typescript
import { useDraftRecovery } from '../hooks';

function MyComponent() {
  const { draftExists, draft, isChecking, acceptDraft, rejectDraft } = useDraftRecovery();

  // Show notification when draft exists
  if (!isChecking && draftExists && draft) {
    return (
      <DraftRecoveryNotification
        draft={draft}
        onRecover={() => {
          const recovered = acceptDraft();
          if (recovered) {
            setFormData(recovered.data);
            setPractices(recovered.practices);
          }
        }}
        onDismiss={async () => {
          await rejectDraft();
        }}
      />
    );
  }

  return <div>...</div>;
}
```

**Returns:**
- `draftExists`: Boolean indicating if draft exists
- `draft`: The draft object (or null)
- `isChecking`: Boolean indicating if check is in progress
- `acceptDraft`: Function to accept and return draft
- `rejectDraft`: Async function to reject and clear draft

### useAutoSave

Automatically save data with debouncing:

```typescript
import { useAutoSave } from '../hooks';

function MyComponent() {
  const [data, setData] = useState(initialData);

  // Auto-save after 2 seconds of inactivity
  useAutoSave(
    data,
    async (value) => {
      await storageManager.saveDraft({
        timestamp: new Date(),
        data: value,
        practices: [],
      });
    },
    2000 // 2 second delay
  );

  return <div>...</div>;
}
```

### useAutoSaveDraft

Specialized hook for draft auto-saving:

```typescript
import { useAutoSaveDraft } from '../hooks';

function MyComponent() {
  const [formData, setFormData] = useState(initialData);
  const [practices, setPractices] = useState(initialPractices);
  const [isDirty, setIsDirty] = useState(false);

  // Only saves when isDirty is true
  useAutoSaveDraft(
    formData,
    practices,
    isDirty,
    async (draft) => {
      await storageManager.saveDraft(draft);
    },
    2000
  );

  return <div>...</div>;
}
```

### usePersistentState

State that automatically syncs with localStorage:

```typescript
import { usePersistentState } from '../hooks';

function MyComponent() {
  // Like useState, but persists to localStorage
  const [theme, setTheme] = usePersistentState<Theme>('app:theme', 'dark');

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

## Utility Functions

```typescript
import {
  generateId,
  formatDate,
  formatBytes,
  getStorageUsagePercent,
  isLocalStorageAvailable,
  validateProfileName,
  sanitizeProfileName,
} from './lib';

// Generate unique ID
const id = generateId(); // "lq2x3y4z-abc123"

// Format date
const formatted = formatDate(new Date(), 'en'); // "Jan 15, 2024, 10:30 AM"

// Format bytes
const size = formatBytes(1024000); // "1000 KB"

// Check storage availability
if (isLocalStorageAvailable()) {
  // Safe to use localStorage
}

// Validate profile name
const error = validateProfileName(name);
if (error) {
  console.error(error);
}
```

## Error Handling

The storage manager handles common errors gracefully:

```typescript
try {
  await storageManager.saveProfile(profile);
} catch (error) {
  if (error.message.includes('quota exceeded')) {
    // Storage is full
    alert('Storage is full. Please delete some profiles or history entries.');
  } else if (error.message.includes('Maximum profiles reached')) {
    // Hit profile limit
    alert('You have reached the maximum of 20 profiles.');
  } else {
    // Other error
    console.error('Failed to save profile:', error);
  }
}
```

## Storage Keys

All data is stored with prefixed keys to avoid conflicts:

```typescript
const STORAGE_KEYS = {
  PROFILES: 'carbon-app:profiles',
  HISTORY: 'carbon-app:history',
  DRAFT: 'carbon-app:draft',
  SETTINGS: 'carbon-app:settings',
  SCHEMA_VERSION: 'carbon-app:schema-version',
};
```

## Data Migration

The storage manager includes a schema version system for future data migrations:

- Current schema version: 1
- Version is stored in localStorage
- Future updates can detect and migrate old data formats

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

**Storage Manager:**
- **Requirement 1.1**: Auto-save within 2 seconds of form changes
- **Requirement 1.2**: Restore state on app reopen
- **Requirement 1.3**: Store up to 50 calculations in history
- **Requirement 1.4**: Remove oldest entries when exceeding 4MB
- **Requirement 1.5**: Save user preferences
- **Requirement 1.6**: Handle missing localStorage gracefully
- **Requirement 65.1-65.7**: Complete storage manager interface
- **Requirement 3.1**: Draft auto-save after 30 seconds (configurable)
- **Requirement 3.3**: Single draft per session
- **Requirement 3.5**: Include timestamp with draft

**Profile Manager (Task 1.5):**
- **Requirement 2.1**: Save current state as named farm profile
- **Requirement 2.2**: Display list of saved profiles with names and timestamps
- **Requirement 2.3**: Load profile data into form
- **Requirement 2.4**: Delete profiles from list
- **Requirement 2.5**: Rename profiles
- **Requirement 2.6**: Store up to 20 profiles
- Profile validation for all data fields
- Comprehensive error handling with ProfileValidationError
- Metadata support (region, farm type, notes)

## Performance Considerations

- **Debouncing**: Auto-save uses debouncing to avoid excessive writes
- **Lazy Loading**: Data is only loaded when needed
- **Efficient Serialization**: Uses native JSON.stringify/parse
- **Date Revival**: Automatically converts ISO date strings back to Date objects
- **Quota Monitoring**: Checks storage usage before large writes

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- ES6+ features (Promise, async/await, etc.)
- Blob API (for size calculations)

## Testing

See `storage-example.ts` for comprehensive usage examples.

For integration testing in your app:

1. Check if localStorage is available
2. Test save/load operations
3. Verify quota management
4. Test error scenarios (quota exceeded, etc.)
