/**
 * URL Encoder Examples
 * 
 * Demonstrates how to use the URL encoding/decoding utilities
 * for sharing and restoring application state via URLs.
 */

import {
  encodeToURL,
  decodeFromURL,
  canEncodeToURL,
  getEncodedURLLength,
  getCompressionRatio,
  getStateFromURL,
  createShareableURL,
  copyShareableURLToClipboard,
} from './url-encoder';

// Example 1: Basic encoding and decoding
export function example1_BasicEncodingDecoding() {
  const state = {
    totalArea: '100',
    dairyCows: '50',
    crops: [
      { crop_id: 1, area: '50', nitrogen: '150' },
      { crop_id: 2, area: '50', nitrogen: '120' },
    ],
    practices: [
      { tillage: 'no_till', irrigation: 'drip' },
      { tillage: 'disk_tillage', irrigation: 'flood' },
    ],
  };

  // Encode state to URL-safe string
  const encoded = encodeToURL(state);
  console.log('Encoded:', encoded);
  console.log('Length:', encoded.length);

  // Decode back to state
  const decoded = decodeFromURL(encoded);
  console.log('Decoded:', decoded);
  console.log('Match:', JSON.stringify(state) === JSON.stringify(decoded));
}

// Example 2: Check if state fits in URL
export function example2_CheckURLCapacity() {
  const smallState = {
    totalArea: '100',
    dairyCows: '50',
  };

  const largeState = {
    totalArea: '100',
    dairyCows: '50',
    crops: Array.from({ length: 100 }, (_, i) => ({
      crop_id: i,
      area: '10',
      nitrogen: '150',
      phosphorus: '50',
      potassium: '100',
      manure: '20',
      diesel: '15',
      irrigation: '50',
    })),
  };

  console.log('Small state fits:', canEncodeToURL(smallState));
  console.log('Large state fits:', canEncodeToURL(largeState));

  console.log('Small state URL length:', getEncodedURLLength(smallState));
  console.log('Large state URL length:', getEncodedURLLength(largeState));
}

// Example 3: Analyze compression
export function example3_CompressionAnalysis() {
  const state = {
    totalArea: '100',
    dairyCows: '50',
    crops: [
      { crop_id: 1, area: '50', nitrogen: '150' },
      { crop_id: 2, area: '50', nitrogen: '120' },
      { crop_id: 3, area: '50', nitrogen: '140' },
    ],
  };

  const ratio = getCompressionRatio(state);
  console.log(`Compression ratio: ${ratio.toFixed(2)}x`);
  console.log(`Original size: ${JSON.stringify(state).length} bytes`);
  console.log(`Compressed size: ${getEncodedURLLength(state)} characters`);
}

// Example 4: Create shareable URL
export function example4_CreateShareableURL() {
  const state = {
    totalArea: '100',
    dairyCows: '50',
    crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
  };

  const shareableURL = createShareableURL(state);
  console.log('Shareable URL:', shareableURL);

  // User can share this URL with others
  // When they visit it, the state will be in the URL
}

// Example 5: Copy URL to clipboard
export async function example5_CopyToClipboard() {
  const state = {
    totalArea: '100',
    dairyCows: '50',
    crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
  };

  try {
    await copyShareableURLToClipboard(state);
    console.log('URL copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy URL:', error);
  }
}

// Example 6: Extract state from URL
export function example6_ExtractStateFromURL() {
  // Simulate being on a URL with state parameter
  // In real usage, this would be called when the page loads

  const state = getStateFromURL('state');

  if (state) {
    console.log('State found in URL:', state);
    // Load this state into the form
  } else {
    console.log('No state in URL');
  }
}

// Example 7: Handle encoding errors
export function example7_ErrorHandling() {
  // Try to encode a state that's too large
  const hugeState = {
    data: 'x'.repeat(100000), // Very large string
  };

  try {
    const encoded = encodeToURL(hugeState);
    console.log('Encoded successfully');
  } catch (error) {
    console.error('Encoding failed:', error instanceof Error ? error.message : error);
  }

  // Try to decode invalid data
  try {
    const decoded = decodeFromURL('invalid!!!data');
    console.log('Decoded:', decoded);
  } catch (error) {
    console.error('Decoding failed:', error instanceof Error ? error.message : error);
  }
}

// Example 8: Round-trip verification
export function example8_RoundTripVerification() {
  const originalState = {
    totalArea: '150.5',
    dairyCows: '75',
    pigs: '30',
    chickens: '200',
    crops: [
      {
        crop_id: 1,
        area: '50.25',
        nitrogen: '150.5',
        phosphorus: '75.25',
        potassium: '100',
        manure: '20.5',
        diesel: '15.75',
        irrigation: '50.5',
      },
      {
        crop_id: 2,
        area: '49.75',
        nitrogen: '120.5',
        phosphorus: '60.25',
        potassium: '80',
        manure: '18.5',
        diesel: '14.25',
        irrigation: '45.5',
      },
    ],
    practices: [
      {
        tillage: 'no_till',
        irrigation: 'drip',
        residue: 'retained',
        precision_fert: true,
        cover_crop: true,
      },
      {
        tillage: 'disk_tillage',
        irrigation: 'flood',
        residue: 'removed',
        precision_fert: false,
        cover_crop: false,
      },
    ],
  };

  // Encode
  const encoded = encodeToURL(originalState);

  // Decode
  const decodedState = decodeFromURL(encoded);

  // Verify
  const isEqual = JSON.stringify(originalState) === JSON.stringify(decodedState);
  console.log('Round-trip successful:', isEqual);

  if (!isEqual) {
    console.error('State mismatch!');
    console.error('Original:', originalState);
    console.error('Decoded:', decodedState);
  }
}
