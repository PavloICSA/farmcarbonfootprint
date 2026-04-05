/**
 * JSON Export Examples
 * Demonstrates how to use the JSON export functionality with schema validation
 */

import {
  exportToJSON,
  importFromJSON,
  downloadAsJSON,
  createExportData,
  validateExportData,
  type ExportData,
} from './json-export';
import { FarmForm, CropPractice } from '../types/storage';
import { EmissionResults } from '../../../shared/calculation-core/src';

/**
 * Example 1: Export farm data to JSON string
 */
export function example1_exportToJSON() {
  const farmForm: FarmForm = {
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [
      {
        crop_id: 0, // Wheat
        area: '50',
        nitrogen: '150',
        phosphorus: '50',
        potassium: '50',
        manure: '0',
        diesel: '20',
        irrigation: '0',
        pesticides: [{ pesticide_id: '1', rate: '1.5' }],
      },
      {
        crop_id: 1, // Corn
        area: '50',
        nitrogen: '180',
        phosphorus: '60',
        potassium: '60',
        manure: '10',
        diesel: '25',
        irrigation: '100',
        pesticides: [{ pesticide_id: '2', rate: '2.0' }],
      },
    ],
  };

  const practices: CropPractice[] = [
    {
      tillage: 'no_till',
      precisionFertilization: true,
      coverCrop: false,
      irrigationMethod: 'drip',
      irrigationEnergy: 'solar',
      residue: 'retain',
    },
    {
      tillage: 'disk_tillage',
      precisionFertilization: false,
      coverCrop: true,
      irrigationMethod: 'center_pivot',
      irrigationEnergy: 'grid',
      residue: 'incorporate',
    },
  ];

  const mockResults: EmissionResults = {
    total_emissions: 250.5,
    per_hectare_emissions: 2.505,
    num_crops: 2,
    fertilizer_emissions: 120.0,
    manure_emissions: 30.0,
    fuel_emissions: 50.0,
    irrigation_emissions: 25.0,
    pesticide_emissions: 15.0,
    livestock_emissions: 10.0,
    crop_results: [
      {
        crop_id: 0,
        area: 50,
        total_emissions: 125.0,
        fertilizer_emissions: 60.0,
        manure_emissions: 15.0,
        fuel_emissions: 25.0,
        irrigation_emissions: 12.5,
        pesticide_emissions: 7.5,
        livestock_emissions: 5.0,
      },
      {
        crop_id: 1,
        area: 50,
        total_emissions: 125.5,
        fertilizer_emissions: 60.0,
        manure_emissions: 15.0,
        fuel_emissions: 25.0,
        irrigation_emissions: 12.5,
        pesticide_emissions: 7.5,
        livestock_emissions: 5.5,
      },
    ],
  };

  // Export to JSON string
  const jsonString = exportToJSON(farmForm, practices, mockResults, 'en');
  console.log('Exported JSON:', jsonString);

  return jsonString;
}

/**
 * Example 2: Import JSON and validate
 */
export function example2_importFromJSON() {
  const jsonString = `{
    "version": "1.0.0",
    "exportDate": "2024-03-04T10:30:00.000Z",
    "appVersion": "0.1.0",
    "language": "en",
    "data": {
      "totalArea": "100",
      "dairyCows": "50",
      "pigs": "0",
      "chickens": "0",
      "crops": [
        {
          "crop_id": 0,
          "area": "50",
          "nitrogen": "150",
          "phosphorus": "50",
          "potassium": "50",
          "manure": "0",
          "diesel": "20",
          "irrigation": "0",
          "pesticides": [{"pesticide_id": "1", "rate": "1.5"}]
        }
      ]
    },
    "practices": [
      {
        "tillage": "no_till",
        "precisionFertilization": true,
        "coverCrop": false,
        "irrigationMethod": "drip",
        "irrigationEnergy": "solar",
        "residue": "retain"
      }
    ],
    "metadata": {
      "version": "1.0.0",
      "customFactors": false
    }
  }`;

  try {
    const importedData = importFromJSON(jsonString);
    console.log('Successfully imported data:', importedData);
    return importedData;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

/**
 * Example 3: Download JSON file
 */
export function example3_downloadAsJSON() {
  const farmForm: FarmForm = {
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [
      {
        crop_id: 0,
        area: '50',
        nitrogen: '150',
        phosphorus: '50',
        potassium: '50',
        manure: '0',
        diesel: '20',
        irrigation: '0',
        pesticides: [{ pesticide_id: '1', rate: '1.5' }],
      },
    ],
  };

  const practices: CropPractice[] = [
    {
      tillage: 'no_till',
      precisionFertilization: true,
      coverCrop: false,
      irrigationMethod: 'drip',
      irrigationEnergy: 'solar',
      residue: 'retain',
    },
  ];

  // Download as JSON file
  downloadAsJSON(farmForm, practices, undefined, 'en');
  console.log('JSON file downloaded');
}

/**
 * Example 4: Create and validate export data
 */
export function example4_createAndValidateExportData() {
  const farmForm: FarmForm = {
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [],
  };

  const practices: CropPractice[] = [];

  // Create export data with validation
  const exportData = createExportData(farmForm, practices, undefined, 'ua');
  console.log('Created export data:', exportData);

  // Validate the data
  const validated = validateExportData(exportData);
  console.log('Validation passed:', validated);

  return validated;
}

/**
 * Example 5: Handle validation errors
 */
export function example5_handleValidationErrors() {
  const invalidJSON = `{
    "version": "1.0.0",
    "exportDate": "2024-03-04T10:30:00.000Z",
    "appVersion": "0.1.0",
    "language": "en",
    "data": {
      "totalArea": "100",
      "dairyCows": "invalid_number",
      "pigs": "0",
      "chickens": "0",
      "crops": []
    },
    "practices": []
  }`;

  try {
    importFromJSON(invalidJSON);
  } catch (error) {
    console.error('Validation error caught:', error instanceof Error ? error.message : error);
    // Handle error appropriately in UI
  }
}

/**
 * Example 6: Round-trip export and import
 */
export function example6_roundTripExportImport() {
  const originalFarmForm: FarmForm = {
    totalArea: '100',
    dairyCows: '50',
    pigs: '0',
    chickens: '0',
    crops: [
      {
        crop_id: 0,
        area: '50',
        nitrogen: '150',
        phosphorus: '50',
        potassium: '50',
        manure: '0',
        diesel: '20',
        irrigation: '0',
        pesticides: [{ pesticide_id: '1', rate: '1.5' }],
      },
    ],
  };

  const originalPractices: CropPractice[] = [
    {
      tillage: 'no_till',
      precisionFertilization: true,
      coverCrop: false,
      irrigationMethod: 'drip',
      irrigationEnergy: 'solar',
      residue: 'retain',
    },
  ];

  // Export to JSON
  const jsonString = exportToJSON(originalFarmForm, originalPractices, undefined, 'en');

  // Import from JSON
  const importedData = importFromJSON(jsonString);

  // Verify round-trip
  console.log('Original farm area:', originalFarmForm.totalArea);
  console.log('Imported farm area:', importedData.data.totalArea);
  console.log('Round-trip successful:', originalFarmForm.totalArea === importedData.data.totalArea);

  return importedData;
}
