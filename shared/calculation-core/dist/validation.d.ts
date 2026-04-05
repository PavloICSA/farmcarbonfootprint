import type { FarmData, LegacyFarmData } from "./types";
export declare const LIVESTOCK_LIMITS: {
    readonly dairy_cows: 10000;
    readonly pigs: 50000;
    readonly chickens: 1000000;
};
export declare function validateLivestockCounts(farm: Pick<FarmData, "dairy_cows" | "pigs" | "chickens">): string[];
export declare function validateInput(farm: FarmData): string[];
export declare function validateLegacyInput(farm: LegacyFarmData): string[];
