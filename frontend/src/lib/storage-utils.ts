/**
 * Utility functions for storage operations
 */

/**
 * Generate a unique ID for profiles and history entries
 * Format: timestamp-random
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date, locale: string = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate storage usage percentage
 */
export function getStorageUsagePercent(used: number, available: number): number {
  if (available === 0) return 0;
  return Math.round((used / available) * 100);
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get the size of a value in bytes
 */
export function getValueSize(value: any): number {
  try {
    const json = JSON.stringify(value);
    return new Blob([json]).size;
  } catch (error) {
    console.error('Failed to calculate value size:', error);
    return 0;
  }
}

/**
 * Validate profile name
 */
export function validateProfileName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Profile name cannot be empty';
  }
  
  if (name.length > 100) {
    return 'Profile name must be less than 100 characters';
  }
  
  return null;
}

/**
 * Sanitize profile name for safe storage
 */
export function sanitizeProfileName(name: string): string {
  return name.trim().substring(0, 100);
}
