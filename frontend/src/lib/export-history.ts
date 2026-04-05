/**
 * CSV Export for Calculation History
 * Exports calculation history to CSV format with date, farm name, areas, emissions, and livestock
 * Supports bilingual output (English and Ukrainian)
 */

import { CalculationHistory } from '../types/storage';
import { generateCSVFromRows, downloadCSV } from './csv-utils';

type Lang = 'en' | 'ua';

/**
 * Translation dictionary for history export labels
 */
const historyLabels: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Farm Carbon Footprint History',
    date: 'Date',
    farmName: 'Farm Name',
    totalArea: 'Total Area (ha)',
    dairyCows: 'Dairy Cows',
    pigs: 'Pigs',
    chickens: 'Chickens',
    totalEmissions: 'Total Emissions (tCO2e)',
    perHectare: 'Per Hectare (tCO2e)',
    cropCount: 'Number of Crops',
  },
  ua: {
    title: 'Історія вуглецевого сліду господарства',
    date: 'Дата',
    farmName: 'Назва господарства',
    totalArea: 'Загальна площа (га)',
    dairyCows: 'Молочні корови',
    pigs: 'Свині',
    chickens: 'Кури',
    totalEmissions: 'Загальні викиди (tCO2e)',
    perHectare: 'На гектар (tCO2e)',
    cropCount: 'Кількість культур',
  },
};

/**
 * Format a number to 2 decimal places
 */
function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

/**
 * Format a date to locale string
 */
function formatDate(date: Date, lang: Lang): string {
  return new Date(date).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'en-US');
}

/**
 * Export calculation history to CSV format
 * Includes columns for date, farm name, areas, emissions, and livestock
 *
 * @param history - Array of calculation history entries
 * @param lang - Language for labels ('en' or 'ua')
 * @returns CSV formatted string
 */
export function exportHistoryToCSV(history: CalculationHistory[], lang: Lang = 'en'): string {
  const t = historyLabels[lang];
  const rows: (string | number)[][] = [];

  // Title section
  rows.push([t.title]);
  rows.push([]);

  // Header row
  rows.push([
    t.date,
    t.farmName,
    t.totalArea,
    t.dairyCows,
    t.pigs,
    t.chickens,
    t.cropCount,
    t.totalEmissions,
    t.perHectare,
  ]);

  // Data rows
  history.forEach((entry: CalculationHistory) => {
    const farmName = entry.farmName || '(Unnamed)';
    const totalArea = formatNumber(entry.data.totalArea);
    const dairyCows = entry.data.dairyCows || '0';
    const pigs = entry.data.pigs || '0';
    const chickens = entry.data.chickens || '0';
    const cropCount = entry.data.crops ? entry.data.crops.length : 0;
    const totalEmissions = formatNumber(entry.results?.total_emissions || 0);
    const perHectare = formatNumber(entry.results?.per_hectare_emissions || 0);
    const date = formatDate(entry.timestamp, lang);

    rows.push([
      date,
      farmName,
      totalArea,
      dairyCows,
      pigs,
      chickens,
      cropCount,
      totalEmissions,
      perHectare,
    ]);
  });

  // Generate CSV from rows
  const headers = [
    t.date,
    t.farmName,
    t.totalArea,
    t.dairyCows,
    t.pigs,
    t.chickens,
    t.cropCount,
    t.totalEmissions,
    t.perHectare,
  ];

  return generateCSVFromRows(headers, rows);
}

/**
 * Export calculation history to CSV and trigger download
 *
 * @param history - Array of calculation history entries
 * @param lang - Language for labels ('en' or 'ua')
 */
export function downloadHistoryAsCSV(history: CalculationHistory[], lang: Lang = 'en'): void {
  const csvContent = exportHistoryToCSV(history, lang);
  const filename = `farm-history-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
}
