import type { EmissionResults } from '../../../shared/calculation-core/src/types';
import type { CalculationHistory, CropPractice } from '../types/storage';
import { CHART_COLORS } from './chart-utils';

export type PieChartDatum = { label: string; value: number; color: string };

export function buildEmissionPieChartData(args: {
  results: EmissionResults;
  labels: {
    fertilizer: string;
    manure: string;
    fuel: string;
    irrigation: string;
    pesticide: string;
    livestock: string;
    poultry: string;
  };
  animalBreakdown?: { livestock: number; poultry: number } | null;
}): PieChartDatum[] {
  const { results, labels, animalBreakdown } = args;
  const livestockOnly = animalBreakdown ? animalBreakdown.livestock : results.livestock_emissions;
  const poultryOnly = animalBreakdown ? animalBreakdown.poultry : 0;
  return [
    { label: labels.fertilizer, value: results.fertilizer_emissions, color: CHART_COLORS.fertilizer },
    { label: labels.manure, value: results.manure_emissions, color: CHART_COLORS.manure },
    { label: labels.fuel, value: results.fuel_emissions, color: CHART_COLORS.fuel },
    { label: labels.irrigation, value: results.irrigation_emissions, color: CHART_COLORS.irrigation },
    { label: labels.pesticide, value: results.pesticide_emissions, color: CHART_COLORS.pesticide },
    { label: labels.livestock, value: livestockOnly, color: CHART_COLORS.livestock },
    { label: labels.poultry, value: poultryOnly, color: CHART_COLORS.poultry },
  ];
}

export type CropComparisonDatum = {
  id: string;
  label: string;
  total: number;
  segments: Array<{ key: string; label: string; value: number; color: string }>;
};

export function buildCropComparisonChartData(args: {
  results: EmissionResults;
  getCropLabel: (cropId: number) => string;
  labels: {
    fertilizer: string;
    manure: string;
    fuel: string;
    irrigation: string;
    pesticide: string;
  };
}): CropComparisonDatum[] {
  const { results, getCropLabel, labels } = args;
  return results.crop_results
    .map((c, index) => {
      const label = getCropLabel(c.crop_id) || `Crop ${index + 1}`;
      return {
        id: String(index),
        label,
        total: c.total_emissions,
        segments: [
          { key: 'fertilizer', label: labels.fertilizer, value: c.fertilizer_emissions, color: CHART_COLORS.fertilizer },
          { key: 'manure', label: labels.manure, value: c.manure_emissions, color: CHART_COLORS.manure },
          { key: 'fuel', label: labels.fuel, value: c.fuel_emissions, color: CHART_COLORS.fuel },
          { key: 'irrigation', label: labels.irrigation, value: c.irrigation_emissions, color: CHART_COLORS.irrigation },
          { key: 'pesticide', label: labels.pesticide, value: c.pesticide_emissions, color: CHART_COLORS.pesticide },
        ],
      };
    })
    .filter((c) => c.total > 0);
}

export type EmissionTrendDatum = { id: string; date: Date; value: number };

export function buildEmissionTrendPoints(history: CalculationHistory[]): EmissionTrendDatum[] {
  return history
    .slice(0, 20)
    .map((h) => ({
      id: h.id,
      date: new Date(h.timestamp),
      value: typeof h.results?.total_emissions === 'number' ? h.results.total_emissions : 0,
    }))
    .filter((p) => p.value >= 0);
}

export type PracticeHeatMapRow = {
  id: string;
  label: string;
  options: Array<{ id: string; label: string; multiplier: number }>;
  selectedIds: Set<string>;
};

type Lang = 'en' | 'ua';
type IrrigationMethod =
  | 'none'
  | 'furrow_surface'
  | 'basin_flood'
  | 'sprinkler'
  | 'center_pivot'
  | 'drip'
  | 'subsurface_drip';
type Residue = 'incorporate' | 'retain' | 'burn';
type Tillage =
  | 'moldboard_plowing'
  | 'disk_tillage'
  | 'chisel_tillage'
  | 'strip_till'
  | 'ridge_till'
  | 'no_till';

const tillageOptions: Tillage[] = [
  'moldboard_plowing',
  'disk_tillage',
  'chisel_tillage',
  'strip_till',
  'ridge_till',
  'no_till',
];
const irrigationMethodOptions: IrrigationMethod[] = [
  'none',
  'furrow_surface',
  'basin_flood',
  'sprinkler',
  'center_pivot',
  'drip',
  'subsurface_drip',
];
const residueOptions: Residue[] = ['incorporate', 'retain', 'burn'];

