/**
 * localStorage Manager for Farm Carbon Footprint App
 * Handles data persistence with quota monitoring and LRU eviction
 */

import type {
  FarmProfile,
  CalculationHistory,
  Draft,
  UserSettings,
  QuotaInfo,
} from '../types/storage';
import {
  CURRENT_SCHEMA_VERSION,
  getStoredSchemaVersion,
  setSchemaVersion,
  isMigrationNeeded,
  migrateAllData,
  addSchemaVersion,
} from './migration-manager';

// Storage keys
export const STORAGE_KEYS = {
  PROFILES: 'carbon-app:profiles',
  HISTORY: 'carbon-app:history',
  DRAFT: 'carbon-app:draft',
  SETTINGS: 'carbon-app:settings',
  SCHEMA_VERSION: 'carbon-app:schema-version',
} as const;

// Note: CURRENT_SCHEMA_VERSION is now imported from migration-manager

// Limits
const MAX_PROFILES = 20;
const MAX_HISTORY = 50;
const ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB conservative estimate
const QUOTA_WARNING_THRESHOLD = 0.8; // 80%
const QUOTA_CLEANUP_THRESHOLD = 0.95; // 95%
const DEFAULT_APP_VERSION = '0.1.0';

/**
 * Default user settings
 */
function getDefaultSettings(): UserSettings {
  return {
    theme: 'dark',
    language: 'en',
    fontSize: 'medium',
    highContrast: false,
    autoSaveInterval: 2, // 2 seconds
    region: '',
    showTutorial: true,
    analyticsEnabled: false,
  };
}

/**
 * Storage Manager Interface
 */
export interface StorageManager {
  // Profiles
  saveProfile(profile: FarmProfile): Promise<void>;
  loadProfile(id: string): Promise<FarmProfile | null>;
  listProfiles(): Promise<FarmProfile[]>;
  deleteProfile(id: string): Promise<void>;
  
  // History
  saveCalculation(calc: CalculationHistory): Promise<void>;
  loadHistory(): Promise<CalculationHistory[]>;
  deleteCalculation(id: string): Promise<void>;
  deleteCalculations(ids: string[]): Promise<void>;
  clearOldHistory(keepCount: number): Promise<void>;
  
  // Draft
  saveDraft(draft: Draft): Promise<void>;
  loadDraft(): Promise<Draft | null>;
  clearDraft(): Promise<void>;
  
  // Settings
  saveSettings(settings: UserSettings): Promise<void>;
  loadSettings(): Promise<UserSettings>;
  clearAllData(): Promise<void>;
  
  // Quota management
  getQuotaInfo(): Promise<QuotaInfo>;
  freeSpace(targetBytes: number): Promise<void>;
  
  // Migration
  checkAndMigrate(): Promise<{ success: boolean; errors: string[] }>;
  getSchemaVersion(): number;
}

/**
 * LocalStorage Manager Implementation
 */
export class LocalStorageManager implements StorageManager {
  /**
   * Get an item from localStorage with error handling
   */
  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      // Convert date strings back to Date objects
      return this.reviveDates(parsed);
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set an item in localStorage with error handling
   */
  private async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      const size = new Blob([json]).size;
      
      // Check if we need to free space
      const quota = await this.getQuotaInfo();
      const availableSpace = quota.available - quota.used;
      
      if (size > availableSpace) {
        // Try to free space
        await this.freeSpace(size);
      }
      
