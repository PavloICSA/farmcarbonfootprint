/**
 * ShareButton Integration Example
 * 
 * Demonstrates how to integrate the ShareButton component
 * with the main App component for URL state sharing.
 */

import React, { useState, useEffect } from 'react';
import { ShareButton } from './ShareButton';
import { useURLState } from '../hooks/useURLState';
import { FarmForm, CropPractice, Lang } from '../types/storage';

/**
 * Example 1: Basic ShareButton Integration
 * 
 * Add ShareButton to results panel
 */
export function Example1_BasicIntegration() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [{ crop_id: 1, area: '50', nitrogen: '150', phosphorus: '75', potassium: '100', manure: '20', diesel: '15', irrigation: '50', pesticides: [] }],
  });
  const [practices, setPractices] = useState<CropPractice[]>([
    { tillage: 'no_till', irrigation: 'drip', residue: 'retained', precision_fert: true, cover_crop: true },
  ]);
  const [results, setResults] = useState<any>(null);

  return (
    <div>
      {results && (
        <div className="results-panel">
          <h2>Results</h2>
          {/* Results display */}
          
          <ShareButton
            state={{ ...form, practices }}
            language="en"
            onSuccess={(msg) => console.log(msg)}
            onError={(err) => console.error(err)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: URL State Loading on Mount
 * 
 * Auto-load state from URL and populate form
 */
export function Example2_URLStateLoading() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [],
  });
  const [practices, setPractices] = useState<CropPractice[]>([]);
  const [lang, setLang] = useState<Lang>('en');

  // Load state from URL on mount
  const { state: urlState, hasURLState, error: urlError } = useURLState(
    'state',
    (loadedState) => {
      // Validate and load state
      if (loadedState && typeof loadedState === 'object') {
        const { practices: loadedPractices, ...formData } = loadedState as any;
        setForm(formData as FarmForm);
        if (Array.isArray(loadedPractices)) {
          setPractices(loadedPractices);
        }
        // Auto-calculate
        console.log('State loaded from URL, auto-calculating...');
      }
    },
    (error) => {
      console.error('Failed to load URL state:', error);
    }
  );

  return (
    <div>
      {hasURLState && <p>✓ State loaded from URL</p>}
      {urlError && <p className="error">Error loading URL state: {urlError}</p>}
      
      {/* Form and results */}
    </div>
  );
}

/**
 * Example 3: Complete Integration with Notifications
 * 
 * Full integration with notification system
 */
export function Example3_CompleteIntegration() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [],
  });
  const [practices, setPractices] = useState<CropPractice[]>([]);
  const [lang, setLang] = useState<Lang>('en');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [results, setResults] = useState<any>(null);

  // Load state from URL
  const { state: urlState, hasURLState } = useURLState(
    'state',
    (loadedState) => {
      if (loadedState && typeof loadedState === 'object') {
        const { practices: loadedPractices, ...formData } = loadedState as any;
        setForm(formData as FarmForm);
        if (Array.isArray(loadedPractices)) {
          setPractices(loadedPractices);
        }
        // Auto-calculate
        handleCalculate();
      }
    }
  );

  const handleCalculate = () => {
    // Perform calculation
    console.log('Calculating...');
    // setResults(calculatedResults);
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="app">
      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Form */}
      <div className="form-panel">
        {hasURLState && (
          <div className="info-banner">
            ℹ️ State loaded from URL
          </div>
        )}
        {/* Form inputs */}
      </div>

      {/* Results */}
      {results && (
        <div className="results-panel">
          <h2>Results</h2>
          {/* Results display */}

          <ShareButton
            state={{ ...form, practices }}
            language={lang}
            onSuccess={(msg) => showNotification(msg, 'success')}
            onError={(err) => showNotification(err, 'error')}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Handling Share Errors
 * 
 * Comprehensive error handling for share operations
 */
export function Example4_ErrorHandling() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: Array.from({ length: 100 }, (_, i) => ({
      crop_id: i,
      area: '10',
      nitrogen: '150',
      phosphorus: '75',
      potassium: '100',
      manure: '20',
      diesel: '15',
      irrigation: '50',
      pesticides: [],
    })),
  });
  const [practices, setPractices] = useState<CropPractice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleShareError = (err: string) => {
    if (err.includes('too large')) {
      setError('Your farm data is too large to share via URL. Try exporting to JSON instead.');
    } else if (err.includes('Clipboard')) {
      setError('Clipboard access not available. Please copy the URL manually.');
    } else {
      setError(`Share error: ${err}`);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <ShareButton
        state={{ ...form, practices }}
        language="en"
        onError={handleShareError}
      />
    </div>
  );
}

/**
 * Example 5: Bilingual ShareButton
 * 
 * Using ShareButton with language switching
 */
export function Example5_BilingualSupport() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [],
  });
  const [practices, setPractices] = useState<CropPractice[]>([]);
  const [lang, setLang] = useState<Lang>('en');

  return (
    <div>
      <div className="language-selector">
        <button onClick={() => setLang('en')} className={lang === 'en' ? 'active' : ''}>
          English
        </button>
        <button onClick={() => setLang('ua')} className={lang === 'ua' ? 'active' : ''}>
          Українська
        </button>
      </div>

      <ShareButton
        state={{ ...form, practices }}
        language={lang}
        onSuccess={(msg) => console.log(msg)}
        onError={(err) => console.error(err)}
      />
    </div>
  );
}

/**
 * Example 6: Share Button with Custom Styling
 * 
 * Integrating ShareButton with custom CSS
 */
export function Example6_CustomStyling() {
  const [form, setForm] = useState<FarmForm>({
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [],
  });
  const [practices, setPractices] = useState<CropPractice[]>([]);

  return (
    <div className="custom-results-panel">
      <div className="results-header">
        <h2>Calculation Results</h2>
        <ShareButton
          state={{ ...form, practices }}
          language="en"
        />
      </div>

      {/* Results content */}
    </div>
  );
}

/**
 * Example 7: Testing ShareButton
 * 
 * Unit test examples for ShareButton
 */
export function Example7_Testing() {
  // Example test cases
  const testCases = [
    {
      name: 'Small farm state',
      state: {
        totalArea: '100',
        dairyCows: '50',
        crops: [{ crop_id: 1, area: '50', nitrogen: '150' }],
      },
      shouldSucceed: true,
    },
    {
      name: 'Large farm state',
      state: {
        totalArea: '1000',
        dairyCows: '500',
        crops: Array.from({ length: 50 }, (_, i) => ({
          crop_id: i,
          area: '20',
          nitrogen: '150',
          phosphorus: '75',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
        })),
      },
      shouldSucceed: true,
    },
    {
      name: 'Oversized state',
      state: {
        crops: Array.from({ length: 200 }, (_, i) => ({
          crop_id: i,
          area: '10',
          nitrogen: '150',
          phosphorus: '75',
          potassium: '100',
          manure: '20',
          diesel: '15',
          irrigation: '50',
          pesticides: Array.from({ length: 20 }, (_, j) => ({
            pesticide_id: j,
            rate: '1.5',
          })),
        })),
      },
      shouldSucceed: false,
    },
  ];

  return (
    <div>
      <h3>ShareButton Test Cases</h3>
      <ul>
        {testCases.map((testCase) => (
          <li key={testCase.name}>
            {testCase.name}: {testCase.shouldSucceed ? '✓ Should succeed' : '✗ Should fail'}
          </li>
        ))}
      </ul>
    </div>
  );
}
