/**
 * JSON Import Example
 * Demonstrates how to use the JSON import functionality
 */

import { importFromJSON, importFromJSONFile, triggerFileUpload } from './json-import';
import { FarmForm, CropPractice } from '../types/storage';

/**
 * Example 1: Import from JSON string
 * Useful for testing or importing from clipboard
 */
export function exampleImportFromString() {
  const jsonString = `{
    "version": "1.0.0",
    "exportDate": "2024-03-04T10:30:00Z",
    "appVersion": "0.1.0",
    "language": "en",
    "data": {
      "totalArea": "100",
      "dairyCows": "50",
      "pigs": "0",
      "chickens": "0",
      "crops": [
        {
          "crop_id": 1,
          "area": "50",
          "nitrogen": "150",
          "phosphorus": "50",
          "potassium": "50",
          "manure": "20",
          "diesel": "10",
          "irrigation": "0",
          "pesticides": []
        }
      ]
    },
    "practices": [
      {
        "tillage": "no_till",
        "precisionFertilization": true,
        "coverCrop": false,
        "irrigationMethod": "furrow_surface",
        "irrigationEnergy": "grid",
        "residue": "retain"
      }
    ]
  }`;

  const result = importFromJSON(jsonString);

  if (result.success && result.data) {
    console.log('Import successful!');
    console.log('Farm form:', result.data.farmForm);
    console.log('Practices:', result.data.practices);

    if (result.warnings) {
      console.warn('Warnings:', result.warnings);
    }
  } else {
    console.error('Import failed:', result.error);
  }
}

/**
 * Example 2: Import from file
 * Useful for file upload handlers
 */
export async function exampleImportFromFile(file: File) {
  const result = await importFromJSONFile(file);

  if (result.success && result.data) {
    console.log('File import successful!');
    console.log('Version:', result.version);
    console.log('Data:', result.data);

    if (result.warnings) {
      console.warn('Warnings:', result.warnings);
    }

    // Use the imported data
    const { farmForm, practices } = result.data;
    updateFormWithImportedData(farmForm, practices);
  } else {
    console.error('File import failed:', result.error);
    showErrorMessage(result.error || 'Unknown error');
  }
}

/**
 * Example 3: Trigger file upload dialog
 * Useful for import buttons
 */
export function exampleTriggerFileUpload() {
  triggerFileUpload(async (file: File) => {
    console.log('File selected:', file.name);
    await exampleImportFromFile(file);
  });
}

/**
 * Example 4: Handle import in React component
 * Shows how to integrate with React state
 */
export function exampleReactIntegration() {
  // This would be in a React component
  const handleImportSuccess = (data: { farmForm: FarmForm; practices: CropPractice[] }) => {
    console.log('Import successful, updating form...');
    // Update form state with imported data
    // setFormData(data.farmForm);
    // setPractices(data.practices);
  };

  const handleImportError = (error: string) => {
    console.error('Import error:', error);
    // Show error notification to user
    // showNotification({ type: 'error', message: error });
  };

  const handleImportWarning = (warnings: string[]) => {
    console.warn('Import warnings:', warnings);
    // Show warning notification to user
    // showNotification({ type: 'warning', message: warnings.join(', ') });
  };

  // These would be passed to JSONImportButton component
  return {
    onImportSuccess: handleImportSuccess,
    onImportError: handleImportError,
    onImportWarning: handleImportWarning,
  };
}

/**
 * Example 5: Error handling scenarios
 * Shows how different error cases are handled
 */
export function exampleErrorHandling() {
  // Invalid JSON
  const invalidJSON = 'not valid json {';
  const result1 = importFromJSON(invalidJSON);
  console.log('Invalid JSON result:', result1);
  // Output: { success: false, error: "Invalid JSON: ..." }

  // Missing required fields
  const missingFields = JSON.stringify({
    version: '1.0.0',
    exportDate: '2024-03-04T10:30:00Z',
    appVersion: '0.1.0',
    language: 'en',
    // Missing 'data' and 'practices'
  });
  const result2 = importFromJSON(missingFields);
  console.log('Missing fields result:', result2);
  // Output: { success: false, error: "Invalid export format: ..." }

  // Invalid numeric values
  const invalidNumbers = JSON.stringify({
    version: '1.0.0',
    exportDate: '2024-03-04T10:30:00Z',
    appVersion: '0.1.0',
    language: 'en',
    data: {
      totalArea: 'not a number', // Invalid
      dairyCows: '50',
      pigs: '0',
      chickens: '0',
      crops: [],
    },
    practices: [],
  });
  const result3 = importFromJSON(invalidNumbers);
  console.log('Invalid numbers result:', result3);
  // Output: { success: false, error: "Invalid farm data: Total area must be a valid number..." }

  // Mismatched practices and crops
  const mismatchedData = JSON.stringify({
    version: '1.0.0',
    exportDate: '2024-03-04T10:30:00Z',
    appVersion: '0.1.0',
    language: 'en',
    data: {
      totalArea: '100',
      dairyCows: '50',
      pigs: '0',
      chickens: '0',
      crops: [
        {
          crop_id: 1,
          area: '50',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '50',
          manure: '20',
          diesel: '10',
          irrigation: '0',
          pesticides: [],
        },
      ],
    },
    practices: [], // Empty, but should have 1 practice
  });
  const result4 = importFromJSON(mismatchedData);
  console.log('Mismatched data result:', result4);
  // Output: { success: false, error: "Data mismatch: Number of practices (0) must match number of crops (1)" }
}

/**
 * Example 6: Backward compatibility
 * Shows how older file formats are handled
 */
export function exampleBackwardCompatibility() {
  // File from older version (missing some fields)
  const olderFormat = JSON.stringify({
    version: '0.9.0', // Older version
    exportDate: '2024-01-01T10:30:00Z',
    appVersion: '0.0.9',
    language: 'en',
    data: {
      totalArea: '100',
      dairyCows: '50',
      pigs: '0',
      chickens: '0',
      crops: [
        {
          crop_id: 1,
          area: '50',
          nitrogen: '150',
          phosphorus: '50',
          potassium: '50',
          manure: '20',
          diesel: '10',
          irrigation: '0',
          pesticides: [],
        },
      ],
    },
    practices: [
      {
        tillage: 'moldboard_plowing',
        precisionFertilization: false,
        coverCrop: false,
        irrigationMethod: 'furrow_surface',
        irrigationEnergy: 'grid',
        residue: 'incorporate',
      },
    ],
  });

  const result = importFromJSON(olderFormat);

  if (result.success) {
    console.log('Backward compatible import successful!');
    console.log('Warnings:', result.warnings);
    // Output: { success: true, warnings: ["File was exported from version 0.9.0, current version is 1.0.0"] }
  }
}

/**
 * Helper function: Update form with imported data
 * (Would be implemented in actual component)
 */
function updateFormWithImportedData(farmForm: FarmForm, practices: CropPractice[]) {
  console.log('Updating form with imported data...');
  console.log('Farm form:', farmForm);
  console.log('Practices:', practices);
  // Implementation would update React state or form fields
}

/**
 * Helper function: Show error message
 * (Would be implemented in actual component)
 */
function showErrorMessage(message: string) {
  console.error('Error:', message);
  // Implementation would show notification to user
}
