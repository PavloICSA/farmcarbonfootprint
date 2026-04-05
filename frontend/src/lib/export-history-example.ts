/**
 * Example: CSV Export for Calculation History
 * Demonstrates how to use the history export functionality
 */

import { exportHistoryToCSV, downloadHistoryAsCSV } from './export-history';
import { CalculationHistory } from '../types/storage';

/**
 * Example 1: Export history to CSV string
 * Useful for testing or sending data to a server
 */
export function exampleExportHistoryToString() {
  // Sample history data
  const sampleHistory: CalculationHistory[] = [
    {
      id: 'calc-001',
      timestamp: new Date('2024-01-15'),
      farmName: 'Green Valley Farm',
      data: {
        totalArea: '150',
        dairyCows: '50',
        pigs: '30',
        chickens: '200',
        crops: [
          {
            crop_id: 0,
            area: '50',
            nitrogen: '150',
            phosphorus: '50',
            potassium: '50',
            manure: '20',
            diesel: '15',
            irrigation: '0',
            pesticides: [{ pesticide_id: '-1', rate: '0' }],
          },
          {
            crop_id: 1,
            area: '100',
            nitrogen: '180',
            phosphorus: '60',
            potassium: '60',
            manure: '25',
            diesel: '20',
            irrigation: '50',
            pesticides: [{ pesticide_id: '-1', rate: '0' }],
          },
        ],
      },
      practices: [
        {
          tillage: 'no_till',
          precisionFertilization: true,
          coverCrop: true,
          irrigationMethod: 'drip',
          irrigationEnergy: 'solar',
          residue: 'retain',
        },
        {
          tillage: 'strip_till',
          precisionFertilization: false,
          coverCrop: false,
          irrigationMethod: 'sprinkler',
          irrigationEnergy: 'grid',
          residue: 'incorporate',
        },
      ],
      results: {
        total_emissions: 125.5,
        per_hectare_emissions: 0.837,
        fertilizer_emissions: 45.2,
        manure_emissions: 20.1,
        fuel_emissions: 35.8,
        irrigation_emissions: 12.4,
        pesticide_emissions: 8.5,
        livestock_emissions: 3.5,
        crop_results: [
          {
            crop_id: 0,
            area: 50,
            total_emissions: 62.3,
          },
          {
            crop_id: 1,
            area: 100,
            total_emissions: 63.2,
          },
        ],
      },
    },
    {
      id: 'calc-002',
      timestamp: new Date('2024-02-20'),
      farmName: 'Sunny Acres',
      data: {
        totalArea: '200',
        dairyCows: '75',
        pigs: '0',
        chickens: '500',
        crops: [
          {
            crop_id: 2,
            area: '150',
            nitrogen: '160',
            phosphorus: '55',
            potassium: '55',
            manure: '30',
            diesel: '18',
            irrigation: '100',
            pesticides: [{ pesticide_id: '-1', rate: '0' }],
          },
          {
            crop_id: 4,
            area: '50',
            nitrogen: '120',
            phosphorus: '40',
            potassium: '40',
            manure: '15',
            diesel: '10',
            irrigation: '80',
            pesticides: [{ pesticide_id: '-1', rate: '0' }],
          },
        ],
      },
      practices: [
        {
          tillage: 'no_till',
          precisionFertilization: true,
          coverCrop: true,
          irrigationMethod: 'drip',
          irrigationEnergy: 'solar',
          residue: 'retain',
        },
        {
          tillage: 'no_till',
          precisionFertilization: true,
          coverCrop: false,
          irrigationMethod: 'drip',
          irrigationEnergy: 'solar',
          residue: 'retain',
        },
      ],
      results: {
        total_emissions: 185.3,
        per_hectare_emissions: 0.927,
        fertilizer_emissions: 68.5,
        manure_emissions: 32.1,
        fuel_emissions: 42.3,
        irrigation_emissions: 28.6,
        pesticide_emissions: 10.2,
        livestock_emissions: 3.6,
        crop_results: [
          {
            crop_id: 2,
            area: 150,
            total_emissions: 142.8,
          },
          {
            crop_id: 4,
            area: 50,
            total_emissions: 42.5,
          },
        ],
      },
    },
  ];

  // Export to CSV string in English
  const csvEnglish = exportHistoryToCSV(sampleHistory, 'en');
  console.log('English CSV:');
  console.log(csvEnglish);

  // Export to CSV string in Ukrainian
  const csvUkrainian = exportHistoryToCSV(sampleHistory, 'ua');
  console.log('\nUkrainian CSV:');
  console.log(csvUkrainian);

  return { csvEnglish, csvUkrainian };
}

/**
 * Example 2: Download history as CSV file
 * Triggers browser download with proper filename
 */
export function exampleDownloadHistoryAsCSV() {
  const sampleHistory: CalculationHistory[] = [
    {
      id: 'calc-001',
      timestamp: new Date('2024-01-15'),
      farmName: 'Green Valley Farm',
      data: {
        totalArea: '150',
        dairyCows: '50',
        pigs: '30',
        chickens: '200',
        crops: [
          {
            crop_id: 0,
            area: '50',
            nitrogen: '150',
            phosphorus: '50',
            potassium: '50',
            manure: '20',
            diesel: '15',
            irrigation: '0',
            pesticides: [{ pesticide_id: '-1', rate: '0' }],
          },
        ],
      },
      practices: [
        {
          tillage: 'no_till',
          precisionFertilization: true,
          coverCrop: true,
          irrigationMethod: 'drip',
          irrigationEnergy: 'solar',
          residue: 'retain',
        },
      ],
      results: {
        total_emissions: 125.5,
        per_hectare_emissions: 0.837,
        fertilizer_emissions: 45.2,
        manure_emissions: 20.1,
        fuel_emissions: 35.8,
        irrigation_emissions: 12.4,
        pesticide_emissions: 8.5,
        livestock_emissions: 3.5,
        crop_results: [
          {
            crop_id: 0,
            area: 50,
            total_emissions: 62.3,
          },
        ],
      },
    },
  ];

  // Download in English
  downloadHistoryAsCSV(sampleHistory, 'en');
  // File will be named: farm-history-2024-01-15.csv (or current date)

  // Download in Ukrainian
  // downloadHistoryAsCSV(sampleHistory, 'ua');
}

/**
 * Example 3: Export empty history
 * Demonstrates handling of empty history
 */
export function exampleExportEmptyHistory() {
  const emptyHistory: CalculationHistory[] = [];

  const csv = exportHistoryToCSV(emptyHistory, 'en');
  console.log('Empty history CSV:');
  console.log(csv);
  // Output will contain headers but no data rows
}

/**
 * Example 4: Export history with missing data
 * Demonstrates handling of incomplete entries
 */
export function exampleExportHistoryWithMissingData() {
  const incompleteHistory: CalculationHistory[] = [
    {
      id: 'calc-001',
      timestamp: new Date('2024-01-15'),
      // farmName is optional - will show as "(Unnamed)"
      data: {
        totalArea: '100',
        dairyCows: '0',
        pigs: '0',
        chickens: '0',
        crops: [],
      },
      practices: [],
      results: {
        total_emissions: 0,
        per_hectare_emissions: 0,
        fertilizer_emissions: 0,
        manure_emissions: 0,
        fuel_emissions: 0,
        irrigation_emissions: 0,
        pesticide_emissions: 0,
        livestock_emissions: 0,
        crop_results: [],
      },
    },
  ];

  const csv = exportHistoryToCSV(incompleteHistory, 'en');
  console.log('History with missing data CSV:');
  console.log(csv);
}
