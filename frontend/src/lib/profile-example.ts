/**
 * Example usage of the Farm Profile Manager
 * This file demonstrates how to use the profile management system
 */

import { profileManager, ProfileValidationError } from './profile-manager';
import type { FarmForm, CropPractice } from '../types/storage';

/**
 * Example: Save a new farm profile
 */
export async function exampleSaveProfile() {
  // Sample farm data
  const farmData: FarmForm = {
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '200',
    crops: [
      {
        crop_id: 0, // Wheat
        area: '50',
        nitrogen: '120',
        phosphorus: '40',
        potassium: '30',
        manure: '0',
        diesel: '50',
        irrigation: '0',
        pesticides: [{ pesticide_id: '-1', rate: '0' }],
      },
      {
        crop_id: 1, // Corn
        area: '50',
        nitrogen: '150',
        phosphorus: '50',
        potassium: '40',
        manure: '5000',
        diesel: '60',
        irrigation: '200',
        pesticides: [{ pesticide_id: '0', rate: '2.5' }],
      },
    ],
  };

  // Sample practices (one per crop)
  const practices: CropPractice[] = [
    {
      tillage: 'no_till',
      precisionFertilization: true,
      coverCrop: true,
      irrigationMethod: 'drip',
      irrigationEnergy: 'solar',
      residue: 'retain',
    },
    {
      tillage: 'disk_tillage',
      precisionFertilization: false,
      coverCrop: false,
      irrigationMethod: 'center_pivot',
      irrigationEnergy: 'grid',
      residue: 'incorporate',
    },
  ];

  // Optional metadata
  const metadata = {
    region: 'North America',
    farmType: 'Mixed Grain and Livestock',
    notes: 'Transitioning to regenerative practices',
  };

  try {
    // Save the profile
    const profile = await profileManager.save(
      'My Farm 2024',
      farmData,
      practices,
      metadata
    );

    console.log('Profile saved successfully:', profile.id);
    return profile;
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to save profile:', error);
    }
    throw error;
  }
}

/**
 * Example: Load a profile by ID
 */
export async function exampleLoadProfile(profileId: string) {
  try {
    const profile = await profileManager.load(profileId);

    if (profile) {
      console.log('Profile loaded:', profile.name);
      console.log('Total area:', profile.data.totalArea, 'ha');
      console.log('Number of crops:', profile.data.crops.length);
      return profile;
    } else {
      console.log('Profile not found');
      return null;
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
    throw error;
  }
}

/**
 * Example: List all profiles
 */
export async function exampleListProfiles() {
  try {
    const profiles = await profileManager.list();

    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach((profile) => {
      console.log(`- ${profile.name} (${profile.id})`);
      console.log(`  Created: ${profile.createdAt.toLocaleDateString()}`);
      console.log(`  Updated: ${profile.updatedAt.toLocaleDateString()}`);
      console.log(`  Area: ${profile.data.totalArea} ha`);
    });

    return profiles;
  } catch (error) {
    console.error('Failed to list profiles:', error);
    throw error;
  }
}

/**
 * Example: Rename a profile
 */
export async function exampleRenameProfile(profileId: string, newName: string) {
  try {
    await profileManager.rename(profileId, newName);
    console.log('Profile renamed successfully');
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to rename profile:', error);
    }
    throw error;
  }
}

/**
 * Example: Delete a profile
 */
export async function exampleDeleteProfile(profileId: string) {
  try {
    await profileManager.delete(profileId);
    console.log('Profile deleted successfully');
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      console.error('Validation error:', error.message);
    } else {
      console.error('Failed to delete profile:', error);
    }
    throw error;
  }
}

/**
 * Example: Update an existing profile
 */
export async function exampleUpdateProfile(profileId: string) {
  try {
    // Load existing profile
    const existing = await profileManager.load(profileId);
    if (!existing) {
      throw new Error('Profile not found');
    }

    // Modify the data
    const updatedData: FarmForm = {
      ...existing.data,
      totalArea: '120', // Increased farm size
      crops: [
        ...existing.data.crops,
        // Add a new crop
        {
          crop_id: 2, // Soybeans
          area: '20',
          nitrogen: '20',
          phosphorus: '30',
          potassium: '40',
          manure: '0',
          diesel: '40',
          irrigation: '0',
          pesticides: [{ pesticide_id: '-1', rate: '0' }],
        },
      ],
    };

    // Add practices for the new crop
    const updatedPractices: CropPractice[] = [
      ...existing.practices,
      {
        tillage: 'no_till',
        precisionFertilization: true,
        coverCrop: false,
        irrigationMethod: 'furrow_surface',
        irrigationEnergy: 'diesel_pump',
        residue: 'retain',
      },
    ];

    // Update the profile
    const updated = await profileManager.update(
      profileId,
      existing.name,
      updatedData,
      updatedPractices,
      existing.metadata
    );

    console.log('Profile updated successfully');
    return updated;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
}

/**
 * Example: Check if profile limit is reached
 */
export async function exampleCheckLimit() {
  try {
    const isLimitReached = await profileManager.isLimitReached();
    const count = await profileManager.getCount();

    console.log(`Current profiles: ${count}/20`);
    if (isLimitReached) {
      console.log('Profile limit reached! Please delete some profiles.');
    } else {
      console.log(`You can save ${20 - count} more profiles.`);
    }

    return { count, isLimitReached };
  } catch (error) {
    console.error('Failed to check limit:', error);
    throw error;
  }
}

/**
 * Example: Check if a profile name already exists
 */
export async function exampleCheckNameExists(name: string) {
  try {
    const exists = await profileManager.nameExists(name);

    if (exists) {
      console.log(`Profile name "${name}" already exists`);
    } else {
      console.log(`Profile name "${name}" is available`);
    }

    return exists;
  } catch (error) {
    console.error('Failed to check name:', error);
    throw error;
  }
}

/**
 * Example: Validate profile data before saving
 */
export async function exampleValidateData(farmData: FarmForm) {
  try {
    const errors = profileManager.validateProfileData(farmData);

    if (errors.length > 0) {
      console.log('Validation errors found:');
      errors.forEach((error) => console.log(`- ${error}`));
      return false;
    } else {
      console.log('Profile data is valid');
      return true;
    }
  } catch (error) {
    console.error('Failed to validate data:', error);
    throw error;
  }
}
