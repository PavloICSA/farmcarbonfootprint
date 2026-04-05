/**
 * CSV Export for Calculation Results
 * Exports emission results to CSV format with metadata, breakdown, and per-crop sections
 * Supports bilingual output (English and Ukrainian)
 */

import { EmissionResults, CropEmissionResults } from '../../../shared/calculation-core/src';
import { generateCSVFromRows, downloadCSV } from './csv-utils';

type Lang = 'en' | 'ua';

/**
 * Translation dictionary for CSV export labels
 */
const exportLabels: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Farm Carbon Footprint Report',
    date: 'Date',
    farmArea: 'Farm Area (ha)',
    total: 'Total Emissions (tCO2e)',
    perHectare: 'Per Hectare (tCO2e)',
    breakdown: 'Emission Breakdown',
    category: 'Category',
    emissions: 'Emissions (tCO2e)',
    percentage: 'Percentage (%)',
    fertilizer: 'Fertilizer',
    manure: 'Manure',
    fuel: 'Fuel and field ops',
    irrigation: 'Irrigation',
    pesticide: 'Pesticide',
    livestock: 'Livestock (cattle + pigs)',
    poultry: 'Poultry (chickens)',
    cropBreakdown: 'Per-Crop Results',
    crop: 'Crop',
    area: 'Area (ha)',
  },
  ua: {
    title: 'Звіт про вуглецевий слід господарства',
    date: 'Дата',
    farmArea: 'Площа господарства (га)',
    total: 'Загальні викиди (tCO2e)',
    perHectare: 'На гектар (tCO2e)',
    breakdown: 'Структура викидів',
    category: 'Категорія',
    emissions: 'Викиди (tCO2e)',
    percentage: 'Відсоток (%)',
    fertilizer: 'Добрива',
    manure: 'Гній',
    fuel: 'Паливо та польові операції',
    irrigation: 'Зрошення',
    pesticide: 'Пестициди',
    livestock: 'Тваринництво (ВРХ + свині)',
    poultry: 'Птиця (кури)',
    cropBreakdown: 'Результати по культурах',
    crop: 'Культура',
    area: 'Площа (га)',
  },
};

/**
 * Crop name translations for CSV export
 */
const cropNames: Record<Lang, Record<number, string>> = {
  en: {
    0: 'Wheat',
    1: 'Corn',
    2: 'Soy',
    3: 'Sunflower',
    4: 'Potato',
    5: 'Rice',
    6: 'Barley',
    7: 'Rapeseed',
    8: 'Sugar beet',
    9: 'Vegetables',
    10: 'Oats',
    11: 'Rye',
    12: 'Sorghum',
    13: 'Millet',
    14: 'Cotton',
    15: 'Alfalfa',
    16: 'Peas',
    17: 'Lentils',
    18: 'Chickpeas',
    19: 'Tomato',
    20: 'Onion',
    21: 'Grapes',
    22: 'Quinoa',
    23: 'Buckwheat',
    24: 'Spelt',
    25: 'Fava bean',
    26: 'Mung bean',
    27: 'Cabbage',
    28: 'Carrot',
    29: 'Pepper',
    30: 'Strawberry',
    31: 'Melon',
    32: 'Basil',
    33: 'Mint',
    34: 'Apple',
    35: 'Citrus',
    36: 'Cucumber',
    37: 'Lettuce',
    38: 'Pumpkin',
    39: 'Garlic',
    40: 'Flax',
    41: 'Clover',
  },
  ua: {
    0: 'Пшениця',
    1: 'Кукурудза',
    2: 'Соя',
    3: 'Соняшник',
    4: 'Картопля',
    5: 'Рис',
    6: 'Ячмінь',
    7: 'Ріпак',
    8: 'Цукровий буряк',
    9: 'Овочі',
    10: 'Овес',
    11: 'Жито',
    12: 'Сорго',
    13: 'Просо',
    14: 'Бавовник',
    15: 'Люцерна',
    16: 'Горох',
    17: 'Сочевиця',
    18: 'Нут',
    19: 'Томат',
    20: 'Цибуля',
    21: 'Виноград',
    22: 'Кіноа',
    23: 'Гречка',
    24: 'Спельта',
    25: 'Кормові боби',
    26: 'Маш',
    27: 'Капуста',
    28: 'Морква',
    29: 'Перець',
    30: 'Полуниця',
    31: 'Диня',
    32: 'Базилік',
    33: "М'ята",
    34: 'Яблуко',
    35: 'Цитрусові',
    36: 'Огірок',
    37: 'Салат',
    38: 'Гарбуз',
    39: 'Часник',
    40: 'Льон',
    41: 'Конюшина',
  },
};

