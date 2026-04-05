import { crops, pesticides } from "./data";
import type { FarmData, LegacyFarmData } from "./types";

export const LIVESTOCK_LIMITS = {
  dairy_cows: 10000,
  pigs: 50000,
  chickens: 1000000
} as const;

export function validateLivestockCounts(farm: Pick<FarmData, "dairy_cows" | "pigs" | "chickens">): string[] {
  const errors: string[] = [];

  if (farm.dairy_cows < 0 || farm.dairy_cows > LIVESTOCK_LIMITS.dairy_cows) {
    errors.push("Number of dairy cows must be between 0 and 10,000");
  }
  if (farm.pigs < 0 || farm.pigs > LIVESTOCK_LIMITS.pigs) {
    errors.push("Number of pigs must be between 0 and 50,000");
  }
  if (farm.chickens < 0 || farm.chickens > LIVESTOCK_LIMITS.chickens) {
    errors.push("Number of chickens must be between 0 and 1,000,000");
  }

  return errors;
}

export function validateInput(farm: FarmData): string[] {
  const errors: string[] = [];

  if (farm.total_farm_size <= 0 || farm.total_farm_size > 100000) {
    errors.push("Total farm size must be greater than 0 and less than 100,000 hectares");
  }

  if (farm.num_crops <= 0 || farm.num_crops > 10) {
    errors.push("Number of crops must be between 1 and 10");
  }

  let totalCropArea = 0;

  for (let i = 0; i < farm.num_crops; i += 1) {
    const crop = farm.crops[i];
    if (!crop) {
      errors.push(`Missing crop data for crop ${i + 1}`);
      continue;
    }

    if (crop.crop_id < 0 || crop.crop_id >= crops.length) {
      errors.push(`Invalid crop ID ${crop.crop_id} for crop ${i + 1}`);
    }

    if (crop.area < 0 || crop.area > 50000) {
      errors.push(`Crop ${i + 1} area must be between 0 and 50,000 hectares`);
    }
    totalCropArea += crop.area;

    if (crop.nitrogen_kg_ha < 0 || crop.nitrogen_kg_ha > 1000) {
      errors.push(`Crop ${i + 1} nitrogen must be between 0 and 1,000 kg/ha`);
    }
    if (crop.phosphorus_kg_ha < 0 || crop.phosphorus_kg_ha > 500) {
      errors.push(`Crop ${i + 1} phosphorus must be between 0 and 500 kg/ha`);
    }
    if (crop.potassium_kg_ha < 0 || crop.potassium_kg_ha > 500) {
      errors.push(`Crop ${i + 1} potassium must be between 0 and 500 kg/ha`);
    }
    if (crop.manure_kg_ha < 0 || crop.manure_kg_ha > 50000) {
      errors.push(`Crop ${i + 1} manure must be between 0 and 50,000 kg/ha`);
    }
    if (crop.diesel_l_ha < 0 || crop.diesel_l_ha > 1000) {
      errors.push(`Crop ${i + 1} diesel must be between 0 and 1,000 L/ha`);
    }
    if (crop.irrigation_mm < 0 || crop.irrigation_mm > 2000) {
      errors.push(`Crop ${i + 1} irrigation must be between 0 and 2,000 mm`);
    }
    if (crop.pesticide_id >= pesticides.length) {
      errors.push(`Invalid pesticide ID ${crop.pesticide_id} for crop ${i + 1}`);
    }
    if (crop.pesticide_rate < 0 || crop.pesticide_rate > 100) {
      errors.push(`Crop ${i + 1} pesticide rate must be between 0 and 100 kg/ha`);
    }
  }

  if (totalCropArea > farm.total_farm_size * 1.01) {
    errors.push(`Total crop area (${totalCropArea.toFixed(1)} ha) exceeds farm size (${farm.total_farm_size.toFixed(1)} ha)`);
  }

  errors.push(...validateLivestockCounts(farm));

  return errors;
}

export function validateLegacyInput(farm: LegacyFarmData): string[] {
  const errors: string[] = [];

  if (farm.farm_size <= 0 || farm.farm_size > 100000) {
    errors.push("Farm size must be greater than 0 and less than 100,000 hectares");
  }

  const cropExists = crops.some((crop) => crop.name.toLowerCase() === farm.crop_type.toLowerCase());
  if (!cropExists) {
    errors.push(`Invalid crop type '${farm.crop_type}'`);
  }

  if (farm.nitrogen_kg_ha < 0 || farm.nitrogen_kg_ha > 1000) {
    errors.push("Nitrogen fertilizer must be between 0 and 1,000 kg/ha");
  }
  if (farm.phosphorus_kg_ha < 0 || farm.phosphorus_kg_ha > 500) {
    errors.push("Phosphorus fertilizer must be between 0 and 500 kg/ha");
  }
  if (farm.potassium_kg_ha < 0 || farm.potassium_kg_ha > 500) {
    errors.push("Potassium fertilizer must be between 0 and 500 kg/ha");
  }
  if (farm.manure_kg_ha < 0 || farm.manure_kg_ha > 50000) {
    errors.push("Manure application must be between 0 and 50,000 kg/ha");
  }
  if (farm.diesel_l_ha < 0 || farm.diesel_l_ha > 1000) {
    errors.push("Diesel consumption must be between 0 and 1,000 L/ha");
  }
  if (farm.irrigation_mm < 0 || farm.irrigation_mm > 2000) {
    errors.push("Irrigation water must be between 0 and 2,000 mm");
  }
  errors.push(...validateLivestockCounts(farm));

  return errors;
}
