/**
 * URL State Encoding/Decoding Utilities
 * 
 * Provides functions to encode and decode application state to/from URL-safe strings
 * using LZ-String compression for efficient URL sharing.
 * 
 * Requirements: 64.1, 64.2, 64.3
 */

import LZString from 'lz-string';

/**
 * Maximum URL length to enforce (2000 characters)
 * Accounts for base URL and other parameters
 */
const MAX_URL_LENGTH = 2000;

/**
 * Encodes application state to a URL-safe compressed string
 * 
 * @param state - The application state object to encode
 * @returns URL-safe encoded string
 * @throws Error if state is too large to fit in URL
 * 
 * Requirement 64.1: URL encoding with compression
 * Requirement 64.2: URL-safe encoding
 */
export function encodeToURL(state: Record<string, unknown>): string {
  try {
    // Serialize state to JSON
    const json = JSON.stringify(state);
    
    // Compress using LZ-String with base64 encoding for better URL safety
    const compressed = LZString.compressToBase64(json);
    
    if (!compressed) {
      throw new Error('Failed to compress state');
    }
    
    // Convert base64 to URL-safe base64 (replace + with -, / with _)
    const urlSafe = compressed
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Check length constraint
    if (urlSafe.length > MAX_URL_LENGTH) {
      throw new Error(
        `State too large for URL encoding (${urlSafe.length} > ${MAX_URL_LENGTH} characters)`
      );
    }
    
    return urlSafe;
  } catch (error) {
    if (error instanceof Error && error.message.includes('too large')) {
      throw error;
    }
    throw new Error(`Failed to encode state to URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decodes a URL-safe compressed string back to application state
 * 
 * @param encoded - The URL-safe encoded string
 * @returns Decoded application state object
 * @throws Error if decoding fails or state is invalid
 * 
 * Requirement 64.3: URL decoding with validation
 */
export function decodeFromURL(encoded: string): Record<string, unknown> {
  try {
    // Validate input
    if (!encoded || typeof encoded !== 'string') {
      throw new Error('Invalid encoded URL state');
    }
    
    // Convert URL-safe base64 back to standard base64
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      // Add padding if needed
      + '='.repeat((4 - (encoded.length % 4)) % 4);
    
    // Decompress using LZ-String
    const decompressed = LZString.decompressFromBase64(base64);
    
    if (!decompressed) {
      throw new Error('Failed to decompress URL state');
    }
    
    // Parse JSON
    const state = JSON.parse(decompressed);
    
    if (!state || typeof state !== 'object') {
      throw new Error('Decoded state is not a valid object');
    }
    
    return state;
  } catch (error) {
    throw new Error(
      `Failed to decode URL state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if a state object can be encoded within URL length constraints
 * 
 * @param state - The state object to check
 * @returns true if state can be encoded, false otherwise
 */
export function canEncodeToURL(state: Record<string, unknown>): boolean {
  try {
    const encoded = encodeToURL(state);
    return encoded.length <= MAX_URL_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Gets the estimated URL length for a given state
 * 
 * @param state - The state object to estimate
 * @returns Estimated URL length in characters
 */
export function getEncodedURLLength(state: Record<string, unknown>): number {
  try {
    const json = JSON.stringify(state);
    const compressed = LZString.compressToBase64(json);
    const urlSafe = compressed
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return urlSafe?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Gets the compression ratio for a given state
 * 
 * @param state - The state object to analyze
 * @returns Compression ratio (original size / compressed size)
 */
export function getCompressionRatio(state: Record<string, unknown>): number {
  try {
    const json = JSON.stringify(state);
    const compressed = LZString.compressToBase64(json);
    
    if (!compressed) return 0;
    
    const urlSafe = compressed
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return json.length / urlSafe.length;
  } catch {
    return 0;
  }
}

/**
 * Extracts URL state parameter from current URL
 * 
 * @param paramName - The URL parameter name (default: 'state')
 * @returns Decoded state or null if parameter not found
 */
export function getStateFromURL(paramName: string = 'state'): Record<string, unknown> | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(paramName);
    
    if (!encoded) {
      return null;
    }
    
    return decodeFromURL(encoded);
  } catch {
    return null;
  }
}

/**
 * Creates a shareable URL with encoded state
 * 
 * @param state - The state to encode
 * @param baseURL - The base URL (default: current origin)
 * @param paramName - The URL parameter name (default: 'state')
 * @returns Full shareable URL
 * @throws Error if state is too large
 */
export function createShareableURL(
  state: Record<string, unknown>,
  baseURL: string = window.location.origin,
  paramName: string = 'state'
): string {
  const encoded = encodeToURL(state);
  const url = new URL(baseURL);
  url.searchParams.set(paramName, encoded);
  return url.toString();
}

/**
 * Copies a shareable URL to clipboard
 * 
 * @param state - The state to encode
 * @param baseURL - The base URL (default: current origin)
 * @returns Promise that resolves when URL is copied
 * @throws Error if copy fails or state is too large
 */
export async function copyShareableURLToClipboard(
  state: Record<string, unknown>,
  baseURL: string = window.location.origin
): Promise<void> {
  const url = createShareableURL(state, baseURL);
  
  if (!navigator.clipboard) {
    throw new Error('Clipboard API not available');
  }
  
  await navigator.clipboard.writeText(url);
}
