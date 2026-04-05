# URL State Encoding Implementation

## Overview

This document describes the implementation of URL state encoding for the Farm Carbon Footprint Calculator. The feature enables users to share calculation states via URLs and auto-load them when visiting shared links.

## Components

### 1. Core Utilities (`url-encoder.ts`)

**Functions:**
- `encodeToURL(state)` - Encodes state to URL-safe compressed string
- `decodeFromURL(encoded)` - Decodes URL-safe string back to state
- `canEncodeToURL(state)` - Checks if state fits in URL (≤2000 chars)
- `getEncodedURLLength(state)` - Gets estimated URL length
- `getCompressionRatio(state)` - Calculates compression efficiency
- `getStateFromURL(paramName)` - Extracts state from current URL
- `createShareableURL(state, baseURL, paramName)` - Creates full shareable URL
- `copyShareableURLToClipboard(state, baseURL)` - Copies URL to clipboard

**Key Features:**
- LZ-String compression for efficient encoding
- URL-safe encoding (no special characters)
- 2000 character limit enforcement
- Validation and error handling
- Bilingual support

### 2. ShareButton Component (`components/ShareButton.tsx`)

**Props:**
- `state` - Application state to encode
- `language` - UI language (en/ua)
- `onSuccess` - Callback on successful copy
- `onError` - Callback on error

**Features:**
- Share button triggering modal dialog
- URL display with copy-to-clipboard
- Open in new tab option
- URL length display
- Error handling with user-friendly messages
- Bilingual UI

### 3. URL State Hooks (`hooks/useURLState.ts`)

**Hooks:**
- `useURLState(paramName, onStateLoaded, onError)` - Loads state from URL
- `useURLStateLoader(paramName)` - Alternative hook for URL state loading

**Features:**
- Auto-loads state on component mount
- Validates decoded state
- Provides error handling
- Returns loading status
- Indicates if URL state exists

## Usage

### Basic Encoding/Decoding

```typescript
import { encodeToURL, decodeFromURL } from './lib/url-encoder';

const state = {
  totalArea: '100',
  dairyCows: '50',
  crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
};

// Encode to URL
const encoded = encodeToURL(state);
const url = `https://example.com?state=${encoded}`;

// Decode from URL
const decoded = decodeFromURL(encoded);
```

### Using ShareButton Component

```typescript
import { ShareButton } from './components/ShareButton';

function MyComponent() {
  const state = { /* form state */ };

  return (
    <ShareButton
      state={state}
      language="en"
      onSuccess={(msg) => console.log(msg)}
      onError={(err) => console.error(err)}
    />
  );
}
```

### Auto-Loading from URL

```typescript
import { useURLState } from './hooks/useURLState';

function App() {
  const { state, error, isLoading, hasURLState } = useURLState(
    'state',
    (loadedState) => {
      // Load state into form
      setForm(loadedState);
    },
    (error) => {
      console.error('Failed to load URL state:', error);
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* form */}</div>;
}
```

## Requirements Mapping

### Requirement 37: URL State Encoding for Sharing

- **37.1**: Create encodeToURL function ✓
- **37.2**: Create decodeFromURL function ✓
- **37.3**: Add "Share" button generating shareable URL ✓
- **37.4**: Add "Copy link" button for clipboard ✓
- **37.5**: Enforce 2000 character limit with error message ✓
- **37.6**: Auto-load and calculate from URL parameters ✓
- **37.7**: Support bilingual content ✓

### Requirement 64: URL Compression

- **64.1**: URL encoding with compression ✓
- **64.2**: URL-safe encoding ✓
- **64.3**: URL decoding with validation ✓
- **64.4**: Compression ratio analysis ✓
- **64.5**: URL length estimation ✓
- **64.6**: Error handling for oversized state ✓
- **64.7**: Input validation for decoder ✓

## Technical Details

### Compression Strategy

Uses LZ-String library for compression:
- Typical compression ratio: 3-5x for farm data
- URL-safe encoding: No special characters
- Preserves all data types and structures

### Size Constraints

- Maximum URL length: 2000 characters
- Typical farm state: 200-800 characters (compressed)
- Large farms (50+ crops): May exceed limit

### Error Handling

- Invalid JSON: Throws descriptive error
- Decompression failure: Returns null
- State too large: Provides size information
- Clipboard unavailable: Graceful fallback

## Integration Points

### In App Component

1. Add ShareButton to results panel
2. Use useURLState hook on mount
3. Load state from URL if present
4. Auto-calculate if state loaded

### Example Integration

```typescript
function App() {
  const { urlState, isLoadingURL } = useURLStateLoader();
  const [form, setForm] = useState(createInitialForm);

  useEffect(() => {
    if (urlState && typeof urlState === 'object') {
      setForm(urlState as FarmForm);
      // Auto-calculate
      handleCalculate();
    }
  }, [urlState]);

  return (
    <>
      {results && (
        <ShareButton
          state={{ ...form, practices }}
          language={lang}
          onSuccess={(msg) => showNotification(msg)}
          onError={(err) => showError(err)}
        />
      )}
    </>
  );
}
```

## Testing

### Unit Tests

- Encoding/decoding round-trip
- Size constraint validation
- Error handling
- Compression ratio verification

### Integration Tests

- URL parameter extraction
- State loading on mount
- Auto-calculation trigger
- Clipboard functionality

### Property Tests

- Round-trip property: encode(decode(x)) === x
- Compression property: compressed < original
- URL-safe property: No special characters
- Size constraint property: length ≤ 2000

## Browser Compatibility

- Modern browsers with Clipboard API
- Fallback for older browsers (manual copy)
- URL API support required
- localStorage for state persistence

## Performance Considerations

- Compression is fast (<100ms for typical data)
- Decompression is fast (<50ms)
- No network requests
- Minimal memory overhead

## Security Considerations

- State is visible in URL (not encrypted)
- No sensitive data should be encoded
- URL length limits prevent DoS
- Input validation prevents injection

## Future Enhancements

- Encryption for sensitive data
- URL shortening service integration
- QR code generation
- Share to social media
- Email sharing with pre-filled message
