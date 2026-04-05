/**
 * Example usage of draft auto-save functionality
 * 
 * This file demonstrates how to use the draft auto-save and recovery features
 * in the Farm Carbon Footprint App.
 */

import { storageManager } from './storage-manager';
import type { Draft, FarmForm, CropPractice } from '../types/storage';

/**
 * Example 1: Manually save a draft
 */
export async function exampleSaveDraft() {
  const draft: Draft = {
    timestamp: new Date(),
    data: {
      totalArea: '100',
      dairyCows: '50',
      pigs: '0',
      chickens: '0',
      crops: [
        {
          crop_id: 0, // Wheat
          area: '50',
          nitrogen: '120',
          phosphorus: '40',
          potassium: '60',
          manure: '0',
          diesel: '50',
          irrigation: '0',
          pesticides: [{ pesticide_id: '-1', rate: '0' }],
        },
      ],
    },
    practices: [
      {
        tillage: 'disk_tillage',
        precisionFertilization: false,
        coverCrop: false,
        irrigationMethod: 'sprinkler',
        irrigationEnergy: 'grid',
        residue: 'incorporate',
      },
    ],
  };

  try {
    await storageManager.saveDraft(draft);
    console.log('Draft saved successfully');
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

/**
 * Example 2: Load an existing draft
 */
export async function exampleLoadDraft(): Promise<Draft | null> {
  try {
    const draft = await storageManager.loadDraft();
    
    if (draft) {
      console.log('Draft found:', {
        timestamp: draft.timestamp,
        farmArea: draft.data.totalArea,
        numCrops: draft.data.crops.length,
      });
      return draft;
    } else {
      console.log('No draft found');
      return null;
    }
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

/**
 * Example 3: Clear draft after successful calculation
 */
export async function exampleClearDraft() {
  try {
    await storageManager.clearDraft();
    console.log('Draft cleared successfully');
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}

/**
 * Example 4: Check if draft exists
 */
export async function exampleCheckDraft(): Promise<boolean> {
  try {
    const draft = await storageManager.loadDraft();
    const exists = draft !== null;
    console.log('Draft exists:', exists);
    return exists;
  } catch (error) {
    console.error('Failed to check for draft:', error);
    return false;
  }
}

/**
 * Example 5: Draft recovery workflow
 * 
 * This demonstrates the typical workflow for draft recovery:
 * 1. Check for draft on app load
 * 2. Show notification if draft exists
 * 3. User chooses to recover or discard
 * 4. Load draft data or clear it
 */
export async function exampleDraftRecoveryWorkflow(
  onRecover: (data: FarmForm, practices: CropPractice[]) => void,
  onDiscard: () => void
): Promise<void> {
  try {
    // Step 1: Check for draft
    const draft = await storageManager.loadDraft();
    
    if (!draft) {
      console.log('No draft to recover');
      return;
    }

    // Step 2: Show notification (in real app, this would be a UI component)
    console.log('Draft found from:', draft.timestamp);
    console.log('Would you like to recover this draft?');

    // Step 3: Simulate user choice (in real app, this comes from UI interaction)
    const userWantsToRecover = true; // This would come from user clicking a button

    if (userWantsToRecover) {
      // Step 4a: Recover draft
      console.log('Recovering draft...');
      onRecover(draft.data, draft.practices);
      // Note: Don't clear draft yet - wait until user completes calculation
    } else {
      // Step 4b: Discard draft
      console.log('Discarding draft...');
      await storageManager.clearDraft();
      onDiscard();
    }
  } catch (error) {
    console.error('Draft recovery workflow failed:', error);
  }
}

/**
 * Example 6: Auto-save simulation
 * 
 * This demonstrates how auto-save works with a debounce delay
 */
export function exampleAutoSaveSimulation(
  data: FarmForm,
  practices: CropPractice[],
  delay: number = 30000
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // This function would be called whenever form data changes
  const scheduleAutoSave = () => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Schedule new auto-save
    timeoutId = setTimeout(async () => {
      const draft: Draft = {
        timestamp: new Date(),
        data,
        practices,
      };

      try {
        await storageManager.saveDraft(draft);
        console.log('Auto-saved draft at:', draft.timestamp);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, delay);
  };

  // Call this whenever form changes
  scheduleAutoSave();

  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Example 7: Complete draft lifecycle
 * 
 * This shows the complete lifecycle of a draft from creation to completion
 */
export async function exampleCompleteDraftLifecycle() {
  console.log('=== Draft Lifecycle Example ===\n');

  // 1. User starts filling form
  console.log('1. User starts filling form...');
  const formData: FarmForm = {
    totalArea: '100',
    dairyCows: '0',
    pigs: '0',
    chickens: '0',
    crops: [
      {
        crop_id: 0,
        area: '100',
        nitrogen: '120',
        phosphorus: '40',
        potassium: '60',
        manure: '0',
        diesel: '50',
        irrigation: '0',
        pesticides: [{ pesticide_id: '-1', rate: '0' }],
      },
    ],
  };

  const practices: CropPractice[] = [
    {
      tillage: 'no_till',
      precisionFertilization: true,
      coverCrop: true,
      irrigationMethod: 'drip',
      irrigationEnergy: 'solar',
      residue: 'retain',
    },
  ];

  // 2. Auto-save triggers after 30 seconds of inactivity
  console.log('2. Auto-save triggers after 30 seconds...');
  await storageManager.saveDraft({
    timestamp: new Date(),
    data: formData,
    practices,
  });
  console.log('   Draft saved\n');

  // 3. User closes browser
  console.log('3. User closes browser\n');

  // 4. User reopens app
  console.log('4. User reopens app...');
  const draft = await storageManager.loadDraft();
  if (draft) {
    console.log('   Draft found from:', draft.timestamp);
    console.log('   Showing recovery notification\n');
  }

  // 5. User recovers draft
  console.log('5. User clicks "Recover Draft"');
  console.log('   Form populated with draft data\n');

  // 6. User completes calculation
  console.log('6. User completes calculation');
  await storageManager.clearDraft();
  console.log('   Draft cleared\n');

  console.log('=== Lifecycle Complete ===');
}