const tillageMultiplierByType: Record<Tillage, number> = {
  moldboard_plowing: 1.18,
  disk_tillage: 1.0,
  chisel_tillage: 0.88,
  strip_till: 0.76,
  ridge_till: 0.82,
  no_till: 0.64,
};
const irrigationMultiplierByMethod: Record<IrrigationMethod, number> = {
  none: 0,
  furrow_surface: 1.22,
  basin_flood: 1.3,
  sprinkler: 1.0,
  center_pivot: 0.9,
  drip: 0.72,
  subsurface_drip: 0.66,
};
const residueMultiplier: Record<Residue, number> = {
  incorporate: 1.0,
  retain: 0.92,
  burn: 1.18,
};

function tText(lang: Lang, en: string, ua: string) {
  return lang === 'en' ? en : ua;
}

function optionLabel(lang: Lang, group: 'tillage' | 'irrigation' | 'residue' | 'yesno', id: string) {
  if (group === 'yesno') return id === 'yes' ? tText(lang, 'Yes', 'Так') : tText(lang, 'No', 'Ні');
  const en: Record<string, string> = {
    moldboard_plowing: 'Moldboard plowing',
    disk_tillage: 'Disk tillage',
    chisel_tillage: 'Chisel tillage',
    strip_till: 'Strip-till',
    ridge_till: 'Ridge-till',
    no_till: 'No-till',
    none: 'No irrigation',
    furrow_surface: 'Furrow/surface',
    basin_flood: 'Basin/flood',
    sprinkler: 'Sprinkler',
    center_pivot: 'Center pivot',
    drip: 'Drip',
    subsurface_drip: 'Subsurface drip',
    incorporate: 'Incorporate',
    retain: 'Retain',
    burn: 'Burn',
  };
  const ua: Record<string, string> = {
    moldboard_plowing: 'Оранка (плуг)',
    disk_tillage: 'Дискування',
    chisel_tillage: 'Чизелювання',
    strip_till: 'Strip-till',
    ridge_till: 'Гребенева',
    no_till: 'No-till',
    none: 'Без зрошення',
    furrow_surface: 'Борозни/поверхневе',
    basin_flood: 'Затоплення',
    sprinkler: 'Дощування',
    center_pivot: 'Кругова',
    drip: 'Краплинне',
    subsurface_drip: 'Підґрунтове краплинне',
    incorporate: 'Загортання',
    retain: 'Залишати',
    burn: 'Спалювання',
  };
  return lang === 'en' ? (en[id] ?? id) : (ua[id] ?? id);
}

export function buildPracticeHeatMapRows(practices: CropPractice[], language: Lang): PracticeHeatMapRow[] {
  const selectedTillage = new Set(practices.map((p) => p.tillage));
  const selectedIrrigation = new Set(practices.map((p) => p.irrigationMethod));
  const selectedResidue = new Set(practices.map((p) => p.residue));
  const selectedPrecision = new Set(practices.map((p) => (p.precisionFertilization ? 'yes' : 'no')));
  const selectedCover = new Set(practices.map((p) => (p.coverCrop ? 'yes' : 'no')));

  return [
    {
      id: 'tillage',
      label: tText(language, 'Tillage', 'Обробіток'),
      selectedIds: new Set(Array.from(selectedTillage)),
      options: tillageOptions.map((id) => ({ id, label: optionLabel(language, 'tillage', id), multiplier: tillageMultiplierByType[id] })),
    },
    {
      id: 'irrigation',
      label: tText(language, 'Irrigation method', 'Метод зрошення'),
      selectedIds: new Set(Array.from(selectedIrrigation)),
      options: irrigationMethodOptions.map((id) => ({
        id,
        label: optionLabel(language, 'irrigation', id),
        multiplier: irrigationMultiplierByMethod[id],
      })),
    },
    {
      id: 'residue',
      label: tText(language, 'Residue management', 'Рештки'),
      selectedIds: new Set(Array.from(selectedResidue)),
      options: residueOptions.map((id) => ({ id, label: optionLabel(language, 'residue', id), multiplier: residueMultiplier[id] })),
    },
    {
      id: 'precision',
      label: tText(language, 'Precision fertilization', 'Точне внесення'),
      selectedIds: new Set(Array.from(selectedPrecision)),
      options: ['yes', 'no'].map((id) => ({ id, label: optionLabel(language, 'yesno', id), multiplier: id === 'yes' ? 0.9 : 1.0 })),
    },
    {
      id: 'cover',
      label: tText(language, 'Cover crops', 'Покривні культури'),
      selectedIds: new Set(Array.from(selectedCover)),
      options: ['yes', 'no'].map((id) => ({ id, label: optionLabel(language, 'yesno', id), multiplier: id === 'yes' ? 0.92 : 1.0 })),
    },
  ];
}