      localStorage.setItem(key, json);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Try aggressive cleanup
        await this.freeSpace(new Blob([JSON.stringify(value)]).size);
        // Retry once
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (retryError) {
          throw new Error('Storage quota exceeded. Please delete some saved data.');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Revive Date objects from JSON
   */
  private reviveDates<T>(obj: any): T {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      // Check if it's an ISO date string
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (isoDateRegex.test(obj)) {
        return new Date(obj) as unknown as T;
      }
      return obj as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.reviveDates(item)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.reviveDates(obj[key]);
        }
      }
      return result as T;
    }
    
    return obj as T;
  }

  // ===== Profiles =====

  async saveProfile(profile: FarmProfile): Promise<void> {
    const profiles = await this.listProfiles();
    
    // Check if profile already exists
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    
    // Add schema version to profile metadata
    const profileWithVersion = {
      ...profile,
      metadata: {
        ...profile.metadata,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
    };
    
    if (existingIndex >= 0) {
      // Update existing profile
      profiles[existingIndex] = { ...profileWithVersion, updatedAt: new Date() };
    } else {
      // Add new profile
      if (profiles.length >= MAX_PROFILES) {
        throw new Error(`Maximum of ${MAX_PROFILES} profiles reached. Please delete some profiles.`);
      }
      profiles.push(profileWithVersion);
    }
    
    await this.setItem(STORAGE_KEYS.PROFILES, profiles);
  }

  async loadProfile(id: string): Promise<FarmProfile | null> {
    const profiles = await this.listProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  async listProfiles(): Promise<FarmProfile[]> {
    const profiles = this.getItem<FarmProfile[]>(STORAGE_KEYS.PROFILES);
    return profiles || [];
  }

  async deleteProfile(id: string): Promise<void> {
    const profiles = await this.listProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    await this.setItem(STORAGE_KEYS.PROFILES, filtered);
  }

  // ===== History =====

  async saveCalculation(calc: CalculationHistory): Promise<void> {
    const history = await this.loadHistory();
    
    // Add schema version to calculation metadata
    const calcWithVersion = {
      ...calc,
      metadata: {
        version: calc.metadata?.version ?? DEFAULT_APP_VERSION,
        customFactors: calc.metadata?.customFactors,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
    };
    
    // Add new calculation at the beginning (most recent first)
    history.unshift(calcWithVersion);
    
    // Enforce limit
    if (history.length > MAX_HISTORY) {
      history.splice(MAX_HISTORY);
    }
    
    await this.setItem(STORAGE_KEYS.HISTORY, history);
  }

  async loadHistory(): Promise<CalculationHistory[]> {
    const history = this.getItem<CalculationHistory[]>(STORAGE_KEYS.HISTORY);
    return history || [];
  }

  async deleteCalculation(id: string): Promise<void> {
    const history = await this.loadHistory();
    const filtered = history.filter(h => h.id !== id);
    await this.setItem(STORAGE_KEYS.HISTORY, filtered);
  }

  async deleteCalculations(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const history = await this.loadHistory();
    const filtered = history.filter(h => !idSet.has(h.id));
    await this.setItem(STORAGE_KEYS.HISTORY, filtered);
  }

  async clearOldHistory(keepCount: number): Promise<void> {
    const history = await this.loadHistory();
    
    if (history.length <= keepCount) {
      return; // Nothing to clear
    }
    
    // Sort by timestamp (most recent first) and keep only the specified count
    const sorted = history.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const kept = sorted.slice(0, keepCount);
    await this.setItem(STORAGE_KEYS.HISTORY, kept);
  }

  // ===== Draft =====

  async saveDraft(draft: Draft): Promise<void> {
    await this.setItem(STORAGE_KEYS.DRAFT, draft);
  }

  async loadDraft(): Promise<Draft | null> {
    return this.getItem<Draft>(STORAGE_KEYS.DRAFT);
  }

  async clearDraft(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILES);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION);
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  // ===== Settings =====

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  async loadSettings(): Promise<UserSettings> {
    const settings = this.getItem<UserSettings>(STORAGE_KEYS.SETTINGS);
    return settings || getDefaultSettings();
  }

  // ===== Quota Management =====

  async getQuotaInfo(): Promise<QuotaInfo> {
    let used = 0;
    
    // Calculate used space by iterating through our keys
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) {
        used += new Blob([item]).size;
      }
    }
    
    return {
      used,
      available: ESTIMATED_QUOTA,
    };
  }

  async freeSpace(targetBytes: number): Promise<void> {
    const quota = await this.getQuotaInfo();
    const availableSpace = quota.available - quota.used;
    
    if (availableSpace >= targetBytes) {
      return; // Already have enough space
    }
    
    const spaceNeeded = targetBytes - availableSpace;
    let spaceFreed = 0;
    
    // Strategy 1: Remove oldest history entries (LRU eviction)
    const history = await this.loadHistory();
    
    if (history.length > 10) {
      // Keep at least 10 most recent entries
      const originalSize = new Blob([JSON.stringify(history)]).size;
      
      // Remove entries one by one from the end (oldest)
      while (history.length > 10 && spaceFreed < spaceNeeded) {
        history.pop();
        const newSize = new Blob([JSON.stringify(history)]).size;
        spaceFreed += (originalSize - newSize);
      }
      
      await this.setItem(STORAGE_KEYS.HISTORY, history);
    }
    
    // Strategy 2: Clear draft if still not enough space
    if (spaceFreed < spaceNeeded) {
      const draft = await this.loadDraft();
      if (draft) {
        const draftSize = new Blob([JSON.stringify(draft)]).size;
        await this.clearDraft();
        spaceFreed += draftSize;
      }
    }
    
    // If still not enough space, throw error
    if (spaceFreed < spaceNeeded) {
      throw new Error('Unable to free enough storage space. Please delete some profiles or history entries manually.');
    }
  }

  // ===== Migration =====

  /**
   * Check if migration is needed and perform it
   */
  async checkAndMigrate(): Promise<{ success: boolean; errors: string[] }> {
    try {
      // Check if migration is needed
      if (!isMigrationNeeded()) {
        console.log('No migration needed');
        return { success: true, errors: [] };
      }

      console.log('Migration needed, starting migration process...');
      
      // Perform migration
      const result = await migrateAllData();
      
      if (result.success) {
        console.log('Migration completed successfully');
      } else {
        console.error('Migration completed with errors:', result.errors);
      }
      
      return result;
    } catch (error) {
      const errorMsg = `Migration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { success: false, errors: [errorMsg] };
    }
  }

  /**
   * Get the current schema version
   */
  getSchemaVersion(): number {
    return getStoredSchemaVersion();
  }
}

/**
 * Singleton instance
 */
export const storageManager = new LocalStorageManager();