/**
 * Get crop name by ID in the specified language
 */
function getCropName(cropId: number, lang: Lang): string {
  return cropNames[lang][cropId] || `Crop ${cropId}`;
}

/**
 * Format a number to 2 decimal places
 */
function formatNumber(value: number): string {
  return value.toFixed(2);
}

/**
 * Calculate percentage of total
 */
function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0.00';
  return ((value / total) * 100).toFixed(2);
}

/**
 * Export calculation results to CSV format
 * Includes metadata, emission breakdown, and per-crop results
 *
 * @param results - The emission calculation results
 * @param metadata - Additional metadata (farm area, etc.)
 * @param lang - Language for labels ('en' or 'ua')
 * @returns CSV formatted string
 */
export function exportResultsToCSV(
  results: EmissionResults,
  metadata: { farmArea: number; totalArea?: number },
  lang: Lang = 'en'
): string {
  const t = exportLabels[lang];
  const rows: (string | number)[][] = [];

  // Title section
  rows.push([t.title]);
  rows.push([]);

  // Metadata section
  rows.push([t.date, new Date().toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'en-US')]);
  rows.push([t.farmArea, formatNumber(metadata.farmArea)]);
  rows.push([t.total, formatNumber(results.total_emissions)]);
  rows.push([t.perHectare, formatNumber(results.per_hectare_emissions)]);
  rows.push([]);

  // Emission breakdown section
  rows.push([t.breakdown]);
  rows.push([t.category, t.emissions, t.percentage]);

  // Add emission categories
  const categories = [
    { label: t.fertilizer, value: results.fertilizer_emissions },
    { label: t.manure, value: results.manure_emissions },
    { label: t.fuel, value: results.fuel_emissions },
    { label: t.irrigation, value: results.irrigation_emissions },
    { label: t.pesticide, value: results.pesticide_emissions },
    { label: t.livestock, value: results.livestock_emissions },
    { label: t.poultry, value: 0 }, // Poultry calculated separately in results
  ];

  categories.forEach(({ label, value }) => {
    rows.push([
      label,
      formatNumber(value),
      calculatePercentage(value, results.total_emissions),
    ]);
  });

  rows.push([]);

  // Per-crop results section
  if (results.crop_results && results.crop_results.length > 0) {
    rows.push([t.cropBreakdown]);
    rows.push([t.crop, t.area, t.emissions]);

    results.crop_results.forEach((crop: CropEmissionResults) => {
      rows.push([
        getCropName(crop.crop_id, lang),
        formatNumber(crop.area),
        formatNumber(crop.total_emissions),
      ]);
    });
  }

  // Generate CSV from rows
  const headers = [t.category, t.emissions, t.percentage];
  return generateCSVFromRows(headers, rows);
}

/**
 * Export calculation results to CSV and trigger download
 *
 * @param results - The emission calculation results
 * @param metadata - Additional metadata (farm area, etc.)
 * @param lang - Language for labels ('en' or 'ua')
 */
export function downloadResultsAsCSV(
  results: EmissionResults,
  metadata: { farmArea: number; totalArea?: number },
  lang: Lang = 'en'
): void {
  const csvContent = exportResultsToCSV(results, metadata, lang);
  const filename = `farm-emissions-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
}
