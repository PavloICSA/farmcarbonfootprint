/**
 * Draft auto-save hook with recovery notification
 * Automatically saves drafts and provides recovery functionality
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Draft, FarmForm, CropPractice } from '../types/storage';
import { storageManager } from '../lib/storage-manager';

/**
 * Configuration for draft auto-save
 */
export interface DraftAutoSaveConfig {
  /** Auto-save interval in milliseconds (default: 30000ms = 30 seconds) */
  interval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when draft is saved */
  onSave?: () => void;
  /** Callback when draft save fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for draft auto-save and recovery
 * 
 * Automatically saves drafts every 30 seconds when there are unsaved changes.
 * Provides recovery functionality on app load.
 * 
 * @param data - The form data to save
 * @param practices - The practices data to save
 * @param isDirty - Whether there are unsaved changes
 * @param config - Configuration options
 * 
 * @returns Object with recovery functions
 * 
 * @example
 * ```tsx
 * const { hasDraft, loadDraft, clearDraft } = useDraftAutoSave(
 *   form,
 *   practices,
 *   isDirty,
 *   { interval: 30000 }
 * );
 * ```
 */
export function useDraftAutoSave(
  data: FarmForm,
  practices: CropPractice[],
  isDirty: boolean,
  config: DraftAutoSaveConfig = {}
) {
  const {
    interval = 30000, // 30 seconds
    enabled = true,
    onSave,
    onError,
  } = config;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const lastSaveTime = useRef<Date | null>(null);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback(async () => {
    try {
      const draft: Draft = {
        timestamp: new Date(),
        data,
        practices,
      };

      await storageManager.saveDraft(draft);
      lastSaveTime.current = new Date();
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [data, practices, onSave, onError]);

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback(async (): Promise<Draft | null> => {
    try {
      return await storageManager.loadDraft();
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, []);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(async () => {
    try {
      await storageManager.clearDraft();
      lastSaveTime.current = null;
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  /**
   * Check if draft exists
   */
  const hasDraft = useCallback(async (): Promise<boolean> => {
    const draft = await loadDraft();
    return draft !== null;
  }, [loadDraft]);

  /**
   * Auto-save effect
   */
  useEffect(() => {
    // Skip auto-save on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) {
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

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, interval);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, practices, isDirty, interval, enabled, saveDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    lastSaveTime: lastSaveTime.current,
  };
}

/**
 * Hook for draft recovery notification on app load
 * 
 * Checks for existing draft on mount and provides recovery state
 * 
 * @returns Object with draft recovery state and functions
 * 
 * @example
 * ```tsx
 * const { draftExists, draft, acceptDraft, rejectDraft } = useDraftRecovery();
 * 
 * if (draftExists && draft) {
 *   // Show recovery notification
 * }
 * ```
 */
export function useDraftRecovery() {
  const [draftExists, setDraftExists] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  /**
   * Check for draft on mount
   */
  useEffect(() => {
    const checkForDraft = async () => {
      try {
        const existingDraft = await storageManager.loadDraft();
        
        if (existingDraft) {
          setDraft(existingDraft);
          setDraftExists(true);
        }
      } catch (error) {
        console.error('Failed to check for draft:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkForDraft();
  }, []);

  /**
   * Accept draft and load it
   */
  const acceptDraft = useCallback(() => {
    setDraftExists(false);
    return draft;
  }, [draft]);

  /**
   * Reject draft and clear it
   */
  const rejectDraft = useCallback(async () => {
    try {
      await storageManager.clearDraft();
      setDraftExists(false);
      setDraft(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  return {
    draftExists,
    draft,
    isChecking,
    acceptDraft,
    rejectDraft,
  };
}
