/**
 * Farm Profile Management System
 * Provides high-level operations for managing farm profiles with validation
 */

import type { FarmProfile, FarmForm, CropPractice } from '../types/storage';
import { storageManager } from './storage-manager';
import { generateId, validateProfileName, sanitizeProfileName } from './storage-utils';

/**
 * Profile validation errors
 */
export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

/**
 * Profile Manager Interface
 */
export interface ProfileManager {
  // Core operations
  save(name: string, data: FarmForm, practices: CropPractice[], metadata?: FarmProfile['metadata']): Promise<FarmProfile>;
  load(id: string): Promise<FarmProfile | null>;
  list(): Promise<FarmProfile[]>;
  delete(id: string): Promise<void>;
  rename(id: string, newName: string): Promise<void>;
  
  // Validation
  validateProfile(profile: Partial<FarmProfile>): string[];
  validateProfileData(data: FarmForm): string[];
}

/**
 * Profile Manager Implementation
 */
export class FarmProfileManager implements ProfileManager {
  /**
   * Save a new profile or update an existing one
   */
  async save(
    name: string,
    data: FarmForm,
    practices: CropPractice[],
    metadata?: FarmProfile['metadata']
  ): Promise<FarmProfile> {
    // Validate profile name
    const nameError = validateProfileName(name);
    if (nameError) {
      throw new ProfileValidationError(nameError);
    }

    // Validate profile data
    const dataErrors = this.validateProfileData(data);
    if (dataErrors.length > 0) {
      throw new ProfileValidationError(`Invalid profile data: ${dataErrors.join(', ')}`);
    }

    // Validate practices array matches crops array
    if (practices.length !== data.crops.length) {
      throw new ProfileValidationError(
        `Practices array length (${practices.length}) must match crops array length (${data.crops.length})`
      );
    }

    // Create profile object
    const now = new Date();
    const profile: FarmProfile = {
      id: generateId(),
      name: sanitizeProfileName(name),
      createdAt: now,
      updatedAt: now,
      data,
      practices,
      metadata,
    };

    // Validate complete profile
    const profileErrors = this.validateProfile(profile);
    if (profileErrors.length > 0) {
      throw new ProfileValidationError(`Invalid profile: ${profileErrors.join(', ')}`);
    }

    // Save to storage
    await storageManager.saveProfile(profile);

    return profile;
  }

  /**
   * Update an existing profile
   */
  async update(
    id: string,
    name: string,
    data: FarmForm,
    practices: CropPractice[],
    metadata?: FarmProfile['metadata']
  ): Promise<FarmProfile> {
    // Load existing profile to preserve creation date
    const existing = await this.load(id);
    if (!existing) {
      throw new ProfileValidationError(`Profile with id ${id} not found`);
    }

    // Validate profile name
    const nameError = validateProfileName(name);
    if (nameError) {
      throw new ProfileValidationError(nameError);
    }

    // Validate profile data
    const dataErrors = this.validateProfileData(data);
    if (dataErrors.length > 0) {
      throw new ProfileValidationError(`Invalid profile data: ${dataErrors.join(', ')}`);
    }

    // Validate practices array matches crops array
    if (practices.length !== data.crops.length) {
      throw new ProfileValidationError(
        `Practices array length (${practices.length}) must match crops array length (${data.crops.length})`
      );
    }

    // Create updated profile object
    const profile: FarmProfile = {
      id,
      name: sanitizeProfileName(name),
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      data,
      practices,
      metadata,
    };

    // Validate complete profile
    const profileErrors = this.validateProfile(profile);
    if (profileErrors.length > 0) {
      throw new ProfileValidationError(`Invalid profile: ${profileErrors.join(', ')}`);
    }

    // Save to storage
    await storageManager.saveProfile(profile);

    return profile;
  }

  /**
   * Load a profile by ID
   */
  async load(id: string): Promise<FarmProfile | null> {
    if (!id || id.trim().length === 0) {
      throw new ProfileValidationError('Profile ID cannot be empty');
    }

    return await storageManager.loadProfile(id);
  }

  /**
   * List all profiles, sorted by update date (most recent first)
   */
  async list(): Promise<FarmProfile[]> {
    const profiles = await storageManager.listProfiles();
    
    // Sort by updatedAt descending (most recent first)
    return profiles.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Delete a profile by ID
   */
  async delete(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new ProfileValidationError('Profile ID cannot be empty');
    }

    // Verify profile exists before deleting
    const profile = await this.load(id);
    if (!profile) {
      throw new ProfileValidationError(`Profile with id ${id} not found`);
    }

    await storageManager.deleteProfile(id);
  }

  /**
   * Rename a profile
   */
  async rename(id: string, newName: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new ProfileValidationError('Profile ID cannot be empty');
    }

    // Validate new name
    const nameError = validateProfileName(newName);
    if (nameError) {
      throw new ProfileValidationError(nameError);
    }

    // Load existing profile
    const profile = await this.load(id);
    if (!profile) {
      throw new ProfileValidationError(`Profile with id ${id} not found`);
    }

    // Update profile with new name
    profile.name = sanitizeProfileName(newName);
    profile.updatedAt = new Date();

