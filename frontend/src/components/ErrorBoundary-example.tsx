/**
 * Error Boundary Usage Examples
 * 
 * This file demonstrates how to use the FeatureErrorBoundary component
 * to wrap major sections of the application and handle errors gracefully.
 */

import { FeatureErrorBoundary } from './FeatureErrorBoundary';

// Example 1: Wrapping a form component
function FormExample() {
  return (
    <FeatureErrorBoundary language="en" featureName="form">
      <div className="panel form-panel">
        {/* Form content here */}
        <h2>Farm Questionnaire</h2>
        {/* ... form fields ... */}
      </div>
    </FeatureErrorBoundary>
  );
}

// Example 2: Wrapping a results component
function ResultsExample() {
  return (
    <FeatureErrorBoundary language="en" featureName="results">
      <div className="panel result-panel">
        {/* Results content here */}
        <h2>Results</h2>
        {/* ... results display ... */}
      </div>
    </FeatureErrorBoundary>
  );
}

// Example 3: Wrapping a chart component with custom reset handler
function ChartExample() {
  const handleChartReset = () => {
    console.log('Chart reset triggered');
    // Custom reset logic here
  };

  return (
    <FeatureErrorBoundary 
      language="en" 
      featureName="charts"
      onReset={handleChartReset}
    >
      <div className="chart-container">
        {/* Chart content here */}
        <h3>Emission Breakdown Chart</h3>
        {/* ... chart rendering ... */}
      </div>
    </FeatureErrorBoundary>
  );
}

// Example 4: Bilingual support (Ukrainian)
function BilingualExample() {
  const language = 'ua'; // or 'en'

  return (
    <FeatureErrorBoundary language={language} featureName="form">
      <div className="panel">
        {/* Content will show error messages in Ukrainian if an error occurs */}
      </div>
    </FeatureErrorBoundary>
  );
}

// Example 5: Nested error boundaries for granular error handling
function NestedExample() {
  return (
    <div className="app">
      <FeatureErrorBoundary language="en" featureName="app">
        <div className="layout">
          <FeatureErrorBoundary language="en" featureName="form">
            <div className="form-section">
              {/* Form content */}
            </div>
          </FeatureErrorBoundary>

          <FeatureErrorBoundary language="en" featureName="results">
            <div className="results-section">
              {/* Results content */}
            </div>
          </FeatureErrorBoundary>
        </div>
      </FeatureErrorBoundary>
    </div>
  );
}

/**
 * Testing Error Boundaries
 * 
 * To test error boundaries in development, you can create a component
 * that throws an error:
 */
function ErrorThrower() {
  throw new Error('Test error for error boundary');
  return <div>This will never render</div>;
}

function TestErrorBoundary() {
  return (
    <FeatureErrorBoundary language="en" featureName="form">
      <ErrorThrower />
    </FeatureErrorBoundary>
  );
}

/**
 * Key Features:
 * 
 * 1. Bilingual Support: Error messages display in English or Ukrainian
 * 2. User Data Preservation: User data is not lost when errors occur
 * 3. Recovery Options: Users can try again, reload, or continue using other features
 * 4. Console Logging: Errors are logged to console for debugging
 * 5. Custom Reset Handler: Optional onReset callback for custom recovery logic
 * 6. Graceful Degradation: Only the affected component fails, not the entire app
 */

export {
  FormExample,
  ResultsExample,
  ChartExample,
  BilingualExample,
  NestedExample,
  TestErrorBoundary,
};
