/**
 * Auto-save hook with debouncing
 * Automatically saves data to localStorage after a specified delay
 */

import { useEffect, useRef } from 'react';

/**
 * Hook for auto-saving data with debouncing
 * 
 * @param value - The value to save
 * @param saveFunction - Async function to save the value
 * @param delay - Debounce delay in milliseconds (default: 2000ms)
 * @param enabled - Whether auto-save is enabled (default: true)
 * 
 * @example
 * ```tsx
 * useAutoSave(
 *   formData,
 *   async (data) => await storageManager.saveDraft({ timestamp: new Date(), data, practices }),
 *   2000
 * );
 * ```
 */
export function useAutoSave<T>(
  value: T,
  saveFunction: (value: T) => Promise<void>,
  delay: number = 2000,
  enabled: boolean = true
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(saveFunction);
  const isFirstRender = useRef(true);

  // Update save function ref when it changes
  useEffect(() => {
    saveRef.current = saveFunction;
  }, [saveFunction]);

  useEffect(() => {
    // Skip auto-save on first render to avoid saving initial state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveRef.current(value).catch((error) => {
        console.error('Auto-save failed:', error);
      });
    }, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled]);
}

/**
 * Hook for auto-saving draft with specific logic
 * Saves draft only if there are unsaved changes
 * 
 * @param data - The form data to save
 * @param practices - The practices data to save
 * @param isDirty - Whether there are unsaved changes
 * @param saveFunction - Async function to save the draft
 * @param delay - Debounce delay in milliseconds (default: 2000ms)
 */
export function useAutoSaveDraft<T, P>(
  data: T,
  practices: P,
  isDirty: boolean,
  saveFunction: (draft: { timestamp: Date; data: T; practices: P }) => Promise<void>,
  delay: number = 2000
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(saveFunction);
  const isFirstRender = useRef(true);

  // Update save function ref when it changes
  useEffect(() => {
    saveRef.current = saveFunction;
  }, [saveFunction]);

  useEffect(() => {
    // Skip auto-save on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if no unsaved changes
    if (!isDirty) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const draft = {
        timestamp: new Date(),
        data,
        practices,
      };

      saveRef.current(draft).catch((error) => {
        console.error('Draft auto-save failed:', error);
      });
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, practices, isDirty, delay]);
}
