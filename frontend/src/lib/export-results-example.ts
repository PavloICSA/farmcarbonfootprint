/**
 * CSV Export Results Example
 * Demonstrates how to use the CSV export functionality for calculation results
 */

import { exportResultsToCSV, downloadResultsAsCSV } from './export-results';
import type { EmissionResults } from '../../../shared/calculation-core/src';

/**
 * Example 1: Export results to CSV string (English)
 */
export function exampleExportResultsEnglish() {
  const mockResults: EmissionResults = {
    fertilizer_emissions: 45.2,
    manure_emissions: 28.1,
    fuel_emissions: 32.5,
    irrigation_emissions: 12.3,
    pesticide_emissions: 8.9,
    livestock_emissions: 0.0,
    total_emissions: 127.0,
    per_hectare_emissions: 0.85,
    num_crops: 3,
    crop_results: [
      {
        crop_id: 0,
        area: 50,
        fertilizer_emissions: 20.1,
        manure_emissions: 12.5,
        fuel_emissions: 15.2,
        irrigation_emissions: 5.1,
        pesticide_emissions: 3.2,
        livestock_emissions: 0,
        total_emissions: 56.1,
      },
      {
        crop_id: 1,
        area: 40,
        fertilizer_emissions: 18.5,
        manure_emissions: 10.2,
        fuel_emissions: 12.1,
        irrigation_emissions: 4.8,
        pesticide_emissions: 3.1,
        livestock_emissions: 0,
        total_emissions: 48.7,
      },
      {
        crop_id: 6,
        area: 60,
        fertilizer_emissions: 6.6,
        manure_emissions: 5.4,
        fuel_emissions: 5.2,
        irrigation_emissions: 2.4,
        pesticide_emissions: 2.6,
        livestock_emissions: 0,
        total_emissions: 22.2,
      },
    ],
  };

  const metadata = {
    farmArea: 150,
    totalArea: 150,
  };

  const csvContent = exportResultsToCSV(mockResults, metadata, 'en');
  console.log('CSV Export (English):');
  console.log(csvContent);

  return csvContent;
}

/**
 * Example 2: Export results to CSV string (Ukrainian)
 */
export function exampleExportResultsUkrainian() {
  const mockResults: EmissionResults = {
    fertilizer_emissions: 45.2,
    manure_emissions: 28.1,
    fuel_emissions: 32.5,
    irrigation_emissions: 12.3,
    pesticide_emissions: 8.9,
    livestock_emissions: 0.0,
    total_emissions: 127.0,
    per_hectare_emissions: 0.85,
    num_crops: 3,
    crop_results: [
      {
        crop_id: 0,
        area: 50,
        fertilizer_emissions: 20.1,
        manure_emissions: 12.5,
        fuel_emissions: 15.2,
        irrigation_emissions: 5.1,
        pesticide_emissions: 3.2,
        livestock_emissions: 0,
        total_emissions: 56.1,
      },
      {
        crop_id: 1,
        area: 40,
        fertilizer_emissions: 18.5,
        manure_emissions: 10.2,
        fuel_emissions: 12.1,
        irrigation_emissions: 4.8,
        pesticide_emissions: 3.1,
        livestock_emissions: 0,
        total_emissions: 48.7,
      },
      {
        crop_id: 6,
        area: 60,
        fertilizer_emissions: 6.6,
        manure_emissions: 5.4,
        fuel_emissions: 5.2,
        irrigation_emissions: 2.4,
        pesticide_emissions: 2.6,
        livestock_emissions: 0,
        total_emissions: 22.2,
      },
    ],
  };

  const metadata = {
    farmArea: 150,
    totalArea: 150,
  };

  const csvContent = exportResultsToCSV(mockResults, metadata, 'ua');
  console.log('CSV Export (Ukrainian):');
  console.log(csvContent);

  return csvContent;
}

/**
 * Example 3: Download results as CSV file
 */
