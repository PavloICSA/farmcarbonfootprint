# URL Encoder Documentation

## Overview

The URL encoder module provides utilities to encode and decode application state to/from URL-safe compressed strings using LZ-String compression. This enables sharing calculations via URLs.

## Requirements

- **64.1**: URL encoding with compression
- **64.2**: URL-safe encoding
- **64.3**: URL decoding with validation

## Core Functions

### `encodeToURL(state: Record<string, unknown>): string`

Encodes application state to a URL-safe compressed string.

**Parameters:**
- `state`: The application state object to encode

**Returns:** URL-safe encoded string

**Throws:** Error if state is too large (> 2000 characters)

**Example:**
```typescript
const state = { totalArea: '100', dairyCows: '50' };
const encoded = encodeToURL(state);
```

### `decodeFromURL(encoded: string): Record<string, unknown>`

Decodes a URL-safe compressed string back to application state.

**Parameters:**
- `encoded`: The URL-safe encoded string

**Returns:** Decoded application state object

**Throws:** Error if decoding fails or state is invalid

**Example:**
```typescript
const state = decodeFromURL(encoded);
```

### `canEncodeToURL(state: Record<string, unknown>): boolean`

Checks if a state object can be encoded within URL length constraints.

**Returns:** true if state can be encoded, false otherwise

### `getEncodedURLLength(state: Record<string, unknown>): number`

Gets the estimated URL length for a given state.

**Returns:** Estimated URL length in characters

### `getCompressionRatio(state: Record<string, unknown>): number`

Gets the compression ratio for a given state.

**Returns:** Compression ratio (original size / compressed size)

### `getStateFromURL(paramName?: string): Record<string, unknown> | null`

Extracts URL state parameter from current URL.

**Parameters:**
- `paramName`: The URL parameter name (default: 'state')

**Returns:** Decoded state or null if parameter not found

### `createShareableURL(state, baseURL?, paramName?): string`

Creates a shareable URL with encoded state.

**Parameters:**
- `state`: The state to encode
- `baseURL`: The base URL (default: current origin)
- `paramName`: The URL parameter name (default: 'state')

**Returns:** Full shareable URL

**Throws:** Error if state is too large

### `copyShareableURLToClipboard(state, baseURL?): Promise<void>`

Copies a shareable URL to clipboard.

**Parameters:**
- `state`: The state to encode
- `baseURL`: The base URL (default: current origin)

**Returns:** Promise that resolves when URL is copied

**Throws:** Error if copy fails or state is too large

## Usage Examples

See `url-encoder-example.ts` for comprehensive examples including:
- Basic encoding/decoding
- URL capacity checking
- Compression analysis
- Creating shareable URLs
- Clipboard operations
- Error handling
- Round-trip verification

## Constraints

- **Maximum URL Length**: 2000 characters
- **Compression**: Uses LZ-String for efficient compression
- **URL-Safe**: All encoded strings are URL-safe (no special characters)

## Integration

Import from the main lib index:

```typescript
import {
  encodeToURL,
  decodeFromURL,
  createShareableURL,
  copyShareableURLToClipboard,
} from '@/lib';
```
