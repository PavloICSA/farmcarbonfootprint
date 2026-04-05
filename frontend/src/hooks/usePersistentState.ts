/**
 * Persistent state hook that syncs with localStorage
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for state that persists to localStorage
 * Similar to useState but automatically syncs with localStorage
 * 
 * @param key - localStorage key
 * @param defaultValue - Default value if nothing is stored
 * @returns [state, setState] tuple like useState
 * 
 * @example
 * ```tsx
 * const [theme, setTheme] = usePersistentState<Theme>('app:theme', 'dark');
 * ```
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or default
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      
      // Revive Date objects
      return reviveDates(parsed);
    } catch (error) {
      console.error(`Failed to load ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  // Persist to localStorage whenever state changes
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setState((prev) => {
          const newValue = value instanceof Function ? value(prev) : value;
          
          // Save to localStorage
          localStorage.setItem(key, JSON.stringify(newValue));
          
          return newValue;
        });
      } catch (error) {
        console.error(`Failed to save ${key} to localStorage:`, error);
        
        // Still update state even if localStorage fails
        setState(value);
      }
    },
    [key]
  );

  // Listen for storage events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState(reviveDates(parsed));
        } catch (error) {
          console.error(`Failed to parse storage event for ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [state, setPersistentState];
}

/**
 * Revive Date objects from JSON
 */
function reviveDates<T>(obj: any): T {
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
    return obj.map(item => reviveDates(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = reviveDates(obj[key]);
      }
    }
    return result as T;
  }
  
  return obj as T;
}
