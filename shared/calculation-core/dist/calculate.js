import { CHICKEN_FACTOR, COW_FACTOR, DIESEL_FACTOR, IRRIGATION_FACTOR, MANURE_FACTOR, NITROGEN_FACTOR, PHOSPHORUS_FACTOR, PIG_FACTOR, POTASSIUM_FACTOR } from "./constants";
import { pesticides } from "./data";
function baseResults() {
    return {
        fertilizer_emissions: 0,
        manure_emissions: 0,
        fuel_emissions: 0,
        irrigation_emissions: 0,
        pesticide_emissions: 0,
        livestock_emissions: 0,
        total_emissions: 0,
        per_hectare_emissions: 0,
        num_crops: 0,
        crop_results: []
    };
}
export function calculateEmissions(farm) {
    const results = baseResults();
    const cowEmissions = (farm.dairy_cows * COW_FACTOR) / 1000.0;
    const pigEmissions = (farm.pigs * PIG_FACTOR) / 1000.0;
    const chickenEmissions = (farm.chickens * CHICKEN_FACTOR) / 1000.0;
    results.livestock_emissions = cowEmissions + pigEmissions + chickenEmissions;
    results.num_crops = farm.num_crops;
    let totalCropArea = 0.0;
    for (let i = 0; i < farm.num_crops; i += 1) {
        totalCropArea += farm.crops[i].area;
    }
    for (let i = 0; i < farm.num_crops; i += 1) {
        const crop = farm.crops[i];
        const nitrogenEmissions = (crop.nitrogen_kg_ha * crop.area * NITROGEN_FACTOR) / 1000.0;
        const phosphorusEmissions = (crop.phosphorus_kg_ha * crop.area * PHOSPHORUS_FACTOR) / 1000.0;
        const potassiumEmissions = (crop.potassium_kg_ha * crop.area * POTASSIUM_FACTOR) / 1000.0;
        const fertilizerEmissions = nitrogenEmissions + phosphorusEmissions + potassiumEmissions;
        const manureEmissions = (crop.manure_kg_ha * crop.area * MANURE_FACTOR) / 1000.0;
        const fuelEmissions = (crop.diesel_l_ha * crop.area * DIESEL_FACTOR) / 1000.0;
        const irrigationM3Ha = crop.irrigation_mm * 10.0;
        const irrigationEmissions = (irrigationM3Ha * crop.area * IRRIGATION_FACTOR) / 1000.0;
        let pesticideEmissions = 0.0;
        if (crop.pesticide_id >= 0 && crop.pesticide_rate > 0) {
            pesticideEmissions =
                (crop.pesticide_rate * crop.area * pesticides[crop.pesticide_id].ef) / 1000.0;
        }
        const livestockEmissions = totalCropArea > 0 ? results.livestock_emissions * (crop.area / totalCropArea) : 0.0;
        const totalEmissions = fertilizerEmissions +
            manureEmissions +
            fuelEmissions +
            irrigationEmissions +
            pesticideEmissions +
            livestockEmissions;
        const cropResult = {
            crop_id: crop.crop_id,
            area: crop.area,
            fertilizer_emissions: fertilizerEmissions,
            manure_emissions: manureEmissions,
            fuel_emissions: fuelEmissions,
            irrigation_emissions: irrigationEmissions,
            pesticide_emissions: pesticideEmissions,
            livestock_emissions: livestockEmissions,
            total_emissions: totalEmissions
        };
        results.crop_results.push(cropResult);
        results.fertilizer_emissions += fertilizerEmissions;
        results.manure_emissions += manureEmissions;
        results.fuel_emissions += fuelEmissions;
        results.irrigation_emissions += irrigationEmissions;
        results.pesticide_emissions += pesticideEmissions;
    }
    results.total_emissions =
        results.fertilizer_emissions +
            results.manure_emissions +
            results.fuel_emissions +
            results.irrigation_emissions +
            results.pesticide_emissions +
            results.livestock_emissions;
    results.per_hectare_emissions =
        farm.total_farm_size > 0 ? results.total_emissions / farm.total_farm_size : 0;
    return results;
}
export function calculateLegacyEmissions(farm) {
    const results = baseResults();
    const nitrogenEmissions = (farm.nitrogen_kg_ha * farm.farm_size * NITROGEN_FACTOR) / 1000.0;
    const phosphorusEmissions = (farm.phosphorus_kg_ha * farm.farm_size * PHOSPHORUS_FACTOR) / 1000.0;
    const potassiumEmissions = (farm.potassium_kg_ha * farm.farm_size * POTASSIUM_FACTOR) / 1000.0;
    results.fertilizer_emissions = nitrogenEmissions + phosphorusEmissions + potassiumEmissions;
    results.manure_emissions = (farm.manure_kg_ha * farm.farm_size * MANURE_FACTOR) / 1000.0;
    results.fuel_emissions = (farm.diesel_l_ha * farm.farm_size * DIESEL_FACTOR) / 1000.0;
    const irrigationM3Ha = farm.irrigation_mm * 10.0;
    results.irrigation_emissions = (irrigationM3Ha * farm.farm_size * IRRIGATION_FACTOR) / 1000.0;
    const cowEmissions = (farm.dairy_cows * COW_FACTOR) / 1000.0;
    const pigEmissions = (farm.pigs * PIG_FACTOR) / 1000.0;
    const chickenEmissions = (farm.chickens * CHICKEN_FACTOR) / 1000.0;
    results.livestock_emissions = cowEmissions + pigEmissions + chickenEmissions;
    results.total_emissions =
        results.fertilizer_emissions +
            results.manure_emissions +
            results.fuel_emissions +
            results.irrigation_emissions +
            results.pesticide_emissions +
            results.livestock_emissions;
    results.per_hectare_emissions = results.total_emissions / farm.farm_size;
    results.num_crops = 0;
    return results;
}