export function exampleDownloadResultsAsCSV() {
  const mockResults: EmissionResults = {
    fertilizer_emissions: 45.2,
    manure_emissions: 28.1,
    fuel_emissions: 32.5,
    irrigation_emissions: 12.3,
    pesticide_emissions: 8.9,
    livestock_emissions: 0.0,
    total_emissions: 127.0,
    per_hectare_emissions: 0.85,
    num_crops: 3,
    crop_results: [
      {
        crop_id: 0,
        area: 50,
        fertilizer_emissions: 20.1,
        manure_emissions: 12.5,
        fuel_emissions: 15.2,
        irrigation_emissions: 5.1,
        pesticide_emissions: 3.2,
        livestock_emissions: 0,
        total_emissions: 56.1,
      },
      {
        crop_id: 1,
        area: 40,
        fertilizer_emissions: 18.5,
        manure_emissions: 10.2,
        fuel_emissions: 12.1,
        irrigation_emissions: 4.8,
        pesticide_emissions: 3.1,
        livestock_emissions: 0,
        total_emissions: 48.7,
      },
      {
        crop_id: 6,
        area: 60,
        fertilizer_emissions: 6.6,
        manure_emissions: 5.4,
        fuel_emissions: 5.2,
        irrigation_emissions: 2.4,
        pesticide_emissions: 2.6,
        livestock_emissions: 0,
        total_emissions: 22.2,
      },
    ],
  };

  const metadata = {
    farmArea: 150,
    totalArea: 150,
  };

  // This will trigger a browser download
  downloadResultsAsCSV(mockResults, metadata, 'en');
  console.log('CSV file download initiated');
}

/**
 * Example 4: Export with livestock-only results
 */
export function exampleExportLivestockOnlyResults() {
  const mockResults: EmissionResults = {
    fertilizer_emissions: 0,
    manure_emissions: 0,
    fuel_emissions: 0,
    irrigation_emissions: 0,
    pesticide_emissions: 0,
    livestock_emissions: 45.2,
    total_emissions: 45.2,
    per_hectare_emissions: 0, // Not applicable for livestock-only
    num_crops: 0,
    crop_results: [],
  };

  const metadata = {
    farmArea: 0,
    totalArea: 0,
  };

  const csvContent = exportResultsToCSV(mockResults, metadata, 'en');
  console.log('CSV Export (Livestock Only):');
  console.log(csvContent);

  return csvContent;
}

/**
 * Example 5: Export with mixed crops and livestock
 */
export function exampleExportMixedResults() {
  const mockResults: EmissionResults = {
    fertilizer_emissions: 35.2,
    manure_emissions: 22.1,
    fuel_emissions: 25.5,
    irrigation_emissions: 9.3,
    pesticide_emissions: 6.9,
    livestock_emissions: 28.5,
    total_emissions: 127.5,
    per_hectare_emissions: 0.85,
    num_crops: 2,
    crop_results: [
      {
        crop_id: 0,
        area: 75,
        fertilizer_emissions: 20.1,
        manure_emissions: 12.5,
        fuel_emissions: 15.2,
        irrigation_emissions: 5.1,
        pesticide_emissions: 3.2,
        livestock_emissions: 0,
        total_emissions: 56.1,
      },
      {
        crop_id: 1,
        area: 75,
        fertilizer_emissions: 15.1,
        manure_emissions: 9.6,
        fuel_emissions: 10.3,
        irrigation_emissions: 4.2,
        pesticide_emissions: 3.7,
        livestock_emissions: 0,
        total_emissions: 42.9,
      },
    ],
  };

  const metadata = {
    farmArea: 150,
    totalArea: 150,
  };

  const csvContent = exportResultsToCSV(mockResults, metadata, 'ua');
  console.log('CSV Export (Mixed Results - Ukrainian):');
  console.log(csvContent);

  return csvContent;
}

/**
 * Example 6: Integration with React component
 * Shows how to use the export function in a React component
 */
export function exampleReactIntegration() {
  // This is pseudocode showing how to integrate in a React component
  const code = `
import { downloadResultsAsCSV } from './lib/export-results';
import type { EmissionResults } from '../../shared/calculation-core/src';

function ResultsPanel({ results, farmArea, language }: Props) {
  const handleExportCSV = () => {
    downloadResultsAsCSV(
      results,
      { farmArea },
      language
    );
  };

  return (
    <div>
      <h2>Results</h2>
      <p>Total: {results.total_emissions.toFixed(2)} tCO2e</p>
      <button onClick={handleExportCSV}>
        {language === 'en' ? 'Export to CSV' : 'Експортувати в CSV'}
      </button>
    </div>
  );
}
  `;

  console.log('React Integration Example:');
  console.log(code);

  return code;
}
