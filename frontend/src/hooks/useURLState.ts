/**
 * useURLState Hook
 * 
 * Handles loading and restoring application state from URL parameters.
 * Auto-loads state on component mount and provides utilities for URL state management.
 * 
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 64.1, 64.2, 64.3, 64.4, 64.5, 64.6, 64.7
 */

import { useEffect, useState, useCallback } from 'react';
import { getStateFromURL, decodeFromURL } from '../lib/url-encoder';

interface URLStateResult {
  state: Record<string, unknown> | null;
  error: string | null;
  isLoading: boolean;
  hasURLState: boolean;
}

/**
 * Hook to extract and manage state from URL parameters
 * 
 * @param paramName - The URL parameter name to look for (default: 'state')
 * @param onStateLoaded - Callback when state is successfully loaded
 * @param onError - Callback when an error occurs
 * @returns Object containing state, error, loading status, and whether URL state exists
 */
export function useURLState(
  paramName: string = 'state',
  onStateLoaded?: (state: Record<string, unknown>) => void,
  onError?: (error: string) => void
): URLStateResult {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasURLState, setHasURLState] = useState(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if URL parameter exists
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get(paramName);

      if (!encoded) {
        setHasURLState(false);
        setIsLoading(false);
        return;
      }

      setHasURLState(true);

      // Decode state from URL
      const decodedState = getStateFromURL(paramName);

      if (decodedState) {
        setState(decodedState);
        onStateLoaded?.(decodedState);
      } else {
        const errorMsg = 'Failed to decode state from URL';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading URL state';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [paramName, onStateLoaded, onError]);

  const clearURLState = useCallback(() => {
    // Remove state parameter from URL without reloading
    const params = new URLSearchParams(window.location.search);
    params.delete(paramName);

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newURL);
    setState(null);
    setHasURLState(false);
  }, [paramName]);

  return {
    state,
    error,
    isLoading,
    hasURLState,
  };
}

/**
 * Hook to handle URL state loading with automatic form population
 * 
 * @param paramName - The URL parameter name to look for
 * @returns Object containing state and utilities
 */
export function useURLStateLoader(paramName: string = 'state') {
  const [urlState, setUrlState] = useState<Record<string, unknown> | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoadingURL, setIsLoadingURL] = useState(false);

  useEffect(() => {
    try {
      setIsLoadingURL(true);
      setUrlError(null);

      const params = new URLSearchParams(window.location.search);
      const encoded = params.get(paramName);

      if (!encoded) {
        setIsLoadingURL(false);
        return;
      }

      // Decode and validate state
      const decodedState = getStateFromURL(paramName);

      if (decodedState && typeof decodedState === 'object') {
        setUrlState(decodedState);
      } else {
        setUrlError('Invalid state in URL');
      }
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to load URL state');
    } finally {
      setIsLoadingURL(false);
    }
  }, [paramName]);

  return {
    urlState,
    urlError,
    isLoadingURL,
  };
}
