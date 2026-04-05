export type Crop = {
  name: string;
  n_rate: number;
  p_rate: number;
  k_rate: number;
  irrigation: number;
  yield: number;
};

export type Pesticide = {
  trade_name: string;
  substance: string;
  type: string;
  ef: number;
};

export type CropData = {
  crop_id: number;
  area: number;
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  manure_kg_ha: number;
  diesel_l_ha: number;
  irrigation_mm: number;
  pesticide_rate: number;
  pesticide_id: number;
};

export type FarmData = {
  total_farm_size: number;
  num_crops: number;
  crops: CropData[];
  dairy_cows: number;
  pigs: number;
  chickens: number;
};

export type LegacyFarmData = {
  farm_size: number;
  crop_type: string;
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  manure_kg_ha: number;
  diesel_l_ha: number;
  irrigation_mm: number;
  dairy_cows: number;
  pigs: number;
  chickens: number;
};

export type CropEmissionResults = {
  crop_id: number;
  area: number;
  fertilizer_emissions: number;
  manure_emissions: number;
  fuel_emissions: number;
  irrigation_emissions: number;
  pesticide_emissions: number;
  livestock_emissions: number;
  total_emissions: number;
};

export type EmissionResults = {
  fertilizer_emissions: number;
  manure_emissions: number;
  fuel_emissions: number;
  irrigation_emissions: number;
  pesticide_emissions: number;
  livestock_emissions: number;
  total_emissions: number;
  per_hectare_emissions: number;
  num_crops: number;
  crop_results: CropEmissionResults[];
};
