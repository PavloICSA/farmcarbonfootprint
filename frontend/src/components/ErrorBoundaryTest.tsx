/**
 * Error Boundary Test Component
 * 
 * This component can be used to test the error boundary functionality
 * during development. It provides buttons to trigger different types of errors.
 * 
 * Usage:
 * 1. Import this component in your App.tsx
 * 2. Wrap it with FeatureErrorBoundary
 * 3. Click the buttons to test error handling
 * 
 * Example:
 * <FeatureErrorBoundary language="en" featureName="form">
 *   <ErrorBoundaryTest />
 * </FeatureErrorBoundary>
 */

import { useState } from 'react';

export function ErrorBoundaryTest() {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [errorType, setErrorType] = useState<'render' | 'async' | 'event'>('render');

  // Render error - will be caught by error boundary
  if (shouldThrowError && errorType === 'render') {
    throw new Error('Test render error: This error was thrown during component rendering');
  }

  // Async error - will NOT be caught by error boundary
  const handleAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test async error')), 100);
      });
    } catch (error) {
      console.error('Async error (not caught by boundary):', error);
      alert('Async error occurred - check console');
    }
  };

  // Event handler error - will NOT be caught by error boundary
  const handleEventError = () => {
    try {
      throw new Error('Test event handler error');
    } catch (error) {
      console.error('Event handler error (not caught by boundary):', error);
      alert('Event handler error occurred - check console');
    }
  };

  return (
    <div style={{ padding: '2rem', border: '2px dashed #666', borderRadius: '8px', margin: '1rem 0' }}>
      <h3>Error Boundary Test Component</h3>
      <p>Use these buttons to test error boundary functionality:</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setErrorType('render');
              setShouldThrowError(true);
            }}
            style={{ marginRight: '0.5rem' }}
          >
            Trigger Render Error (Caught by Boundary)
          </button>
          <span style={{ fontSize: '0.875rem', color: '#10b981' }}>
            ✓ Will be caught by error boundary
          </span>
        </div>

        <div>
          <button
            type="button"
            className="ghost"
            onClick={handleAsyncError}
            style={{ marginRight: '0.5rem' }}
          >
            Trigger Async Error (Not Caught)
          </button>
          <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>
            ✗ Will NOT be caught by error boundary
          </span>
        </div>

        <div>
          <button
            type="button"
            className="ghost"
            onClick={handleEventError}
            style={{ marginRight: '0.5rem' }}
          >
            Trigger Event Handler Error (Not Caught)
          </button>
          <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>
            ✗ Will NOT be caught by error boundary
          </span>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <h4 style={{ marginTop: 0 }}>What Error Boundaries Catch:</h4>
        <ul style={{ marginBottom: 0 }}>
          <li>Errors during rendering</li>
          <li>Errors in lifecycle methods</li>
          <li>Errors in constructors of child components</li>
        </ul>

        <h4>What Error Boundaries DON'T Catch:</h4>
        <ul style={{ marginBottom: 0 }}>
          <li>Event handlers (use try-catch)</li>
          <li>Asynchronous code (use try-catch)</li>
          <li>Server-side rendering</li>
          <li>Errors in the error boundary itself</li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        <strong>Note:</strong> After triggering a render error, you can use the "Try Again" button
        in the error boundary UI to reset and return to this test component.
      </div>
    </div>
  );
}

/**
 * Example usage in App.tsx:
 * 
 * import { ErrorBoundaryTest } from './components/ErrorBoundaryTest';
 * import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';
 * 
 * // Add this somewhere in your component tree (e.g., in development mode only)
 * {process.env.NODE_ENV === 'development' && (
 *   <FeatureErrorBoundary language={lang} featureName="form">
 *     <ErrorBoundaryTest />
 *   </FeatureErrorBoundary>
 * )}
 */
