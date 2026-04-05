# ShareButton Component

## Overview

The ShareButton component provides a user-friendly interface for sharing application state via URL encoding. It enables users to generate shareable URLs, copy them to clipboard, and open them in new tabs.

## Features

- **Share Button**: Triggers modal dialog with shareable URL
- **Copy to Clipboard**: One-click URL copying with feedback
- **Open in New Tab**: Direct link opening for testing
- **URL Length Display**: Shows encoded URL size
- **Error Handling**: User-friendly error messages
- **Bilingual Support**: English and Ukrainian UI
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Responsive Design**: Mobile-optimized layout

## Props

```typescript
interface ShareButtonProps {
  state: Record<string, unknown>;      // Application state to encode
  language: Lang;                       // UI language ('en' or 'ua')
  onSuccess?: (message: string) => void; // Success callback
  onError?: (error: string) => void;    // Error callback
}
```

## Usage

### Basic Usage

```typescript
import { ShareButton } from './components/ShareButton';

function ResultsPanel() {
  const [form, setForm] = useState<FarmForm>(...);
  const [practices, setPractices] = useState<CropPractice[]>(...);

  return (
    <div>
      <h2>Results</h2>
      {/* Results display */}
      
      <ShareButton
        state={{ ...form, practices }}
        language="en"
        onSuccess={(msg) => showNotification(msg)}
        onError={(err) => showError(err)}
      />
    </div>
  );
}
```

### With Notification System

```typescript
function App() {
  const [notification, setNotification] = useState<string | null>(null);

  return (
    <>
      <ShareButton
        state={appState}
        language={lang}
        onSuccess={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 3000);
        }}
        onError={(err) => {
          setNotification(`Error: ${err}`);
        }}
      />
      {notification && <Notification message={notification} />}
    </>
  );
}
```

## Component Structure

### Modal Dialog

The component renders a modal overlay with:
- Header with title and close button
- Content area with URL display
- Action buttons (Copy, Open in New Tab)
- Error messages if encoding fails

### States

1. **Closed**: Button visible, modal hidden
2. **Open**: Modal displayed with URL
3. **Error**: Error message shown in modal
4. **Loading**: (Implicit) Encoding happens synchronously

## Styling

The component includes comprehensive CSS styling in `ShareButton.css`:

- Light and dark theme support
- Responsive design for mobile
- Accessibility-focused styling
- Smooth animations and transitions
- Focus indicators for keyboard navigation

### CSS Classes

- `.share-button` - Main button
- `.share-modal-overlay` - Modal background
- `.share-modal` - Modal dialog
- `.share-modal-header` - Header section
- `.share-modal-content` - Content area
- `.share-url-display` - URL input area
- `.share-modal-actions` - Action buttons
- `.share-error` - Error message

## Integration with App

### Step 1: Import Component

```typescript
import { ShareButton } from './components/ShareButton';
import './components/ShareButton.css';
```

### Step 2: Add to Results Panel

```typescript
{results && (
  <div className="results-panel">
    <h2>Results</h2>
    {/* Results display */}
    
    <ShareButton
      state={{ ...form, practices }}
      language={lang}
      onSuccess={(msg) => showNotification(msg)}
      onError={(err) => showError(err)}
    />
  </div>
)}
```

### Step 3: Handle URL State on Mount

```typescript
import { useURLState } from './hooks/useURLState';

function App() {
  const { state: urlState, hasURLState } = useURLState(
    'state',
    (loadedState) => {
      // Load state into form
      if (loadedState && typeof loadedState === 'object') {
        setForm(loadedState as FarmForm);
        // Auto-calculate
        handleCalculate();
      }
    }
  );

  return (
    // App JSX
  );
}
```

## Error Handling

The component handles several error scenarios:

1. **State Too Large**: Displays size information and limit
2. **Encoding Failed**: Shows generic error message
3. **Copy Failed**: Indicates clipboard unavailable
4. **Invalid URL State**: Gracefully handles decode errors

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management in modal
- High contrast support
- Screen reader friendly
- Semantic HTML structure

## Browser Support

- Modern browsers with Clipboard API
- Fallback for older browsers (manual copy)
- URL API support required
- localStorage for state persistence

## Performance

- Encoding: <100ms for typical data
- Decoding: <50ms
- No network requests
- Minimal memory overhead
- Smooth animations (60fps)

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareButton } from './ShareButton';

test('should display share button', () => {
  render(
    <ShareButton
      state={{ test: 'value' }}
      language="en"
    />
  );
  expect(screen.getByText('Share')).toBeInTheDocument();
});

test('should open modal on button click', () => {
  render(
    <ShareButton
      state={{ test: 'value' }}
      language="en"
    />
  );
  fireEvent.click(screen.getByText('Share'));
  expect(screen.getByText('Shareable URL')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
test('should copy URL to clipboard', async () => {
  const mockClipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
  };
  Object.assign(navigator, { clipboard: mockClipboard });

  render(
    <ShareButton
      state={{ test: 'value' }}
      language="en"
      onSuccess={jest.fn()}
    />
  );

  fireEvent.click(screen.getByText('Share'));
  fireEvent.click(screen.getByText('Copy to Clipboard'));

  await waitFor(() => {
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });
});
```

## Troubleshooting

### URL Not Copying

- Check browser Clipboard API support
- Verify HTTPS connection (required for Clipboard API)
- Check browser permissions

### State Too Large

- Reduce number of crops
- Remove unnecessary data
- Use JSON export instead for large datasets

### URL Not Loading

- Verify URL parameter name matches ('state' by default)
- Check URL encoding is valid
- Verify state structure matches expected format

## Future Enhancements

- QR code generation for easy mobile sharing
- Email sharing with pre-filled message
- Social media sharing integration
- URL shortening service integration
- Encryption for sensitive data
- Share history tracking
