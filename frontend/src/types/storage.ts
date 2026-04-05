/**
 * Storage-related type definitions for the Farm Carbon Footprint App
 */

// Re-export types from App.tsx that are needed for storage
export type Lang = "en" | "ua";
export type Theme = "dark" | "light";
export type Tillage =
  | "moldboard_plowing"
  | "disk_tillage"
  | "chisel_tillage"
  | "strip_till"
  | "ridge_till"
  | "no_till";
export type IrrigationEnergy = "grid" | "diesel_pump" | "solar";
export type IrrigationMethod =
  | "none"
  | "furrow_surface"
  | "basin_flood"
  | "sprinkler"
  | "center_pivot"
  | "drip"
  | "subsurface_drip";
export type Residue = "incorporate" | "retain" | "burn";

export type CropPractice = {
  tillage: Tillage;
  precisionFertilization: boolean;
  coverCrop: boolean;
  irrigationMethod: IrrigationMethod;
  irrigationEnergy: IrrigationEnergy;
  residue: Residue;
};

export type PesticideEntryForm = {
  pesticide_id: string;
  rate: string;
};

export type CropForm = {
  crop_id: number;
  area: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  manure: string;
  compost?: string;
  greenManure?: string;
  diesel: string;
  irrigation: string;
  yield?: string;
  bioPest?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  scheduleMode?: 'annual' | 'monthly';
  schedule?: {
    fertilizer: number[];
    pesticide: number[];
    irrigation: number[];
  };
  pesticides: PesticideEntryForm[];
};

export type FarmForm = {
  totalArea: string;
  dairyCows: string;
  pigs: string;
  chickens: string;
  crops: CropForm[];
};

// Storage-specific types
export interface FarmProfile {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  data: FarmForm;
  practices: CropPractice[];
  metadata?: {
    region?: string;
    farmType?: string;
    notes?: string;
  };
}

export interface CalculationHistory {
  id: string;
  timestamp: Date;
  farmName?: string;
  data: FarmForm;
  practices: CropPractice[];
  results: any; // EmissionResults from calculation-core
  metadata?: {
    version: string;
    customFactors?: boolean;
  };
}

export interface UserSettings {
  theme: Theme;
  language: Lang;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  autoSaveInterval: number; // seconds
  region: string;
  showTutorial: boolean;
  analyticsEnabled: boolean;
}

export interface Draft {
  timestamp: Date;
  data: FarmForm;
  practices: CropPractice[];
}

export interface QuotaInfo {
  used: number;
  available: number;
}
