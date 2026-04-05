/**
 * Example usage of the storage manager and hooks
 * This file demonstrates how to use the localStorage functionality
 */

import { storageManager, generateId } from './index';
import type { FarmProfile, Draft, UserSettings } from '../types/storage';
import type { FarmForm, CropPractice } from '../types/storage';

/**
 * Example 1: Save and load a farm profile
 */
export async function exampleSaveProfile(
  name: string,
  data: FarmForm,
  practices: CropPractice[]
): Promise<string> {
  const profile: FarmProfile = {
    id: generateId(),
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    data,
    practices,
    metadata: {
      region: 'UA',
      farmType: 'mixed',
    },
  };

  await storageManager.saveProfile(profile);
  console.log('Profile saved:', profile.id);
  
  return profile.id;
}

/**
 * Example 2: Load all profiles
 */
export async function exampleListProfiles(): Promise<FarmProfile[]> {
  const profiles = await storageManager.listProfiles();
  console.log(`Found ${profiles.length} profiles`);
  
  profiles.forEach(profile => {
    console.log(`- ${profile.name} (${profile.id})`);
  });
  
  return profiles;
}

/**
 * Example 3: Save a draft
 */
export async function exampleSaveDraft(
  data: FarmForm,
  practices: CropPractice[]
): Promise<void> {
  const draft: Draft = {
    timestamp: new Date(),
    data,
    practices,
  };

  await storageManager.saveDraft(draft);
  console.log('Draft saved at:', draft.timestamp);
}

/**
 * Example 4: Load draft and check if it exists
 */
export async function exampleLoadDraft(): Promise<Draft | null> {
  const draft = await storageManager.loadDraft();
  
  if (draft) {
    console.log('Draft found from:', draft.timestamp);
    return draft;
  } else {
    console.log('No draft found');
    return null;
  }
}

/**
 * Example 5: Save and load settings
 */
export async function exampleSettings(): Promise<void> {
  // Save custom settings
  const settings: UserSettings = {
    theme: 'light',
    language: 'ua',
    fontSize: 'large',
    highContrast: false,
    autoSaveInterval: 3,
    region: 'UA',
    showTutorial: false,
    analyticsEnabled: false,
  };

  await storageManager.saveSettings(settings);
  console.log('Settings saved');

  // Load settings
  const loaded = await storageManager.loadSettings();
  console.log('Settings loaded:', loaded);
}

/**
 * Example 6: Check storage quota
 */
export async function exampleCheckQuota(): Promise<void> {
  const quota = await storageManager.getQuotaInfo();
  const usedPercent = Math.round((quota.used / quota.available) * 100);
  
  console.log(`Storage: ${quota.used} / ${quota.available} bytes (${usedPercent}%)`);
  
  if (usedPercent > 80) {
    console.warn('Storage is getting full!');
  }
}

/**
 * Example 7: Save calculation to history
 */
export async function exampleSaveCalculation(
  data: FarmForm,
  practices: CropPractice[],
  results: any
): Promise<void> {
  const calculation = {
    id: generateId(),
    timestamp: new Date(),
    farmName: 'My Farm',
    data,
    practices,
    results,
    metadata: {
      version: '1.0.0',
    },
  };

  await storageManager.saveCalculation(calculation);
  console.log('Calculation saved to history');
}

/**
 * Example 8: Load calculation history
 */
export async function exampleLoadHistory(): Promise<void> {
  const history = await storageManager.loadHistory();
  console.log(`Found ${history.length} calculations in history`);
  
  history.forEach((calc, index) => {
    console.log(`${index + 1}. ${calc.farmName || 'Unnamed'} - ${calc.timestamp}`);
  });
}

/**
 * Example 9: Clean up old history
 */
export async function exampleCleanupHistory(): Promise<void> {
  console.log('Cleaning up old history entries...');
  await storageManager.clearOldHistory(20); // Keep only 20 most recent
  console.log('History cleaned up');
}

/**
 * Example 10: Delete a profile
 */
export async function exampleDeleteProfile(profileId: string): Promise<void> {
  await storageManager.deleteProfile(profileId);
  console.log('Profile deleted:', profileId);
}

// Usage in a React component would look like this:
/*
import { useAutoSave } from '../hooks';
import { storageManager } from '../lib';

function MyComponent() {
  const [formData, setFormData] = useState<FarmForm>(initialData);
  const [practices, setPractices] = useState<CropPractice[]>(initialPractices);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save draft every 2 seconds when there are changes
  useAutoSave(
    { data: formData, practices },
    async (value) => {
      if (isDirty) {
        await storageManager.saveDraft({
          timestamp: new Date(),
          data: value.data,
          practices: value.practices,
        });
      }
    },
    2000,
    isDirty
  );

  // ... rest of component
}
*/
