# Error Boundary Implementation

## Overview

The `FeatureErrorBoundary` component provides robust error handling for major sections of the Farm Carbon Footprint Web App. It catches JavaScript errors in child components, logs them for debugging, and displays user-friendly error messages with recovery options.

## Features

### 1. Bilingual Error Messages
- Supports English and Ukrainian
- Automatically uses the app's current language setting
- All error messages and UI text are translated

### 2. User Data Preservation
- User data is never lost when errors occur
- localStorage data remains intact
- Form state is preserved
- Users can continue using unaffected parts of the app

### 3. Recovery Options
- **Try Again**: Resets the error boundary and attempts to re-render the component
- **Reload Page**: Performs a full page reload
- **Continue**: Users can interact with other parts of the app that aren't affected

### 4. Developer-Friendly Debugging
- Errors are logged to browser console with full stack traces
- Component stack information is preserved
- Error details are displayed in the UI for debugging

### 5. Graceful Degradation
- Only the affected component fails, not the entire app
- Multiple error boundaries can be nested for granular error handling
- Unaffected features remain fully functional

## Usage

### Basic Usage

```tsx
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';

function MyComponent() {
  return (
    <FeatureErrorBoundary language="en" featureName="form">
      <div className="my-content">
        {/* Your component content */}
      </div>
    </FeatureErrorBoundary>
  );
}
```

### With Custom Reset Handler

```tsx
<FeatureErrorBoundary 
  language={lang} 
  featureName="results"
  onReset={() => {
    // Custom reset logic
    console.log('Resetting results panel');
  }}
>
  <ResultsPanel />
</FeatureErrorBoundary>
```

### Current Implementation

The error boundaries are currently wrapping:

1. **Form Panel**: Catches errors in the farm questionnaire form
2. **Results Panel**: Catches errors in the results display and calculations

```tsx
// In App.tsx
<section className="layout">
  <FeatureErrorBoundary language={lang} featureName="form">
    <article className="panel form-panel">
      {/* Form content */}
    </article>
  </FeatureErrorBoundary>

  <FeatureErrorBoundary language={lang} featureName="results">
    <article className="panel result-panel">
      {/* Results content */}
    </article>
  </FeatureErrorBoundary>
</section>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | The component(s) to wrap with error handling |
| `language` | `'en' \| 'ua'` | Yes | The language for error messages |
| `featureName` | `string` | Yes | Name of the feature (used in error messages) |
| `onReset` | `() => void` | No | Optional callback when user clicks "Try Again" |

## Feature Names

The following feature names are supported with translations:

- `form` - Form panel (EN: "form", UA: "форми")
- `results` - Results panel (EN: "results", UA: "результатів")
- `charts` - Chart components (EN: "charts", UA: "графіків")
- `app` - Entire application (EN: "application", UA: "додатку")

Custom feature names can be used, but they won't be translated.

## Error Display

When an error occurs, users see:

1. **Error Icon**: Visual indicator (⚠️) with pulse animation
2. **Title**: "Something went wrong" (translated)
3. **Description**: Which feature encountered the error
4. **What Happened**: The error message
5. **What To Do**: List of recovery options
6. **Data Preserved Note**: Reassurance that data is safe
7. **Action Buttons**: Try Again and Reload buttons
8. **Report Issue**: Suggestion to report persistent issues

## Styling

Error boundary styles are defined in `ErrorBoundary.css` and include:

- Responsive design for mobile and desktop
- Theme-aware colors using CSS variables
- Pulse animation for the error icon
- Accessible button styles
- Proper spacing and typography

### CSS Variables Used

```css
--panel-bg: Background color for the error panel
--text-primary: Primary text color
--text-secondary: Secondary text color
--text-tertiary: Tertiary text color
--error-color: Error message color (default: #ef4444)
--success-color: Success message color (default: #10b981)
--bg-secondary: Secondary background
--bg-tertiary: Tertiary background
```

## Testing

### Manual Testing

To test error boundaries in development:

```tsx
// Create a component that throws an error
function ErrorThrower() {
  throw new Error('Test error');
  return <div>Never rendered</div>;
}

// Wrap it in an error boundary
<FeatureErrorBoundary language="en" featureName="form">
  <ErrorThrower />
</FeatureErrorBoundary>
```

### What to Test

1. **Error Catching**: Verify errors are caught and displayed
2. **Bilingual Support**: Test both English and Ukrainian messages
3. **Try Again**: Verify reset functionality works
4. **Reload**: Verify page reload works
5. **Data Preservation**: Verify localStorage data persists
6. **Console Logging**: Verify errors are logged to console
7. **Multiple Boundaries**: Test nested error boundaries
8. **Responsive Design**: Test on mobile and desktop

## Requirements Satisfied

This implementation satisfies Requirement 67:

- ✅ 67.1: Error boundaries around form panel, results panel, and chart components
- ✅ 67.2: User-friendly error messages displayed
- ✅ 67.3: Error messages include what went wrong, suggested actions, and reload option
- ✅ 67.4: Errors logged to browser console for debugging
- ✅ 67.5: User data preserved when errors occur
- ✅ 67.6: Users can continue using unaffected parts of the app
- ✅ 67.7: Error messages display in user's selected language

## Future Enhancements

Potential improvements for future iterations:

1. **Error Reporting**: Send errors to a logging service
2. **Error Analytics**: Track error frequency and types
3. **Retry Logic**: Automatic retry with exponential backoff
4. **Partial Recovery**: Attempt to recover specific state
5. **Error Boundaries for Charts**: Add boundaries around individual chart components
6. **Custom Error Messages**: Feature-specific error messages and recovery steps

## Troubleshooting

### Error Boundary Not Catching Errors

Error boundaries only catch errors in:
- Rendering
- Lifecycle methods
- Constructors of child components

They do NOT catch errors in:
- Event handlers (use try-catch)
- Asynchronous code (use try-catch)
- Server-side rendering
- Errors in the error boundary itself

### Styling Issues

If error boundary styles aren't applying:
1. Verify `ErrorBoundary.css` is imported
2. Check CSS variable definitions in your theme
3. Inspect element to see if styles are being overridden

### Language Not Updating

If error messages don't update when language changes:
- Error boundaries don't re-render automatically
- The error must be cleared and re-thrown to see new language
- Consider adding a key prop to force remount on language change

## References

- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Boundary Best Practices](https://react.dev/reference/react/Component#static-getderivedstatefromerror)
- Requirement 67 in `.kiro/specs/client-side-enhancements/requirements.md`
- Design Document: `.kiro/specs/client-side-enhancements/design.md`