    // Save updated profile
    await storageManager.saveProfile(profile);
  }

  /**
   * Validate a complete profile object
   */
  validateProfile(profile: Partial<FarmProfile>): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!profile.id || profile.id.trim().length === 0) {
      errors.push('Profile ID is required');
    }

    if (!profile.name || profile.name.trim().length === 0) {
      errors.push('Profile name is required');
    } else if (profile.name.length > 100) {
      errors.push('Profile name must be less than 100 characters');
    }

    if (!profile.createdAt || !(profile.createdAt instanceof Date)) {
      errors.push('Profile createdAt must be a valid Date');
    }

    if (!profile.updatedAt || !(profile.updatedAt instanceof Date)) {
      errors.push('Profile updatedAt must be a valid Date');
    }

    if (!profile.data) {
      errors.push('Profile data is required');
    } else {
      // Validate data structure
      const dataErrors = this.validateProfileData(profile.data);
      errors.push(...dataErrors);
    }

    if (!profile.practices || !Array.isArray(profile.practices)) {
      errors.push('Profile practices must be an array');
    } else if (profile.data && profile.practices.length !== profile.data.crops.length) {
      errors.push('Practices array length must match crops array length');
    }

    return errors;
  }

  /**
   * Validate profile data (FarmForm)
   */
  validateProfileData(data: FarmForm): string[] {
    const errors: string[] = [];

    // Validate totalArea
    if (data.totalArea === undefined || data.totalArea === null) {
      errors.push('Total area is required');
    } else {
      const area = parseFloat(data.totalArea);
      if (isNaN(area)) {
        errors.push('Total area must be a valid number');
      } else if (area < 0) {
        errors.push('Total area must be non-negative');
      } else if (area > 1000000) {
        errors.push('Total area exceeds reasonable limit (1,000,000 ha)');
      }
    }

    // Validate livestock counts
    const livestockFields = [
      { field: 'dairyCows', name: 'Dairy cows' },
      { field: 'pigs', name: 'Pigs' },
      { field: 'chickens', name: 'Chickens' },
    ];

    for (const { field, name } of livestockFields) {
      const value = data[field as keyof FarmForm] as string;
      if (value === undefined || value === null) {
        errors.push(`${name} count is required`);
      } else {
        const count = parseFloat(value);
        if (isNaN(count)) {
          errors.push(`${name} count must be a valid number`);
        } else if (count < 0) {
          errors.push(`${name} count must be non-negative`);
        } else if (count > 1000000) {
          errors.push(`${name} count exceeds reasonable limit`);
        }
      }
    }

    // Validate crops array
    if (!data.crops || !Array.isArray(data.crops)) {
      errors.push('Crops must be an array');
    } else {
      // Validate each crop
      data.crops.forEach((crop, index) => {
        const cropErrors = this.validateCrop(crop, index);
        errors.push(...cropErrors);
      });
    }

    return errors;
  }

  /**
   * Validate a single crop entry
   */
  private validateCrop(crop: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Crop ${index + 1}`;

    // Validate crop_id
    if (crop.crop_id === undefined || crop.crop_id === null) {
      errors.push(`${prefix}: crop_id is required`);
    } else if (typeof crop.crop_id !== 'number') {
      errors.push(`${prefix}: crop_id must be a number`);
    } else if (crop.crop_id < 0) {
      errors.push(`${prefix}: crop_id must be non-negative`);
    }

    // Validate numeric fields
    const numericFields = [
      { field: 'area', name: 'Area', max: 1000000 },
      { field: 'nitrogen', name: 'Nitrogen', max: 1000 },
      { field: 'phosphorus', name: 'Phosphorus', max: 1000 },
      { field: 'potassium', name: 'Potassium', max: 1000 },
      { field: 'manure', name: 'Manure', max: 100000 },
      { field: 'diesel', name: 'Diesel', max: 10000 },
      { field: 'irrigation', name: 'Irrigation', max: 10000 },
    ];

    for (const { field, name, max } of numericFields) {
      const value = crop[field];
      if (value === undefined || value === null) {
        errors.push(`${prefix}: ${name} is required`);
      } else {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`${prefix}: ${name} must be a valid number`);
        } else if (num < 0) {
          errors.push(`${prefix}: ${name} must be non-negative`);
        } else if (num > max) {
          errors.push(`${prefix}: ${name} exceeds reasonable limit (${max})`);
        }
      }
    }

    // Validate pesticides array
    if (!crop.pesticides || !Array.isArray(crop.pesticides)) {
      errors.push(`${prefix}: pesticides must be an array`);
    } else {
      crop.pesticides.forEach((pesticide: any, pIndex: number) => {
        if (!pesticide.pesticide_id) {
          errors.push(`${prefix}, Pesticide ${pIndex + 1}: pesticide_id is required`);
        }
        if (pesticide.rate === undefined || pesticide.rate === null) {
          errors.push(`${prefix}, Pesticide ${pIndex + 1}: rate is required`);
        } else {
          const rate = parseFloat(pesticide.rate);
          if (isNaN(rate)) {
            errors.push(`${prefix}, Pesticide ${pIndex + 1}: rate must be a valid number`);
          } else if (rate < 0) {
            errors.push(`${prefix}, Pesticide ${pIndex + 1}: rate must be non-negative`);
          }
        }
      });
    }

    return errors;
  }

  /**
   * Check if a profile name already exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const profiles = await this.list();
    const normalizedName = name.trim().toLowerCase();
    
    return profiles.some(
      p => p.name.toLowerCase() === normalizedName && p.id !== excludeId
    );
  }

  /**
   * Get profile count
   */
  async getCount(): Promise<number> {
    const profiles = await this.list();
    return profiles.length;
  }

  /**
   * Check if profile limit is reached
   */
  async isLimitReached(): Promise<boolean> {
    const count = await this.getCount();
    return count >= 20; // MAX_PROFILES
  }
}

/**
 * Singleton instance
 */
export const profileManager = new FarmProfileManager();
