import { Suspense, lazy, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  calculateEmissions,
  crops,
  pesticides,
  validateInput,
  validateLivestockCounts,
  type EmissionResults,
  type FarmData
} from "../../shared/calculation-core/src";
import {
  NITROGEN_FACTOR,
  PHOSPHORUS_FACTOR,
  POTASSIUM_FACTOR,
  DIESEL_FACTOR,
  IRRIGATION_FACTOR,
  COW_FACTOR,
  PIG_FACTOR,
  CHICKEN_FACTOR
} from "../../shared/calculation-core/src/constants";
import { useDraftAutoSave, useDraftRecovery } from "./hooks/useDraftAutoSave";
import { DraftRecoveryNotification } from "./components/DraftRecoveryNotification";
import { FeatureErrorBoundary } from "./components/FeatureErrorBoundary";
import type { PieChartData } from "./components/EmissionPieChart";
import type { EmissionTrendPoint } from "./components/EmissionTrendChart";
import {
  storageManager,
  generateId,
  downloadResultsAsCSV,
  profileManager,
  generateCSVFromRows,
  downloadCSV,
  parseCSVFile,
  createCSVTemplate,
  fuzzyMatchCropName
} from "./lib";
import type { CalculationHistory } from "./types/storage";
import { buildCropComparisonChartData, buildEmissionPieChartData, buildEmissionTrendPoints, buildPracticeHeatMapRows } from "./lib/chart-data";

type Lang = "en" | "ua";
type Theme = "dark" | "light";
type Tillage =
  | "moldboard_plowing"
  | "disk_tillage"
  | "chisel_tillage"
  | "strip_till"
  | "ridge_till"
  | "no_till";
type IrrigationEnergy = "grid" | "diesel_pump" | "solar";
type IrrigationMethod =
  | "none"
  | "furrow_surface"
  | "basin_flood"
  | "sprinkler"
  | "center_pivot"
  | "drip"
  | "subsurface_drip";
type Residue = "incorporate" | "retain" | "burn";
type WhatIfTillageOption = "current" | Tillage;
type WhatIfIrrigationOption = "current" | IrrigationMethod;
type WhatIfCoverOption = "current" | "off" | "on";
type PracticeComparison = {
  before: EmissionResults;
  after: EmissionResults;
  pinned: boolean;
};
type ProjectionRates = {
  fertilizer: number;
  manure: number;
  fuel: number;
  irrigation: number;
  pesticide: number;
  livestock: number;
};
type ProjectionPoint = {
  year: number;
  fertilizer: number;
  manure: number;
  fuel: number;
  irrigation: number;
  pesticide: number;
  livestock: number;
  total: number;
};
type RecommendationItem = {
  id: "no_till" | "precision" | "irrigation" | "cover";
  title: string;
  description: string;
  impact: number;
  impactPercent: number;
  implemented: boolean;
};
type ActionPlanItem = RecommendationItem & {
  difficulty: "low" | "medium" | "high";
  cost: "low" | "medium" | "high";
  timeline: "now" | "season" | "next";
};
type RecommendationDetailMeta = {
  difficulty: ActionPlanItem["difficulty"];
  cost: ActionPlanItem["cost"];
  timeline: ActionPlanItem["timeline"];
  applied: boolean;
};
type FarmTemplate = {
  id: string;
  name: string;
  description: string;
  form: FarmForm;
  practices: CropPractice[];
};
type SampleCalculation = {
  name: string;
  notes: string;
  form: FarmForm;
  practices: CropPractice[];
  results: EmissionResults;
};
type SampleSnapshot = {
  form: FarmForm;
  practices: CropPractice[];
  results: EmissionResults | null;
  animalBreakdown: AnimalBreakdown | null;
  calculationDate: Date | null;
  organicMode: boolean;
  settingsRegion: string;
  lastCalcForm: FarmForm | null;
  lastCalcPractices: CropPractice[] | null;
  errors: string[];
};
type CustomFactors = {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  diesel: number;
  electricity: number;
  livestock: number;
};
type ClimateZoneKey = "arid" | "semi_arid" | "temperate" | "humid" | "tropical";
type EquipmentEntry = {
  id: string;
  name: string;
  type: "tractor" | "combine" | "irrigation_pump" | "sprayer" | "sprinkler_system" | "seed_drill" | "planter" | "harvester" | "other";
  fuel: "diesel" | "electric";
  hours: number;
  rate: number;
};
type GoalSetting = {
  mode: "absolute" | "percent";
  value: number;
};
type MonthlySchedule = {
  fertilizer: number[];
  pesticide: number[];
  irrigation: number[];
};
type AnalyticsState = {
  enabled: boolean;
  events: Record<string, number>;
  lastEventAt?: string;
};

const EmissionPieChart = lazy(() => import("./components/EmissionPieChart"));
const CropComparisonChart = lazy(() => import("./components/CropComparisonChart"));
const EmissionTrendChart = lazy(() => import("./components/EmissionTrendChart"));
const PracticeHeatMap = lazy(() => import("./components/PracticeHeatMap"));
type ToastKind = "success" | "error" | "warning" | "info";
type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
  sticky?: boolean;
};
type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
} | null;
type AutoField = "nitrogen" | "phosphorus" | "potassium" | "irrigation";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type CropPractice = {
  tillage: Tillage;
  precisionFertilization: boolean;
  coverCrop: boolean;
  irrigationMethod: IrrigationMethod;
  irrigationEnergy: IrrigationEnergy;
  residue: Residue;
};

type PesticideEntryForm = {
  pesticide_id: string;
  rate: string;
};

type CropForm = {
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
  season?: "spring" | "summer" | "fall" | "winter";
  scheduleMode?: "annual" | "monthly";
  schedule?: MonthlySchedule;
  pesticides: PesticideEntryForm[];
};

type FarmForm = {
  totalArea: string;
  dairyCows: string;
  pigs: string;
  chickens: string;
  crops: CropForm[];
};

type AnimalBreakdown = {
  livestock: number;
  poultry: number;
};

type IconName =
  | "farm"
  | "crops"
  | "practices"
  | "review"
  | "results"
  | "breakdown"
  | "footprint"
  | "perha"
  | "fertilizer"
  | "manure"
  | "fuel"
  | "irrigation"
  | "pesticide"
  | "poultry"
  | "sun"
  | "moon"
  | "plus"
  | "back"
  | "next"
  | "calc"
  | "clear"
  | "reset"
  | "livestock"
  | "info"
  | "menu";

type Dict = {
  appTitle: string;
  appSubtitle: string;
  questionnaire: string;
  results: string;
  history: string;
  historySearch: string;
  historyFrom: string;
  historyTo: string;
  historyEmpty: string;
  historyLoad: string;
  historyDelete: string;
  historyExport: string;
  historyDeleteSelected: string;
  historyFarm: string;
  historyDate: string;
  historyTotal: string;
  historyPerHa: string;
  comparison: string;
  scenarioA: string;
  scenarioB: string;
  selectScenario: string;
  delta: string;
  noComparisonData: string;
  beforeAfterTitle: string;
  beforeLabel: string;
  afterLabel: string;
  changeLabel: string;
  pin: string;
  unpin: string;
  recommendationsTitle: string;
  recommendationApply: string;
  recommendationImplemented: string;
  recommendationImpact: string;
  recommendationNone: string;
  recNoTillTitle: string;
  recNoTillDesc: string;
  recPrecisionTitle: string;
  recPrecisionDesc: string;
  recIrrigationTitle: string;
  recIrrigationDesc: string;
  recCoverTitle: string;
  recCoverDesc: string;
  actionPlanTitle: string;
  actionPlanExport: string;
  actionPlanNoData: string;
  actionPlanDifficulty: string;
  actionPlanCost: string;
  actionPlanTimeline: string;
  difficultyLow: string;
  difficultyMedium: string;
  difficultyHigh: string;
  costLow: string;
  costMedium: string;
  costHigh: string;
  timelineNow: string;
  timelineSeason: string;
  timelineNextYear: string;
  shortcutsTitle: string;
  shortcutsOpen: string;
  shortcutsClose: string;
  shortcutsHint: string;
  shortcutSave: string;
  shortcutExport: string;
  shortcutCalculate: string;
  shortcutNewCrop: string;
  shortcutDuplicateCrop: string;
  shortcutHelp: string;
  shortcutSavePrompt: string;
  shortcutSaveSuccess: string;
  shortcutSaveError: string;
  projectionTitle: string;
  projectionYears: string;
  projectionRates: string;
  projectionCumulative: string;
  projectionExport: string;
  projectionYearLabel: string;
  whatIfTitle: string;
  whatIfNitrogen: string;
  whatIfTillage: string;
  whatIfIrrigation: string;
  whatIfCover: string;
  whatIfCurrent: string;
  whatIfResults: string;
  whatIfReset: string;
  whatIfTillageHint: string;
  whatIfScenarioName: string;
  whatIfScenarioPlaceholder: string;
  whatIfSave: string;
  whatIfSaved: string;
  whatIfNameRequired: string;
  whatIfSaveError: string;
  farmArea: string;
  cropsTitle: string;
  addCrop: string;
  remove: string;
  crop: string;
  area: string;
  useDefaults: string;
  nRate: string;
  pRate: string;
  kRate: string;
  manure: string;
  diesel: string;
  irrigation: string;
  pesticides: string;
  addPesticide: string;
  noPesticide: string;
  pesticideRate: string;
  practices: string;
  tillage: string;
  precision: string;
  coverCrop: string;
  irrigationMethod: string;
  irrigationEnergy: string;
  organicMode: string;
  organicHelp: string;
  compost: string;
  greenManure: string;
  bioPest: string;
  cropYield: string;
  season: string;
  seasonSpring: string;
  seasonSummer: string;
  seasonFall: string;
  seasonWinter: string;
  seasonalAnalysis: string;
  seasonalTop: string;
  residue: string;
  livestock: string;
  cows: string;
  pigs: string;
  chickens: string;
  calculate: string;
  resetInputs: string;
  clearResults: string;
  switchToLight: string;
  switchToDark: string;
  formProgress: string;
  wizardMode: string;
  advancedMode: string;
  stepFarm: string;
  stepCrops: string;
  stepPractices: string;
  stepReview: string;
  nextStep: string;
  prevStep: string;
  errorsTitle: string;
  areaMismatch: string;
  zeroAreaNeedsAnimals: string;
  zeroAreaNoCrops: string;
  emptyState: string;
  loading: string;
  total: string;
  perHectare: string;
  breakdown: string;
  cropBreakdown: string;
  carbonIntensity: string;
  uncertaintyTitle: string;
  uncertaintyNote: string;
  grossEmissions: string;
  netEmissions: string;
  sequestrationTitle: string;
  sequestrationHelp: string;
  benchmarkTitle: string;
  benchmarkRegion: string;
  benchmarkFarmType: string;
  benchmarkDisclaimer: string;
  benchmarkDiff: string;
  costBenefitTitle: string;
  costBenefitDisclaimer: string;
  costBenefitCost: string;
  costBenefitSavings: string;
  costBenefitPayback: string;
  regionGlobal: string;
  regionNorthAmerica: string;
  regionEurope: string;
  regionUkraine: string;
  regionAsia: string;
  regionSouthAmerica: string;
  regionAfrica: string;
  regionAustralia: string;
  carbonCreditTitle: string;
  carbonCreditBaseline: string;
  carbonCreditPrice: string;
  carbonCreditEligible: string;
  carbonCreditDisclaimer: string;
  carbonCreditValue: string;
  templatesTitle: string;
  templatesApply: string;
  templatesRegion: string;
  examplesOpen: string;
  menuLabel: string;
  menuOpen: string;
  menuClose: string;
  examplesTitle: string;
  examplesUse: string;
  examplesCopy: string;
  examplesClose: string;
  sampleMode: string;
  sampleExit: string;
  sampleExitConfirm: string;
  importLastYear: string;
  importLastYearHint: string;
  trendTitle: string;
  trendUp: string;
  trendDown: string;
  trendFlat: string;
  comparisonTableTitle: string;
  comparisonSelectHint: string;
  comparisonExport: string;
  comparisonLimit: string;
  dashboardOpen: string;
  dashboardTitle: string;
  dashboardNoData: string;
  dashboardTotal: string;
  dashboardAverage: string;
  dashboardLowest: string;
  dashboardHighest: string;
  dashboardTrend: string;
  dashboardRange: string;
  batchModeOpen: string;
  batchModeTitle: string;
  batchModeTemplate: string;
  batchModeUpload: string;
  batchModeSummary: string;
  batchModeExport: string;
  batchModeClear: string;
  batchModeHint: string;
  batchModeNoData: string;
  goalTitle: string;
  goalModePercent: string;
  goalModeAbsolute: string;
  goalTarget: string;
  goalProgress: string;
  goalRemaining: string;
  goalAchieved: string;
  customFactorsTitle: string;
  customFactorsEnable: string;
  customFactorsReset: string;
  customFactorsHint: string;
  customFactorsActive: string;
  schedulingTitle: string;
  schedulingToggle: string;
  scheduleFertilizer: string;
  schedulePesticide: string;
  scheduleIrrigation: string;
  weatherTitle: string;
  weatherZone: string;
  weatherTemp: string;
  weatherPrecip: string;
  weatherIrrigationFactor: string;
  weatherHint: string;
  rotationOpen: string;
  rotationTitle: string;
  rotationDescription: string;
  rotationAddYear: string;
  rotationAverage: string;
  equipmentTitle: string;
  equipmentAdd: string;
  equipmentName: string;
  equipmentType: string;
  equipmentFuel: string;
  equipmentHours: string;
  equipmentRate: string;
  equipmentEmissions: string;
  equipmentHint: string;
  equipmentHelpTitle: string;
  equipmentHoursHelp: string;
  equipmentRateHelp: string;
  equipmentTypeTractor: string;
  equipmentTypeCombine: string;
  equipmentTypeIrrigationPump: string;
  equipmentTypeSprayer: string;
  equipmentTypeSprinkler: string;
  equipmentTypeSeedDrill: string;
  equipmentTypePlanter: string;
  equipmentTypeHarvester: string;
  equipmentTypeOther: string;
  fuelDiesel: string;
  fuelElectric: string;
  analyticsTitle: string;
  analyticsEnabled: string;
  analyticsOptOut: string;
  analyticsReset: string;
  analyticsEvents: string;
  recommendationStatus: string;
  recommendationNotes: string;
  recommendationPlanned: string;
  recommendationNotApplicable: string;
  recommendationFilterImplemented: string;
  recommendationProgress: string;
  recommendationHelp: string;
  recommendationNotesHelp: string;
  actionPlanSelectHelp: string;
  recommendationStatusHelp: string;
  impact: string;
  recommendation: string;
  disclaimer: string;
  fertilizer: string;
  manureCat: string;
  fuel: string;
  irrigationCat: string;
  pesticideCat: string;
  livestockCat: string;
  poultryCat: string;
  helpFarmArea: string;
  helpCows: string;
  helpPigs: string;
  helpChickens: string;
  helpCropArea: string;
  helpNitrogen: string;
  helpPhosphorus: string;
  helpPotassium: string;
  helpManure: string;
  helpDiesel: string;
  helpIrrigation: string;
  helpPesticides: string;
  helpTillage: string;
  helpPrecision: string;
  helpCover: string;
  helpIrrigationMethod: string;
  helpIrrigationEnergy: string;
  helpResidue: string;
  collapse: string;
  expand: string;
  summaryCrops: string;
  summaryPractices: string;
  summaryLivestock: string;
  cropSearch: string;
  cropSearchPlaceholder: string;
  cropNoResults: string;
  pesticideSearch: string;
  pesticideSearchPlaceholder: string;
  pesticideNoResults: string;
  copyCrop: string;
  copyLastCrop: string;
  autoArea: string;
  autoAreaCalc: string;
  autoAreaMode: string;
  resetDefaults: string;
  autoBadge: string;
  highContrastOn: string;
  highContrastOff: string;
  fontSizeTitle: string;
  fontSizeSmall: string;
  fontSizeMedium: string;
  fontSizeLarge: string;
  fontSizeXL: string;
  installApp: string;
  installReady: string;
  installGuidelinesTitle: string;
  installGuidelinesIntro: string;
  installGuidelinesPros: string;
  installGuidelinesCons: string;
  installGuidelinesDesktop: string;
  installGuidelinesAndroid: string;
  installGuidelinesIOS: string;
  installGuideOpen: string;
  installNotAvailable: string;
  footerTitle: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerTerms: string;
  footerOtherProducts: string;
  privacyTitle: string;
  privacyBody1: string;
  privacyBody2: string;
  privacyBody3: string;
  termsTitle: string;
  termsBody1: string;
  termsBody2: string;
  termsBody3: string;
  offline: string;
  online: string;
  settingsTitle: string;
  settingsOpen: string;
  settingsClose: string;
  settingsLanguage: string;
  settingsTheme: string;
  settingsContrast: string;
  settingsFont: string;
  settingsRegion: string;
  settingsAutoSave: string;
  settingsStorage: string;
  settingsReset: string;
  settingsClear: string;
  settingsConfirmClear: string;
  toastSaved: string;
  toastExported: string;
  toastError: string;
  toastDraftRecovered: string;
  toastDraftDiscarded: string;
  toastCopied: string;
  toastInvalid: string;
  toastResultsCleared: string;
  confirmTitle: string;
  confirmYes: string;
  confirmNo: string;
  confirmDelete: string;
  confirmDeleteSelected: string;
  confirmClearAll: string;
  tutorialTitle: string;
  tutorialOpen: string;
  tutorialNext: string;
  tutorialBack: string;
  tutorialFinish: string;
  tutorialSkip: string;
  tutorialStep1: string;
  tutorialStep2: string;
  tutorialStep3: string;
  tutorialStep4: string;
  tutorialStep5: string;
  tutorialStep6: string;
  tutorialStep7: string;
  tutorialStep8: string;
  helpTitle: string;
  helpOpen: string;
  helpClose: string;
  helpStep1: string;
  helpStep2: string;
  helpStep3: string;
  docsTitle: string;
  docsFaq1Q: string;
  docsFaq1A: string;
  docsFaq2Q: string;
  docsFaq2A: string;
  dataSourcesTitle: string;
  dataSourcesExport: string;
  dataSourcesIntro: string;
  developerInfoTitle: string;
  developerInfoOpen: string;
  developerInfoRole: string;
  developerInfoOrg: string;
  developerInfoPhone: string;
  developerInfoEmail: string;
  developerInfoEmailLabel: string;
  developerInfoEmailSend: string;
  backToForm: string;
  exportReportTxt: string;
  exportChartsPng: string;
  downloadChartPng: string;
  exportActionPlanTxt: string;
  exportRotationTxt: string;
  versionLabel: string;
  changelogTitle: string;
  changelogItem1: string;
  changelogItem2: string;
  compatTitle: string;
  compatIssue: string;
};

const dict: Record<Lang, Dict> = {
  en: {
    appTitle: "What carbon footprint does my farm actually have?",
    appSubtitle: "Fill in your real farm setup and field practices to get a practical footprint estimate.",
    questionnaire: "Farm Questionnaire",
    results: "Farm Footprint Results",
    history: "Calculation history",
    historySearch: "Search by farm name",
    historyFrom: "From date",
    historyTo: "To date",
    historyEmpty: "No history yet. Run a calculation to save it here.",
    historyLoad: "Load",
    historyDelete: "Delete",
    historyExport: "Export",
    historyDeleteSelected: "Delete selected",
    historyFarm: "Farm",
    historyDate: "Date",
    historyTotal: "Total",
    historyPerHa: "Per hectare",
    comparison: "Scenario comparison",
    scenarioA: "Scenario A",
    scenarioB: "Scenario B",
    selectScenario: "Select a saved calculation",
    delta: "Delta",
    noComparisonData: "Select two calculations to compare.",
    beforeAfterTitle: "Practice change impact",
    beforeLabel: "Before",
    afterLabel: "After",
    changeLabel: "Change",
    pin: "Pin",
    unpin: "Unpin",
    recommendationsTitle: "Recommendations",
    recommendationApply: "Apply",
    recommendationImplemented: "Implemented",
    recommendationImpact: "Potential reduction",
    recommendationNone: "No recommendations at the moment.",
    recNoTillTitle: "Adopt no-till where possible",
    recNoTillDesc: "Switching to no-till lowers fuel and field operations emissions.",
    recPrecisionTitle: "Enable precision fertilization",
    recPrecisionDesc: "Targeted application reduces fertilizer-related emissions.",
    recIrrigationTitle: "Improve irrigation efficiency",
    recIrrigationDesc: "Shift to efficient irrigation (drip/SDI) to cut energy and water use.",
    recCoverTitle: "Introduce cover crops",
    recCoverDesc: "Cover crops reduce fertilizer losses and improve soil health.",
    actionPlanTitle: "Action plan",
    actionPlanExport: "Export action plan (TXT)",
    actionPlanNoData: "No recommendations to build an action plan yet.",
    actionPlanDifficulty: "Difficulty",
    actionPlanCost: "Cost impact",
    actionPlanTimeline: "Timeline",
    difficultyLow: "Low",
    difficultyMedium: "Medium",
    difficultyHigh: "High",
    costLow: "Low",
    costMedium: "Medium",
    costHigh: "High",
    timelineNow: "Immediate",
    timelineSeason: "This season",
    timelineNextYear: "Next year",
    shortcutsTitle: "Keyboard shortcuts",
    shortcutsOpen: "Shortcuts",
    shortcutsClose: "Close",
    shortcutsHint: "Use Ctrl on Windows/Linux or Cmd on macOS.",
    shortcutSave: "Save profile",
    shortcutExport: "Export CSV",
    shortcutCalculate: "Calculate",
    shortcutNewCrop: "New crop",
    shortcutDuplicateCrop: "Duplicate crop",
    shortcutHelp: "Toggle shortcuts",
    shortcutSavePrompt: "Profile name",
    shortcutSaveSuccess: "Profile saved.",
    shortcutSaveError: "Could not save profile.",
    projectionTitle: "Multi-year emission projections",
    projectionYears: "Projection period (years)",
    projectionRates: "Annual improvement rates (%)",
    projectionCumulative: "Cumulative total",
    projectionExport: "Export projection CSV",
    projectionYearLabel: "Year",
    whatIfTitle: "What-if calculator",
    whatIfNitrogen: "Nitrogen rate",
    whatIfTillage: "Tillage type",
    whatIfIrrigation: "Irrigation method",
    whatIfCover: "Cover crop usage",
    whatIfCurrent: "Current (per-crop)",
    whatIfResults: "What-if results",
    whatIfReset: "Reset",
    whatIfTillageHint: "Affects fuel emissions; set Diesel > 0 to see impact.",
    whatIfScenarioName: "Scenario name",
    whatIfScenarioPlaceholder: "e.g., Low till + drip",
    whatIfSave: "Save scenario",
    whatIfSaved: "Scenario saved to history and profiles.",
    whatIfNameRequired: "Enter a scenario name to save.",
    whatIfSaveError: "Could not save scenario.",
    farmArea: "Total farm area (ha)",
    cropsTitle: "Crops and inputs",
    addCrop: "Add crop",
    remove: "Remove",
    crop: "Crop",
    area: "Area (ha)",
    useDefaults: "Apply default crop rates",
    nRate: "Nitrogen (kg/ha)",
    pRate: "Phosphorus (kg/ha)",
    kRate: "Potassium (kg/ha)",
    manure: "Manure (t/ha)",
    diesel: "Diesel (L/ha)",
    irrigation: "Irrigation (mm)",
    pesticides: "Pesticides",
    addPesticide: "Add pesticide",
    noPesticide: "No pesticide",
    pesticideRate: "Rate (kg a.i./ha)",
    practices: "Field practice options",
    tillage: "Tillage",
    precision: "Precision fertilization",
    coverCrop: "Cover crop used",
    irrigationMethod: "Irrigation method",
    irrigationEnergy: "Irrigation energy source",
    organicMode: "Organic farm mode",
    organicHelp: "Hide synthetic inputs and use organic-specific factors.",
    compost: "Compost (t/ha)",
    greenManure: "Green manure (kg/ha N eq.)",
    bioPest: "Biological pest control (kg a.i./ha)",
    cropYield: "Yield (t/ha)",
    season: "Season",
    seasonSpring: "Spring",
    seasonSummer: "Summer",
    seasonFall: "Fall",
    seasonWinter: "Winter",
    seasonalAnalysis: "Seasonal analysis",
    seasonalTop: "Highest-emission season",
    residue: "Residue management",
    livestock: "Livestock",
    cows: "Dairy cows",
    pigs: "Pigs",
    chickens: "Chickens",
    calculate: "Calculate footprint",
    resetInputs: "Reset inputs",
    clearResults: "Clear results",
    switchToLight: "Light mode",
    switchToDark: "Dark mode",
    formProgress: "Form completion",
    wizardMode: "Wizard",
    advancedMode: "Advanced",
    stepFarm: "Farm",
    stepCrops: "Crops",
    stepPractices: "Practices",
    stepReview: "Review",
    nextStep: "Next",
    prevStep: "Back",
    errorsTitle: "Please fix these fields:",
    areaMismatch: "Total crop area must exactly equal total farm area.",
    zeroAreaNeedsAnimals: "If total farm area is 0, enter at least one livestock value (cows, pigs, or chickens).",
    zeroAreaNoCrops: "If total farm area is 0, crop areas must all be 0.",
    emptyState: "Complete the form and run calculation.",
    loading: "Loading…",
    total: "Total emissions",
    perHectare: "Per hectare",
    breakdown: "Emission breakdown",
    cropBreakdown: "Per-crop totals",
    carbonIntensity: "Carbon intensity (kg CO2e/kg)",
    uncertaintyTitle: "Uncertainty ranges",
    uncertaintyNote: "Ranges reflect typical variability in emission factors.",
    grossEmissions: "Gross emissions",
    netEmissions: "Net emissions",
    sequestrationTitle: "Soil carbon sequestration",
    sequestrationHelp: "Estimated removals from no-till, cover crops, and residue retention.",
    benchmarkTitle: "Benchmark vs regional average",
    benchmarkRegion: "Benchmark region",
    benchmarkFarmType: "Farm type",
    benchmarkDisclaimer: "Benchmarks are approximate and provided for orientation only.",
    benchmarkDiff: "Difference vs benchmark",
    costBenefitTitle: "Cost-benefit",
    costBenefitDisclaimer: "Costs are indicative. Adjust assumptions to match your farm.",
    costBenefitCost: "Implementation cost",
    costBenefitSavings: "Annual savings",
    costBenefitPayback: "Payback",
    regionGlobal: "Global",
    regionNorthAmerica: "North America",
    regionEurope: "Europe",
    regionUkraine: "Ukraine",
    regionAsia: "Asia",
    regionSouthAmerica: "South America",
    regionAfrica: "Africa",
    regionAustralia: "Australia",
    carbonCreditTitle: "Carbon credit potential",
    carbonCreditBaseline: "Baseline scenario",
    carbonCreditPrice: "Carbon price ($/tCO2e)",
    carbonCreditEligible: "Eligibility: verified reductions, permanence, and monitoring.",
    carbonCreditDisclaimer: "Credits require verification; values shown are indicative.",
    carbonCreditValue: "Estimated value",
    templatesTitle: "Start from template",
    templatesApply: "Use template",
    templatesRegion: "Template climate",
    examplesOpen: "Examples",
    menuLabel: "Menu",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    examplesTitle: "Sample calculations",
    examplesUse: "View sample",
    examplesCopy: "Copy to editable",
    examplesClose: "Close samples",
    sampleMode: "Sample mode (editable)",
    sampleExit: "Exit sample mode",
    sampleExitConfirm: "Exit sample mode and clear all sample data?",
    importLastYear: "Import from last year",
    importLastYearHint: "Loads your most recent saved calculation.",
    trendTitle: "Trend vs previous calculation",
    trendUp: "Increasing",
    trendDown: "Decreasing",
    trendFlat: "Stable",
    comparisonTableTitle: "Comparison table",
    comparisonSelectHint: "Select up to 5 calculations to compare.",
    comparisonExport: "Export comparison CSV",
    comparisonLimit: "Maximum 5 selections.",
    dashboardOpen: "Dashboard",
    dashboardTitle: "Quick stats",
    dashboardNoData: "No calculations yet.",
    dashboardTotal: "Total calculations",
    dashboardAverage: "Average per ha",
    dashboardLowest: "Lowest per ha",
    dashboardHighest: "Highest per ha",
    dashboardTrend: "Trend",
    dashboardRange: "Date range",
    batchModeOpen: "Batch mode",
    batchModeTitle: "Batch calculation",
    batchModeTemplate: "Download CSV template",
    batchModeUpload: "Upload CSV",
    batchModeSummary: "Batch results",
    batchModeExport: "Export batch CSV",
    batchModeClear: "Clear results",
    batchModeHint: "Columns: farm_name, total_area, dairy_cows, pigs, chickens, crops (e.g., wheat:50;barley:30).",
    batchModeNoData: "No batch results yet.",
    goalTitle: "Goal setting",
    goalModePercent: "Percent reduction",
    goalModeAbsolute: "Target total",
    goalTarget: "Target value",
    goalProgress: "Progress",
    goalRemaining: "Remaining",
    goalAchieved: "Goal achieved",
    customFactorsTitle: "Custom emission factors",
    customFactorsEnable: "Enable custom factors",
    customFactorsReset: "Reset to defaults",
    customFactorsHint: "Overrides default emission factors used in calculations.",
    customFactorsActive: "Custom factors applied",
    schedulingTitle: "Seasonal scheduling",
    schedulingToggle: "Enable monthly scheduling",
    scheduleFertilizer: "Fertilizer distribution (%)",
    schedulePesticide: "Pesticide distribution (%)",
    scheduleIrrigation: "Irrigation distribution (%)",
    weatherTitle: "Weather context",
    weatherZone: "Climate zone",
    weatherTemp: "Avg temp",
    weatherPrecip: "Precipitation",
    weatherIrrigationFactor: "Irrigation factor",
    weatherHint: "Weather adjusts irrigation emissions and suggestions.",
    rotationOpen: "Rotation planner",
    rotationTitle: "Crop rotation planning",
    rotationDescription: "Plan a multi-year rotation to compare emissions per year and the average across the cycle. Each year should sum to your farm area; results use your current practices and inputs to estimate annual and per‑hectare emissions.",
    rotationAddYear: "Add year",
    rotationAverage: "Average emissions across rotation",
    equipmentTitle: "Equipment tracking",
    equipmentAdd: "Add equipment",
    equipmentName: "Equipment name",
    equipmentType: "Type",
    equipmentFuel: "Fuel",
    equipmentHours: "Annual hours",
    equipmentRate: "Consumption rate",
    equipmentEmissions: "Equipment emissions",
    equipmentHint: "Track fuel or electricity use for equipment.",
    equipmentHelpTitle: "What these numbers mean:",
    equipmentHoursHelp: "Annual hours = total operating hours per year for this machine.",
    equipmentRateHelp: "Consumption rate = fuel or electricity used per hour (diesel liters/hour or electric kWh/hour).",
    equipmentTypeTractor: "Tractor",
    equipmentTypeCombine: "Combine",
    equipmentTypeIrrigationPump: "Irrigation pump",
    equipmentTypeSprayer: "Sprayer",
    equipmentTypeSprinkler: "Sprinkler system",
    equipmentTypeSeedDrill: "Seed drill",
    equipmentTypePlanter: "Planter",
    equipmentTypeHarvester: "Harvester",
    equipmentTypeOther: "Other",
    fuelDiesel: "Diesel",
    fuelElectric: "Electric",
    analyticsTitle: "Privacy analytics",
    analyticsEnabled: "Analytics enabled",
    analyticsOptOut: "Opt out of analytics",
    analyticsReset: "Reset analytics",
    analyticsEvents: "Events",
    recommendationStatus: "Status",
    recommendationNotes: "Notes",
    recommendationPlanned: "Planned",
    recommendationNotApplicable: "Not applicable",
    recommendationFilterImplemented: "Hide implemented",
    recommendationProgress: "Progress",
    recommendationHelp: "Review each recommendation, track its status, and add notes for context.",
    recommendationNotesHelp: "Use notes to record assumptions, field constraints, or next steps.",
    actionPlanSelectHelp: "Select this to include the recommendation in your action plan list below.",
    recommendationStatusHelp: "Status tracks whether you plan to implement the recommendation, have already implemented it, or it doesn't apply.",
    impact: "Impact level",
    recommendation: "Recommendation",
    disclaimer: "Estimate in tCO2e. Field practice options adjust baseline emissions for decision support.",
    fertilizer: "Fertilizer",
    manureCat: "Manure",
    fuel: "Fuel and field ops",
    irrigationCat: "Irrigation",
    pesticideCat: "Pesticide",
    livestockCat: "Livestock (cattle + pigs)",
    poultryCat: "Poultry (chickens)",
    helpFarmArea: "Total managed area used to normalize per-hectare emissions.",
    helpCows: "Number of dairy cows on the farm (head).",
    helpPigs: "Number of pigs on the farm (head).",
    helpChickens: "Number of chickens on the farm (head).",
    helpCropArea: "Area planted to this crop in hectares.",
    helpNitrogen: "Mineral nitrogen applied per hectare (kg/ha).",
    helpPhosphorus: "Phosphorus fertilizer applied per hectare (kg/ha).",
    helpPotassium: "Potassium fertilizer applied per hectare (kg/ha).",
    helpManure: "Manure applied per hectare (t/ha).",
    helpDiesel: "Diesel used for field operations per hectare (L/ha).",
    helpIrrigation: "Water applied per hectare (mm).",
    helpPesticides: "Select pesticide and active ingredient rate (kg a.i./ha).",
    helpTillage: "Primary tillage system used for this crop.",
    helpPrecision: "Precision application reduces fertilizer emissions.",
    helpCover: "Cover crops lower fertilizer losses and improve soil health.",
    helpIrrigationMethod: "Irrigation system type impacts energy use.",
    helpIrrigationEnergy: "Energy source powering irrigation pumps.",
    helpResidue: "Residue handling can increase or reduce emissions.",
    collapse: "Collapse",
    expand: "Expand",
    summaryCrops: "crops",
    summaryPractices: "practice settings",
    summaryLivestock: "animals",
    cropSearch: "Crop search",
    cropSearchPlaceholder: "Search crops...",
    cropNoResults: "No crops found.",
    pesticideSearch: "Pesticide search",
    pesticideSearchPlaceholder: "Search pesticides...",
    pesticideNoResults: "No pesticides found.",
    copyCrop: "Copy crop",
    copyLastCrop: "Copy last crop",
    autoArea: "Auto-calculate area",
    autoAreaCalc: "Calculate from crops",
    autoAreaMode: "Auto-update",
    resetDefaults: "Reset to defaults",
    autoBadge: "Auto",
    highContrastOn: "High contrast",
    highContrastOff: "Standard contrast",
    fontSizeTitle: "Font size",
    fontSizeSmall: "Small",
    fontSizeMedium: "Medium",
    fontSizeLarge: "Large",
    fontSizeXL: "Extra large",
    installApp: "Install app",
    installReady: "Install available",
    installGuidelinesTitle: "Installation guidelines",
    installGuidelinesIntro: "Installing adds an app-like shortcut to your device. If the Install button is not shown, use your browser menu.",
    installGuidelinesPros: "Pros: faster launch, full-screen experience, works with saved data even when offline.",
    installGuidelinesCons: "Cons: uses device storage; updates still come through the browser.",
    installGuidelinesDesktop: "Desktop (Chrome/Edge): click the Install icon in the address bar or Menu → Install app.",
    installGuidelinesAndroid: "Android (Chrome): Menu → Install app or Add to Home screen.",
    installGuidelinesIOS: "iPhone/iPad (Safari): Share → Add to Home Screen.",
    installGuideOpen: "Installation guide",
    installNotAvailable: "Install is not available in this browser. Use the browser menu instructions above.",
    footerTitle: "Farm Carbon Footprint Estimator",
    footerCopyright: "Copyright © 2026. All rights reserved.",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Use",
    footerOtherProducts: "Other Products",
    privacyTitle: "Privacy Policy",
    privacyBody1: "We store calculation data locally in your browser to keep your work available.",
    privacyBody2: "We do not sell personal data. Any exports you generate remain on your device.",
    privacyBody3: "If you contact us by email, your message is handled through your email provider.",
    termsTitle: "Terms of Use",
    termsBody1: "This tool provides estimation guidance and should not be treated as a legally binding audit.",
    termsBody2: "You are responsible for the accuracy of data entered and decisions made from results.",
    termsBody3: "We may update features and assumptions over time to improve accuracy and usability.",
    offline: "Offline",
    online: "Online",
    settingsTitle: "Settings",
    settingsOpen: "Settings",
    settingsClose: "Close",
    settingsLanguage: "Language",
    settingsTheme: "Theme",
    settingsContrast: "Contrast",
    settingsFont: "Font size",
    settingsRegion: "Region",
    settingsAutoSave: "Auto-save interval (sec)",
    settingsStorage: "Storage usage",
    settingsReset: "Reset to defaults",
    settingsClear: "Clear all data",
    settingsConfirmClear: "This will remove all saved data. Continue?",
    toastSaved: "Saved.",
    toastExported: "Exported.",
    toastError: "Something went wrong.",
    toastDraftRecovered: "Draft restored.",
    toastDraftDiscarded: "Draft discarded.",
    toastCopied: "Copied.",
    toastInvalid: "Invalid input.",
    toastResultsCleared: "Results cleared.",
    confirmTitle: "Confirm action",
    confirmYes: "Yes",
    confirmNo: "Cancel",
    confirmDelete: "Delete this entry?",
    confirmDeleteSelected: "Delete selected entries?",
    confirmClearAll: "Clear all saved data?",
    tutorialTitle: "Quick tour",
    tutorialOpen: "Tutorial",
    tutorialNext: "Next",
    tutorialBack: "Back",
    tutorialFinish: "Finish",
    tutorialSkip: "Skip",
    tutorialStep1: "Start by choosing your language, theme, and font size. If you use high contrast, turn it on in the menu.",
    tutorialStep2: "Enter total farm area, then add crops. For each crop, fill area, inputs, and yield. Use “Apply default crop rates” if you want baseline values.",
    tutorialStep3: "Set field practices: tillage, irrigation method, residue handling, precision fertilization, and cover crops. Choose “No irrigation” if the crop is rain‑fed.",
    tutorialStep4: "Add livestock only if applicable. If you have no animals, leave those fields at 0.",
    tutorialStep5: "Use advanced tools: cost‑benefit, benchmarks, what‑if scenarios, and projections to explore trade‑offs.",
    tutorialStep6: "Track equipment fuel/electricity use to include machinery emissions. Add multiple machines if needed.",
    tutorialStep7: "Save calculations to history. Compare scenarios, export CSV/TXT, and download charts as PNG when needed.",
    tutorialStep8: "Check the dashboard and batch mode for quick summaries or multiple farms. You can always return here for guidance.",
    helpTitle: "Inline help",
    helpOpen: "Help",
    helpClose: "Close",
    helpStep1: "Start with total farm area and livestock counts.",
    helpStep2: "Add crops and apply default rates if needed.",
    helpStep3: "Tune practices to explore reduction options.",
    docsTitle: "Help & documentation",
    docsFaq1Q: "How are emissions calculated?",
    docsFaq1A: "The app uses crop inputs, livestock counts, and practice multipliers to estimate tCO2e.",
    docsFaq2Q: "Can I export results?",
    docsFaq2A: "Yes. Use CSV/TXT export and download charts as PNG.",
    dataSourcesTitle: "Data sources",
    dataSourcesExport: "Export bibliography",
    dataSourcesIntro: "Emission factors and defaults are based on public agronomy and climate references:",
    developerInfoTitle: "Information about developer",
    developerInfoOpen: "Developer info",
    developerInfoRole: "Dr Pavlo Lykhovyd — Leading Researcher",
    developerInfoOrg: "Institute of Climate-Smart Agriculture, Ukraine",
    developerInfoPhone: "Phone: +380 66 062 98 97",
    developerInfoEmail: "pavel.likhovid@gmail.com",
    developerInfoEmailLabel: "Email",
    developerInfoEmailSend: "Send email",
    backToForm: "Edit questionnaire",
    exportReportTxt: "Export report (TXT)",
    exportChartsPng: "Download charts (PNG)",
    downloadChartPng: "Download chart (PNG)",
    exportActionPlanTxt: "Export action plan (TXT)",
    exportRotationTxt: "Export rotation (TXT)",
    versionLabel: "Version",
    changelogTitle: "Changelog",
    changelogItem1: "Added what-if analysis, projections, and recommendations.",
    changelogItem2: "Improved accessibility and export options.",
    compatTitle: "Compatibility",
    compatIssue: "Some features may not work in this browser:"
  },
  ua: {
    appTitle: "Який вуглецевий слід має моє господарство?",
    appSubtitle: "Заповніть параметри господарства та агротехнологій, щоб отримати практичну оцінку.",
    questionnaire: "Опитувальник господарства",
    results: "Результати оцінки вуглецевого сліду",
    history: "Історія розрахунків",
    historySearch: "Пошук за назвою господарства",
    historyFrom: "Дата від",
    historyTo: "Дата до",
    historyEmpty: "Історія порожня. Виконайте розрахунок, щоб зберегти його.",
    historyLoad: "Завантажити",
    historyDelete: "Видалити",
    historyExport: "Експорт",
    historyDeleteSelected: "Видалити вибране",
    historyFarm: "Господарство",
    historyDate: "Дата",
    historyTotal: "Загальні",
    historyPerHa: "На гектар",
    comparison: "Порівняння сценаріїв",
    scenarioA: "Сценарій A",
    scenarioB: "Сценарій B",
    selectScenario: "Оберіть збережений розрахунок",
    delta: "Різниця",
    noComparisonData: "Оберіть два розрахунки для порівняння.",
    beforeAfterTitle: "Вплив зміни практик",
    beforeLabel: "Було",
    afterLabel: "Стало",
    changeLabel: "Зміна",
    pin: "Закріпити",
    unpin: "Відкріпити",
    recommendationsTitle: "Рекомендації",
    recommendationApply: "Застосувати",
    recommendationImplemented: "Впроваджено",
    recommendationImpact: "Потенційне скорочення",
    recommendationNone: "Наразі рекомендацій немає.",
    recNoTillTitle: "Перехід на no-till де можливо",
    recNoTillDesc: "No-till знижує викиди повʼязані з використанням паливно-мастильних матеріалів і від технологічних операцій.",
    recPrecisionTitle: "Увімкнути точне внесення добрив",
    recPrecisionDesc: "Точне внесення скорочує викиди від добрив.",
    recIrrigationTitle: "Підвищити ефективність зрошення",
    recIrrigationDesc: "Перехід на ефективне зрошення (краплинне/підґрунтове) зменшує енерговитрати.",
    recCoverTitle: "Додати покривні культури",
    recCoverDesc: "Покривні культури зменшують втрати азоту та покращують родючість ґрунту.",
    actionPlanTitle: "План дій",
    actionPlanExport: "Експорт плану дій (TXT)",
    actionPlanNoData: "Поки немає рекомендацій для плану дій.",
    actionPlanDifficulty: "Складність",
    actionPlanCost: "Вартість",
    actionPlanTimeline: "Часова шкала",
    difficultyLow: "Низька",
    difficultyMedium: "Середня",
    difficultyHigh: "Висока",
    costLow: "Низька",
    costMedium: "Середня",
    costHigh: "Висока",
    timelineNow: "Негайно",
    timelineSeason: "Цього сезону",
    timelineNextYear: "Наступного року",
    shortcutsTitle: "Гарячі клавіші",
    shortcutsOpen: "Комбінації",
    shortcutsClose: "Закрити",
    shortcutsHint: "Використовуйте Ctrl на Windows/Linux або Cmd на macOS.",
    shortcutSave: "Зберегти профіль",
    shortcutExport: "Експорт CSV",
    shortcutCalculate: "Розрахувати",
    shortcutNewCrop: "Нова культура",
    shortcutDuplicateCrop: "Дублювати культуру",
    shortcutHelp: "Показати комбінації",
    shortcutSavePrompt: "Назва профілю",
    shortcutSaveSuccess: "Профіль збережено.",
    shortcutSaveError: "Не вдалося зберегти профіль.",
    projectionTitle: "Багаторічний прогноз викидів",
    projectionYears: "Період прогнозу (років)",
    projectionRates: "Річні темпи покращення (%)",
    projectionCumulative: "Накопичений підсумок",
    projectionExport: "Експорт прогнозу CSV",
    projectionYearLabel: "Рік",
    whatIfTitle: "А-що-як калькулятор",
    whatIfNitrogen: "Норма азоту",
    whatIfTillage: "Обробіток грунту",
    whatIfIrrigation: "Метод зрошення",
    whatIfCover: "Покривна культура",
    whatIfCurrent: "Поточні (по культурах)",
    whatIfResults: "Результат а-що-як",
    whatIfReset: "Скинути",
    whatIfTillageHint: "Впливає на викиди пального; встановіть Дизель > 0, щоб побачити ефект.",
    whatIfScenarioName: "Назва сценарію",
    whatIfScenarioPlaceholder: "напр., смуговий обробіток ґрунту + краплинне зрошення",
    whatIfSave: "Зберегти сценарій",
    whatIfSaved: "Сценарій збережено в історії та профілях.",
    whatIfNameRequired: "Вкажіть назву сценарію для збереження.",
    whatIfSaveError: "Не вдалося зберегти сценарій.",
    farmArea: "Загальна площа господарства (га)",
    cropsTitle: "Культури та агротехніка",
    addCrop: "Додати культуру",
    remove: "Видалити",
    crop: "Культура",
    area: "Площа (га)",
    useDefaults: "Підставити типові норми",
    nRate: "Азот (кг/га)",
    pRate: "Фосфор (кг/га)",
    kRate: "Калій (кг/га)",
    manure: "Гній (т/га)",
    diesel: "Дизель (л/га)",
    irrigation: "Зрошення (мм)",
    pesticides: "Пестициди",
    addPesticide: "Додати пестицид",
    noPesticide: "Без пестициду",
    pesticideRate: "Норма (кг д.р./га)",
    practices: "Польові агротехнології",
    tillage: "Обробіток грунту",
    precision: "Точне внесення добрив",
    coverCrop: "Покривна культура",
    irrigationMethod: "Метод зрошення",
    irrigationEnergy: "Джерело енергії для зрошення",
    organicMode: "Органічне господарство",
    organicHelp: "Приховує синтетичні вводи та застосовує органічні фактори.",
    compost: "Компост (т/га)",
    greenManure: "Сидерати (кг/га N екв.)",
    bioPest: "Біозахист (кг д.р./га)",
    cropYield: "Урожайність (т/га)",
    season: "Сезон",
    seasonSpring: "Весна",
    seasonSummer: "Літо",
    seasonFall: "Осінь",
    seasonWinter: "Зима",
    seasonalAnalysis: "Сезонний аналіз",
    seasonalTop: "Найвищі викиди у сезоні",
    residue: "Управління рослинними рештками",
    livestock: "Тваринництво",
    cows: "Дійні корови",
    pigs: "Свині",
    chickens: "Кури (птиця)",
    calculate: "Розрахувати слід",
    resetInputs: "Скинути поля",
    clearResults: "Очистити результати",
    switchToLight: "Світла тема",
    switchToDark: "Темна тема",
    formProgress: "Заповнення форми",
    wizardMode: "Майстер",
    advancedMode: "Розширений",
    stepFarm: "Господарство",
    stepCrops: "Культури",
    stepPractices: "Практики",
    stepReview: "Огляд",
    nextStep: "Далі",
    prevStep: "Назад",
    errorsTitle: "Виправте ці поля:",
    areaMismatch: "Сумарна площа культур має точно дорівнювати загальній площі господарства.",
    zeroAreaNeedsAnimals: "Якщо загальна площа господарства 0, вкажіть принаймні одне значення для тваринництва (корови, свині або кури).",
    zeroAreaNoCrops: "Якщо загальна площа господарства 0, площі всіх культур мають бути 0.",
    emptyState: "Заповніть форму та виконайте розрахунок.",
    loading: "Завантаження…",
    total: "Загальні викиди",
    perHectare: "На гектар",
    breakdown: "Структура викидів",
    cropBreakdown: "Підсумок по культурах",
    carbonIntensity: "Інтенсивність (кг CO2e/кг)",
    uncertaintyTitle: "Діапазони невизначеності",
    uncertaintyNote: "Діапазони відображають типову варіативність факторів.",
    grossEmissions: "Валові викиди",
    netEmissions: "Чисті викиди",
    sequestrationTitle: "Секвестрація вуглецю ґрунту",
    sequestrationHelp: "Оцінка зменшення від no-till, покривних культур та утримання решток.",
    benchmarkTitle: "Порівняння з регіональним середнім",
    benchmarkRegion: "Регіон для порівняння",
    benchmarkFarmType: "Тип господарства",
    benchmarkDisclaimer: "Бенчмарки орієнтовні й наведені для загальної оцінки.",
    benchmarkDiff: "Відхилення від бенчмарку",
    costBenefitTitle: "Витрати та вигоди",
    costBenefitDisclaimer: "Вартість орієнтовна. Налаштуйте припущення під своє господарство.",
    costBenefitCost: "Вартість впровадження",
    costBenefitSavings: "Річна економія",
    costBenefitPayback: "Окупність",
    regionGlobal: "Глобальний",
    regionNorthAmerica: "Північна Америка",
    regionEurope: "Європа",
    regionUkraine: "Україна",
    regionAsia: "Азія",
    regionSouthAmerica: "Південна Америка",
    regionAfrica: "Африка",
    regionAustralia: "Австралія",
    carbonCreditTitle: "Потенціал вуглецевих кредитів",
    carbonCreditBaseline: "Базовий сценарій",
    carbonCreditPrice: "Ціна вуглецю ($/tCO2e)",
    carbonCreditEligible: "Критерії: верифіковані скорочення, постійність та моніторинг.",
    carbonCreditDisclaimer: "Кредити потребують верифікації; значення орієнтовні.",
    carbonCreditValue: "Оціночна вартість",
    templatesTitle: "Старт з шаблону",
    templatesApply: "Застосувати шаблон",
    templatesRegion: "Клімат шаблону",
    examplesOpen: "Приклади",
    menuLabel: "Меню",
    menuOpen: "Відкрити меню",
    menuClose: "Закрити меню",
    examplesTitle: "Приклади розрахунків",
    examplesUse: "Переглянути",
    examplesCopy: "Скопіювати для редагування",
    examplesClose: "Закрити",
    sampleMode: "Режим прикладу (можна редагувати)",
    sampleExit: "Вийти з режиму прикладу",
    sampleExitConfirm: "Вийти з режиму прикладу та очистити всі дані прикладу?",
    importLastYear: "Імпорт з минулого року",
    importLastYearHint: "Завантажує останній збережений розрахунок.",
    trendTitle: "Тренд відносно попереднього",
    trendUp: "Зростає",
    trendDown: "Знижується",
    trendFlat: "Стабільно",
    comparisonTableTitle: "Таблиця порівняння",
    comparisonSelectHint: "Оберіть до 5 розрахунків для порівняння.",
    comparisonExport: "Експорт CSV порівняння",
    comparisonLimit: "Максимум 5 вибраних.",
    dashboardOpen: "Дашборд",
    dashboardTitle: "Швидка статистика",
    dashboardNoData: "Поки немає розрахунків.",
    dashboardTotal: "Всього розрахунків",
    dashboardAverage: "Середнє на га",
    dashboardLowest: "Найнижче на га",
    dashboardHighest: "Найвище на га",
    dashboardTrend: "Тренд",
    dashboardRange: "Діапазон дат",
    batchModeOpen: "Пакетний режим",
    batchModeTitle: "Пакетний розрахунок",
    batchModeTemplate: "Завантажити шаблон CSV",
    batchModeUpload: "Завантажити CSV",
    batchModeSummary: "Результати пакету",
    batchModeExport: "Експорт CSV пакету",
    batchModeClear: "Очистити результати",
    batchModeHint: "Колонки: farm_name, total_area, dairy_cows, pigs, chickens, crops (напр., wheat:50;barley:30).",
    batchModeNoData: "Поки немає пакетних результатів.",
    goalTitle: "Цільові показники",
    goalModePercent: "Відсоток скорочення",
    goalModeAbsolute: "Цільовий рівень",
    goalTarget: "Ціль",
    goalProgress: "Прогрес",
    goalRemaining: "Залишилось",
    goalAchieved: "Ціль досягнуто",
    customFactorsTitle: "Користувацькі фактори викидів",
    customFactorsEnable: "Увімкнути фактори",
    customFactorsReset: "Скинути до типових",
    customFactorsHint: "Перевизначає стандартні фактори викидів.",
    customFactorsActive: "Користувацькі фактори застосовано",
    schedulingTitle: "Сезонне планування",
    schedulingToggle: "Увімкнути помісячне планування",
    scheduleFertilizer: "Розподіл добрив (%)",
    schedulePesticide: "Розподіл пестицидів (%)",
    scheduleIrrigation: "Розподіл зрошення (%)",
    weatherTitle: "Кліматичний контекст",
    weatherZone: "Кліматична зона",
    weatherTemp: "Сер. температура",
    weatherPrecip: "Опади",
    weatherIrrigationFactor: "Коеф. зрошення",
    weatherHint: "Погода коригує викиди зрошення та поради.",
    rotationOpen: "План ротації",
    rotationTitle: "Планування сівозміни",
    rotationDescription: "Заплануйте сівозміну на кілька років, щоб порівняти викиди за кожен рік і середнє за цикл. Площі культур у році мають сумарно дорівнювати площі господарства; розрахунки використовують поточні практики та введені дані.",
    rotationAddYear: "Додати рік",
    rotationAverage: "Середні викиди за ротацію",
    equipmentTitle: "Облік техніки",
    equipmentAdd: "Додати техніку",
    equipmentName: "Назва техніки",
    equipmentType: "Тип",
    equipmentFuel: "Паливо",
    equipmentHours: "Годин на рік",
    equipmentRate: "Норма споживання",
    equipmentEmissions: "Викиди від техніки",
    equipmentHint: "Враховуйте дизель або електроенергію техніки.",
    equipmentHelpTitle: "Що означають ці числа:",
    equipmentHoursHelp: "Годин на рік — загальний час роботи машини за рік.",
    equipmentRateHelp: "Норма споживання — витрати пального або електроенергії за годину (л/год для дизеля або кВт·год/год для електрики).",
    equipmentTypeTractor: "Трактор",
    equipmentTypeCombine: "Комбайн",
    equipmentTypeIrrigationPump: "Насос для зрошення",
    equipmentTypeSprayer: "Обприскувач",
    equipmentTypeSprinkler: "Дощувальна система",
    equipmentTypeSeedDrill: "Сівалка",
    equipmentTypePlanter: "Саджалка",
    equipmentTypeHarvester: "Жниварка",
    equipmentTypeOther: "Інше",
    fuelDiesel: "Дизель",
    fuelElectric: "Електроенергія",
    analyticsTitle: "Приватна аналітика",
    analyticsEnabled: "Аналітика увімкнена",
    analyticsOptOut: "Вимкнути аналітику",
    analyticsReset: "Скинути аналітику",
    analyticsEvents: "Події",
    recommendationStatus: "Статус",
    recommendationNotes: "Нотатки",
    recommendationPlanned: "Заплановано",
    recommendationNotApplicable: "Не застосовується",
    recommendationFilterImplemented: "Приховати виконані",
    recommendationProgress: "Прогрес",
    recommendationHelp: "Перегляньте рекомендації, відстежуйте статус і додайте нотатки для контексту.",
    recommendationNotesHelp: "Нотатки — для обмежень поля, припущень або наступних кроків.",
    actionPlanSelectHelp: "Позначте, щоб додати рекомендацію до плану дій нижче.",
    recommendationStatusHelp: "Статус показує, чи ви плануєте впровадження, вже виконали, або рекомендація не підходить.",
    impact: "Рівень впливу",
    recommendation: "Рекомендація",
    disclaimer: "Оцінка у tCO2e. Польові опції коригують базові викиди для підтримки прийняття рішень.",
    fertilizer: "Добрива",
    manureCat: "Гній",
    fuel: "Паливо та польові операції",
    irrigationCat: "Зрошення",
    pesticideCat: "Пестициди",
    livestockCat: "Тваринництво (ВРХ + свині)",
    poultryCat: "Птиця (кури)",
    helpFarmArea: "Загальна площа господарства для розрахунку на гектар.",
    helpCows: "Кількість дійних корів (голів).",
    helpPigs: "Кількість свиней (голів).",
    helpChickens: "Кількість курей/птиця (голів).",
    helpCropArea: "Площа під культурою у гектарах.",
    helpNitrogen: "Мінеральний азот на гектар (кг/га).",
    helpPhosphorus: "Фосфорні добрива на гектар (кг/га).",
    helpPotassium: "Калійні добрива на гектар (кг/га).",
    helpManure: "Гній на гектар (т/га).",
    helpDiesel: "Дизель для польових робіт на гектар (л/га).",
    helpIrrigation: "Зрошення на гектар (мм).",
    helpPesticides: "Оберіть пестицид і норму д.р. (кг/га).",
    helpTillage: "Тип основного обробітку для цієї культури.",
    helpPrecision: "Точне внесення зменшує викиди від добрив.",
    helpCover: "Покривні культури знижують втрати азоту.",
    helpIrrigationMethod: "Метод зрошення впливає на енерговитрати.",
    helpIrrigationEnergy: "Джерело енергії для насосів.",
    helpResidue: "Управління рештками змінює викиди.",
    collapse: "Згорнути",
    expand: "Розгорнути",
    summaryCrops: "культури",
    summaryPractices: "практики",
    summaryLivestock: "тварини",
    cropSearch: "Пошук культур",
    cropSearchPlaceholder: "Пошук культур...",
    cropNoResults: "Культур не знайдено.",
    pesticideSearch: "Пошук пестицидів",
    pesticideSearchPlaceholder: "Пошук пестицидів...",
    pesticideNoResults: "Пестицидів не знайдено.",
    copyCrop: "Копіювати культуру",
    copyLastCrop: "Копіювати останню культуру",
    autoArea: "Авто-розрахунок площі",
    autoAreaCalc: "Порахувати з культур",
    autoAreaMode: "Авто-оновлення",
    resetDefaults: "Скинути до норм",
    autoBadge: "Авто",
    highContrastOn: "Високий контраст",
    highContrastOff: "Стандартний контраст",
    fontSizeTitle: "Розмір шрифту",
    fontSizeSmall: "Малий",
    fontSizeMedium: "Середній",
    fontSizeLarge: "Великий",
    fontSizeXL: "Дуже великий",
    installApp: "Встановити додаток",
    installReady: "Доступне встановлення",
    installGuidelinesTitle: "Інструкція з встановлення",
    installGuidelinesIntro: "Встановлення додає ярлик додатка на пристрій. Якщо кнопки немає, скористайтесь меню браузера.",
    installGuidelinesPros: "Переваги: швидший запуск, повноекранний режим, робота зі збереженими даними офлайн.",
    installGuidelinesCons: "Недоліки: займає місце; оновлення все одно через браузер.",
    installGuidelinesDesktop: "ПК (Chrome/Edge): натисніть іконку встановлення в адресному рядку або Меню → Встановити додаток.",
    installGuidelinesAndroid: "Android (Chrome): Меню → Встановити додаток або Додати на головний екран.",
    installGuidelinesIOS: "iPhone/iPad (Safari): Поділитися → Додати на головний екран.",
    installGuideOpen: "Інструкція з встановлення",
    installNotAvailable: "Встановлення недоступне у цьому браузері. Скористайтесь інструкціями через меню браузера.",
    footerTitle: "Farm Carbon Footprint Estimator",
    footerCopyright: "Автрське право © 2026. Всі права захищено.",
    footerPrivacy: "Політика конфіденційності",
    footerTerms: "Умови використання",
    footerOtherProducts: "Інші продукти",
    privacyTitle: "Політика конфіденційності",
    privacyBody1: "Ми зберігаємо дані розрахунків локально у вашому браузері, щоб зберігати прогрес.",
    privacyBody2: "Ми не продаємо персональні дані. Усі експорти залишаються на вашому пристрої.",
    privacyBody3: "Якщо ви пишете нам електронною поштою, повідомлення обробляється вашим провайдером пошти.",
    termsTitle: "Умови використання",
    termsBody1: "Цей інструмент надає оцінки і не є юридично обовʼязковим аудитом.",
    termsBody2: "Ви відповідаєте за точність введених даних і рішення, прийняті за результатами.",
    termsBody3: "Ми можемо оновлювати функції та припущення для підвищення точності й зручності.",
    offline: "Офлайн",
    online: "Онлайн",
    settingsTitle: "Налаштування",
    settingsOpen: "Налаштування",
    settingsClose: "Закрити",
    settingsLanguage: "Мова",
    settingsTheme: "Тема",
    settingsContrast: "Контраст",
    settingsFont: "Розмір шрифту",
    settingsRegion: "Регіон",
    settingsAutoSave: "Інтервал автозбереження (сек)",
    settingsStorage: "Використання сховища",
    settingsReset: "Скинути налаштування",
    settingsClear: "Очистити дані",
    settingsConfirmClear: "Це видалить усі збережені дані. Продовжити?",
    toastSaved: "Збережено.",
    toastExported: "Експортовано.",
    toastError: "Сталася помилка.",
    toastDraftRecovered: "Чернетку відновлено.",
    toastDraftDiscarded: "Чернетку скасовано.",
    toastCopied: "Скопійовано.",
    toastInvalid: "Некоректні дані.",
    toastResultsCleared: "Результати очищено.",
    confirmTitle: "Підтвердження",
    confirmYes: "Так",
    confirmNo: "Скасувати",
    confirmDelete: "Видалити цей запис?",
    confirmDeleteSelected: "Видалити вибрані записи?",
    confirmClearAll: "Очистити всі дані?",
    tutorialTitle: "Короткий тур",
    tutorialOpen: "Навчання",
    tutorialNext: "Далі",
    tutorialBack: "Назад",
    tutorialFinish: "Завершити",
    tutorialSkip: "Пропустити",
    tutorialStep1: "Почніть з вибору мови, теми та розміру шрифту. За потреби ввімкніть високий контраст у меню.",
    tutorialStep2: "Вкажіть загальну площу господарства, потім додайте культури. Для кожної культури заповніть площу, норми внесення та врожайність. Можна застосувати типові норми.",
    tutorialStep3: "Налаштуйте практики: обробіток ґрунту, метод зрошення, рослинні рештки, точне внесення та покривні культури. Для богарних культур виберіть “Без зрошення”.",
    tutorialStep4: "Тваринництво заповнюйте лише за потреби. Якщо тварин немає, залиште 0.",
    tutorialStep5: "Скористайтеся інструментами: витрати‑вигоди, бенчмарки, а-що-як сценарії та проєкції для аналізу.",
    tutorialStep6: "Додайте техніку й витрати палива/електроенергії, щоб врахувати викиди від машин.",
    tutorialStep7: "Зберігайте розрахунки в історії. Порівнюйте сценарії, експортуйте CSV/TXT та за потреби завантажуйте графіки PNG.",
    tutorialStep8: "Переглядайте дашборд і пакетний режим для швидких підсумків чи роботи з кількома господарствами.",
    helpTitle: "Підказки",
    helpOpen: "Допомога",
    helpClose: "Закрити",
    helpStep1: "Почніть із площі та тварин.",
    helpStep2: "Додайте культури й застосуйте типові норми.",
    helpStep3: "Налаштуйте практики для пошуку скорочень.",
    docsTitle: "Довідка",
    docsFaq1Q: "Як рахуються викиди?",
    docsFaq1A: "Розрахунок базується на даних введених користувачем щодо рослиннцитва і тваринництва з урахуванням коефіцієнтів сільськогосподарських практик.",
    docsFaq2Q: "Чи можна експортувати результати?",
    docsFaq2A: "Так. Використовуйте експорт CSV/TXT та завантаження PNG.",
    dataSourcesTitle: "Джерела даних",
    dataSourcesExport: "Експорт бібліографії",
    dataSourcesIntro: "Фактори викидів і значення за замовчуванням базуються на публічних джерелах:",
    developerInfoTitle: "Інформація про розробника",
    developerInfoOpen: "Про розробника",
    developerInfoRole: "д-р с.-г. наук Павло Лиховид — провідний науковий співробітник",
    developerInfoOrg: "Інститут кліматично розумного сільського господарства, Україна",
    developerInfoPhone: "Телефон: +380 66 062 98 97",
    developerInfoEmail: "pavel.likhovid@gmail.com",
    developerInfoEmailLabel: "Email",
    developerInfoEmailSend: "Надіслати email",
    backToForm: "Повернутись до анкети",
    exportReportTxt: "Експорт звіту (TXT)",
    exportChartsPng: "Завантажити графіки (PNG)",
    downloadChartPng: "Завантажити графік (PNG)",
    exportActionPlanTxt: "Експорт плану дій (TXT)",
    exportRotationTxt: "Експорт ротації (TXT)",
    versionLabel: "Версія",
    changelogTitle: "Зміни",
    changelogItem1: "Додано what-if аналіз, прогнози та рекомендації.",
    changelogItem2: "Покращено доступність та експорт.",
    compatTitle: "Сумісність",
    compatIssue: "Деякі функції можуть не працювати:"
  }
};

function validateDictionary(dictionaries: Record<Lang, Dict>) {
  const baseKeys = Object.keys(dictionaries.en);
  const uaKeys = Object.keys(dictionaries.ua);
  const missingInUa = baseKeys.filter((key) => !uaKeys.includes(key));
  const missingInEn = uaKeys.filter((key) => !baseKeys.includes(key));
  if (missingInUa.length > 0) {
    console.warn("Missing UA dictionary keys:", missingInUa);
  }
  if (missingInEn.length > 0) {
    console.warn("Missing EN dictionary keys:", missingInEn);
  }
}

function getDictWithFallback(lang: Lang): Dict {
  const base = dict.en;
  const current = dict[lang];
  return new Proxy(current, {
    get(target, prop: string) {
      if (prop in target) return (target as Dict)[prop as keyof Dict];
      if (prop in base) return (base as Dict)[prop as keyof Dict];
      return prop;
    }
  }) as Dict;
}

const AUTO_FIELDS: AutoField[] = ["nitrogen", "phosphorus", "potassium", "irrigation"];

const TILLAGE_OPTIONS: Tillage[] = [
  "moldboard_plowing",
  "disk_tillage",
  "chisel_tillage",
  "strip_till",
  "ridge_till",
  "no_till"
];

const IRRIGATION_METHOD_OPTIONS: IrrigationMethod[] = [
  "none",
  "furrow_surface",
  "basin_flood",
  "sprinkler",
  "center_pivot",
  "drip",
  "subsurface_drip"
];

const WHATIF_TILLAGE_OPTIONS: WhatIfTillageOption[] = ["current", ...TILLAGE_OPTIONS];
const WHATIF_IRRIGATION_OPTIONS: WhatIfIrrigationOption[] = ["current", ...IRRIGATION_METHOD_OPTIONS];
const WHATIF_COVER_OPTIONS: WhatIfCoverOption[] = ["current", "off", "on"];

const cropNameUA = [
  "Пшениця",
  "Кукурудза",
  "Соя",
  "Соняшник",
  "Картопля",
  "Рис",
  "Ячмінь",
  "Ріпак",
  "Цукровий буряк",
  "Овочі",
  "Овес",
  "Жито",
  "Сорго",
  "Просо",
  "Бавовник",
  "Люцерна",
  "Горох",
  "Сочевиця",
  "Нут",
  "Томат",
  "Цибуля",
  "Виноград",
  "Кіноа",
  "Гречка",
  "Спельта",
  "Кормові боби",
  "Маш",
  "Капуста",
  "Морква",
  "Перець",
  "Полуниця",
  "Диня",
  "Базилік",
  "М'ята",
  "Яблуко",
  "Цитрусові",
  "Огірок",
  "Салат",
  "Гарбуз",
  "Часник",
  "Льон",
  "Конюшина"
];
const pesticideNameUA = [
  "Раундап",
  "Атразин",
  "Харнес",
  "Карате",
  "Децис",
  "Ридоміл Голд",
  "Браво",
  "Тілт",
  "Амістар",
  "Дітан",
  "Косайд",
  "Дуал Голд",
  "Калісто",
  "Банвел",
  "2,4-Д",
  "Конфідор",
  "Дурсбан",
  "Карате Зеон",
  "Селект",
  "Базагран",
  "Гранстар",
  "Проул",
  "Лассо",
  "Стомп",
  "Сенкор",
  "Реглон",
  "Бетанал",
  "Фузілад",
  "Тарга",
  "Скор",
  "Топаз",
  "Світч",
  "Сигнум",
  "Квадріс",
  "Фалкон",
  "Ровраль",
  "Хлорокис міді",
  "Каратейн",
  "Актара",
  "Моспілан",
  "Матч",
  "Кораген",
  "Вертимек",
  "Фастак",
  "Енжіо",
  "Децис Експерт",
  "Біская",
  "Конфідор Енерджі",
  "Моддус",
  "Церон",
  "Етефон Макс",
  "Паклобутразол",
  "Бор Мікс"
];

function cropLabel(id: number, lang: Lang): string {
  return lang === "ua" ? cropNameUA[id] ?? crops[id]?.name : crops[id]?.name;
}

function pesticideLabel(id: number, lang: Lang): string {
  const trade = lang === "ua" ? pesticideNameUA[id] ?? pesticides[id]?.trade_name : pesticides[id]?.trade_name;
  const substance = pesticides[id]?.substance;
  return substance ? `${trade} (${substance})` : trade;
}

function groupPesticideOptions(query: string, lang: Lang) {
  const normalized = query.trim().toLowerCase();
  const groups = new Map<string, { id: number; label: string }[]>();
  pesticides.forEach((item, id) => {
    const label = pesticideLabel(id, lang);
    const alt = pesticideLabel(id, lang === "en" ? "ua" : "en");
    const matches =
      !normalized ||
      includesQuery(label, normalized) ||
      includesQuery(item.type, normalized) ||
      includesQuery(item.substance, normalized) ||
      includesQuery(alt, normalized);
    if (!matches) return;
    const bucket = groups.get(item.type) ?? [];
    bucket.push({ id, label });
    groups.set(item.type, bucket);
  });
  return Array.from(groups.entries()).map(([type, options]) => ({
    type,
    options: options.sort((a, b) => a.label.localeCompare(b.label))
  }));
}

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

function filterCropsByQuery(query: string, lang: Lang) {
  if (!query) return crops.map((_, id) => ({ id, label: cropLabel(id, lang) }));
  return crops
    .map((_, id) => ({ id, label: cropLabel(id, lang) }))
    .filter((entry) => {
      const alt = lang === "en" ? cropLabel(entry.id, "ua") : cropLabel(entry.id, "en");
      return includesQuery(entry.label, query) || (alt ? includesQuery(alt, query) : false);
    });
}

function CropSelector({
  cropId,
  lang,
  placeholder,
  searchLabel,
  noResultsLabel,
  onSelect
}: {
  cropId: number;
  lang: Lang;
  placeholder: string;
  searchLabel: string;
  noResultsLabel: string;
  onSelect: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filterCropsByQuery(q, lang);
    if (q) return base;
    const hasCurrent = base.some((entry) => entry.id === cropId);
    return hasCurrent ? base : [{ id: cropId, label: cropLabel(cropId, lang) }, ...base];
  }, [query, lang, cropId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (options.length === 1) {
      if (cropId !== options[0].id) onSelect(options[0].id);
      return;
    }
    const exact = options.find((entry) => entry.label.toLowerCase() === trimmed);
    if (exact && exact.id !== cropId) {
      onSelect(exact.id);
      return;
    }
    if (options.length > 0 && !options.some((entry) => entry.id === cropId)) {
      onSelect(options[0].id);
    }
  }, [options, query, onSelect, cropId]);

  return (
    <>
      <input
        type="text"
        className="select-search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={searchLabel}
      />
      <select aria-label={searchLabel} value={cropId} onChange={(e) => onSelect(Number(e.target.value))}>
        {options.length === 0 && <option value={cropId}>{noResultsLabel}</option>}
        {options.map((entry) => (
          <option key={`c-${entry.id}`} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </>
  );
}

function PesticideSelector({
  cropIndex,
  pesticideIndex,
  value,
  lang,
  placeholder,
  onSelect
}: {
  cropIndex: number;
  pesticideIndex: number;
  value: string | number;
  lang: Lang;
  placeholder: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => groupPesticideOptions(query, lang), [query, lang]);
  const flat = useMemo(() => grouped.flatMap((group) => group.options), [grouped]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (flat.length === 1) {
      if (String(value) !== String(flat[0].id)) onSelect(String(flat[0].id));
      return;
    }
    if (flat.length > 1) {
      const currentId = Number(value);
      const matches = new Set(flat.map((item) => item.id));
      if (!matches.has(currentId)) onSelect(String(flat[0].id));
    }
  }, [flat, query, onSelect, value]);

  return (
    <div className="pesticide-select">
      <input
        type="text"
        className="select-search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={lang === "en" ? "Pesticide search" : "Пошук пестицидів"}
      />
      <select aria-label={lang === "en" ? "Pesticides" : "Пестициди"} value={value} onChange={(e) => onSelect(e.target.value)}>
        <option value={-1}>{lang === "en" ? "No pesticide" : "Без пестициду"}</option>
        {grouped.length === 0 ? (
          <option value={value}>{lang === "en" ? "No results" : "Немає результатів"}</option>
        ) : (
          grouped.map((group) => (
            <optgroup key={`pg-${group.type}`} label={group.type}>
              {group.options.map((entry) => (
                <option key={`po-${entry.id}`} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
    </div>
  );
}

function decimalValue(input: string): number {
  const n = Number(input.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function intValue(input: string): number {
  return Math.max(0, Math.round(decimalValue(input)));
}

function defaultSchedule(): MonthlySchedule {
  const even = Array.from({ length: 12 }, () => 100 / 12);
  return {
    fertilizer: [...even],
    pesticide: [...even],
    irrigation: [...even]
  };
}

function defaultCrop(cropId = 0): CropForm {
  const base = crops[cropId];
  return {
    crop_id: cropId,
    area: "0",
    nitrogen: String(base.n_rate),
    phosphorus: String(base.p_rate),
    potassium: String(base.k_rate),
    manure: "0",
    compost: "0",
    greenManure: "0",
    diesel: "0",
    irrigation: String(base.irrigation),
    yield: String(base.yield),
    bioPest: "0",
    season: "spring",
    scheduleMode: "annual",
    schedule: defaultSchedule(),
    pesticides: [{ pesticide_id: "-1", rate: "0" }]
  };
}

function cloneCrop(crop: CropForm): CropForm {
  const schedule = crop.schedule
    ? {
        fertilizer: [...crop.schedule.fertilizer],
        pesticide: [...crop.schedule.pesticide],
        irrigation: [...crop.schedule.irrigation]
      }
    : undefined;
  return {
    ...crop,
    schedule,
    pesticides: crop.pesticides.map((pest) => ({ ...pest }))
  };
}

function rotationCropWithDefaults(crop: CropForm, cropId: number): CropForm {
  const base = defaultCrop(cropId);
  return { ...base, area: crop.area || "0" };
}

function cloneFormData(form: FarmForm): FarmForm {
  return {
    ...form,
    crops: form.crops.map((crop) => cloneCrop(crop))
  };
}

function clonePracticesData(practices: CropPractice[]): CropPractice[] {
  return practices.map((practice) => ({ ...practice }));
}

function createInitialForm(): FarmForm {
  return {
    totalArea: "0",
    dairyCows: "0",
    pigs: "0",
    chickens: "0",
    crops: [defaultCrop()]
  };
}

function defaultPractice(): CropPractice {
  return {
    tillage: "disk_tillage",
    precisionFertilization: false,
    coverCrop: false,
    irrigationMethod: "sprinkler",
    irrigationEnergy: "grid",
    residue: "incorporate"
  };
}

function tillageLabel(value: Tillage, lang: Lang): string {
  const en = {
    moldboard_plowing: "Moldboard plowing",
    disk_tillage: "Disk tillage",
    chisel_tillage: "Chisel tillage",
    strip_till: "Strip tillage",
    ridge_till: "Ridge tillage",
    no_till: "No-till"
  };
  const ua = {
    moldboard_plowing: "Оранка плугом",
    disk_tillage: "Дисковий обробіток",
    chisel_tillage: "Чизельний обробіток",
    strip_till: "Смуговий обробіток",
    ridge_till: "Гребеневий обробіток",
    no_till: "No-till"
  };
  return lang === "ua" ? ua[value] : en[value];
}

function irrigationMethodLabel(value: IrrigationMethod, lang: Lang): string {
  const en = {
    none: "No irrigation",
    furrow_surface: "Furrow (surface)",
    basin_flood: "Basin/Flood",
    sprinkler: "Sprinkler",
    center_pivot: "Center pivot (LEPA/LESA)",
    drip: "Drip",
    subsurface_drip: "Subsurface drip (SDI)"
  };
  const ua = {
    none: "Без зрошення",
    furrow_surface: "Борозенне (поверхневе)",
    basin_flood: "Басейнове/затоплення",
    sprinkler: "Дощування",
    center_pivot: "Центр-півот (LEPA/LESA)",
    drip: "Краплинне",
    subsurface_drip: "Підгрунтове краплинне (SDI)"
  };
  return lang === "ua" ? ua[value] : en[value];
}

function isLegumeCrop(cropId: number): boolean {
  const name = crops[cropId]?.name?.toLowerCase() ?? "";
  return ["pea", "bean", "soy", "lentil", "chickpea", "alfalfa", "clover", "lupin"].some((key) =>
    name.includes(key)
  );
}

function irrigationEnergyLabel(value: IrrigationEnergy, lang: Lang): string {
  const en = { grid: "Grid electricity", diesel_pump: "Diesel pump", solar: "Solar" };
  const ua = { grid: "Електромережа", diesel_pump: "Дизельний насос", solar: "Сонячна" };
  return lang === "ua" ? ua[value] : en[value];
}

function residueLabel(value: Residue, lang: Lang): string {
  const en = { incorporate: "Incorporate", retain: "Retain on field", burn: "Burn" };
  const ua = { incorporate: "Загортання", retain: "Залишати в полі", burn: "Спалювання" };
  return lang === "ua" ? ua[value] : en[value];
}

function benchmarkFarmTypeLabel(value: string, lang: Lang) {
  const en: Record<string, string> = {
    grain: "Grain farm",
    mixed: "Mixed farm",
    livestock: "Livestock-heavy"
  };
  const ua: Record<string, string> = {
    grain: "Зернове",
    mixed: "Змішане",
    livestock: "Тваринницьке"
  };
  return lang === "ua" ? ua[value] ?? value : en[value] ?? value;
}

function benchmarkClass(diff: number, base: number) {
  if (base <= 0) return "status-neutral";
  const ratio = diff / base;
  if (ratio <= -0.1) return "status-ok";
  if (ratio >= 0.1) return "status-bad";
  return "status-warn";
}

function applyPracticesAndPesticides(
  base: EmissionResults,
  farm: FarmData,
  practices: CropPractice[],
  pesticideSets: PesticideEntryForm[][],
  organicMode = false,
  organicInputs: OrganicInputs[] = []
): EmissionResults {
  const out: EmissionResults = {
    ...base,
    crop_results: base.crop_results.map((entry) => ({ ...entry }))
  };

  let fertilizer = 0;
  let manure = 0;
  let fuel = 0;
  let irrigation = 0;
  let pesticide = 0;

  for (let i = 0; i < out.crop_results.length; i += 1) {
    const pr = practices[i] ?? defaultPractice();
    const crop = out.crop_results[i];
    const cropPesticides = pesticideSets[i] ?? [];

    const tillageMultiplierByType: Record<Tillage, number> = {
      moldboard_plowing: 1.18,
      disk_tillage: 1.0,
      chisel_tillage: 0.88,
      strip_till: 0.76,
      ridge_till: 0.82,
      no_till: 0.64
    };
    const irrigationMultiplierByMethod: Record<IrrigationMethod, number> = {
      none: 0,
      furrow_surface: 1.22,
      basin_flood: 1.30,
      sprinkler: 1.0,
      center_pivot: 0.90,
      drip: 0.72,
      subsurface_drip: 0.66
    };
    const irrigationMultiplierByEnergy: Record<IrrigationEnergy, number> = {
      grid: 1.0,
      diesel_pump: 1.15,
      solar: 0.38
    };

    const tillageMultiplier = tillageMultiplierByType[pr.tillage];
    const irrigationMultiplier = irrigationMultiplierByMethod[pr.irrigationMethod] * irrigationMultiplierByEnergy[pr.irrigationEnergy];

    let fertilizerMultiplier = 1;
    if (pr.precisionFertilization) fertilizerMultiplier *= 0.9;
    if (pr.coverCrop) fertilizerMultiplier *= 0.92;

    crop.fertilizer_emissions *= fertilizerMultiplier;
    crop.fuel_emissions *= tillageMultiplier;
    crop.irrigation_emissions *= irrigationMultiplier;

    if (pr.residue === "burn") crop.fuel_emissions += crop.area * 0.22;
    if (pr.residue === "retain") crop.fertilizer_emissions = Math.max(0, crop.fertilizer_emissions - crop.area * 0.08);

    if (organicMode) {
      const organic = organicInputs[i] ?? { compost: 0, greenManure: 0, bioPest: 0 };
      const compostEmissions = (organic.compost * crop.area * ORGANIC_FACTORS.compost) / 1000.0;
      const greenManureEmissions = (organic.greenManure * crop.area * ORGANIC_FACTORS.greenManure) / 1000.0;
      const bioPestEmissions = (organic.bioPest * crop.area * ORGANIC_FACTORS.bioPest) / 1000.0;
      crop.manure_emissions = compostEmissions;
      crop.fertilizer_emissions = greenManureEmissions * fertilizerMultiplier;
      crop.pesticide_emissions = bioPestEmissions;
    } else {
      const pesticideEmission = cropPesticides.reduce((sum, item) => {
        const id = Number(item.pesticide_id);
        const rate = decimalValue(item.rate);
        if (id >= 0 && id < pesticides.length && rate > 0) {
          return sum + (rate * crop.area * pesticides[id].ef) / 1000.0;
        }
        return sum;
      }, 0);
      crop.pesticide_emissions = pesticideEmission;
    }

    crop.total_emissions =
      crop.fertilizer_emissions +
      crop.manure_emissions +
      crop.fuel_emissions +
      crop.irrigation_emissions +
      crop.pesticide_emissions +
      crop.livestock_emissions;

    fertilizer += crop.fertilizer_emissions;
    manure += crop.manure_emissions;
    fuel += crop.fuel_emissions;
    irrigation += crop.irrigation_emissions;
    pesticide += crop.pesticide_emissions;
  }

  out.fertilizer_emissions = fertilizer;
  out.manure_emissions = manure;
  out.fuel_emissions = fuel;
  out.irrigation_emissions = irrigation;
  out.pesticide_emissions = pesticide;
  out.total_emissions = fertilizer + manure + fuel + irrigation + pesticide + out.livestock_emissions;
  out.per_hectare_emissions = farm.total_farm_size > 0 ? out.total_emissions / farm.total_farm_size : 0;

  return out;
}

function impact(perHa: number, lang: Lang): { level: string; note: string; cls: string } {
  if (perHa < 2) {
    return {
      level: lang === "ua" ? "Низький" : "Low",
      note: lang === "ua" ? "Показник низький. Підтримуйте поточні практики й масштабуйте ефективні рішення." : "Low footprint. Keep current practices and scale what already works.",
      cls: "low"
    };
  }
  if (perHa < 5) {
    return {
      level: lang === "ua" ? "Помірний" : "Moderate",
      note: lang === "ua" ? "Сфокусуйтесь на 1-2 найбільших джерелах викидів цього сезону." : "Focus on the top 1-2 emission drivers this season.",
      cls: "moderate"
    };
  }
  return {
    level: lang === "ua" ? "Високий" : "High",
    note: lang === "ua" ? "Потрібен план швидкого скорочення: азот, паливо, зрошення та обробіток грунту." : "A rapid reduction plan is needed: nitrogen, fuel, irrigation and tillage first.",
    cls: "high"
  };
}

function decimalInputProps() {
  return { type: "text", inputMode: "decimal" as const };
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function downloadTextFile(text: string, filename: string, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8;` });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeFarm(form: FarmForm, nitrogenPct = 100, organicMode = false): FarmData {
  const nitrogenFactor = Math.max(0, nitrogenPct) / 100;
  return {
    total_farm_size: decimalValue(form.totalArea),
    num_crops: form.crops.length,
    crops: form.crops.map((crop) => ({
      crop_id: crop.crop_id,
      area: decimalValue(crop.area),
      nitrogen_kg_ha: organicMode ? 0 : Math.max(0, decimalValue(crop.nitrogen) * nitrogenFactor),
      phosphorus_kg_ha: organicMode ? 0 : decimalValue(crop.phosphorus),
      potassium_kg_ha: organicMode ? 0 : decimalValue(crop.potassium),
      // UI collects manure in t/ha; core model expects kg/ha.
      manure_kg_ha: organicMode ? 0 : decimalValue(crop.manure) * 1000,
      diesel_l_ha: decimalValue(crop.diesel),
      irrigation_mm: decimalValue(crop.irrigation),
      pesticide_id: -1,
      pesticide_rate: 0
    })),
    dairy_cows: intValue(form.dairyCows),
    pigs: intValue(form.pigs),
    chickens: intValue(form.chickens)
  };
}

type OrganicInputs = { compost: number; greenManure: number; bioPest: number };

const ORGANIC_FACTORS = {
  compost: 55,
  greenManure: 1.5,
  bioPest: 20
};

const REGION_FACTORS: Record<string, { fertilizer: number; fuel: number; irrigation: number }> = {
  Global: { fertilizer: 1.0, fuel: 1.0, irrigation: 1.0 },
  "North America": { fertilizer: 1.05, fuel: 1.02, irrigation: 0.95 },
  Europe: { fertilizer: 0.95, fuel: 0.98, irrigation: 0.85 },
  Ukraine: { fertilizer: 1.0, fuel: 1.0, irrigation: 0.9 },
  Asia: { fertilizer: 1.08, fuel: 1.03, irrigation: 1.05 },
  "South America": { fertilizer: 1.02, fuel: 1.0, irrigation: 0.98 },
  Africa: { fertilizer: 1.1, fuel: 1.04, irrigation: 1.08 },
  Australia: { fertilizer: 0.98, fuel: 0.99, irrigation: 0.9 }
};

const BENCHMARKS: Record<string, Record<string, { perHa: number }>> = {
  "North America": {
    grain: { perHa: 3.2 },
    mixed: { perHa: 4.5 },
    livestock: { perHa: 5.8 }
  },
  Europe: {
    grain: { perHa: 2.8 },
    mixed: { perHa: 4.1 },
    livestock: { perHa: 5.2 }
  },
  Ukraine: {
    grain: { perHa: 3.0 },
    mixed: { perHa: 4.3 },
    livestock: { perHa: 5.5 }
  },
  Asia: {
    grain: { perHa: 3.6 },
    mixed: { perHa: 4.9 },
    livestock: { perHa: 6.1 }
  },
  "South America": {
    grain: { perHa: 3.3 },
    mixed: { perHa: 4.6 },
    livestock: { perHa: 5.9 }
  },
  Africa: {
    grain: { perHa: 3.8 },
    mixed: { perHa: 5.1 },
    livestock: { perHa: 6.4 }
  },
  Australia: {
    grain: { perHa: 2.9 },
    mixed: { perHa: 4.0 },
    livestock: { perHa: 5.0 }
  },
  Global: {
    grain: { perHa: 3.1 },
    mixed: { perHa: 4.4 },
    livestock: { perHa: 5.6 }
  }
};

function buildOrganicInputs(form: FarmForm): OrganicInputs[] {
  return form.crops.map((crop) => ({
    compost: Math.max(0, decimalValue(crop.compost ?? "0")),
    greenManure: Math.max(0, decimalValue(crop.greenManure ?? "0")),
    bioPest: Math.max(0, decimalValue(crop.bioPest ?? "0"))
  }));
}

function applyRegionalFactors(results: EmissionResults, region: string, farmArea: number): EmissionResults {
  const factors = REGION_FACTORS[region] ?? REGION_FACTORS.Global;
  const adjusted: EmissionResults = {
    ...results,
    crop_results: results.crop_results.map((crop) => ({ ...crop }))
  };

  adjusted.crop_results.forEach((crop) => {
    crop.fertilizer_emissions *= factors.fertilizer;
    crop.fuel_emissions *= factors.fuel;
    crop.irrigation_emissions *= factors.irrigation;
    crop.total_emissions =
      crop.fertilizer_emissions +
      crop.manure_emissions +
      crop.fuel_emissions +
      crop.irrigation_emissions +
      crop.pesticide_emissions +
      crop.livestock_emissions;
  });

  adjusted.fertilizer_emissions *= factors.fertilizer;
  adjusted.fuel_emissions *= factors.fuel;
  adjusted.irrigation_emissions *= factors.irrigation;
  adjusted.total_emissions =
    adjusted.fertilizer_emissions +
    adjusted.manure_emissions +
    adjusted.fuel_emissions +
    adjusted.irrigation_emissions +
    adjusted.pesticide_emissions +
    adjusted.livestock_emissions;
  adjusted.per_hectare_emissions = farmArea > 0 ? adjusted.total_emissions / farmArea : 0;

  return adjusted;
}

const UNCERTAINTY_PCT = {
  fertilizer: 0.2,
  manure: 0.2,
  fuel: 0.15,
  irrigation: 0.2,
  pesticide: 0.2,
  livestock: 0.25
};

function calculateSequestration(form: FarmForm, practices: CropPractice[]) {
  let total = 0;
  form.crops.forEach((crop, index) => {
    const area = decimalValue(crop.area);
    const practice = practices[index] ?? defaultPractice();
    let rate = 0;
    if (practice.tillage === "no_till") rate += 0.3;
    if (practice.coverCrop) rate += 0.2;
    if (practice.residue === "retain") rate += 0.1;
    total += area * rate;
  });
  return total;
}

function coverCropLabel(value: WhatIfCoverOption, lang: Lang, currentLabel: string) {
  if (value === "current") return currentLabel;
  const on = lang === "ua" ? "Так" : "Yes";
  const off = lang === "ua" ? "Ні" : "No";
  return value === "on" ? on : off;
}

function Icon({ name, className = "icon" }: { name: IconName; className?: string }) {
  const pathByName: Record<IconName, string> = {
    farm: "M3 10.5 12 4l9 6.5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10ZM9 22v-6h6v6",
    crops: "M12 3v18M12 11c-3.5 0-6-1.5-7-5 4.5 0 7 2 7 5Zm0 0c3.5 0 6-1.5 7-5-4.5 0-7 2-7 5Z",
    practices: "M4 8h16M4 16h16M8 4v8M16 12v8",
    review: "M7 4h10l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4 8h6m-6 4h6m-6-8h2",
    results: "M4 19h16M7 15l3-3 2 2 5-5",
    breakdown: "M5 18h14M7 18V8m5 10V5m5 13v-7",
    footprint: "M12 3a6 6 0 0 1 6 6c0 4-3 8-6 12-3-4-6-8-6-12a6 6 0 0 1 6-6Z",
    perha: "M4 19h16M6 15l4-4 3 3 5-6",
    fertilizer: "M5 19h14l-2-8H7l-2 8Zm4-8V6h6v5",
    manure: "M12 4s5 4 5 8a5 5 0 1 1-10 0c0-4 5-8 5-8Z",
    fuel: "M6 6h8v12H6zM14 10h3l1 2v6h-4",
    irrigation: "M12 4v12m0 0c-2.2 0-4 1.3-4 3h8c0-1.7-1.8-3-4-3Z",
    pesticide: "M5 19c3-8 11-10 14-14 1 6-2 13-10 14",
    poultry: "M4 17c0-5 3-9 8-9 4 0 8 3 8 8 0 2-2 4-4 4H8c-2 0-4-1-4-3Zm7-9V5m0 0 2 2m-2-2-2 2",
    sun: "M12 4v2m0 12v2m8-8h-2M6 12H4m13.66 5.66-1.41-1.41M7.76 7.76 6.34 6.34m11.32 0-1.41 1.41M7.76 16.24l-1.42 1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    moon: "M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z",
    plus: "M12 5v14M5 12h14",
    back: "M15 18 9 12l6-6",
    next: "M9 6l6 6-6 6",
    calc: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h6M9 11h2m4 0h0M9 15h2m4 0h0",
    clear: "M18 6 6 18M6 6l12 12",
    reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
    livestock: "M4 17V8l4-2 4 2v9m0 0h8m-8 0v4m8-4V9l-3-2-3 2v8",
    info: "M12 17v-6m0-4h.01M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z",
    menu: "M4 6h16M4 12h16M4 18h16"
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={pathByName[name]} />
    </svg>
  );
}

function HelpTip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, opacity: 0, align: "center" as "center" | "left" | "right" });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    let raf = 0;
    const updatePosition = () => {
      const buttonEl = buttonRef.current;
      if (!buttonEl) return;
      const rect = buttonEl.getBoundingClientRect();
      const padding = 8;
      const widthLimit = Math.min(320, window.innerWidth - padding * 2);
      const heightLimit = Math.min(220, window.innerHeight - padding * 2);
      let align: "center" | "left" | "right" = "center";
      let left = rect.left + rect.width / 2;
      if (rect.left < padding + widthLimit / 2) {
        align = "left";
        left = padding;
      } else if (rect.right > window.innerWidth - padding - widthLimit / 2) {
        align = "right";
        left = window.innerWidth - padding;
      }
      let top = rect.bottom + 6;
      if (top + heightLimit > window.innerHeight - padding) {
        top = rect.top - heightLimit - 6;
      }
      if (top < padding) top = padding;
      setPosition({ top, left, opacity: 1, align });
    };
    raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, content]);

  return (
    <span className="tooltip-wrap">
      <button
        type="button"
        className="info-btn"
        ref={buttonRef}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setLocked((prev) => {
            const next = !prev;
            setOpen(next);
            return next;
          });
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!locked) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!locked) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setLocked(false);
            setOpen(false);
          }
        }}
      >
        i
      </button>
      {open && (
        createPortal(
          <span
          id={id}
          role="tooltip"
          className="tooltip-bubble"
          style={{
            top: position.top,
            left: position.left,
            opacity: position.opacity,
            overflow: "auto",
            maxWidth: "min(320px, calc(100vw - 16px))",
            maxHeight: "min(220px, calc(100vh - 16px))",
            transform: position.align === "center" ? "translateX(-50%)" : position.align === "right" ? "translateX(-100%)" : "none"
          }}
        >
          {content}
        </span>,
          document.body
        )
      )}
    </span>
  );
}

function livestockOnlyResults(livestock: number, poultry: number): EmissionResults {
  const total = livestock + poultry;
  return {
    fertilizer_emissions: 0,
    manure_emissions: 0,
    fuel_emissions: 0,
    irrigation_emissions: 0,
    pesticide_emissions: 0,
    livestock_emissions: total,
    total_emissions: total,
    per_hectare_emissions: 0,
    num_crops: 0,
    crop_results: []
  };
}

function practicesEqual(a: CropPractice[] | null, b: CropPractice[] | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.tillage !== right.tillage ||
      left.precisionFertilization !== right.precisionFertilization ||
      left.coverCrop !== right.coverCrop ||
      left.irrigationMethod !== right.irrigationMethod ||
      left.irrigationEnergy !== right.irrigationEnergy ||
      left.residue !== right.residue
    ) {
      return false;
    }
  }
  return true;
}

function calculateAdjustedResults(
  form: FarmForm,
  practices: CropPractice[],
  options?: {
    organicMode?: boolean;
    region?: string;
    customFactors?: CustomFactors;
    equipment?: EquipmentEntry[];
    irrigationFactor?: number;
  }
) {
  const organicInputs = buildOrganicInputs(form);
  const farmData = normalizeFarm(form, 100, Boolean(options?.organicMode));
  const base = calculateEmissions(farmData);
  const adjusted = applyPracticesAndPesticides(
    base,
    farmData,
    practices,
    form.crops.map((c) => c.pesticides),
    Boolean(options?.organicMode),
    organicInputs
  );
  const regional = applyRegionalFactors(adjusted, options?.region ?? "Global", farmData.total_farm_size);
  const customApplied = options?.customFactors ? applyCustomFactors(regional, farmData, options.customFactors) : regional;
  const weatherApplied = options?.irrigationFactor ? applyWeatherAdjustments(customApplied, options.irrigationFactor) : customApplied;
  const equipmentApplied = options?.equipment ? applyEquipmentEmissions(weatherApplied, options.equipment, options?.customFactors) : weatherApplied;
  return equipmentApplied;
}

function applyCustomFactors(results: EmissionResults, farm: FarmData, factors: CustomFactors): EmissionResults {
  const totalArea = farm.total_farm_size;
  const totalNitrogen = farm.crops.reduce((sum, c) => sum + c.nitrogen_kg_ha * c.area, 0);
  const totalPhosphorus = farm.crops.reduce((sum, c) => sum + c.phosphorus_kg_ha * c.area, 0);
  const totalPotassium = farm.crops.reduce((sum, c) => sum + c.potassium_kg_ha * c.area, 0);
  const baseFertilizer = (totalNitrogen * NITROGEN_FACTOR + totalPhosphorus * PHOSPHORUS_FACTOR + totalPotassium * POTASSIUM_FACTOR) / 1000;
  const customFertilizer = (totalNitrogen * factors.nitrogen + totalPhosphorus * factors.phosphorus + totalPotassium * factors.potassium) / 1000;
  const fertilizerRatio = baseFertilizer > 0 ? customFertilizer / baseFertilizer : 1;

  const totalDiesel = farm.crops.reduce((sum, c) => sum + c.diesel_l_ha * c.area, 0);
  const baseFuel = (totalDiesel * DIESEL_FACTOR) / 1000;
  const customFuel = (totalDiesel * factors.diesel) / 1000;
  const fuelRatio = baseFuel > 0 ? customFuel / baseFuel : 1;

  const totalIrrigationM3 = farm.crops.reduce((sum, c) => sum + c.irrigation_mm * 10 * c.area, 0);
  const baseIrrigation = (totalIrrigationM3 * IRRIGATION_FACTOR) / 1000;
  const customIrrigation = (totalIrrigationM3 * factors.electricity) / 1000;
  const irrigationRatio = baseIrrigation > 0 ? customIrrigation / baseIrrigation : 1;

  const livestockRatio = factors.livestock;

  const next: EmissionResults = {
    ...results,
    crop_results: results.crop_results.map((crop) => ({
      ...crop,
      fertilizer_emissions: crop.fertilizer_emissions * fertilizerRatio,
      fuel_emissions: crop.fuel_emissions * fuelRatio,
      irrigation_emissions: crop.irrigation_emissions * irrigationRatio,
      livestock_emissions: crop.livestock_emissions * livestockRatio,
      total_emissions:
        crop.fertilizer_emissions * fertilizerRatio +
        crop.manure_emissions +
        crop.fuel_emissions * fuelRatio +
        crop.irrigation_emissions * irrigationRatio +
        crop.pesticide_emissions +
        crop.livestock_emissions * livestockRatio
    }))
  };

  next.fertilizer_emissions = results.fertilizer_emissions * fertilizerRatio;
  next.fuel_emissions = results.fuel_emissions * fuelRatio;
  next.irrigation_emissions = results.irrigation_emissions * irrigationRatio;
  next.livestock_emissions = results.livestock_emissions * livestockRatio;
  next.total_emissions =
    next.fertilizer_emissions +
    next.manure_emissions +
    next.fuel_emissions +
    next.irrigation_emissions +
    next.pesticide_emissions +
    next.livestock_emissions;
  next.per_hectare_emissions = totalArea > 0 ? next.total_emissions / totalArea : 0;
  return next;
}

function applyWeatherAdjustments(results: EmissionResults, irrigationFactor: number): EmissionResults {
  if (Math.abs(irrigationFactor - 1) < 1e-6) return results;
  const next: EmissionResults = {
    ...results,
    crop_results: results.crop_results.map((crop) => ({
      ...crop,
      irrigation_emissions: crop.irrigation_emissions * irrigationFactor,
      total_emissions:
        crop.fertilizer_emissions +
        crop.manure_emissions +
        crop.fuel_emissions +
        crop.irrigation_emissions * irrigationFactor +
        crop.pesticide_emissions +
        crop.livestock_emissions
    }))
  };
  next.irrigation_emissions = results.irrigation_emissions * irrigationFactor;
  next.total_emissions =
    next.fertilizer_emissions +
    next.manure_emissions +
    next.fuel_emissions +
    next.irrigation_emissions +
    next.pesticide_emissions +
    next.livestock_emissions;
  next.per_hectare_emissions =
    results.per_hectare_emissions > 0 && results.total_emissions > 0
      ? (next.total_emissions / results.total_emissions) * results.per_hectare_emissions
      : next.total_emissions;
  return next;
}

function applyEquipmentEmissions(
  results: EmissionResults,
  equipment: EquipmentEntry[],
  factors?: CustomFactors
): EmissionResults {
  const dieselFactor = factors?.diesel ?? DIESEL_FACTOR;
  const electricityFactor = factors?.electricity ?? IRRIGATION_FACTOR;
  const totalEquipment = equipment.reduce((sum, item) => {
    const factor = item.fuel === "diesel" ? dieselFactor : electricityFactor;
    return sum + (item.hours * item.rate * factor) / 1000;
  }, 0);
  if (totalEquipment <= 0) return results;
  const next: EmissionResults = {
    ...results,
    fuel_emissions: results.fuel_emissions + totalEquipment,
    total_emissions: results.total_emissions + totalEquipment
  };
  next.per_hectare_emissions =
    results.per_hectare_emissions > 0 && results.total_emissions > 0
      ? (next.total_emissions / results.total_emissions) * results.per_hectare_emissions
      : next.total_emissions;
  return next;
}

export default function App() {
  const APP_VERSION = "0.1.0";
  const DATA_SOURCES = [
    "IPCC. 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories.",
    "IPCC. 2006 IPCC Guidelines for National Greenhouse Gas Inventories.",
    "EMEP/EEA. 2019 Air Pollutant Emission Inventory Guidebook (Agriculture).",
    "FAO. 2017 Global Livestock Environmental Assessment Model (GLEAM) documentation.",
    "US EPA. 2022 Inventory of U.S. Greenhouse Gas Emissions and Sinks (Agriculture)."
  ];
  const DATA_SOURCES_BIB = `@book{ipcc2019refinement,
  title={2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories},
  author={IPCC},
  year={2019},
  publisher={IPCC}
}

@book{ipcc2006guidelines,
  title={2006 IPCC Guidelines for National Greenhouse Gas Inventories},
  author={IPCC},
  year={2006},
  publisher={IPCC}
}

@book{emep2019agri,
  title={EMEP/EEA Air Pollutant Emission Inventory Guidebook},
  author={EMEP/EEA},
  year={2019},
  publisher={European Environment Agency}
}

@manual{fao2017gleam,
  title={GLEAM 2.0 - Global Livestock Environmental Assessment Model Documentation},
  author={FAO},
  year={2017},
  organization={Food and Agriculture Organization}
}

@report{epa2022inventory,
  title={Inventory of U.S. Greenhouse Gas Emissions and Sinks},
  author={US EPA},
  year={2022},
  institution={US Environmental Protection Agency}
}`;
  const DEFAULT_CUSTOM_FACTORS: CustomFactors = {
    nitrogen: NITROGEN_FACTOR,
    phosphorus: PHOSPHORUS_FACTOR,
    potassium: POTASSIUM_FACTOR,
    diesel: DIESEL_FACTOR,
    electricity: IRRIGATION_FACTOR,
    livestock: 1
  };
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [mode, setMode] = useState<"wizard" | "advanced">("wizard");
  const [wizardStep, setWizardStep] = useState(0);
  const t = useMemo(() => getDictWithFallback(lang), [lang]);
  const regionLabels = useMemo<Record<string, string>>(
    () => ({
      Global: t.regionGlobal,
      "North America": t.regionNorthAmerica,
      Europe: t.regionEurope,
      Ukraine: t.regionUkraine,
      Asia: t.regionAsia,
      "South America": t.regionSouthAmerica,
      Africa: t.regionAfrica,
      Australia: t.regionAustralia
    }),
    [t]
  );
  const regionLabel = (region: string) => regionLabels[region] ?? region;
  const equipmentTypeLabel = (type: EquipmentEntry["type"]) => {
    const map: Record<EquipmentEntry["type"], string> = {
      tractor: t.equipmentTypeTractor,
      combine: t.equipmentTypeCombine,
      irrigation_pump: t.equipmentTypeIrrigationPump,
      sprayer: t.equipmentTypeSprayer,
      sprinkler_system: t.equipmentTypeSprinkler,
      seed_drill: t.equipmentTypeSeedDrill,
      planter: t.equipmentTypePlanter,
      harvester: t.equipmentTypeHarvester,
      other: t.equipmentTypeOther
    };
    return map[type] ?? type;
  };
  const equipmentFuelLabel = (fuel: EquipmentEntry["fuel"]) => {
    const map: Record<EquipmentEntry["fuel"], string> = {
      diesel: t.fuelDiesel,
      electric: t.fuelElectric
    };
    return map[fuel] ?? fuel;
  };
  const recommendationTitleById = (id: RecommendationItem["id"]) => {
    const map: Record<RecommendationItem["id"], string> = {
      no_till: t.recNoTillTitle,
      precision: t.recPrecisionTitle,
      irrigation: t.recIrrigationTitle,
      cover: t.recCoverTitle
    };
    return map[id] ?? id;
  };
  const climateZones = useMemo(() => ({
    arid: { label: lang === "en" ? "Arid" : "Посушливий", precipitation: 200, temperature: 22, irrigationFactor: 1.2 },
    semi_arid: { label: lang === "en" ? "Semi-arid" : "Напівпосушливий", precipitation: 400, temperature: 20, irrigationFactor: 1.1 },
    temperate: { label: lang === "en" ? "Temperate" : "Помірний", precipitation: 650, temperature: 14, irrigationFactor: 1.0 },
    humid: { label: lang === "en" ? "Humid" : "Вологий", precipitation: 900, temperature: 18, irrigationFactor: 0.9 },
    tropical: { label: lang === "en" ? "Tropical" : "Тропічний", precipitation: 1400, temperature: 26, irrigationFactor: 0.95 }
  }), [lang]);

  useEffect(() => {
    validateDictionary(dict);
  }, []);

  const [form, setForm] = useState<FarmForm>(createInitialForm);

  const [practices, setPractices] = useState<CropPractice[]>([defaultPractice()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<EmissionResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [animalBreakdown, setAnimalBreakdown] = useState<AnimalBreakdown | null>(null);
  const [lastCalcForm, setLastCalcForm] = useState<FarmForm | null>(null);
  const [lastCalcPractices, setLastCalcPractices] = useState<CropPractice[] | null>(null);
  const [practiceComparison, setPracticeComparison] = useState<PracticeComparison | null>(null);
  const [practiceComparisonVisible, setPracticeComparisonVisible] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [calculationDate, setCalculationDate] = useState<Date | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historySelected, setHistorySelected] = useState<Set<string>>(new Set());
  const [historySelectAll, setHistorySelectAll] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());
  const [compareLeftId, setCompareLeftId] = useState<string>("");
  const [compareRightId, setCompareRightId] = useState<string>("");
  const [whatIfNitrogen, setWhatIfNitrogen] = useState(100);
  const [whatIfTillageIndex, setWhatIfTillageIndex] = useState(0);
  const [whatIfIrrigationIndex, setWhatIfIrrigationIndex] = useState(0);
  const [whatIfCoverIndex, setWhatIfCoverIndex] = useState(0);
  const [whatIfName, setWhatIfName] = useState("");
  const [whatIfMessage, setWhatIfMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [projectionYears, setProjectionYears] = useState(5);
  const [projectionRates, setProjectionRates] = useState<ProjectionRates>({
    fertilizer: 0,
    manure: 0,
    fuel: 0,
    irrigation: 0,
    pesticide: 0,
    livestock: 0
  });
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<RecommendationItem["id"]>>(new Set());
  const [actionPlanSelection, setActionPlanSelection] = useState<Set<RecommendationItem["id"]>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutsPanelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [sectionCollapsed, setSectionCollapsed] = useState({
    farm: false,
    livestock: false,
    crops: false,
    practices: false,
    equipment: false
  });
  const [collapsedCrops, setCollapsedCrops] = useState<Set<number>>(new Set());
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [pesticideSearch, setPesticideSearch] = useState<Record<string, string>>({});
  const [autoArea, setAutoArea] = useState(false);
  const [autoFieldMap, setAutoFieldMap] = useState<Record<number, AutoField[]>>({});
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large" | "extra-large">("medium");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsLastFocusRef = useRef<HTMLElement | null>(null);
  const [settingsRegion, setSettingsRegion] = useState("Global");
  const [autoSaveInterval, setAutoSaveInterval] = useState(2);
  const [organicMode, setOrganicMode] = useState(false);
  const [benchmarkRegion, setBenchmarkRegion] = useState("Europe");
  const [benchmarkFarmType, setBenchmarkFarmType] = useState("grain");
  const [seasonalAnalysis, setSeasonalAnalysis] = useState(false);
  const [schedulingMode, setSchedulingMode] = useState(false);
  const [climateZone, setClimateZone] = useState<ClimateZoneKey>("temperate");
  const [customFactors, setCustomFactors] = useState<CustomFactors>(DEFAULT_CUSTOM_FACTORS);
  const [customFactorsEnabled, setCustomFactorsEnabled] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [goalSetting, setGoalSetting] = useState<GoalSetting>({ mode: "percent", value: 10 });
  const [analytics, setAnalytics] = useState<AnalyticsState>({ enabled: true, events: {} });
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBatchMode, setShowBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ name: string; total: number; perHa: number }>>([]);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [rotationPlan, setRotationPlan] = useState<{ years: Array<{ id: string; name: string; crops: CropForm[] }>; avg: number } | null>(null);
  const [showRotationPlanner, setShowRotationPlanner] = useState(false);
  const [costAssumptions, setCostAssumptions] = useState<Record<RecommendationItem["id"], { cost: number; savings: number }>>({
    no_till: { cost: 1200, savings: 400 },
    precision: { cost: 900, savings: 350 },
    irrigation: { cost: 2200, savings: 600 },
    cover: { cost: 700, savings: 250 }
  });
  const [recStatus, setRecStatus] = useState<Record<RecommendationItem["id"], { status: "implemented" | "planned" | "na"; notes: string }>>({
    no_till: { status: "planned", notes: "" },
    precision: { status: "planned", notes: "" },
    irrigation: { status: "planned", notes: "" },
    cover: { status: "planned", notes: "" }
  });
  const [hideImplementedRecs, setHideImplementedRecs] = useState(false);
  const [baselineId, setBaselineId] = useState("");
  const [carbonPrice, setCarbonPrice] = useState(20);
  const [templateRegion, setTemplateRegion] = useState<"temperate" | "subtropical">("temperate");
  const [showExamples, setShowExamples] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [sampleSelection, setSampleSelection] = useState<SampleCalculation | null>(null);
  const sampleSnapshotRef = useRef<SampleSnapshot | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [compatIssues, setCompatIssues] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<"form" | "results">("form");
  const headerMenuId = useId();
  const formPanelRef = useRef<HTMLDivElement | null>(null);

  const { draftExists, draft, acceptDraft, rejectDraft } = useDraftRecovery();
  const pieSvgRef = useRef<SVGSVGElement | null>(null);
  const cropSvgRef = useRef<SVGSVGElement | null>(null);
  const trendSvgRef = useRef<SVGSVGElement | null>(null);
  const heatmapSvgRef = useRef<SVGSVGElement | null>(null);
  const practiceCompareTimerRef = useRef<number | null>(null);
  const practiceComparisonRef = useRef<PracticeComparison | null>(null);
  const prevPracticesRef = useRef<CropPractice[] | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!showHeaderMenu) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowHeaderMenu(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showHeaderMenu]);

  useEffect(() => {
    if (!showHeaderMenu) return;
    const updatePosition = () => {
      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(560, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
      const top = rect.bottom + 10;
      setMenuPosition({ top, left, width: panelWidth });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showHeaderMenu]);

  useEffect(() => {
    document.documentElement.setAttribute("data-contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (results) {
      setActiveView("results");
      return;
    }
    if (!isCalculating) {
      setActiveView("form");
    }
  }, [results, isCalculating]);

  useEffect(() => {
    if (activeView !== "form") return;
    const panel = formPanelRef.current;
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [wizardStep, mode, activeView]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:region");
      if (stored) setSettingsRegion(stored);
    } catch (e) {
      console.warn("Failed to load region:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:autoSaveInterval");
      if (stored) {
        const value = Number(stored);
        if (Number.isFinite(value) && value > 0) setAutoSaveInterval(value);
      }
    } catch (e) {
      console.warn("Failed to load auto-save interval:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:organicMode");
      if (stored) setOrganicMode(stored === "true");
    } catch (e) {
      console.warn("Failed to load organic mode:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:customFactors");
      if (stored) {
        const parsed = JSON.parse(stored) as CustomFactors;
        setCustomFactors({ ...DEFAULT_CUSTOM_FACTORS, ...parsed });
        setCustomFactorsEnabled(true);
      }
    } catch (e) {
      console.warn("Failed to load custom factors:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:climateZone");
      if (stored && climateZones[stored as ClimateZoneKey]) {
        setClimateZone(stored as ClimateZoneKey);
      }
    } catch (e) {
      console.warn("Failed to load climate zone:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:equipment");
      if (stored) setEquipment(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to load equipment:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:goal");
      if (stored) setGoalSetting(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to load goal:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:recommendationStatus");
      if (stored) setRecStatus({ ...recStatus, ...JSON.parse(stored) });
    } catch (e) {
      console.warn("Failed to load recommendation status:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:hideImplementedRecs");
      if (stored) setHideImplementedRecs(stored === "true");
    } catch (e) {
      console.warn("Failed to load recommendation filter:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:analytics");
      if (stored) setAnalytics(JSON.parse(stored));
    } catch (e) {
      console.warn("Failed to load analytics:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui:region", settingsRegion);
    } catch (e) {
      console.warn("Failed to save region:", e);
    }
  }, [settingsRegion]);

  useEffect(() => {
    try {
      if (customFactorsEnabled) {
        localStorage.setItem("ui:customFactors", JSON.stringify(customFactors));
      } else {
        localStorage.removeItem("ui:customFactors");
      }
    } catch (e) {
      console.warn("Failed to save custom factors:", e);
    }
  }, [customFactors, customFactorsEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:climateZone", climateZone);
    } catch (e) {
      console.warn("Failed to save climate zone:", e);
    }
  }, [climateZone]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:equipment", JSON.stringify(equipment));
    } catch (e) {
      console.warn("Failed to save equipment:", e);
    }
  }, [equipment]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:goal", JSON.stringify(goalSetting));
    } catch (e) {
      console.warn("Failed to save goal:", e);
    }
  }, [goalSetting]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:recommendationStatus", JSON.stringify(recStatus));
    } catch (e) {
      console.warn("Failed to save recommendation status:", e);
    }
  }, [recStatus]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:hideImplementedRecs", String(hideImplementedRecs));
    } catch (e) {
      console.warn("Failed to save recommendation filter:", e);
    }
  }, [hideImplementedRecs]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:analytics", JSON.stringify(analytics));
    } catch (e) {
      console.warn("Failed to save analytics:", e);
    }
  }, [analytics]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:autoSaveInterval", String(autoSaveInterval));
    } catch (e) {
      console.warn("Failed to save auto-save interval:", e);
    }
  }, [autoSaveInterval]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:organicMode", organicMode ? "true" : "false");
    } catch (e) {
      console.warn("Failed to save organic mode:", e);
    }
  }, [organicMode]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:costAssumptions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setCostAssumptions((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {
      console.warn("Failed to load cost assumptions:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui:costAssumptions", JSON.stringify(costAssumptions));
    } catch (e) {
      console.warn("Failed to save cost assumptions:", e);
    }
  }, [costAssumptions]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:carbonPrice");
      if (stored) {
        const value = Number(stored);
        if (Number.isFinite(value) && value > 0) setCarbonPrice(value);
      }
    } catch (e) {
      console.warn("Failed to load carbon price:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui:carbonPrice", String(carbonPrice));
    } catch (e) {
      console.warn("Failed to save carbon price:", e);
    }
  }, [carbonPrice]);

  useEffect(() => {
    const issues: string[] = [];
    if (typeof ResizeObserver === "undefined") issues.push("ResizeObserver");
    if (!("localStorage" in window)) issues.push("localStorage");
    if (!("Intl" in window)) issues.push("Intl");
    if (!("serviceWorker" in navigator)) issues.push("Service Worker");
    if (!("ClipboardItem" in window)) issues.push("Clipboard");
    setCompatIssues(issues);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:contrast");
      if (!stored) return;
      setHighContrast(stored === "high");
    } catch (e) {
      console.warn("Failed to load contrast setting:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:font");
      if (!stored) return;
      if (stored === "small" || stored === "medium" || stored === "large" || stored === "extra-large") {
        setFontSize(stored);
      }
    } catch (e) {
      console.warn("Failed to load font size:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui:contrast", highContrast ? "high" : "normal");
    } catch (e) {
      console.warn("Failed to save contrast setting:", e);
    }
  }, [highContrast]);

  useEffect(() => {
    try {
      localStorage.setItem("ui:font", fontSize);
    } catch (e) {
      console.warn("Failed to save font size:", e);
    }
  }, [fontSize]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    let alive = true;
    storageManager
      .loadHistory()
      .then((items) => {
        if (!alive) return;
        setHistory(items);
      })
      .catch((e) => {
        console.warn("Failed to load history:", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (showRotationPlanner) ensureRotationPlan();
  }, [showRotationPlanner]);

  useEffect(() => {
    if (!results) return;
    setWhatIfNitrogen(100);
    setWhatIfTillageIndex(0);
    setWhatIfIrrigationIndex(0);
    setWhatIfCoverIndex(0);
    setWhatIfName("");
    setWhatIfMessage(null);
    prevPracticesRef.current = practices;
    setActionPlanSelection(new Set());
    setAutoFieldMap({});
  }, [results]);

  useEffect(() => {
    practiceComparisonRef.current = practiceComparison;
  }, [practiceComparison]);

  useEffect(() => {
    return () => {
      if (practiceCompareTimerRef.current) {
        window.clearTimeout(practiceCompareTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showShortcuts) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const panel = shortcutsPanelRef.current;
    if (panel) {
      const focusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowShortcuts(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showShortcuts]);

  useEffect(() => {
    function handleFontShortcuts(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (!modKey) return;
      const key = event.key;
      if (key === "+" || key === "=") {
        event.preventDefault();
        setFontSize((prev) => {
          if (prev === "small") return "medium";
          if (prev === "medium") return "large";
          if (prev === "large") return "extra-large";
          return prev;
        });
      }
      if (key === "-") {
        event.preventDefault();
        setFontSize((prev) => {
          if (prev === "extra-large") return "large";
          if (prev === "large") return "medium";
          if (prev === "medium") return "small";
          return prev;
        });
      }
    }
    window.addEventListener("keydown", handleFontShortcuts);
    return () => window.removeEventListener("keydown", handleFontShortcuts);
  }, []);

  useEffect(() => {
    function handleSettingsShortcut(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (!modKey) return;
      if (event.key === ",") {
        event.preventDefault();
        setShowSettings(true);
      }
    }
    window.addEventListener("keydown", handleSettingsShortcut);
    return () => window.removeEventListener("keydown", handleSettingsShortcut);
  }, []);

  useEffect(() => {
    if (showShortcuts) return;
    lastFocusedRef.current?.focus();
  }, [showShortcuts]);

  useEffect(() => {
    if (!showSettings) return;
    settingsLastFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = settingsPanelRef.current;
    if (panel) {
      const focusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowSettings(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSettings]);

  useEffect(() => {
    if (showSettings) return;
    settingsLastFocusRef.current?.focus();
  }, [showSettings]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:collapsed");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        setSectionCollapsed((prev) => ({
          ...prev,
          ...parsed
        }));
      }
    } catch (e) {
      console.warn("Failed to load collapsed sections:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui:collapsed", JSON.stringify(sectionCollapsed));
    } catch (e) {
      console.warn("Failed to save collapsed sections:", e);
    }
  }, [sectionCollapsed]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (!modKey) return;

      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() ?? "";
      const isFormField = tag === "input" || tag === "textarea" || tag === "select";
      if (isFormField && key !== "enter") return;
      if (key === "s") {
        event.preventDefault();
        const name = window.prompt(t.shortcutSavePrompt);
        if (!name) return;
        profileManager
          .save(name, form, practices)
          .then(() => pushToast(t.shortcutSaveSuccess, "success"))
          .catch(() => pushToast(t.shortcutSaveError, "error", true));
        return;
      }
      if (key === "e") {
        event.preventDefault();
        if (!results) return;
        const farmArea = decimalValue(form.totalArea || "0");
        downloadResultsAsCSV(results, { farmArea }, lang);
        return;
      }
      if (key === "enter") {
        event.preventDefault();
        runCalculation();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        addCrop();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        duplicateCrop(form.crops.length - 1);
        return;
      }
      if (key === "/") {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [t, form, practices, results, lang]);

  const totals = useMemo(() => {
    if (!results) return [];
    const livestockOnly = animalBreakdown ? animalBreakdown.livestock : results.livestock_emissions;
    const poultryOnly = animalBreakdown ? animalBreakdown.poultry : 0;
    return [
      { icon: "fertilizer" as IconName, label: t.fertilizer, value: results.fertilizer_emissions },
      { icon: "manure" as IconName, label: t.manureCat, value: results.manure_emissions },
      { icon: "fuel" as IconName, label: t.fuel, value: results.fuel_emissions },
      { icon: "irrigation" as IconName, label: t.irrigationCat, value: results.irrigation_emissions },
      { icon: "pesticide" as IconName, label: t.pesticideCat, value: results.pesticide_emissions },
      { icon: "livestock" as IconName, label: t.livestockCat, value: livestockOnly },
      { icon: "poultry" as IconName, label: t.poultryCat, value: poultryOnly }
    ];
  }, [results, t, animalBreakdown]);

  const pieChartData = useMemo<PieChartData[]>(() => {
    if (!results) return [];
    return buildEmissionPieChartData({
      results,
      labels: {
        fertilizer: t.fertilizer,
        manure: t.manureCat,
        fuel: t.fuel,
        irrigation: t.irrigationCat,
        pesticide: t.pesticideCat,
        livestock: t.livestockCat,
        poultry: t.poultryCat,
      },
      animalBreakdown,
    });
  }, [results, t, animalBreakdown]);

  const cropComparisonData = useMemo(() => {
    if (!results) return [];
    return buildCropComparisonChartData({
      results,
      getCropLabel: (cropId) => cropLabel(cropId, lang),
      labels: {
        fertilizer: t.fertilizer,
        manure: t.manureCat,
        fuel: t.fuel,
        irrigation: t.irrigationCat,
        pesticide: t.pesticideCat,
      },
    });
  }, [results, lang, t]);

  const trendPoints = useMemo<EmissionTrendPoint[]>(() => buildEmissionTrendPoints(history), [history]);

  const filteredHistory = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    const fromDate = historyFrom ? new Date(historyFrom) : null;
    const toDate = historyTo ? new Date(historyTo) : null;

    return [...history]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((entry) => {
        const farmName = (entry.farmName || "").toLowerCase();
        if (search && !farmName.includes(search)) return false;
        const ts = new Date(entry.timestamp).getTime();
        if (fromDate && ts < fromDate.getTime()) return false;
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          if (ts > end.getTime()) return false;
        }
        return true;
      });
  }, [history, historySearch, historyFrom, historyTo]);
  const compareEntries = useMemo(
    () => filteredHistory.filter((entry) => compareSelection.has(entry.id)),
    [filteredHistory, compareSelection]
  );
  const compareExtremes = useMemo(() => {
    if (compareEntries.length === 0) return null;
    const totals = compareEntries.map((entry) => entry.results?.total_emissions ?? 0);
    const perHa = compareEntries.map((entry) => entry.results?.per_hectare_emissions ?? 0);
    return {
      minTotal: Math.min(...totals),
      maxTotal: Math.max(...totals),
      minPerHa: Math.min(...perHa),
      maxPerHa: Math.max(...perHa)
    };
  }, [compareEntries]);

  const historyOptions = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((entry) => ({
        id: entry.id,
        label: `${entry.farmName || (lang === "en" ? "Unnamed farm" : "Без назви")} • ${new Date(entry.timestamp).toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}`,
      }));
  }, [history, lang]);

  const compareLeft = useMemo(() => history.find((h) => h.id === compareLeftId) || null, [history, compareLeftId]);
  const compareRight = useMemo(() => history.find((h) => h.id === compareRightId) || null, [history, compareRightId]);

  useEffect(() => {
    setHistorySelected(new Set());
    setHistorySelectAll(false);
    setCompareSelection(new Set());
  }, [historySearch, historyFrom, historyTo, history]);

  const impactInfo = useMemo(() => (results ? impact(results.per_hectare_emissions, lang) : null), [results, lang]);
  const sequestration = useMemo(() => (results ? calculateSequestration(form, practices) : 0), [results, form, practices]);
  const uncertainty = useMemo(() => {
    if (!results) return null;
    const farmArea = Math.max(0, decimalValue(form.totalArea));
    const categories = [
      { key: "fertilizer", label: t.fertilizer, value: results.fertilizer_emissions, pct: UNCERTAINTY_PCT.fertilizer },
      { key: "manure", label: t.manureCat, value: results.manure_emissions, pct: UNCERTAINTY_PCT.manure },
      { key: "fuel", label: t.fuel, value: results.fuel_emissions, pct: UNCERTAINTY_PCT.fuel },
      { key: "irrigation", label: t.irrigationCat, value: results.irrigation_emissions, pct: UNCERTAINTY_PCT.irrigation },
      { key: "pesticide", label: t.pesticideCat, value: results.pesticide_emissions, pct: UNCERTAINTY_PCT.pesticide },
      { key: "livestock", label: t.livestockCat, value: results.livestock_emissions, pct: UNCERTAINTY_PCT.livestock }
    ];
    const totalLow = categories.reduce((sum, c) => sum + c.value * (1 - c.pct), 0);
    const totalHigh = categories.reduce((sum, c) => sum + c.value * (1 + c.pct), 0);
    return {
      categories,
      totalLow,
      totalHigh,
      perHaLow: farmArea > 0 ? totalLow / farmArea : 0,
      perHaHigh: farmArea > 0 ? totalHigh / farmArea : 0
    };
  }, [results, form.totalArea, t]);
  const equipmentEmissions = useMemo(() => {
    const dieselFactor = customFactorsEnabled ? customFactors.diesel : DIESEL_FACTOR;
    const electricityFactor = customFactorsEnabled ? customFactors.electricity : IRRIGATION_FACTOR;
    return equipment.reduce((sum, item) => {
      const factor = item.fuel === "diesel" ? dieselFactor : electricityFactor;
      return sum + (item.hours * item.rate * factor) / 1000;
    }, 0);
  }, [equipment, customFactorsEnabled, customFactors]);
  const templates = useMemo<FarmTemplate[]>(() => {
    const climateFactor = templateRegion === "temperate" ? 1 : 1.2;
    const buildCrop = (cropId: number, area: number, overrides?: Partial<CropForm>) => {
      const base = defaultCrop(cropId);
      return {
        ...base,
        area: String(area),
        irrigation: String(decimalValue(base.irrigation) * climateFactor),
        ...overrides
      };
    };
    return [
      {
        id: "grain",
        name: lang === "en" ? "Small Grain Farm" : "Зернове господарство",
        description: lang === "en" ? "Wheat, barley, and rapeseed focus." : "Фокус на пшениці, ячмені та ріпаку.",
        form: {
          totalArea: "120",
          dairyCows: "0",
          pigs: "0",
          chickens: "0",
          crops: [buildCrop(0, 50), buildCrop(6, 40), buildCrop(7, 30)]
        },
        practices: [defaultPractice(), defaultPractice(), defaultPractice()]
      },
      {
        id: "mixed",
        name: lang === "en" ? "Mixed Livestock Farm" : "Змішане тваринницьке",
        description: lang === "en" ? "Feed crops with livestock integration." : "Кормові культури та тваринництво.",
        form: {
          totalArea: "80",
          dairyCows: "45",
          pigs: "80",
          chickens: "120",
          crops: [buildCrop(1, 30), buildCrop(15, 25), buildCrop(16, 25)]
        },
        practices: [defaultPractice(), defaultPractice(), defaultPractice()]
      },
      {
        id: "veg",
        name: lang === "en" ? "Vegetable Farm" : "Овочеве господарство",
        description: lang === "en" ? "Irrigated vegetables and high inputs." : "Зрошувані овочі з високими вводами.",
        form: {
          totalArea: "40",
          dairyCows: "0",
          pigs: "0",
          chickens: "0",
          crops: [buildCrop(4, 15), buildCrop(19, 10), buildCrop(27, 8), buildCrop(28, 7)]
        },
        practices: [defaultPractice(), defaultPractice(), defaultPractice(), defaultPractice()]
      }
    ];
  }, [templateRegion, lang]);
  const samples = useMemo<SampleCalculation[]>(() => {
    const baseSamples = [
      {
        name: lang === "en" ? "Low-input grain" : "Низьковитратне зерно",
        notes: lang === "en" ? "Dryland grain with reduced inputs." : "Сухі зернові з меншими вводами.",
        form: {
          totalArea: "150",
          dairyCows: "0",
          pigs: "0",
          chickens: "0",
          crops: [{ ...defaultCrop(0), area: "80" }, { ...defaultCrop(6), area: "70" }]
        },
        practices: [defaultPractice(), defaultPractice()]
      },
      {
        name: lang === "en" ? "High-intensity vegetables" : "Інтенсивні овочі",
        notes: lang === "en" ? "Irrigated vegetables with higher fertilizer." : "Зрошувані овочі з високими нормами.",
        form: {
          totalArea: "30",
          dairyCows: "0",
          pigs: "0",
          chickens: "0",
          crops: [{ ...defaultCrop(4), area: "12" }, { ...defaultCrop(19), area: "10" }, { ...defaultCrop(28), area: "8" }]
        },
        practices: [defaultPractice(), defaultPractice(), defaultPractice()]
      },
      {
        name: lang === "en" ? "Livestock + forage" : "Тваринництво + корми",
        notes: lang === "en" ? "Forage crops supporting dairy." : "Кормові культури для ВРХ.",
        form: {
          totalArea: "90",
          dairyCows: "60",
          pigs: "40",
          chickens: "0",
          crops: [{ ...defaultCrop(15), area: "50" }, { ...defaultCrop(1), area: "40" }]
        },
        practices: [defaultPractice(), defaultPractice()]
      }
    ];
    return baseSamples.map((sample) => ({
      ...sample,
      results: calculateAdjustedResults(sample.form, sample.practices, { organicMode: false, region: "Global" })
    }));
  }, [lang]);
  const seasonalBreakdown = useMemo(() => {
    if (!results || !seasonalAnalysis) return null;
    const totals: Record<string, number> = { spring: 0, summer: 0, fall: 0, winter: 0 };
    results.crop_results.forEach((crop, index) => {
      const season = form.crops[index]?.season ?? "spring";
      totals[season] = (totals[season] ?? 0) + crop.total_emissions;
    });
    const entries = [
      { key: "spring", label: t.seasonSpring, value: totals.spring },
      { key: "summer", label: t.seasonSummer, value: totals.summer },
      { key: "fall", label: t.seasonFall, value: totals.fall },
      { key: "winter", label: t.seasonWinter, value: totals.winter }
    ];
    const top = entries.reduce((best, item) => (item.value > best.value ? item : best), entries[0]);
    return { entries, top };
  }, [results, seasonalAnalysis, form.crops, t]);
  const monthlyBreakdown = useMemo(() => {
    if (!results || !schedulingMode) return null;
    const months = Array.from({ length: 12 }, () => 0);
    results.crop_results.forEach((cropResult, index) => {
      const cropForm = form.crops[index];
      if (!cropForm || cropForm.scheduleMode !== "monthly" || !cropForm.schedule) return;
      const schedule = cropForm.schedule;
      for (let m = 0; m < 12; m += 1) {
        const fertilizerPart = cropResult.fertilizer_emissions * (schedule.fertilizer[m] ?? 0) / 100;
        const pesticidePart = cropResult.pesticide_emissions * (schedule.pesticide[m] ?? 0) / 100;
        const irrigationPart = cropResult.irrigation_emissions * (schedule.irrigation[m] ?? 0) / 100;
        const other = (cropResult.manure_emissions + cropResult.fuel_emissions + cropResult.livestock_emissions) / 12;
        months[m] += fertilizerPart + pesticidePart + irrigationPart + other;
      }
    });
    const max = Math.max(...months, 0.0001);
    return { months, max };
  }, [results, schedulingMode, form.crops]);
  const historyTrend = useMemo(() => {
    if (history.length < 2) return null;
    const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest = sorted[0];
    const previous = sorted[1];
    if (!latest?.results || !previous?.results) return null;
    const latestPerHa = latest.results.per_hectare_emissions ?? 0;
    const previousPerHa = previous.results.per_hectare_emissions ?? 0;
    const delta = latestPerHa - previousPerHa;
    const percent = Math.abs(previousPerHa) < 1e-6 ? 0 : (delta / previousPerHa) * 100;
    const direction = Math.abs(delta) < 1e-6 ? "flat" : delta > 0 ? "up" : "down";
    const symbol = direction === "up" ? "^" : direction === "down" ? "v" : "-";
    return { latestPerHa, previousPerHa, delta, percent, direction, symbol };
  }, [history]);
  const dashboardStats = useMemo(() => {
    if (history.length === 0) return null;
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const perHaValues = sorted.map((item) => item.results?.per_hectare_emissions ?? 0);
    const total = sorted.length;
    const average = perHaValues.reduce((sum, v) => sum + v, 0) / Math.max(1, perHaValues.length);
    const lowest = Math.min(...perHaValues);
    const highest = Math.max(...perHaValues);
    const start = new Date(sorted[0].timestamp);
    const end = new Date(sorted[sorted.length - 1].timestamp);
    const maxValue = Math.max(...perHaValues, 0.0001);
    const points = perHaValues.map((value, index) => {
      const x = 10 + (index / Math.max(1, perHaValues.length - 1)) * 180;
      const y = 50 - (value / maxValue) * 40;
      return { x, y };
    });
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return { total, average, lowest, highest, start, end, path };
  }, [history]);
  const rotationStats = useMemo(() => {
    if (!rotationPlan) return null;
    const yearResults = rotationPlan.years.map((year, index) => {
      const prev = rotationPlan.years[index - 1];
      const hadLegume = prev ? prev.crops.some((crop) => isLegumeCrop(crop.crop_id)) : false;
      const cropsWithBenefit = year.crops.map((crop) =>
        hadLegume ? { ...crop, nitrogen: formatNumber(decimalValue(crop.nitrogen) * 0.9) } : crop
      );
      const farmForm: FarmForm = {
        ...form,
        crops: cropsWithBenefit
      };
      const practiceList = farmForm.crops.map(() => defaultPractice());
      const result = calculateAdjustedResults(farmForm, practiceList, {
        organicMode,
        region: settingsRegion,
        customFactors: customFactorsEnabled ? customFactors : undefined,
        equipment,
        irrigationFactor: climateZones[climateZone].irrigationFactor
      });
      return { name: year.name, total: result.total_emissions, perHa: result.per_hectare_emissions };
    });
    const avg = yearResults.reduce((sum, item) => sum + item.total, 0) / Math.max(1, yearResults.length);
    return { yearResults, avg };
  }, [rotationPlan, form, organicMode, settingsRegion, customFactorsEnabled, customFactors, equipment, climateZone]);
  const goalProgress = useMemo(() => {
    if (!results) return null;
    const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const baseline = sorted[1]?.results?.total_emissions ?? results.total_emissions;
    const target = goalSetting.mode === "percent" ? baseline * (1 - goalSetting.value / 100) : goalSetting.value;
    const remaining = Math.max(0, results.total_emissions - target);
    const progress = target > 0 ? Math.max(0, Math.min(1, (baseline - results.total_emissions) / (baseline - target || 1))) : 0;
    const achieved = results.total_emissions <= target;
    return { baseline, target, remaining, progress, achieved };
  }, [results, history, goalSetting]);
  const wizardSteps = useMemo(() => [t.stepFarm, t.stepCrops, t.stepPractices, t.stepReview], [t]);
  const wizardStepIcons: IconName[] = ["farm", "crops", "practices", "review"];
  const showWhatIf = Boolean(results && results.crop_results.length > 0);
  const monthLabels = lang === "en"
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

  const whatIfTillage = WHATIF_TILLAGE_OPTIONS[whatIfTillageIndex] ?? "current";
  const whatIfIrrigation = WHATIF_IRRIGATION_OPTIONS[whatIfIrrigationIndex] ?? "current";
  const whatIfCover = WHATIF_COVER_OPTIONS[whatIfCoverIndex] ?? "current";

  const whatIfResults = useMemo(() => {
    if (!results) return null;
    return calculateWhatIf(whatIfNitrogen, whatIfTillage, whatIfIrrigation, whatIfCover);
  }, [results, whatIfNitrogen, whatIfTillage, whatIfIrrigation, whatIfCover, form, practices]);

  const nitrogenDeltaResults = useMemo(() => {
    if (!results) return null;
    return calculateWhatIf(whatIfNitrogen, "current", "current", "current");
  }, [results, whatIfNitrogen, form, practices]);

  const tillageDeltaResults = useMemo(() => {
    if (!results || whatIfTillage === "current") return null;
    return calculateWhatIf(100, whatIfTillage, "current", "current");
  }, [results, whatIfTillage, form, practices]);

  const irrigationDeltaResults = useMemo(() => {
    if (!results || whatIfIrrigation === "current") return null;
    return calculateWhatIf(100, "current", whatIfIrrigation, "current");
  }, [results, whatIfIrrigation, form, practices]);

  const coverDeltaResults = useMemo(() => {
    if (!results || whatIfCover === "current") return null;
    return calculateWhatIf(100, "current", "current", whatIfCover);
  }, [results, whatIfCover, form, practices]);

  const projectionPoints = useMemo<ProjectionPoint[]>(() => {
    if (!results) return [];
    const years = Math.min(10, Math.max(1, projectionYears));
    const startYear = (calculationDate ?? new Date()).getFullYear();
    const base = {
      fertilizer: results.fertilizer_emissions,
      manure: results.manure_emissions,
      fuel: results.fuel_emissions,
      irrigation: results.irrigation_emissions,
      pesticide: results.pesticide_emissions,
      livestock: results.livestock_emissions
    };

    const points: ProjectionPoint[] = [];
    for (let i = 0; i <= years; i += 1) {
      const factor = (rate: number) => Math.pow(1 - rate / 100, i);
      const fertilizer = base.fertilizer * factor(projectionRates.fertilizer);
      const manure = base.manure * factor(projectionRates.manure);
      const fuel = base.fuel * factor(projectionRates.fuel);
      const irrigation = base.irrigation * factor(projectionRates.irrigation);
      const pesticide = base.pesticide * factor(projectionRates.pesticide);
      const livestock = base.livestock * factor(projectionRates.livestock);
      const total = fertilizer + manure + fuel + irrigation + pesticide + livestock;
      points.push({
        year: startYear + i,
        fertilizer,
        manure,
        fuel,
        irrigation,
        pesticide,
        livestock,
        total
      });
    }
    return points;
  }, [results, projectionYears, projectionRates, calculationDate]);

  const projectionCumulative = useMemo(() => projectionPoints.reduce((sum, item) => sum + item.total, 0), [projectionPoints]);

  const projectionChart = useMemo(() => {
    if (projectionPoints.length === 0) return { path: "", coords: [] as Array<{ x: number; y: number; year: number; total: number }> };
    const width = 520;
    const height = 220;
    const padding = 32;
    const maxValue = Math.max(...projectionPoints.map((p) => p.total), 0.0001);
    const coords = projectionPoints.map((point, index) => {
      const x = padding + (index / Math.max(1, projectionPoints.length - 1)) * (width - padding * 2);
      const y = height - padding - (point.total / maxValue) * (height - padding * 2);
      return { x, y, year: point.year, total: point.total };
    });
    const path = coords.map((p, index) => `${index === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return { path, coords };
  }, [projectionPoints]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    if (!results) return [];
    const baseTotal = results.total_emissions;
    const baseMap: Record<RecommendationItem["id"], RecommendationDetailMeta> = {
      no_till: {
        difficulty: "medium",
        cost: "medium",
        timeline: "season",
        applied: !practices.some((p) => p.tillage !== "no_till")
      },
      precision: {
        difficulty: "medium",
        cost: "high",
        timeline: "season",
        applied: !practices.some((p) => !p.precisionFertilization)
      },
      irrigation: {
        difficulty: "high",
        cost: "high",
        timeline: "next",
        applied: !practices.some((p) => ["furrow_surface", "basin_flood", "sprinkler", "center_pivot"].includes(p.irrigationMethod))
      },
      cover: {
        difficulty: "low",
        cost: "low",
        timeline: "now",
        applied: !practices.some((p) => !p.coverCrop)
      }
    };

    const buildImpact = (nextPractices: CropPractice[]) => {
      const adjusted = calculateAdjustedResults(form, nextPractices, {
        organicMode,
        region: settingsRegion,
        customFactors: customFactorsEnabled ? customFactors : undefined,
        equipment,
        irrigationFactor: climateZones[climateZone].irrigationFactor
      });
      const delta = baseTotal - adjusted.total_emissions;
      const impact = Math.max(0, delta);
      const impactPercent = baseTotal > 0 ? (impact / baseTotal) * 100 : 0;
      return { impact, impactPercent };
    };

    const noTillPractices = practices.map((p) => ({ ...p, tillage: "no_till" as Tillage }));
    const precisionPractices = practices.map((p) => ({ ...p, precisionFertilization: true }));
    const irrigationPractices = practices.map((p) => ({ ...p, irrigationMethod: "drip" as IrrigationMethod }));
    const coverPractices = practices.map((p) => ({ ...p, coverCrop: true }));

    const items: RecommendationItem[] = [
      {
        id: "no_till",
        title: t.recNoTillTitle,
        description: t.recNoTillDesc,
        ...buildImpact(noTillPractices),
        implemented: baseMap.no_till.applied || recStatus.no_till.status === "implemented" || appliedRecommendations.has("no_till")
      },
      {
        id: "precision",
        title: t.recPrecisionTitle,
        description: t.recPrecisionDesc,
        ...buildImpact(precisionPractices),
        implemented: baseMap.precision.applied || recStatus.precision.status === "implemented" || appliedRecommendations.has("precision")
      },
      {
        id: "irrigation",
        title: t.recIrrigationTitle,
        description: t.recIrrigationDesc,
        ...buildImpact(irrigationPractices),
        implemented: baseMap.irrigation.applied || recStatus.irrigation.status === "implemented" || appliedRecommendations.has("irrigation")
      },
      {
        id: "cover",
        title: t.recCoverTitle,
        description: t.recCoverDesc,
        ...buildImpact(coverPractices),
        implemented: baseMap.cover.applied || recStatus.cover.status === "implemented" || appliedRecommendations.has("cover")
      }
    ];

    return items.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }, [results, practices, form, appliedRecommendations, t, recStatus, customFactorsEnabled, customFactors, equipment, climateZone]);

  const recommendationProgress = useMemo(() => {
    const total = recommendations.length;
    if (total === 0) return { total: 0, implemented: 0, percent: 0 };
    const implemented = recommendations.filter((rec) => rec.implemented).length;
    return { total, implemented, percent: (implemented / total) * 100 };
  }, [recommendations]);
  const visibleRecommendations = useMemo(
    () => (hideImplementedRecs ? recommendations.filter((rec) => !rec.implemented) : recommendations),
    [recommendations, hideImplementedRecs]
  );

  const actionPlanItems = useMemo<ActionPlanItem[]>(() => {
    if (recommendations.length === 0) return [];
    const metaById: Record<ActionPlanItem["id"], RecommendationDetailMeta> = {
      no_till: { difficulty: "medium", cost: "medium", timeline: "season", applied: false },
      precision: { difficulty: "medium", cost: "high", timeline: "season", applied: false },
      irrigation: { difficulty: "high", cost: "high", timeline: "next", applied: false },
      cover: { difficulty: "low", cost: "low", timeline: "now", applied: false }
    };

    const selected = recommendations.filter((rec) => actionPlanSelection.has(rec.id) && recStatus[rec.id]?.status !== "na");
    const base = selected.length > 0 ? selected : recommendations.filter((rec) => recStatus[rec.id]?.status !== "na").slice(0, 3);
    return base.map((rec) => ({
      ...rec,
      difficulty: metaById[rec.id].difficulty,
      cost: metaById[rec.id].cost,
      timeline: metaById[rec.id].timeline
    }));
  }, [recommendations, actionPlanSelection, recStatus]);

  const cropAreaSum = useMemo(() => form.crops.reduce((sum, crop) => sum + decimalValue(crop.area), 0), [form.crops]);
  const cropIndices = useMemo(() => form.crops.map((_, index) => index), [form.crops]);
  const visibleCropIndices = useMemo(
    () => (showAllCrops ? cropIndices : cropIndices.slice(0, 10)),
    [cropIndices, showAllCrops]
  );

  useEffect(() => {
    if (!autoArea) return;
    setForm((prev) => ({
      ...prev,
      totalArea: formatNumber(cropAreaSum)
    }));
  }, [autoArea, cropAreaSum]);

  const storageUsage = useMemo(() => {
    try {
      let used = 0;
      for (const key of Object.keys(localStorage)) {
        const value = localStorage.getItem(key) ?? "";
        used += key.length + value.length;
      }
      const usedKb = Math.round((used * 2) / 1024);
      return `${usedKb} KB`;
    } catch {
      return "—";
    }
  }, [history, form, practices]);

  const formCompletion = useMemo(() => {
    const requiredSlots = 2 + form.crops.length * 4;
    let filled = 0;
    if (decimalValue(form.totalArea) > 0) filled += 1;
    if (intValue(form.dairyCows) + intValue(form.pigs) + intValue(form.chickens) > 0) filled += 1;

    for (const crop of form.crops) {
      if (decimalValue(crop.area) > 0) {
        filled += 1;
        if (crop.crop_id >= 0) filled += 1;
        if (decimalValue(crop.nitrogen) >= 0 && decimalValue(crop.phosphorus) >= 0 && decimalValue(crop.potassium) >= 0) filled += 1;
        if (decimalValue(crop.diesel) >= 0 && decimalValue(crop.irrigation) >= 0) filled += 1;
      }
    }

    return Math.max(0, Math.min(100, Math.round((filled / requiredSlots) * 100)));
  }, [form]);

  useEffect(() => {
    if (!results || !lastCalcForm || !lastCalcPractices) {
      prevPracticesRef.current = practices;
      return;
    }

    const previous = prevPracticesRef.current;
    if (!previous) {
      prevPracticesRef.current = practices;
      return;
    }

    if (practicesEqual(previous, practices)) {
      return;
    }

    const before = calculateAdjustedResults(lastCalcForm, lastCalcPractices, {
      organicMode,
      region: settingsRegion,
      customFactors: customFactorsEnabled ? customFactors : undefined,
      equipment,
      irrigationFactor: climateZones[climateZone].irrigationFactor
    });
    const after = calculateAdjustedResults(lastCalcForm, practices, {
      organicMode,
      region: settingsRegion,
      customFactors: customFactorsEnabled ? customFactors : undefined,
      equipment,
      irrigationFactor: climateZones[climateZone].irrigationFactor
    });
    setPracticeComparison({ before, after, pinned: false });
    setPracticeComparisonVisible(true);

    if (practiceCompareTimerRef.current) {
      window.clearTimeout(practiceCompareTimerRef.current);
    }
    practiceCompareTimerRef.current = window.setTimeout(() => {
      if (practiceComparisonRef.current?.pinned) return;
      setPracticeComparisonVisible(false);
    }, 5000);

    prevPracticesRef.current = practices;
  }, [practices, results, lastCalcForm, lastCalcPractices]);

  function updateCrop(index: number, patch: Partial<CropForm>) {
    setForm((prev) => ({
      ...prev,
      crops: prev.crops.map((crop, i) => (i === index ? { ...crop, ...patch } : crop))
    }));
  }

  function updateCropField(index: number, field: AutoField, value: string) {
    updateCrop(index, { [field]: value } as Partial<CropForm>);
    setAutoFieldMap((prev) => {
      const current = prev[index] ?? [];
      if (!current.includes(field)) return prev;
      return { ...prev, [index]: current.filter((item) => item !== field) };
    });
  }

  function applySmartDefaults(index: number, cropId: number) {
    const base = crops[cropId];
    updateCrop(index, {
      crop_id: cropId,
      nitrogen: String(base.n_rate),
      phosphorus: String(base.p_rate),
      potassium: String(base.k_rate),
      irrigation: String(base.irrigation),
      yield: String(base.yield)
    });
    setAutoFieldMap((prev) => ({ ...prev, [index]: [...AUTO_FIELDS] }));
  }

  function updatePractice(index: number, patch: Partial<CropPractice>) {
    setPractices((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    if (patch.irrigationMethod === "none") {
      setForm((prev) => ({
        ...prev,
        crops: prev.crops.map((crop, idx) => (idx === index ? { ...crop, irrigation: "0" } : crop))
      }));
      setAutoFieldMap((prev) => {
        const next = new Set(prev[index] ?? []);
        next.delete("irrigation");
        return { ...prev, [index]: [...next] };
      });
    }
  }

  function addEquipment() {
    setEquipment((prev) => [
      ...prev,
      { id: generateId(), name: "", type: "tractor", fuel: "diesel", hours: 0, rate: 0 }
    ]);
  }

  function updateEquipmentEntry(id: string, patch: Partial<EquipmentEntry>) {
    setEquipment((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeEquipmentEntry(id: string) {
    setEquipment((prev) => prev.filter((item) => item.id !== id));
  }

  function ensureRotationPlan() {
    if (rotationPlan) return;
    const baseYear = {
      id: generateId(),
      name: `${lang === "en" ? "Year" : "Рік"} 1`,
      crops: form.crops.map((crop) => rotationCropWithDefaults(crop, crop.crop_id))
    };
    const year2 = {
      id: generateId(),
      name: `${lang === "en" ? "Year" : "Рік"} 2`,
      crops: form.crops.map((crop) => rotationCropWithDefaults(crop, crop.crop_id))
    };
    const year3 = {
      id: generateId(),
      name: `${lang === "en" ? "Year" : "Рік"} 3`,
      crops: form.crops.map((crop) => rotationCropWithDefaults(crop, crop.crop_id))
    };
    setRotationPlan({ years: [baseYear, year2, year3], avg: 0 });
  }

  function updateRotationYear(index: number, patch: Partial<{ name: string; crops: CropForm[] }>) {
    setRotationPlan((prev) => {
      if (!prev) return prev;
      const nextYears = prev.years.map((year, i) => (i === index ? { ...year, ...patch } : year));
      return { ...prev, years: nextYears };
    });
  }

  function addRotationYear() {
    setRotationPlan((prev) => {
      const base = prev?.years ?? [];
      const next = [
        ...base,
        { id: generateId(), name: `${lang === "en" ? "Year" : "Рік"} ${base.length + 1}`, crops: [defaultCrop()] }
      ];
      return { years: next, avg: 0 };
    });
  }

  function updateRotationCrop(yearIndex: number, cropIndex: number, patch: Partial<CropForm>) {
    setRotationPlan((prev) => {
      if (!prev) return prev;
      const nextYears = prev.years.map((year, yi) => {
        if (yi !== yearIndex) return year;
        const nextCrops = year.crops.map((crop, ci) => {
          if (ci !== cropIndex) return crop;
          if (patch.crop_id !== undefined) {
            const next = rotationCropWithDefaults(crop, patch.crop_id);
            return { ...next, ...patch, area: patch.area ?? crop.area };
          }
          return { ...crop, ...patch };
        });
        return { ...year, crops: nextCrops };
      });
      return { ...prev, years: nextYears };
    });
  }

  function addRotationCrop(yearIndex: number) {
    setRotationPlan((prev) => {
      if (!prev) return prev;
      const nextYears = prev.years.map((year, yi) =>
        yi === yearIndex ? { ...year, crops: [...year.crops, defaultCrop()] } : year
      );
      return { ...prev, years: nextYears };
    });
  }

  function removeRotationCrop(yearIndex: number, cropIndex: number) {
    setRotationPlan((prev) => {
      if (!prev) return prev;
      const nextYears = prev.years.map((year, yi) => {
        if (yi !== yearIndex) return year;
        const nextCrops = year.crops.filter((_, ci) => ci !== cropIndex);
        return { ...year, crops: nextCrops.length > 0 ? nextCrops : [defaultCrop()] };
      });
      return { ...prev, years: nextYears };
    });
  }

  function addCrop() {
    setForm((prev) => {
      const next = [...prev.crops, defaultCrop()];
      const index = next.length - 1;
      setAutoFieldMap((map) => ({ ...map, [index]: [...AUTO_FIELDS] }));
      return { ...prev, crops: next };
    });
    setPractices((prev) => [...prev, defaultPractice()]);
  }

  function duplicateCrop(index: number) {
    setForm((prev) => {
      const target = prev.crops[index];
      if (!target) return prev;
      const next = [...prev.crops];
      next.splice(index + 1, 0, { ...target, pesticides: target.pesticides.map((p) => ({ ...p })) });
      setAutoFieldMap((map) => {
        const nextMap: Record<number, AutoField[]> = {};
        Object.entries(map).forEach(([key, value]) => {
          const idx = Number(key);
          nextMap[idx >= index + 1 ? idx + 1 : idx] = value;
        });
        if (map[index]) nextMap[index + 1] = [...map[index]];
        return nextMap;
      });
      return { ...prev, crops: next };
    });
    setPractices((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, { ...target });
      return next;
    });
  }

  function removeCrop(index: number) {
    if (form.crops.length <= 1) return;
    setForm((prev) => ({ ...prev, crops: prev.crops.filter((_, i) => i !== index) }));
    setPractices((prev) => prev.filter((_, i) => i !== index));
    setAutoFieldMap((prev) => {
      const next: Record<number, AutoField[]> = {};
      Object.entries(prev)
        .map(([key, value]) => [Number(key), value] as const)
        .filter(([key]) => key !== index)
        .forEach(([key, value]) => {
          next[key > index ? key - 1 : key] = value;
        });
      return next;
    });
    setPesticideSearch((prev) => {
      const next: Record<number, string> = {};
      const entries = Object.entries(prev)
        .map(([key, value]) => [Number(key), value] as const)
        .filter(([key]) => key !== index)
        .map(([key, value]) => [key > index ? key - 1 : key, value] as const);
      for (const [key, value] of entries) next[key] = value;
      return next;
    });
  }

  function applyDefaults(index: number) {
    const id = form.crops[index].crop_id;
    applySmartDefaults(index, id);
  }

  function addPesticide(index: number) {
    updateCrop(index, {
      pesticides: [...form.crops[index].pesticides, { pesticide_id: "-1", rate: "0" }]
    });
  }

  function updatePesticide(index: number, pestIndex: number, patch: Partial<PesticideEntryForm>) {
    const next = form.crops[index].pesticides.map((item, i) => (i === pestIndex ? { ...item, ...patch } : item));
    updateCrop(index, { pesticides: next });
    if (patch.pesticide_id !== undefined) {
      setPesticideSearch((prev) => {
        const nextSearch = { ...prev };
        nextSearch[index] = "";
        return nextSearch;
      });
    }
  }

  function toggleSection(section: keyof typeof sectionCollapsed) {
    setSectionCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function toggleCropCollapse(index: number) {
    setCollapsedCrops((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function pushToast(message: string, kind: ToastKind = "info", sticky = false) {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, kind, sticky }]);
    if (!sticky) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function trackEvent(name: string) {
    if (!analytics.enabled) return;
    setAnalytics((prev) => {
      const nextCount = (prev.events[name] ?? 0) + 1;
      return {
        ...prev,
        events: { ...prev.events, [name]: nextCount },
        lastEventAt: new Date().toISOString()
      };
    });
  }

  function openConfirm(message: string, onConfirm: () => void, confirmLabel = t.confirmYes) {
    setConfirmState({
      title: t.confirmTitle,
      message,
      confirmLabel,
      cancelLabel: t.confirmNo,
      onConfirm
    });
  }

  async function handleDraftRecover() {
    const recovered = acceptDraft();
    if (!recovered) return;
    setForm(recovered.data);
    setPractices(recovered.practices);
    setResults(null);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(null);
    pushToast(t.toastDraftRecovered, "info");
  }

  async function handleDraftDismiss() {
    await rejectDraft();
    pushToast(t.toastDraftDiscarded, "warning");
  }

  function applyTemplate(template: FarmTemplate) {
    setSampleMode(false);
    setSampleSelection(null);
    sampleSnapshotRef.current = null;
    setForm(cloneFormData(template.form));
    setPractices(clonePracticesData(template.practices));
    setResults(null);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(null);
    setLastCalcForm(null);
    setLastCalcPractices(null);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    setPesticideSearch({});
    pushToast(`${t.templatesTitle}: ${template.name}`, "success");
  }

  function enterSample(sample: SampleCalculation) {
    if (!sampleMode) {
      sampleSnapshotRef.current = {
        form: cloneFormData(form),
        practices: clonePracticesData(practices),
        results,
        animalBreakdown,
        calculationDate,
        organicMode,
        settingsRegion,
        lastCalcForm,
        lastCalcPractices,
        errors
      };
    }
    setSampleMode(true);
    setSampleSelection(sample);
    setForm(cloneFormData(sample.form));
    setPractices(clonePracticesData(sample.practices));
    setResults(sample.results);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(new Date());
    setLastCalcForm(sample.form);
    setLastCalcPractices(sample.practices);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    setPesticideSearch({});
  }

  function exitSampleMode(restore = true) {
    setSampleMode(false);
    setSampleSelection(null);
    if (restore && sampleSnapshotRef.current) {
      const snapshot = sampleSnapshotRef.current;
      setForm(cloneFormData(snapshot.form));
      setPractices(clonePracticesData(snapshot.practices));
      setResults(snapshot.results);
      setAnimalBreakdown(snapshot.animalBreakdown);
      setErrors(snapshot.errors);
      setCalculationDate(snapshot.calculationDate);
      setOrganicMode(snapshot.organicMode);
      setSettingsRegion(snapshot.settingsRegion);
      setLastCalcForm(snapshot.lastCalcForm);
      setLastCalcPractices(snapshot.lastCalcPractices);
    } else if (!restore) {
      setForm(createInitialForm());
      setPractices([defaultPractice()]);
      setResults(null);
      setAnimalBreakdown(null);
      setErrors([]);
      setCalculationDate(null);
      setLastCalcForm(null);
      setLastCalcPractices(null);
      setPracticeComparison(null);
      setPracticeComparisonVisible(false);
      setAppliedRecommendations(new Set());
      setAutoFieldMap({});
      setPesticideSearch({});
    }
    sampleSnapshotRef.current = null;
  }

  function copySampleToEditable() {
    setSampleMode(false);
    setSampleSelection(null);
    sampleSnapshotRef.current = null;
    setResults(null);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(null);
    setLastCalcForm(null);
    setLastCalcPractices(null);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    setPesticideSearch({});
    setActiveView("form");
    pushToast(t.examplesCopy, "success");
  }

  async function handleImportLastYear() {
    if (history.length === 0) return;
    const latest = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!latest) return;
    setSampleMode(false);
    setSampleSelection(null);
    sampleSnapshotRef.current = null;
    setForm(cloneFormData(latest.data));
    setPractices(clonePracticesData(latest.practices));
    setResults(null);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(new Date());
    setLastCalcForm(null);
    setLastCalcPractices(null);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    setPesticideSearch({});
    const name = latest.farmName || (lang === "en" ? "Unnamed farm" : "Без назви");
    const dateLabel = new Date(latest.timestamp).toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US");
    pushToast(`${t.importLastYear}: ${name} (${dateLabel})`, "success");
  }

  function removePesticide(index: number, pestIndex: number) {
    const current = form.crops[index].pesticides;
    if (current.length <= 1) return;
    updateCrop(index, { pesticides: current.filter((_, i) => i !== pestIndex) });
  }

  function isAutoField(index: number, field: AutoField) {
    return (autoFieldMap[index] ?? []).includes(field);
  }

  async function runCalculation() {
    setIsCalculating(true);
    const start = Date.now();
    const normalized = normalizeFarm(form, 100, organicMode);

    const livestockOnly = (normalized.dairy_cows * 1000.0) / 1000.0 + (normalized.pigs * 200.0) / 1000.0;
    const poultryOnly = (normalized.chickens * 5.0) / 1000.0;
    const totalCropArea = normalized.crops.reduce((sum, c) => sum + c.area, 0);

    // Special case: farms with no crop production and only animal production.
    if (normalized.total_farm_size === 0) {
      const zeroAreaErrors = [
        ...validateLivestockCounts(normalized),
        ...(Math.abs(totalCropArea) > 1e-6 ? [t.zeroAreaNoCrops] : [])
      ];
      if (zeroAreaErrors.length > 0) {
        setErrors(zeroAreaErrors);
        setResults(null);
        setAnimalBreakdown(null);
        pushToast(zeroAreaErrors[0] ?? t.toastInvalid, "warning", true);
        const wait = Math.max(0, 300 - (Date.now() - start));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        setIsCalculating(false);
        return;
      }

      if (livestockOnly + poultryOnly <= 0) {
        setErrors([t.zeroAreaNeedsAnimals]);
        setResults(null);
        setAnimalBreakdown(null);
        pushToast(t.zeroAreaNeedsAnimals, "warning", true);
        const wait = Math.max(0, 300 - (Date.now() - start));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        setIsCalculating(false);
        return;
      }

      setErrors([]);
      setAnimalBreakdown({ livestock: livestockOnly, poultry: poultryOnly });
      setResults(livestockOnlyResults(livestockOnly, poultryOnly));
      setCalculationDate(new Date());
      setLastCalcForm(form);
      setLastCalcPractices(practices);
      setPracticeComparison(null);
      setPracticeComparisonVisible(false);
      setAppliedRecommendations(new Set());
      const wait = Math.max(0, 300 - (Date.now() - start));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setIsCalculating(false);
      return;
    }

    const ownErrors: string[] = [];
    if (Math.abs(totalCropArea - normalized.total_farm_size) > 1e-6) {
      ownErrors.push(t.areaMismatch);
    }

    const validationErrors = validateInput(normalized);
    const allErrors = [...ownErrors, ...validationErrors];

    if (allErrors.length > 0) {
      setErrors(allErrors);
      setResults(null);
      setAnimalBreakdown(null);
      setLastCalcForm(null);
      setLastCalcPractices(null);
      setPracticeComparison(null);
      setPracticeComparisonVisible(false);
      pushToast(allErrors[0] ?? t.toastInvalid, "warning", true);
      const wait = Math.max(0, 300 - (Date.now() - start));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setIsCalculating(false);
      return;
    }

    const base = calculateEmissions(normalized);
    const organicInputs = buildOrganicInputs(form);
    const adjusted = applyPracticesAndPesticides(
      base,
      normalized,
      practices,
      form.crops.map((c) => c.pesticides),
      organicMode,
      organicInputs
    );
    const regional = applyRegionalFactors(adjusted, settingsRegion, normalized.total_farm_size);
    const withCustom = customFactorsEnabled ? applyCustomFactors(regional, normalized, customFactors) : regional;
    const climate = climateZones[climateZone];
    const withWeather = applyWeatherAdjustments(withCustom, climate.irrigationFactor);
    const withEquipment = applyEquipmentEmissions(withWeather, equipment, customFactorsEnabled ? customFactors : undefined);

    setErrors([]);
    setAnimalBreakdown({ livestock: livestockOnly, poultry: poultryOnly });
    setResults(withEquipment);
    setCalculationDate(new Date());
    setLastCalcForm(form);
    setLastCalcPractices(practices);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    const wait = Math.max(0, 300 - (Date.now() - start));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    setIsCalculating(false);
    pushToast(t.toastSaved, "success");
    trackEvent("calculate");

      const entry: CalculationHistory = {
        id: generateId(),
        timestamp: new Date(),
        data: form,
        practices,
        results: withEquipment,
        metadata: { version: APP_VERSION, customFactors: customFactorsEnabled }
      };

    try {
      await storageManager.saveCalculation(entry);
      const nextHistory = await storageManager.loadHistory();
      setHistory(nextHistory);
    } catch (e) {
      console.warn("Failed to save calculation history:", e);
      pushToast(t.toastError, "error", true);
    }
  }

  function resetAllInputs() {
    setForm(createInitialForm());
    setPractices([defaultPractice()]);
    setErrors([]);
    setResults(null);
    setAnimalBreakdown(null);
    setCalculationDate(null);
    setLastCalcForm(null);
    setLastCalcPractices(null);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    setSampleMode(false);
    setSampleSelection(null);
    sampleSnapshotRef.current = null;
    setSchedulingMode(false);
    setShowAllCrops(false);
  }

  function clearResultsOnly(keepSampleMode = false) {
    setErrors([]);
    setResults(null);
    setAnimalBreakdown(null);
    setCalculationDate(null);
    setLastCalcForm(null);
    setLastCalcPractices(null);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
    if (!keepSampleMode) {
      setSampleMode(false);
      setSampleSelection(null);
      sampleSnapshotRef.current = null;
    }
    setShowAllCrops(false);
    pushToast(t.toastResultsCleared, "success");
  }

  function resolveVarValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed.includes("var(")) return trimmed;
    return trimmed.replace(/var\\((--[^)]+)\\)/g, (_, varName) => {
      const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return resolved || `var(${varName})`;
    });
  }

  function extractCssVars(svg: SVGSVGElement) {
    const html = svg.outerHTML || "";
    const matches = [...html.matchAll(/var\\((--[^)]+)\\)/g)].map((m) => m[1]);
    return Array.from(new Set(matches));
  }

  async function svgToPngDataUrl(svg: SVGSVGElement | null): Promise<string | undefined> {
    if (!svg) return undefined;
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font loading errors and proceed with best effort.
      }
    }
    const serializer = new XMLSerializer();
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const vb = svg.viewBox?.baseVal;
    let width = vb?.width || svg.clientWidth || 800;
    let height = vb?.height || svg.clientHeight || 600;
    let viewBox = vb ? `${vb.x} ${vb.y} ${vb.width} ${vb.height}` : `0 0 ${width} ${height}`;
    try {
      const bbox = svg.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const bboxW = bbox.x + bbox.width;
        const bboxH = bbox.y + bbox.height;
        width = Math.max(width, bboxW);
        height = Math.max(height, bboxH);
        viewBox = `${bbox.x} ${bbox.y} ${Math.max(width, bboxW)} ${Math.max(height, bboxH)}`;
      }
    } catch {
      // getBBox can fail for hidden elements; fallback to viewBox.
    }
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("viewBox", viewBox);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    extractCssVars(svg).forEach((varName) => {
      const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (resolved) {
        clone.style.setProperty(varName, resolved);
      }
    });

    const styleProps = [
      "fill",
      "fill-opacity",
      "stroke",
      "stroke-width",
      "stroke-opacity",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "opacity",
      "font-size",
      "font-family",
      "font-weight",
      "text-anchor",
      "letter-spacing",
      "color"
    ];
    const sourceNodes = svg.querySelectorAll<SVGElement>("*");
    const targetNodes = clone.querySelectorAll<SVGElement>("*");
    sourceNodes.forEach((node, index) => {
      const target = targetNodes[index];
      if (!target) return;
      const computed = window.getComputedStyle(node);
      styleProps.forEach((prop) => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== "auto" && value !== "none") {
          if ((prop === "fill" || prop === "stroke" || prop === "color") && value) {
            target.style.setProperty(prop, resolveCssColor(value));
          } else if (prop === "font-family" && !value.includes("Arial")) {
            target.style.setProperty(prop, `${value}, Arial, sans-serif`);
          } else {
            target.style.setProperty(prop, value);
          }
        }
      });
      const computedFill = computed.getPropertyValue("fill");
      const computedStroke = computed.getPropertyValue("stroke");
      if (computedFill && computedFill !== "none") {
        target.setAttribute("fill", resolveCssColor(computedFill));
      }
      if (computedStroke && computedStroke !== "none") {
        target.setAttribute("stroke", resolveCssColor(computedStroke));
      }
      target.style.removeProperty("filter");
      if (target.hasAttribute("fill")) {
        const attr = target.getAttribute("fill") || "";
        if (attr.includes("var(")) {
          target.setAttribute("fill", resolveCssColor(attr));
        }
      }
      if (target.hasAttribute("stroke")) {
        const attr = target.getAttribute("stroke") || "";
        if (attr.includes("var(")) {
          target.setAttribute("stroke", resolveCssColor(attr));
        }
      }
    });

    const rootFont = window.getComputedStyle(svg).getPropertyValue("font-family");
    if (rootFont) {
      clone.style.setProperty("font-family", rootFont.includes("Arial") ? rootFont : `${rootFont}, Arial, sans-serif`);
    } else {
      clone.style.setProperty("font-family", "Arial, sans-serif");
    }

    const bgColor = getChartBackground(svg);

    const svgText = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load SVG image"));
      });
      img.src = url;
      const image = await loaded;
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      const safeBg = bgColor && bgColor !== "rgba(0, 0, 0, 0)" ? normalizeColor(bgColor) : "#ffffff";
      ctx.fillStyle = safeBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function svgTextToPngDataUrl(svgText: string, width: number, height: number, bgColor?: string) {
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load SVG image"));
      });
      img.src = url;
      const image = await loaded;
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      const safeBg = bgColor && bgColor !== "rgba(0, 0, 0, 0)" ? normalizeColor(bgColor) : "#ffffff";
      ctx.fillStyle = safeBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function normalizeColor(value: string) {
    const probe = document.createElement("span");
    probe.style.color = value;
    document.body.appendChild(probe);
    const computed = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return computed || value;
  }

  function resolveCssColor(value: string) {
    const resolved = resolveVarValue(value);
    if (!resolved) return resolved;
    if (resolved.includes("color-mix(") || resolved.includes("var(")) {
      return normalizeColor(resolved);
    }
    return normalizeColor(resolved);
  }

  function getThemeSurfaceColor() {
    const root = window.getComputedStyle(document.documentElement);
    const surface = root.getPropertyValue("--surface").trim();
    const panel = root.getPropertyValue("--panel").trim();
    return normalizeColor(surface || panel || "#ffffff");
  }

  function getChartBackground(svg: SVGSVGElement) {
    const selectors = [".practice-heatmap", ".emission-trend-chart", ".crop-comparison-chart", ".emission-pie-chart", ".results-panel"];
    for (const sel of selectors) {
      const node = svg.closest(sel) as HTMLElement | null;
      if (!node) continue;
      const bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
    }
    const base = svg.closest(".chart-base") as HTMLElement | null;
    if (base) {
      const bg = window.getComputedStyle(base).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
    }
    return getThemeSurfaceColor();
  }

  function describePieArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const sweep = endAngle - startAngle;
    if (sweep >= Math.PI * 2 - 1e-6) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    }
    const start = {
      x: cx + r * Math.cos(endAngle),
      y: cy + r * Math.sin(endAngle),
    };
    const end = {
      x: cx + r * Math.cos(startAngle),
      y: cy + r * Math.sin(startAngle),
    };
    const largeArc = sweep > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  function buildPieExportSvg(data: PieChartData[], language: Lang, total: number) {
    const width = 900;
    const height = 980;
    const cx = width / 2;
    const cy = 230;
    const r = 160;
    const textColor = window.getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0d1b2a";
    const muted = window.getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#6b7c93";
    const bg = getThemeSurfaceColor();
    const font = window.getComputedStyle(document.documentElement).getPropertyValue("font-family") || "Arial, sans-serif";

    let current = -Math.PI / 2;
    const slices = data.map((item) => {
      if (item.value <= 0 || total <= 0) return null;
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const end = current + sliceAngle;
      const path = describePieArc(cx, cy, r, current, end);
      current = end;
      return { path, color: resolveCssColor(item.color) };
    });

    const legendStartY = 460;
    const rowH = 54;
    const swatch = 18;
    const legendX = 80;
    const valueX = width - 80;

    const legendRows = data.map((item, idx) => {
      const y = legendStartY + idx * rowH;
      const percent = total === 0 ? 0 : (item.value / total) * 100;
      const valueText = `${item.value.toFixed(2)} tCO2e (${percent.toFixed(1)}%)`;
      const color = resolveCssColor(item.color);
      return `
        <rect x="${legendX}" y="${y - swatch + 6}" width="${swatch}" height="${swatch}" rx="4" fill="${color}" />
        <text x="${legendX + swatch + 14}" y="${y}" fill="${textColor}" font-size="16" font-weight="600">${item.label}</text>
        <text x="${valueX}" y="${y}" fill="${muted}" font-size="15" text-anchor="end">${valueText}</text>
      `;
    }).join("");

    const summaryLabel = language === "en" ? "Total Emissions" : "Загальні викиди";
    const summaryValue = `${total.toFixed(2)} tCO2e`;
    const summaryY = legendStartY + data.length * rowH + 40;
    const summaryH = 110;

    return {
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <style>
            text { font-family: ${font}; dominant-baseline: middle; }
          </style>
          <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />
          ${slices.map((slice) => slice ? `<path d="${slice.path}" fill="${slice.color}" stroke="#ffffff" stroke-width="3" />` : "").join("")}
          <rect x="60" y="${legendStartY - 40}" width="${width - 120}" height="${data.length * rowH + 20}" rx="14" fill="rgba(0,0,0,0)" stroke="rgba(100,120,140,0.25)" />
          ${legendRows}
          <rect x="60" y="${summaryY}" width="${width - 120}" height="${summaryH}" rx="14" fill="rgba(0,0,0,0)" stroke="rgba(100,120,140,0.25)" />
          <text x="${width / 2}" y="${summaryY + 34}" fill="${muted}" font-size="16" text-anchor="middle">${summaryLabel.toUpperCase()}</text>
          <text x="${width / 2}" y="${summaryY + 72}" fill="${textColor}" font-size="34" font-weight="700" text-anchor="middle">${summaryValue}</text>
        </svg>
      `,
      width,
      height,
      bg,
    };
  }

  function buildCropComparisonExportSvg(data: ReturnType<typeof buildCropComparisonChartData>, language: Lang) {
    const width = 980;
    const height = Math.max(460, 160 + data.length * 70);
    const margin = { top: 56, right: 40, bottom: 80, left: 220 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const maxTotal = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;
    const barGap = 14;
    const barH = Math.max(18, (innerH - barGap * (data.length - 1)) / data.length);
    const ticks = Array.from({ length: 5 }, (_, i) => (maxTotal * i) / 4);
    const textColor = window.getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0d1b2a";
    const muted = window.getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#6b7c93";
    const bg = getThemeSurfaceColor();
    const font = window.getComputedStyle(document.documentElement).getPropertyValue("font-family") || "Arial, sans-serif";
    const unit = "tCO2e";

    let bars = "";
    data.forEach((crop, index) => {
      const y = margin.top + index * (barH + barGap);
      let offset = 0;
      bars += `<text x="${margin.left - 12}" y="${y + barH / 2}" fill="${textColor}" font-size="16" font-weight="600" text-anchor="end">${crop.label}</text>`;
      crop.segments.forEach((seg) => {
        if (seg.value <= 0) return;
        const w = maxTotal === 0 ? 0 : (seg.value / maxTotal) * innerW;
        const x = margin.left + offset;
        offset += w;
        bars += `<rect x="${x}" y="${y}" width="${w}" height="${barH}" fill="${resolveCssColor(seg.color)}" rx="4" />`;
      });
    });

    const grid = ticks
      .map((t) => {
        const x = margin.left + (maxTotal === 0 ? 0 : (t / maxTotal) * innerW);
        return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + innerH}" stroke="rgba(100,120,140,0.25)" stroke-width="1" />\n` +
          `<text x="${x}" y="${margin.top + innerH + 30}" fill="${muted}" font-size="14" text-anchor="middle">${t.toFixed(0)}</text>`;
      })
      .join("");

    const legendKeys = data[0]?.segments ?? [];
    const legendY = height - 28;
    let legend = "";
    let legendX = margin.left;
    legendKeys.forEach((seg) => {
      const label = seg.label;
      legend += `<rect x="${legendX}" y="${legendY - 10}" width="14" height="14" rx="3" fill="${resolveCssColor(seg.color)}" />`;
      legend += `<text x="${legendX + 20}" y="${legendY}" fill="${textColor}" font-size="13">${label}</text>`;
      legendX += 20 + label.length * 7 + 24;
    });

    return {
      width,
      height,
      bg,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <style>
            text { font-family: ${font}; dominant-baseline: middle; }
          </style>
          <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />
          <text x="${margin.left}" y="28" fill="${textColor}" font-size="18" font-weight="700">
            ${language === "en" ? "Emissions by crop (stacked)" : "Викиди за культурами (стек)"}
          </text>
          ${grid}
          <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerH}" stroke="rgba(120,140,160,0.6)" />
          <line x1="${margin.left}" y1="${margin.top + innerH}" x2="${margin.left + innerW}" y2="${margin.top + innerH}" stroke="rgba(120,140,160,0.6)" />
          <text x="${margin.left + innerW / 2}" y="${height - 14}" fill="${muted}" font-size="14" text-anchor="middle">${unit}</text>
          ${bars}
          ${legend}
        </svg>
      `,
    };
  }

  function buildTrendExportSvg(points: EmissionTrendPoint[], language: Lang) {
    const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-20);
    const width = 900;
    const height = 560;
    const margin = { top: 70, right: 40, bottom: 90, left: 90 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const times = sorted.map((p) => p.date.getTime());
    const values = sorted.map((p) => p.value);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const paddedMinV = Math.max(0, minV * 0.95);
    const paddedMaxV = maxV * 1.05;
    const xOf = (t: number) => (maxT === minT ? margin.left + innerW / 2 : margin.left + ((t - minT) / (maxT - minT)) * innerW);
    const yOf = (v: number) => (paddedMaxV === paddedMinV ? margin.top + innerH / 2 : margin.top + (1 - (v - paddedMinV) / (paddedMaxV - paddedMinV)) * innerH);
    const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.date.getTime())} ${yOf(p.value)}`).join(" ");
    const textColor = window.getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0d1b2a";
    const muted = window.getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#6b7c93";
    const bg = getThemeSurfaceColor();
    const font = window.getComputedStyle(document.documentElement).getPropertyValue("font-family") || "Arial, sans-serif";
    const formatDate = (d: Date) => language === "en" ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

    const dateLabels = [
      formatDate(sorted[0].date),
      formatDate(sorted[Math.floor(sorted.length / 2)].date),
      formatDate(sorted[sorted.length - 1].date),
    ];

    const pointsSvg = sorted
      .map((p) => `<circle cx="${xOf(p.date.getTime())}" cy="${yOf(p.value)}" r="5" fill="#0b66c3" stroke="#e8f1ff" stroke-width="2" />`)
      .join("");

    return {
      width,
      height,
      bg,
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <style>
            text { font-family: ${font}; dominant-baseline: middle; }
          </style>
          <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />
          <text x="${margin.left}" y="30" fill="${textColor}" font-size="18" font-weight="700">
            ${language === "en" ? "Emissions trend" : "Тренд викидів"}
          </text>
          <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerH}" stroke="rgba(120,140,160,0.6)" />
          <line x1="${margin.left}" y1="${margin.top + innerH}" x2="${margin.left + innerW}" y2="${margin.top + innerH}" stroke="rgba(120,140,160,0.6)" />
          <text x="${margin.left}" y="${margin.top - 20}" fill="${muted}" font-size="14">tCO2e</text>
          <path d="${path}" fill="none" stroke="#7fb4ff" stroke-width="3" />
          ${pointsSvg}
          <text x="${margin.left}" y="${margin.top + innerH + 36}" fill="${muted}" font-size="14" text-anchor="start">${dateLabels[0]}</text>
          <text x="${margin.left + innerW / 2}" y="${margin.top + innerH + 36}" fill="${muted}" font-size="14" text-anchor="middle">${dateLabels[1]}</text>
          <text x="${margin.left + innerW}" y="${margin.top + innerH + 36}" fill="${muted}" font-size="14" text-anchor="end">${dateLabels[2]}</text>
        </svg>
      `,
    };
  }

  async function exportPieChartPng() {
    if (!pieChartData || pieChartData.length === 0) return undefined;
    const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return undefined;
    const { svg, width, height, bg } = buildPieExportSvg(pieChartData, lang, total);
    return svgTextToPngDataUrl(svg, width, height, bg);
  }

  function buildHeatmapExportSvg(practices: CropPractice[], language: Lang) {
    const rows = buildPracticeHeatMapRows(practices, language);
    const viewBoxWidth = 1000;
    const rowHeight = 56;
    const labelW = 220;
    const cellH = 36;
    const gap = 10;
    const headerH = 72;
    const height = headerH + rows.length * rowHeight + 10;
    const textColor = window.getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0d1b2a";
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    const strongText = theme === "dark" ? "#f5fbff" : "#0d1b2a";
    const border = window.getComputedStyle(document.documentElement).getPropertyValue("--line-strong").trim() || "rgba(15,29,43,0.35)";
    const low = resolveCssColor("#2cc4a1");
    const medium = resolveCssColor("#f1b84c");
    const high = resolveCssColor("#ff6b6b");
    const selected = resolveCssColor(window.getComputedStyle(document.documentElement).getPropertyValue("--primary-2").trim() || "#1f568a");
    const bg = getThemeSurfaceColor();
    const font = window.getComputedStyle(document.documentElement).getPropertyValue("font-family") || "Arial, sans-serif";

    const getCellFill = (multiplier: number) => {
      if (multiplier <= 0.9) return low;
      if (multiplier <= 1.05) return medium;
      return high;
    };

    const cells = rows
      .map((row, rowIndex) => {
        const y = headerH + rowIndex * rowHeight;
        const cellW = Math.floor((viewBoxWidth - labelW - 30) / row.options.length);
        const label = `<text x=\"10\" y=\"${y + cellH / 2 + 5}\" fill=\"${strongText}\" font-size=\"15\" font-weight=\"700\">${row.label}</text>`;
        const options = row.options
          .map((opt, i) => {
            const x = labelW + 10 + i * cellW;
            const w = cellW - gap;
            const fill = getCellFill(opt.multiplier);
            const stroke = row.selectedIds.has(opt.id) ? selected : border;
            const strokeWidth = row.selectedIds.has(opt.id) ? 2 : 1;
            const labelText = opt.label.length > 18 ? `${opt.label.slice(0, 16)}…` : opt.label;
            return `<g>\n<rect x=\"${x}\" y=\"${y}\" width=\"${w}\" height=\"${cellH}\" rx=\"6\" fill=\"${fill}\" stroke=\"${stroke}\" stroke-width=\"${strokeWidth}\" />\n<text x=\"${x + w / 2}\" y=\"${y + 23}\" fill=\"${strongText}\" font-size=\"13\" font-weight=\"700\" text-anchor=\"middle\">${labelText}</text>\n</g>`;
          })
          .join("\n");
        return `${label}\\n${options}`;
      })
      .join("\n");

    const legend = `
      <rect x=\"6\" y=\"2\" width=\"${viewBoxWidth - 12}\" height=\"${headerH - 12}\" rx=\"10\" fill=\"${bg}\" stroke=\"${border}\" stroke-width=\"1\" />
      <text x=\"10\" y=\"26\" fill=\"${strongText}\" font-size=\"14\" font-weight=\"600\">
        ${language === "en" ? "Colors show emissions impact vs baseline (green = lower, red = higher)." : "Кольори показують вплив на викиди щодо бази (зелений = менше, червоний = більше)."}
      </text>
      <g transform=\"translate(${viewBoxWidth - 360} 6)\">
        <rect x=\"0\" y=\"0\" width=\"14\" height=\"14\" rx=\"3\" fill=\"${low}\" stroke=\"${border}\" stroke-width=\"1\" />
        <text x=\"20\" y=\"11\" fill=\"${strongText}\" font-size=\"13\" font-weight=\"700\">${language === "en" ? "Lower" : "Менше"}</text>
        <g transform=\"translate(120 0)\">
          <rect x=\"0\" y=\"0\" width=\"14\" height=\"14\" rx=\"3\" fill=\"${medium}\" stroke=\"${border}\" stroke-width=\"1\" />
          <text x=\"20\" y=\"11\" fill=\"${strongText}\" font-size=\"13\" font-weight=\"700\">${language === "en" ? "Neutral" : "Нейтр."}</text>
        </g>
        <g transform=\"translate(240 0)\">
          <rect x=\"0\" y=\"0\" width=\"14\" height=\"14\" rx=\"3\" fill=\"${high}\" stroke=\"${border}\" stroke-width=\"1\" />
          <text x=\"20\" y=\"11\" fill=\"${strongText}\" font-size=\"13\" font-weight=\"700\">${language === "en" ? "Higher" : "Більше"}</text>
        </g>
      </g>
    `;

    return {
      width: viewBoxWidth,
      height,
      bg,
      svg: `
        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${viewBoxWidth}\" height=\"${height}\" viewBox=\"0 0 ${viewBoxWidth} ${height}\">
          <style>
            text { font-family: ${font}; dominant-baseline: middle; }
          </style>
          <rect x=\"0\" y=\"0\" width=\"${viewBoxWidth}\" height=\"${height}\" fill=\"${bg}\" />
          ${legend}
          ${cells}
        </svg>
      `,
    };
  }

  function downloadTextFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  async function handleDownloadChart(svg: SVGSVGElement | null, baseName: string) {
    let png: string | undefined;
    if (baseName === "emission-breakdown") {
      png = await exportPieChartPng();
    } else if (baseName === "crop-comparison") {
      const payload = buildCropComparisonExportSvg(cropComparisonData, lang);
      png = await svgTextToPngDataUrl(payload.svg, payload.width, payload.height, payload.bg);
    } else if (baseName === "emissions-trend") {
      const payload = buildTrendExportSvg(trendPoints, lang);
      png = await svgTextToPngDataUrl(payload.svg, payload.width, payload.height, payload.bg);
    } else if (baseName === "practice-heatmap") {
      const payload = buildHeatmapExportSvg(practices, lang);
      png = await svgTextToPngDataUrl(payload.svg, payload.width, payload.height, payload.bg);
    } else {
      png = await svgToPngDataUrl(svg);
    }
    const date = calculationDate ?? new Date();
    const dateLabel = date.toISOString().split("T")[0];
    if (png) {
      downloadDataUrl(png, `${baseName}-${dateLabel}.png`);
      pushToast(t.toastExported, "success");
    } else {
      pushToast(t.toastError, "error", true);
    }
  }

  async function handleDownloadCharts() {
    const breakdownPng = await exportPieChartPng();
    const cropPayload = buildCropComparisonExportSvg(cropComparisonData, lang);
    const cropPng = await svgTextToPngDataUrl(cropPayload.svg, cropPayload.width, cropPayload.height, cropPayload.bg);
    const trendPayload = buildTrendExportSvg(trendPoints, lang);
    const trendPng = await svgTextToPngDataUrl(trendPayload.svg, trendPayload.width, trendPayload.height, trendPayload.bg);
    const heatmapPayload = buildHeatmapExportSvg(practices, lang);
    const heatmapPng = await svgTextToPngDataUrl(heatmapPayload.svg, heatmapPayload.width, heatmapPayload.height, heatmapPayload.bg);
    const date = calculationDate ?? new Date();
    const dateLabel = date.toISOString().split("T")[0];
    if (breakdownPng) downloadDataUrl(breakdownPng, `breakdown-${dateLabel}.png`);
    if (cropPng) downloadDataUrl(cropPng, `crop-breakdown-${dateLabel}.png`);
    if (trendPng) downloadDataUrl(trendPng, `emissions-trend-${dateLabel}.png`);
    if (heatmapPng) downloadDataUrl(heatmapPng, `practice-heatmap-${dateLabel}.png`);
    if (breakdownPng || cropPng || trendPng || heatmapPng) {
      pushToast(t.toastExported, "success");
    }
  }

  async function handleExportPdf() {
    if (!results) return;
    const date = calculationDate ?? new Date();
    const dateLabel = date.toISOString().split("T")[0];
    const lines: string[] = [];
    lines.push(`${t.appTitle}`);
    lines.push(`${t.results}`);
    lines.push(`${lang === "en" ? "Calculation date" : "Дата розрахунку"}: ${date.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}`);
    lines.push("");
    lines.push(`${lang === "en" ? "Farm summary" : "Підсумок господарства"}`);
    lines.push(`${t.farmArea}: ${form.totalArea || "0"} ha`);
    lines.push(`${t.livestock}: ${form.dairyCows || "0"} / ${form.pigs || "0"} / ${form.chickens || "0"}`);
    lines.push(`${t.cropsTitle}: ${form.crops.length}`);
    lines.push("");
    lines.push(`${lang === "en" ? "Results summary" : "Підсумок результатів"}`);
    lines.push(`${t.grossEmissions}: ${results.total_emissions.toFixed(2)} tCO2e`);
    lines.push(`${t.perHectare}: ${results.per_hectare_emissions.toFixed(2)} tCO2e/ha`);
    lines.push(`${t.netEmissions}: ${(results.total_emissions - sequestration).toFixed(2)} tCO2e`);
    if (uncertainty) {
      lines.push(`${t.uncertaintyTitle}: ${uncertainty.totalLow.toFixed(2)} - ${uncertainty.totalHigh.toFixed(2)} tCO2e`);
    }
    lines.push("");
    lines.push(`${t.cropBreakdown}`);
    results.crop_results.forEach((c, index) => {
      const label = cropLabel(c.crop_id, lang);
      const yieldVal = decimalValue(form.crops[index]?.yield ?? "0");
      const totalYield = yieldVal * c.area;
      const intensity = totalYield > 0 ? (c.total_emissions / totalYield).toFixed(2) : "—";
      lines.push(`- ${label}: ${c.area.toFixed(1)} ha, ${c.total_emissions.toFixed(2)} tCO2e, ${t.carbonIntensity}: ${intensity}`);
    });
    lines.push("");
    lines.push(`${t.recommendationsTitle}`);
    lines.push(`${t.organicMode}: ${organicMode ? (lang === "en" ? "On" : "Увімкнено") : (lang === "en" ? "Off" : "Вимкнено")}`);
    recommendations.forEach((rec) => {
      const status = rec.implemented ? t.recommendationImplemented : t.recommendationApply;
      const cost = costAssumptions[rec.id]?.cost ?? 0;
      const savings = costAssumptions[rec.id]?.savings ?? 0;
      const payback = savings > 0 ? `${(cost / savings).toFixed(1)}y` : "—";
      lines.push(`• ${rec.title} — ${rec.description} (${t.recommendationImpact}: ${rec.impact.toFixed(2)} tCO2e; ${status}; ${t.costBenefitPayback}: ${payback})`);
    });
    lines.push("");
    lines.push(`${t.dataSourcesTitle}`);
    DATA_SOURCES.forEach((c, idx) => lines.push(`${idx + 1}. ${c}`));
    downloadTextFile(lines.join("\n"), `farm-report-${dateLabel}.txt`);
    pushToast(t.toastExported, "success");
    trackEvent("export_pdf");
  }

  async function handleLoadHistory(entry: CalculationHistory) {
    setSampleMode(false);
    setSampleSelection(null);
    sampleSnapshotRef.current = null;
    setForm(entry.data);
    setPractices(entry.practices);
    setResults(entry.results || null);
    setAnimalBreakdown(null);
    setErrors([]);
    setCalculationDate(new Date(entry.timestamp));
    setLastCalcForm(entry.data);
    setLastCalcPractices(entry.practices);
    setPracticeComparison(null);
    setPracticeComparisonVisible(false);
    setAppliedRecommendations(new Set());
    setAutoFieldMap({});
  }

  async function handleDeleteHistory(entry: CalculationHistory) {
    openConfirm(t.confirmDelete, async () => {
      try {
        await storageManager.deleteCalculation(entry.id);
        const nextHistory = await storageManager.loadHistory();
        setHistory(nextHistory);
        setHistorySelected((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
        pushToast(t.toastSaved, "success");
      } catch (e) {
        console.warn("Failed to delete history:", e);
        pushToast(t.toastError, "error", true);
      }
    });
  }

  function handleExportHistoryEntry(entry: CalculationHistory) {
    if (!entry.results) return;
    const farmArea = decimalValue(entry.data.totalArea || "0");
    downloadResultsAsCSV(entry.results, { farmArea }, lang);
    pushToast(t.toastExported, "success");
    trackEvent("export_history_entry");
  }

  function downloadBatchTemplate() {
    const headers = ["farm_name", "total_area", "dairy_cows", "pigs", "chickens", "crops"];
    const example = [
      ["Green Farm", "100", "20", "40", "200", "wheat:60;barley:40"]
    ];
    const csvText = createCSVTemplate(headers, example);
    downloadCSV(csvText, "batch-template.csv");
  }

  async function handleBatchUpload(file: File | null) {
    if (!file) return;
    setBatchMessage(null);
    try {
      const result = await parseCSVFile(file);
      if (result.errors.length > 0) {
        setBatchMessage(result.errors[0].message);
        return;
      }
      const rows = result.rows;
      const nextResults: Array<{ name: string; total: number; perHa: number }> = [];
      rows.forEach((row) => {
        const rowData = row.data ?? {};
        const name = (rowData["farm_name"] ?? "").trim() || (lang === "en" ? "Unnamed farm" : "Без назви");
        const totalArea = String(rowData["total_area"] ?? "0");
        const cropsRaw = String(rowData["crops"] ?? "");
        const cropEntries = cropsRaw.split(";").map((entry) => entry.trim()).filter(Boolean);
        const cropForms: CropForm[] = cropEntries.map((entry) => {
          const [cropName, area] = entry.split(":").map((part) => part.trim());
          const cropId = cropName ? fuzzyMatchCropName(cropName) : 0;
          return { ...defaultCrop(cropId), area: area || "0" };
        });
        const farmForm: FarmForm = {
          totalArea,
          dairyCows: String(rowData["dairy_cows"] ?? "0"),
          pigs: String(rowData["pigs"] ?? "0"),
          chickens: String(rowData["chickens"] ?? "0"),
          crops: cropForms.length > 0 ? cropForms : [defaultCrop()]
        };
        const practiceList = farmForm.crops.map(() => defaultPractice());
        const batchResults = calculateAdjustedResults(farmForm, practiceList, {
          organicMode,
          region: settingsRegion,
          customFactors: customFactorsEnabled ? customFactors : undefined,
          equipment,
          irrigationFactor: climateZones[climateZone].irrigationFactor
        });
        nextResults.push({ name, total: batchResults.total_emissions, perHa: batchResults.per_hectare_emissions });
      });
      setBatchResults(nextResults);
      trackEvent("batch_upload");
    } catch (e) {
      console.warn("Batch upload failed:", e);
      setBatchMessage(t.toastError);
    }
  }

  function exportBatchResults() {
    if (batchResults.length === 0) return;
    const headers = [t.historyFarm, t.total, t.perHectare];
    const rows = batchResults.map((item) => [item.name, item.total.toFixed(2), item.perHa.toFixed(2)]);
    const csvText = generateCSVFromRows(headers, rows);
    downloadCSV(csvText, `batch-results-${new Date().toISOString().slice(0, 10)}.csv`);
    trackEvent("batch_export");
  }

  function clearBatchResults() {
    setBatchResults([]);
    setBatchMessage(null);
  }

  async function handleExportRotationPdf() {
    if (!rotationStats) return;
    const baseResults = results ?? calculateAdjustedResults(form, practices, {
      organicMode,
      region: settingsRegion,
      customFactors: customFactorsEnabled ? customFactors : undefined,
      equipment,
      irrigationFactor: climateZones[climateZone].irrigationFactor
    });
    const dateLabel = new Date().toISOString().split("T")[0];
    const lines: string[] = [];
    lines.push(`${t.rotationTitle}`);
    lines.push("");
    lines.push(`${t.total}: ${baseResults.total_emissions.toFixed(2)} tCO2e`);
    lines.push(`${t.perHectare}: ${baseResults.per_hectare_emissions.toFixed(2)} tCO2e/ha`);
    lines.push("");
    lines.push(t.rotationAverage + `: ${rotationStats.avg.toFixed(2)} tCO2e`);
    rotationStats.yearResults.forEach((item) => {
      lines.push(`- ${item.name}: ${item.total.toFixed(2)} tCO2e (${item.perHa.toFixed(2)} tCO2e/ha)`);
    });
    downloadTextFile(lines.join("\n"), `rotation-${dateLabel}.txt`);
    pushToast(t.toastExported, "success");
    trackEvent("rotation_export");
  }

  function toggleHistorySelection(id: string) {
    setHistorySelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setHistorySelectAll(next.size === filteredHistory.length && filteredHistory.length > 0);
      return next;
    });
  }

  function toggleCompareSelection(id: string) {
    setCompareSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= 5) {
        pushToast(t.comparisonLimit, "warning");
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  function exportComparisonTable() {
    const entries = filteredHistory.filter((entry) => compareSelection.has(entry.id));
    if (entries.length === 0) return;
    const headers = [
      t.historyFarm,
      t.total,
      t.perHectare,
      t.fertilizer,
      t.manureCat,
      t.fuel,
      t.irrigationCat,
      t.pesticideCat,
      t.livestockCat,
      t.farmArea,
      t.livestock
    ];
    const rows = entries.map((entry) => [
      entry.farmName || (lang === "en" ? "Unnamed farm" : "Без назви"),
      entry.results?.total_emissions?.toFixed(2) ?? "0.00",
      entry.results?.per_hectare_emissions?.toFixed(2) ?? "0.00",
      entry.results?.fertilizer_emissions?.toFixed(2) ?? "0.00",
      entry.results?.manure_emissions?.toFixed(2) ?? "0.00",
      entry.results?.fuel_emissions?.toFixed(2) ?? "0.00",
      entry.results?.irrigation_emissions?.toFixed(2) ?? "0.00",
      entry.results?.pesticide_emissions?.toFixed(2) ?? "0.00",
      entry.results?.livestock_emissions?.toFixed(2) ?? "0.00",
      decimalValue(entry.data.totalArea || "0").toFixed(1),
      `${entry.data.dairyCows}/${entry.data.pigs}/${entry.data.chickens}`
    ]);
    const csvText = generateCSVFromRows(headers, rows);
    downloadCSV(csvText, `comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function toggleHistorySelectAll() {
    if (historySelectAll) {
      setHistorySelected(new Set());
      setHistorySelectAll(false);
      return;
    }
    const next = new Set(filteredHistory.map((h) => h.id));
    setHistorySelected(next);
    setHistorySelectAll(true);
  }

  function buildWhatIfPractices(tillage: WhatIfTillageOption, irrigation: WhatIfIrrigationOption, cover: WhatIfCoverOption) {
    return form.crops.map((_, index) => {
      const base = practices[index] ?? defaultPractice();
      return {
        ...base,
        tillage: tillage === "current" ? base.tillage : tillage,
        irrigationMethod: irrigation === "current" ? base.irrigationMethod : irrigation,
        coverCrop: cover === "current" ? base.coverCrop : cover === "on"
      };
    });
  }

  function buildWhatIfForm(nitrogenPct: number) {
    const factor = Math.max(0, nitrogenPct) / 100;
    return {
      ...form,
      crops: form.crops.map((c) => ({
        ...c,
        nitrogen: formatNumber(decimalValue(c.nitrogen) * factor)
      }))
    };
  }

  function calculateWhatIf(
    nitrogenPct: number,
    tillage: WhatIfTillageOption,
    irrigation: WhatIfIrrigationOption,
    cover: WhatIfCoverOption
  ) {
    const farmData = normalizeFarm(form, nitrogenPct, organicMode);
    const base = calculateEmissions(farmData);
    const organicInputs = buildOrganicInputs(form);
    const adjusted = applyPracticesAndPesticides(
      base,
      farmData,
      buildWhatIfPractices(tillage, irrigation, cover),
      form.crops.map((c) => c.pesticides),
      organicMode,
      organicInputs
    );
    const regional = applyRegionalFactors(adjusted, settingsRegion, farmData.total_farm_size);
    const withCustom = customFactorsEnabled ? applyCustomFactors(regional, farmData, customFactors) : regional;
    const withWeather = applyWeatherAdjustments(withCustom, climateZones[climateZone].irrigationFactor);
    return applyEquipmentEmissions(withWeather, equipment, customFactorsEnabled ? customFactors : undefined);
  }

  async function handleSaveWhatIf() {
    if (!results) return;
    const name = whatIfName.trim();
    if (!name) {
      setWhatIfMessage({ type: "error", text: t.whatIfNameRequired });
      pushToast(t.whatIfNameRequired, "warning", true);
      return;
    }

    const scenarioForm = buildWhatIfForm(whatIfNitrogen);
    const scenarioPractices = buildWhatIfPractices(
      WHATIF_TILLAGE_OPTIONS[whatIfTillageIndex] ?? "current",
      WHATIF_IRRIGATION_OPTIONS[whatIfIrrigationIndex] ?? "current",
      WHATIF_COVER_OPTIONS[whatIfCoverIndex] ?? "current"
    );
    const scenarioResults = calculateWhatIf(
      whatIfNitrogen,
      WHATIF_TILLAGE_OPTIONS[whatIfTillageIndex] ?? "current",
      WHATIF_IRRIGATION_OPTIONS[whatIfIrrigationIndex] ?? "current",
      WHATIF_COVER_OPTIONS[whatIfCoverIndex] ?? "current"
    );

    try {
      await profileManager.save(name, scenarioForm, scenarioPractices, { notes: "What-if scenario" });
      const entry: CalculationHistory = {
        id: generateId(),
        timestamp: new Date(),
        farmName: name,
        data: scenarioForm,
        practices: scenarioPractices,
        results: scenarioResults,
        metadata: { version: APP_VERSION, customFactors: customFactorsEnabled }
      };
      await storageManager.saveCalculation(entry);
      const nextHistory = await storageManager.loadHistory();
      setHistory(nextHistory);
      setWhatIfMessage({ type: "success", text: t.whatIfSaved });
      pushToast(t.whatIfSaved, "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : t.whatIfSaveError;
      setWhatIfMessage({ type: "error", text: message });
      pushToast(message, "error", true);
    }
  }

  function updateProjectionRate(key: keyof ProjectionRates, value: string) {
    const next = Number(value);
    setProjectionRates((prev) => ({
      ...prev,
      [key]: Number.isFinite(next) ? next : 0
    }));
  }

  function handleExportProjectionCsv() {
    if (!results || projectionPoints.length === 0) return;
    const headers = [
      t.projectionYearLabel,
      t.total,
      t.fertilizer,
      t.manureCat,
      t.fuel,
      t.irrigationCat,
      t.pesticideCat,
      t.livestockCat
    ];
    const rows = projectionPoints.map((p) => [
      p.year,
      p.total.toFixed(2),
      p.fertilizer.toFixed(2),
      p.manure.toFixed(2),
      p.fuel.toFixed(2),
      p.irrigation.toFixed(2),
      p.pesticide.toFixed(2),
      p.livestock.toFixed(2)
    ]);
    rows.push([t.projectionCumulative, projectionCumulative.toFixed(2), "", "", "", "", "", ""]);
    const csvText = generateCSVFromRows(headers, rows);
    const stamp = (calculationDate ?? new Date()).toISOString().slice(0, 10);
    downloadCSV(csvText, `farm-projection-${stamp}.csv`);
    pushToast(t.toastExported, "success");
  }

  function applyRecommendation(id: RecommendationItem["id"]) {
    if (!results) return;
    let nextPractices = practices;
    switch (id) {
      case "no_till":
        nextPractices = practices.map((p) => ({ ...p, tillage: "no_till" as Tillage }));
        break;
      case "precision":
        nextPractices = practices.map((p) => ({ ...p, precisionFertilization: true }));
        break;
      case "irrigation":
        nextPractices = practices.map((p) => ({ ...p, irrigationMethod: "drip" as IrrigationMethod }));
        break;
      case "cover":
        nextPractices = practices.map((p) => ({ ...p, coverCrop: true }));
        break;
    }

    setPractices(nextPractices);
    setResults(
      calculateAdjustedResults(form, nextPractices, {
        organicMode,
        region: settingsRegion,
        customFactors: customFactorsEnabled ? customFactors : undefined,
        equipment,
        irrigationFactor: climateZones[climateZone].irrigationFactor
      })
    );
    setCalculationDate(new Date());
    setAppliedRecommendations((prev) => new Set(prev).add(id));
    setRecStatus((prev) => ({ ...prev, [id]: { ...prev[id], status: "implemented" } }));
    pushToast(t.toastSaved, "success");
  }

  function toggleActionPlanSelection(id: RecommendationItem["id"]) {
    setActionPlanSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function labelForDifficulty(value: ActionPlanItem["difficulty"]) {
    if (value === "low") return t.difficultyLow;
    if (value === "medium") return t.difficultyMedium;
    return t.difficultyHigh;
  }

  function labelForCost(value: ActionPlanItem["cost"]) {
    if (value === "low") return t.costLow;
    if (value === "medium") return t.costMedium;
    return t.costHigh;
  }

  function labelForTimeline(value: ActionPlanItem["timeline"]) {
    if (value === "now") return t.timelineNow;
    if (value === "season") return t.timelineSeason;
    return t.timelineNextYear;
  }

  async function handleExportActionPlanPdf() {
    if (!results || actionPlanItems.length === 0) return;
    const date = calculationDate ?? new Date();
    const dateLabel = date.toISOString().split("T")[0];
    const lines: string[] = [];
    lines.push(`${t.actionPlanTitle}`);
    lines.push(`${lang === "en" ? "Calculation date" : "Дата розрахунку"}: ${date.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}`);
    lines.push("");
    lines.push(`${t.total}: ${results.total_emissions.toFixed(2)} tCO2e`);
    lines.push(`${t.perHectare}: ${results.per_hectare_emissions.toFixed(2)} tCO2e/ha`);
    lines.push("");
    lines.push(`${t.organicMode}: ${organicMode ? (lang === "en" ? "On" : "Увімкнено") : (lang === "en" ? "Off" : "Вимкнено")}`);
    lines.push("");
    actionPlanItems.forEach((item) => {
      const detail = `${t.actionPlanDifficulty}: ${labelForDifficulty(item.difficulty)} • ${t.actionPlanCost}: ${labelForCost(item.cost)} • ${t.actionPlanTimeline}: ${labelForTimeline(item.timeline)}`;
      const cost = costAssumptions[item.id]?.cost ?? 0;
      const savings = costAssumptions[item.id]?.savings ?? 0;
      const payback = savings > 0 ? `${(cost / savings).toFixed(1)}y` : "—";
      const status = recStatus[item.id]?.status ?? "planned";
      const statusLabel = status === "implemented" ? t.recommendationImplemented : status === "na" ? t.recommendationNotApplicable : t.recommendationPlanned;
      const notes = recStatus[item.id]?.notes ? `; ${t.recommendationNotes}: ${recStatus[item.id]?.notes}` : "";
      lines.push(`• ${item.title} — ${item.description} (${detail}; ${t.costBenefitPayback}: ${payback}; ${t.recommendationStatus}: ${statusLabel}${notes})`);
    });
    downloadTextFile(lines.join("\n"), `action-plan-${dateLabel}.txt`);
    pushToast(t.toastExported, "success");
    trackEvent("export_action_plan");
  }

  async function handleDeleteSelectedHistory() {
    if (historySelected.size === 0) return;
    openConfirm(t.confirmDeleteSelected, async () => {
      try {
        await storageManager.deleteCalculations(Array.from(historySelected));
        const nextHistory = await storageManager.loadHistory();
        setHistory(nextHistory);
        setHistorySelected(new Set());
        setHistorySelectAll(false);
        pushToast(t.toastSaved, "success");
      } catch (e) {
        console.warn("Failed to delete selected history:", e);
        pushToast(t.toastError, "error", true);
      }
    });
  }

  function deltaClass(value: number) {
    if (value < -1e-6) return "delta-good";
    if (value > 1e-6) return "delta-bad";
    return "delta-neutral";
  }

  function formatDelta(value: number, unit: string) {
    const sign = value > 1e-6 ? "+" : "";
    return `${sign}${value.toFixed(2)} ${unit}`;
  }

  function formatPercentChange(delta: number, base: number) {
    if (Math.abs(base) < 1e-6) return "—";
    const sign = delta > 1e-6 ? "+" : "";
    return `${sign}${((delta / base) * 100).toFixed(1)}%`;
  }

  return (
    <main className={activeView === "form" ? "page page-form" : "page"}>
      {draftExists && draft && (
        <DraftRecoveryNotification
          draft={draft}
          language={lang}
          onRecover={handleDraftRecover}
          onDismiss={handleDraftDismiss}
        />
      )}
      <header className="hero" role="banner">
        <div className="hero-top">
          <div className="hero-actions">
            <div className="lang-switch">
              <button className={lang === "en" ? "lang-btn active" : "lang-btn"} type="button" aria-label={lang === "en" ? "Switch to English" : "Перемкнути на англійську"} onClick={() => setLang("en")}>EN</button>
              <button className={lang === "ua" ? "lang-btn active" : "lang-btn"} type="button" aria-label={lang === "en" ? "Switch to Ukrainian" : "Перемкнути на українську"} onClick={() => setLang("ua")}>UA</button>
            </div>
            <button
              className="ghost btn-with-icon menu-btn"
              type="button"
              aria-label={showHeaderMenu ? t.menuClose : t.menuOpen}
              aria-expanded={showHeaderMenu}
              aria-controls={headerMenuId}
              ref={menuButtonRef}
              onClick={() => setShowHeaderMenu((prev) => !prev)}
            >
              <Icon name="menu" className="icon-xs" />
              {t.menuLabel}
            </button>
          </div>
          <div className="app-title-row">
            <img className="app-header__logo" src="/brand-icon.png" alt="" aria-hidden="true" />
            <div className="app-header__title">Farm Carbon Footprint Estimator</div>
          </div>
          <button
            className="theme-btn"
            type="button"
            aria-label={theme === "dark" ? t.switchToLight : t.switchToDark}
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} className="icon-xs" />
            {theme === "dark" ? t.switchToLight : t.switchToDark}
          </button>
        </div>
        {!isOnline && (
          <div className="offline-banner" role="status" aria-live="polite">
            {t.offline}
          </div>
        )}
        <h2>{t.appTitle}</h2>
        <p className="subhead">{t.appSubtitle}</p>
      </header>

      <section className={activeView === "results" || activeView === "form" ? "layout layout-single" : "layout"} aria-label={lang === "en" ? "Main content" : "Основний вміст"}>
        <div className="toast-stack" role="region" aria-live="polite" aria-label={lang === "en" ? "Notifications" : "Сповіщення"}>
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
              <span>{toast.message}</span>
              <button className="ghost" type="button" aria-label={t.shortcutsClose} onClick={() => dismissToast(toast.id)}>×</button>
            </div>
          ))}
        </div>
        {confirmState && (
          <div className="shortcut-overlay" onClick={() => setConfirmState(null)} role="dialog" aria-modal="true" aria-label={confirmState.title}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{confirmState.title}</h3>
                <button className="ghost" type="button" aria-label={t.confirmNo} onClick={() => setConfirmState(null)}>{t.confirmNo}</button>
              </div>
              <p className="hint">{confirmState.message}</p>
              <div className="settings-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setConfirmState(null);
                  }}
                >
                  {confirmState.cancelLabel}
                </button>
                <button
                  className="ghost danger btn-with-icon"
                  type="button"
                  onClick={() => {
                    const action = confirmState.onConfirm;
                    setConfirmState(null);
                    action();
                  }}
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
        {showShortcuts && (
          <div className="shortcut-overlay" onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true" aria-label={t.shortcutsTitle}>
            <div className="shortcut-panel" ref={shortcutsPanelRef} onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.shortcutsTitle}</h3>
                <button className="ghost" type="button" aria-label={t.shortcutsClose} onClick={() => setShowShortcuts(false)}>{t.shortcutsClose}</button>
              </div>
              <p className="hint">{t.shortcutsHint}</p>
              <table className="shortcut-table">
                <tbody>
                  <tr><td>Ctrl/Cmd + S</td><td>{t.shortcutSave}</td></tr>
                  <tr><td>Ctrl/Cmd + E</td><td>{t.shortcutExport}</td></tr>
                  <tr><td>Ctrl/Cmd + Enter</td><td>{t.shortcutCalculate}</td></tr>
                  <tr><td>Ctrl/Cmd + N</td><td>{t.shortcutNewCrop}</td></tr>
                  <tr><td>Ctrl/Cmd + D</td><td>{t.shortcutDuplicateCrop}</td></tr>
                  <tr><td>Ctrl/Cmd + /</td><td>{t.shortcutHelp}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {showTutorial && (
          <div className="shortcut-overlay" onClick={() => setShowTutorial(false)} role="dialog" aria-modal="true" aria-label={t.tutorialTitle}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.tutorialTitle}</h3>
                <button className="ghost" type="button" aria-label={t.tutorialSkip} onClick={() => setShowTutorial(false)}>{t.tutorialSkip}</button>
              </div>
              <div className="tutorial-body">
                {[t.tutorialStep1, t.tutorialStep2, t.tutorialStep3, t.tutorialStep4, t.tutorialStep5, t.tutorialStep6, t.tutorialStep7, t.tutorialStep8][tutorialStep] ?? t.tutorialStep1}
              </div>
              <div className="settings-actions">
                <button className="ghost" type="button" disabled={tutorialStep === 0} onClick={() => setTutorialStep((s) => Math.max(0, s - 1))}>{t.tutorialBack}</button>
                {tutorialStep < 7 ? (
                  <button className="ghost" type="button" onClick={() => setTutorialStep((s) => Math.min(7, s + 1))}>{t.tutorialNext}</button>
                ) : (
                  <button className="ghost" type="button" onClick={() => setShowTutorial(false)}>{t.tutorialFinish}</button>
                )}
              </div>
            </div>
          </div>
        )}
        {showExamples && (
          <div className="shortcut-overlay" onClick={() => setShowExamples(false)} role="dialog" aria-modal="true" aria-label={t.examplesTitle}>
            <div className="shortcut-panel examples-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.examplesTitle}</h3>
                <button className="ghost" type="button" aria-label={t.examplesClose} onClick={() => setShowExamples(false)}>{t.examplesClose}</button>
              </div>
              <div className="examples-grid">
                {samples.map((sample) => (
                  <div className="sample-card" key={sample.name}>
                    <div>
                      <strong>{sample.name}</strong>
                      <p className="hint">{sample.notes}</p>
                    </div>
                    <div className="sample-actions">
                      <button
                        className="ghost"
                        type="button"
                        aria-label={t.examplesUse}
                        onClick={() => {
                          enterSample(sample);
                          setShowExamples(false);
                        }}
                      >
                        {t.examplesUse}
                      </button>
                      <button
                        className="ghost btn-with-icon"
                        type="button"
                        aria-label={t.examplesCopy}
                        onClick={() => {
                          setForm(cloneFormData(sample.form));
                          setPractices(clonePracticesData(sample.practices));
                          setResults(null);
                          setAnimalBreakdown(null);
                          setErrors([]);
                          setCalculationDate(null);
                          setLastCalcForm(null);
                          setLastCalcPractices(null);
                          setPracticeComparison(null);
                          setPracticeComparisonVisible(false);
                          setAppliedRecommendations(new Set());
                          setAutoFieldMap({});
                          setPesticideSearch({});
                          setSampleMode(false);
                          setSampleSelection(null);
                          sampleSnapshotRef.current = null;
                          setActiveView("form");
                          setShowExamples(false);
                        }}
                      >
                        {t.examplesCopy}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {showDashboard && (
          <div className="shortcut-overlay" onClick={() => setShowDashboard(false)} role="dialog" aria-modal="true" aria-label={t.dashboardTitle}>
            <div className="shortcut-panel dashboard-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.dashboardTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowDashboard(false)}>{t.settingsClose}</button>
              </div>
              {!dashboardStats && <p className="hint">{t.dashboardNoData}</p>}
              {dashboardStats && (
                <>
                  <div className="dashboard-grid">
                    <div className="status-pill status-ok">{t.dashboardTotal}: {dashboardStats.total}</div>
                    <div className="status-pill status-ok">{t.dashboardAverage}: {dashboardStats.average.toFixed(2)} tCO2e/ha</div>
                    <div className="status-pill status-warn">{t.dashboardLowest}: {dashboardStats.lowest.toFixed(2)} tCO2e/ha</div>
                    <div className="status-pill status-warn">{t.dashboardHighest}: {dashboardStats.highest.toFixed(2)} tCO2e/ha</div>
                  </div>
                  <div className="dashboard-sparkline">
                    <svg viewBox="0 0 200 60" role="img" aria-label={t.dashboardTrend}>
                      <path d={dashboardStats.path} fill="none" stroke="var(--primary)" strokeWidth="2" />
                    </svg>
                  </div>
                  {historyTrend && (
                    <p className="hint">
                      {t.dashboardTrend}: {historyTrend.direction === "up" ? t.trendUp : historyTrend.direction === "down" ? t.trendDown : t.trendFlat} ({formatPercentChange(historyTrend.delta, historyTrend.previousPerHa)})
                    </p>
                  )}
                  <p className="hint">
                    {t.dashboardRange}: {dashboardStats.start.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")} – {dashboardStats.end.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        {showBatchMode && (
          <div className="shortcut-overlay" onClick={() => setShowBatchMode(false)} role="dialog" aria-modal="true" aria-label={t.batchModeTitle}>
            <div className="shortcut-panel batch-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.batchModeTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowBatchMode(false)}>{t.settingsClose}</button>
              </div>
              <p className="hint">{t.batchModeHint}</p>
              <div className="settings-actions">
                <button className="ghost" type="button" onClick={downloadBatchTemplate}>
                  {t.batchModeTemplate}
                </button>
                <label className="ghost btn-with-icon">
                  {t.batchModeUpload}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleBatchUpload(e.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {batchMessage && <p className="hint">{batchMessage}</p>}
              {batchResults.length === 0 && <p className="hint">{t.batchModeNoData}</p>}
              {batchResults.length > 0 && (
                <>
                  <div className="table-scroll">
                    <table className="projection-table">
                      <thead>
                        <tr>
                          <th>{t.historyFarm}</th>
                          <th>{t.total}</th>
                          <th>{t.perHectare}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((item) => (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.total.toFixed(2)} tCO2e</td>
                            <td>{item.perHa.toFixed(2)} tCO2e/ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button className="ghost" type="button" onClick={exportBatchResults}>
                    {t.batchModeExport}
                  </button>
                  <button className="ghost" type="button" onClick={clearBatchResults}>
                    {t.batchModeClear}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {showRotationPlanner && (
          <div className="shortcut-overlay" onClick={() => setShowRotationPlanner(false)} role="dialog" aria-modal="true" aria-label={t.rotationTitle}>
            <div className="shortcut-panel rotation-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.rotationTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowRotationPlanner(false)}>{t.settingsClose}</button>
              </div>
              <p className="hint">{t.rotationDescription}</p>
              {rotationPlan && (
                <div className="rotation-years">
                  {rotationPlan.years.map((year, yi) => (
                    <div key={year.id} className="rotation-year">
                      <input
                        type="text"
                        value={year.name}
                        onChange={(e) => updateRotationYear(yi, { name: e.target.value })}
                      />
                      {year.crops.map((crop, ci) => (
                        <div key={`rot-${year.id}-${ci}`} className="rotation-crop-row">
                          <select value={crop.crop_id} onChange={(e) => updateRotationCrop(yi, ci, { crop_id: Number(e.target.value) })}>
                            {crops.map((_, id) => (
                              <option key={`rot-c-${id}`} value={id}>{cropLabel(id, lang)}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={crop.area}
                            onChange={(e) => updateRotationCrop(yi, ci, { area: e.target.value })}
                          />
                          <button className="ghost danger" type="button" onClick={() => removeRotationCrop(yi, ci)}>
                            {t.remove}
                          </button>
                        </div>
                      ))}
                      <button className="ghost" type="button" onClick={() => addRotationCrop(yi)}>{t.addCrop}</button>
                    </div>
                  ))}
                </div>
              )}
              <button className="ghost" type="button" onClick={addRotationYear}>{t.rotationAddYear}</button>
              <button className="ghost" type="button" onClick={handleExportRotationPdf} disabled={!rotationStats}>
                {t.exportRotationTxt}
              </button>
              {rotationStats && (
                <div className="rotation-summary">
                  <strong>{t.rotationAverage}: {rotationStats.avg.toFixed(2)} tCO2e</strong>
                  <div className="table-scroll">
                    <table className="projection-table">
                      <thead>
                        <tr>
                          <th>{t.historyDate}</th>
                          <th>{t.total}</th>
                          <th>{t.perHectare}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rotationStats.yearResults.map((item) => (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.total.toFixed(2)} tCO2e</td>
                            <td>{item.perHa.toFixed(2)} tCO2e/ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {showDeveloperInfo && (
          <div className="shortcut-overlay" onClick={() => setShowDeveloperInfo(false)} role="dialog" aria-modal="true" aria-label={t.developerInfoTitle}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.developerInfoTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowDeveloperInfo(false)}>{t.settingsClose}</button>
              </div>
              <div className="tutorial-body">
                <p><strong>{t.developerInfoRole}</strong></p>
                <p>{t.developerInfoOrg}</p>
                <p>{t.developerInfoPhone}</p>
                {(() => {
                  const emailMatch = t.developerInfoEmail.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i);
                  const email = emailMatch?.[0];
                  return (
                    <div className="developer-email">
                      <span>{t.developerInfoEmailLabel}:</span>
                      {email ? (
                        <a href={`mailto:${email}`} className="developer-email-link">{email}</a>
                      ) : (
                        <span>{t.developerInfoEmail}</span>
                      )}
                      {email && (
                        <div className="developer-email-actions">
                          <button
                            className="ghost"
                            type="button"
                            aria-label={t.developerInfoEmailSend}
                            onClick={() => {
                              const mailto = `mailto:${email}`;
                              window.open(mailto, "_blank");
                            }}
                          >
                            {t.developerInfoEmailSend}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        {showInstallGuide && (
          <div className="shortcut-overlay" onClick={() => setShowInstallGuide(false)} role="dialog" aria-modal="true" aria-label={t.installGuidelinesTitle}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.installGuidelinesTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowInstallGuide(false)}>{t.settingsClose}</button>
              </div>
              <div className="tutorial-body">
                <p>{t.installGuidelinesIntro}</p>
                <p>{t.installGuidelinesPros}</p>
                <p>{t.installGuidelinesCons}</p>
                <ul>
                  <li>{t.installGuidelinesDesktop}</li>
                  <li>{t.installGuidelinesAndroid}</li>
                  <li>{t.installGuidelinesIOS}</li>
                </ul>
                <div className="install-guide-actions">
                  <button
                    className="primary"
                    type="button"
                    aria-label={t.installApp}
                    onClick={async () => {
                      if (!installPrompt) {
                        pushToast(t.installNotAvailable, "warning");
                        return;
                      }
                      try {
                        await installPrompt.prompt();
                        await installPrompt.userChoice;
                      } finally {
                        setInstallPrompt(null);
                      }
                    }}
                  >
                    {t.installApp}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showPrivacyPolicy && (
          <div className="shortcut-overlay" onClick={() => setShowPrivacyPolicy(false)} role="dialog" aria-modal="true" aria-label={t.privacyTitle}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.privacyTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowPrivacyPolicy(false)}>{t.settingsClose}</button>
              </div>
              <div className="tutorial-body">
                <p>{t.privacyBody1}</p>
                <p>{t.privacyBody2}</p>
                <p>{t.privacyBody3}</p>
              </div>
            </div>
          </div>
        )}
        {showTerms && (
          <div className="shortcut-overlay" onClick={() => setShowTerms(false)} role="dialog" aria-modal="true" aria-label={t.termsTitle}>
            <div className="shortcut-panel" onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.termsTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowTerms(false)}>{t.settingsClose}</button>
              </div>
              <div className="tutorial-body">
                <p>{t.termsBody1}</p>
                <p>{t.termsBody2}</p>
                <p>{t.termsBody3}</p>
              </div>
            </div>
          </div>
        )}
        {showSettings && (
          <div className="shortcut-overlay" onClick={() => setShowSettings(false)} role="dialog" aria-modal="true" aria-label={t.settingsTitle}>
            <div className="shortcut-panel settings-panel" ref={settingsPanelRef} onClick={(e) => e.stopPropagation()}>
              <div className="panel-title-row">
                <h3>{t.settingsTitle}</h3>
                <button className="ghost" type="button" aria-label={t.settingsClose} onClick={() => setShowSettings(false)}>{t.settingsClose}</button>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label>{t.settingsLanguage}</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                    <option value="en">English</option>
                    <option value="ua">Українська</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.settingsTheme}</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                    <option value="dark">{lang === "en" ? "Dark" : "Темна"}</option>
                    <option value="light">{lang === "en" ? "Light" : "Світла"}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.settingsContrast}</label>
                  <select value={highContrast ? "high" : "normal"} onChange={(e) => setHighContrast(e.target.value === "high")}>
                    <option value="normal">{t.highContrastOff}</option>
                    <option value="high">{t.highContrastOn}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.settingsFont}</label>
                  <select value={fontSize} onChange={(e) => setFontSize(e.target.value as typeof fontSize)}>
                    <option value="small">{t.fontSizeSmall}</option>
                    <option value="medium">{t.fontSizeMedium}</option>
                    <option value="large">{t.fontSizeLarge}</option>
                    <option value="extra-large">{t.fontSizeXL}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.settingsRegion}</label>
                  <select value={settingsRegion} onChange={(e) => setSettingsRegion(e.target.value)}>
                    {Object.keys(REGION_FACTORS).map((region) => (
                      <option key={region} value={region}>{regionLabel(region)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{t.settingsAutoSave}</label>
                  <input type="number" min={1} max={60} value={autoSaveInterval} onChange={(e) => setAutoSaveInterval(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>{t.organicMode}</label>
                  <select value={organicMode ? "on" : "off"} onChange={(e) => setOrganicMode(e.target.value === "on")}>
                    <option value="off">{lang === "en" ? "Off" : "Вимкнено"}</option>
                    <option value="on">{lang === "en" ? "On" : "Увімкнено"}</option>
                  </select>
                </div>
                <div className="field settings-wide">
                  <label>{t.costBenefitTitle} ({lang === "en" ? "USD" : "UAH"})</label>
                  <div className="settings-costs">
                    {Object.entries(costAssumptions).map(([key, value]) => (
                      <div key={key} className="cost-row">
                        <span>{recommendationTitleById(key as RecommendationItem["id"])}</span>
                        <input
                          type="number"
                          min={0}
                          value={value.cost}
                          onChange={(e) => setCostAssumptions((prev) => ({ ...prev, [key]: { ...prev[key as RecommendationItem["id"]], cost: Number(e.target.value) } }))}
                          aria-label={t.costBenefitCost}
                        />
                        <input
                          type="number"
                          min={0}
                          value={value.savings}
                          onChange={(e) => setCostAssumptions((prev) => ({ ...prev, [key]: { ...prev[key as RecommendationItem["id"]], savings: Number(e.target.value) } }))}
                          aria-label={t.costBenefitSavings}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="hint">{t.costBenefitDisclaimer}</p>
                </div>
                <div className="field">
                  <label>{t.customFactorsTitle}</label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={customFactorsEnabled}
                      onChange={(e) => setCustomFactorsEnabled(e.target.checked)}
                    />
                    {t.customFactorsEnable}
                  </label>
                  {customFactorsEnabled && (
                    <div className="settings-costs">
                      <div className="cost-row">
                        <span>N factor</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.nitrogen}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, nitrogen: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="cost-row">
                        <span>P factor</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.phosphorus}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, phosphorus: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="cost-row">
                        <span>K factor</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.potassium}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, potassium: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="cost-row">
                        <span>Diesel</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.diesel}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, diesel: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="cost-row">
                        <span>Electricity</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.electricity}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, electricity: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="cost-row">
                        <span>Livestock multiplier</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customFactors.livestock}
                          onChange={(e) => setCustomFactors((prev) => ({ ...prev, livestock: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setCustomFactors(DEFAULT_CUSTOM_FACTORS)}
                  >
                    {t.customFactorsReset}
                  </button>
                  <p className="hint">{t.customFactorsHint}</p>
                </div>
                <div className="field">
                  <label>{t.analyticsTitle}</label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={analytics.enabled}
                      onChange={(e) => setAnalytics((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    {t.analyticsEnabled}
                  </label>
                  <p className="hint">{t.analyticsEvents}</p>
                  <div className="settings-costs">
                    {Object.entries(analytics.events).map(([key, value]) => (
                      <div key={key} className="cost-row">
                        <span>{key}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                    {Object.keys(analytics.events).length === 0 && <span className="hint">{t.batchModeNoData}</span>}
                  </div>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setAnalytics({ enabled: analytics.enabled, events: {}, lastEventAt: new Date().toISOString() })}
                  >
                    {t.analyticsReset}
                  </button>
                </div>
              </div>
              <div className="settings-meta">
                <span>{t.settingsStorage}: {storageUsage}</span>
                <span className={`status-pill ${isOnline ? "status-ok" : "status-warn"}`}>
                  {isOnline ? t.online : t.offline}
                </span>
              </div>
              <div className="settings-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setLang("en");
                    setTheme("dark");
                    setHighContrast(false);
                    setFontSize("medium");
                    setSettingsRegion("Global");
                    setAutoSaveInterval(2);
                    setOrganicMode(false);
                    setCustomFactorsEnabled(false);
                    setCustomFactors(DEFAULT_CUSTOM_FACTORS);
                    setClimateZone("temperate");
                    setGoalSetting({ mode: "percent", value: 10 });
                    setAnalytics({ enabled: true, events: {} });
                    setEquipment([]);
                    setSchedulingMode(false);
                  }}
                >
                  {t.settingsReset}
                </button>
                <button
                  className="ghost danger btn-with-icon"
                  type="button"
                  onClick={() => {
                    openConfirm(t.confirmClearAll, () => {
                      storageManager.clearAllData().catch((e) => console.warn("Failed to clear data:", e));
                      setHistory([]);
                      setForm(createInitialForm());
                      setPractices([defaultPractice()]);
                      setResults(null);
                      setAnimalBreakdown(null);
                      setCalculationDate(null);
                      setErrors([]);
                      setAutoFieldMap({});
                      pushToast(t.toastSaved, "success");
                    });
                  }}
                >
                  {t.settingsClear}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeView === "form" && (
          <FeatureErrorBoundary language={lang} featureName="form">
            <article className="panel form-panel" aria-label={t.questionnaire} ref={formPanelRef}>
          <div className="panel-title-row">
            <h2>{t.questionnaire}</h2>
            <div className="progress-chip">{t.formProgress}: {formCompletion}%</div>
          </div>
          <div className="progress-track">
            <span style={{ width: `${formCompletion}%` }} />
          </div>

          {sampleMode && sampleSelection && (
            <div className="sample-banner" role="status" aria-live="polite">
              <div>
                <strong>{t.sampleMode}</strong>
                <p className="hint">{sampleSelection.name} — {sampleSelection.notes}</p>
              </div>
              <div className="sample-actions">
                <button
                  className="ghost"
                  type="button"
                  aria-label={t.sampleExit}
                  onClick={() => openConfirm(t.sampleExitConfirm, () => exitSampleMode(false))}
                >
                  {t.sampleExit}
                </button>
                <button className="ghost btn-with-icon" type="button" aria-label={t.clearResults} onClick={() => clearResultsOnly(true)}>
                  <Icon name="clear" className="icon-xs" />
                  {t.clearResults}
                </button>
                <button className="ghost btn-with-icon" type="button" aria-label={t.examplesCopy} onClick={copySampleToEditable}>
                  {t.examplesCopy}
                </button>
              </div>
            </div>
          )}

          {showHelp && (
            <div className="help-panel">
              <div className="panel-title-row">
                <h3>{t.helpTitle}</h3>
                <button className="ghost" type="button" onClick={() => setShowHelp(false)}>{t.helpClose}</button>
              </div>
              <ul>
                <li>{t.helpStep1}</li>
                <li>{t.helpStep2}</li>
                <li>{t.helpStep3}</li>
              </ul>
            </div>
          )}

          <fieldset className={sampleMode ? "sample-fieldset" : undefined}>
          <div className="template-panel">
            <div className="panel-title-row">
              <h3>{t.templatesTitle}</h3>
              <div className="template-region">
                <label>{t.templatesRegion}</label>
                <select value={templateRegion} onChange={(e) => setTemplateRegion(e.target.value as "temperate" | "subtropical")}>
                  <option value="temperate">{lang === "en" ? "Temperate" : "Помірний"}</option>
                  <option value="subtropical">{lang === "en" ? "Subtropical" : "Субтропічний"}</option>
                </select>
              </div>
            </div>
            <div className="template-grid">
              {templates.map((template) => (
                <div className="template-card" key={template.id}>
                  <div>
                    <strong>{template.name}</strong>
                    <p className="hint">{template.description}</p>
                  </div>
                  <button className="ghost btn-with-icon" type="button" aria-label={t.templatesApply} onClick={() => applyTemplate(template)}>
                    {t.templatesApply}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="import-last-year">
            <button className="ghost" type="button" aria-label={t.importLastYear} onClick={handleImportLastYear} disabled={history.length === 0}>
              {t.importLastYear}
            </button>
            <span className="hint">{t.importLastYearHint}</span>
          </div>

          <div className="organic-toggle">
            <label className="check">
              <input type="checkbox" checked={schedulingMode} onChange={(e) => setSchedulingMode(e.target.checked)} />
              {t.schedulingToggle}
            </label>
            <span className="hint">{t.schedulingTitle}</span>
          </div>

          <div className="mode-switch">
            <button
              className={mode === "wizard" ? "mode-btn active" : "mode-btn"}
              type="button"
              aria-label={t.wizardMode}
              onClick={() => setMode("wizard")}
            >
              {t.wizardMode}
            </button>
            <button
              className={mode === "advanced" ? "mode-btn active" : "mode-btn"}
              type="button"
              aria-label={t.advancedMode}
              onClick={() => setMode("advanced")}
            >
              {t.advancedMode}
            </button>
          </div>
          <div className="organic-toggle">
            <label className="check">
              <input
                type="checkbox"
                checked={organicMode}
                aria-label={t.organicMode}
                onChange={(e) => setOrganicMode(e.target.checked)}
              />
              {t.organicMode}
            </label>
            <span className="hint">{t.organicHelp}</span>
          </div>

          {mode === "wizard" && (
            <div
              className="wizard-steps"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setWizardStep((prev) => Math.min(wizardSteps.length - 1, prev + 1));
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setWizardStep((prev) => Math.max(0, prev - 1));
                }
              }}
            >
              {wizardSteps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={wizardStep === index ? "step-pill active" : "step-pill"}
                  aria-label={label}
                  onClick={() => setWizardStep(index)}
                >
                  <Icon name={wizardStepIcons[index]} className="icon-xs" />
                  {index + 1}. {label}
                </button>
              ))}
            </div>
          )}

          {(mode === "advanced" || wizardStep === 0) && (
            <>
              <div className="section-header">
                <h3 className="title-with-icon"><span className="icon-badge tone-results"><Icon name="farm" className="icon-sm" /></span>{t.stepFarm}</h3>
                <button className="ghost" type="button" aria-label={sectionCollapsed.farm ? t.expand : t.collapse} onClick={() => toggleSection("farm")}>
                  {sectionCollapsed.farm ? t.expand : t.collapse}
                </button>
              </div>
              <div className={sectionCollapsed.farm ? "section-body collapsed" : "section-body"}>
                <div className="field">
                  <label className="label-with-help">
                    <span>{t.farmArea}</span>
                    <HelpTip content={t.helpFarmArea} />
                  </label>
                  <input {...decimalInputProps()} aria-label={t.farmArea} value={form.totalArea} onChange={(e) => setForm((prev) => ({ ...prev, totalArea: e.target.value }))} />
                </div>
                <div className="area-actions">
                  <button className="ghost" type="button" aria-label={t.autoAreaCalc} onClick={() => setForm((prev) => ({ ...prev, totalArea: formatNumber(cropAreaSum) }))}>
                    {t.autoAreaCalc}
                  </button>
                  <label className="check">
                    <input type="checkbox" aria-label={t.autoAreaMode} checked={autoArea} onChange={(e) => setAutoArea(e.target.checked)} />
                    {t.autoAreaMode}
                  </label>
                </div>
              </div>
              {sectionCollapsed.farm && (
                <p className="section-summary">{t.farmArea}: {decimalValue(form.totalArea).toFixed(1)} ha</p>
              )}

              <div className="section-header">
                <h3 className="title-with-icon"><span className="icon-badge tone-livestock"><Icon name="livestock" className="icon-sm" /></span>{t.livestock}</h3>
                <button className="ghost" type="button" aria-label={sectionCollapsed.livestock ? t.expand : t.collapse} onClick={() => toggleSection("livestock")}>
                  {sectionCollapsed.livestock ? t.expand : t.collapse}
                </button>
              </div>
              <div className={sectionCollapsed.livestock ? "section-body collapsed" : "section-body"}>
                <div className="grid3">
                  <div className="field">
                    <label className="label-with-help"><span>{t.cows}</span><HelpTip content={t.helpCows} /></label>
                    <input {...decimalInputProps()} aria-label={t.cows} value={form.dairyCows} onChange={(e) => setForm((prev) => ({ ...prev, dairyCows: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="label-with-help"><span>{t.pigs}</span><HelpTip content={t.helpPigs} /></label>
                    <input {...decimalInputProps()} aria-label={t.pigs} value={form.pigs} onChange={(e) => setForm((prev) => ({ ...prev, pigs: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="label-with-help"><span>{t.chickens}</span><HelpTip content={t.helpChickens} /></label>
                    <input {...decimalInputProps()} aria-label={t.chickens} value={form.chickens} onChange={(e) => setForm((prev) => ({ ...prev, chickens: e.target.value }))} />
                  </div>
                </div>
              </div>
              {sectionCollapsed.livestock && (
                <p className="section-summary">{t.summaryLivestock}: {intValue(form.dairyCows) + intValue(form.pigs) + intValue(form.chickens)}</p>
              )}

              <div className="section-header">
                <h3 className="title-with-icon"><span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>{t.equipmentTitle}</h3>
                <button className="ghost" type="button" aria-label={sectionCollapsed.equipment ? t.expand : t.collapse} onClick={() => toggleSection("equipment")}>
                  {sectionCollapsed.equipment ? t.expand : t.collapse}
                </button>
              </div>
              <div className={sectionCollapsed.equipment ? "section-body collapsed" : "section-body"}>
                {equipment.length === 0 && <p className="hint">{t.equipmentHint}</p>}
                <p className="equipment-help">
                  <strong>{t.equipmentHelpTitle}</strong> {t.equipmentHoursHelp} {t.equipmentRateHelp}
                </p>
                {equipment.length > 0 && (
                  <div className="equipment-list">
                    {equipment.map((item) => (
                      <div className="equipment-row" key={item.id}>
                        <input
                          type="text"
                          placeholder={t.equipmentName}
                          value={item.name}
                          onChange={(e) => updateEquipmentEntry(item.id, { name: e.target.value })}
                        />
                        <select value={item.type} onChange={(e) => updateEquipmentEntry(item.id, { type: e.target.value as EquipmentEntry["type"] })}>
                          <option value="tractor">{equipmentTypeLabel("tractor")}</option>
                          <option value="combine">{equipmentTypeLabel("combine")}</option>
                          <option value="irrigation_pump">{equipmentTypeLabel("irrigation_pump")}</option>
                          <option value="sprayer">{equipmentTypeLabel("sprayer")}</option>
                          <option value="sprinkler_system">{equipmentTypeLabel("sprinkler_system")}</option>
                          <option value="seed_drill">{equipmentTypeLabel("seed_drill")}</option>
                          <option value="planter">{equipmentTypeLabel("planter")}</option>
                          <option value="harvester">{equipmentTypeLabel("harvester")}</option>
                          <option value="other">{equipmentTypeLabel("other")}</option>
                        </select>
                        <select value={item.fuel} onChange={(e) => updateEquipmentEntry(item.id, { fuel: e.target.value as EquipmentEntry["fuel"] })}>
                          <option value="diesel">{equipmentFuelLabel("diesel")}</option>
                          <option value="electric">{equipmentFuelLabel("electric")}</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={item.hours === 0 ? "" : item.hours}
                          onChange={(e) => {
                            const next = e.target.value;
                            updateEquipmentEntry(item.id, { hours: next === "" ? 0 : Number(next) });
                          }}
                          placeholder={t.equipmentHours}
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.rate === 0 ? "" : item.rate}
                          onChange={(e) => {
                            const next = e.target.value;
                            updateEquipmentEntry(item.id, { rate: next === "" ? 0 : Number(next) });
                          }}
                          placeholder={t.equipmentRate}
                        />
                        <button className="ghost danger btn-with-icon" type="button" onClick={() => removeEquipmentEntry(item.id)}>
                          <Icon name="clear" className="icon-xs" />
                          {t.remove}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="ghost btn-with-icon" type="button" onClick={addEquipment}>
                  <Icon name="plus" className="icon-xs" />
                  {t.equipmentAdd}
                </button>
              </div>
            </>
          )}

          {(mode === "advanced" || wizardStep === 1 || wizardStep === 2) && (
              <div className="section-header">
                <h3 className="title-with-icon"><span className="icon-badge tone-crops"><Icon name="crops" className="icon-sm" /></span>{t.cropsTitle}</h3>
                <div className="section-actions">
                  {(mode === "advanced" || wizardStep === 1) && (
                    <button className="ghost btn-with-icon" type="button" aria-label={t.addCrop} onClick={addCrop}><Icon name="plus" className="icon-xs" />{t.addCrop}</button>
                  )}
                  <button className="ghost" type="button" aria-label={sectionCollapsed.crops ? t.expand : t.collapse} onClick={() => toggleSection("crops")}>
                    {sectionCollapsed.crops ? t.expand : t.collapse}
                  </button>
                </div>
              </div>
            )}

          {(mode === "advanced" || wizardStep === 1 || wizardStep === 2) && !sectionCollapsed.crops && visibleCropIndices.map((i) => {
            const crop = form.crops[i];
            return (
            <div className={`crop-card ${collapsedCrops.has(i) ? "collapsed" : ""}`} key={`crop-${i}`}>
                <div className="crop-head">
                  <strong>{t.crop} #{i + 1}</strong>
                  <div className="crop-actions">
                    {(mode === "advanced" || wizardStep === 1) && (
                      <button className="ghost" type="button" aria-label={t.copyCrop} onClick={() => duplicateCrop(i)}>
                        {t.copyCrop}
                      </button>
                    )}
                    <button className="ghost" type="button" aria-label={collapsedCrops.has(i) ? t.expand : t.collapse} onClick={() => toggleCropCollapse(i)}>
                      {collapsedCrops.has(i) ? t.expand : t.collapse}
                    </button>
                    {(mode === "advanced" || wizardStep === 1) && form.crops.length > 1 && <button className="ghost danger btn-with-icon" type="button" aria-label={t.remove} onClick={() => removeCrop(i)}><Icon name="clear" className="icon-xs" />{t.remove}</button>}
                  </div>
                </div>
              {collapsedCrops.has(i) && (
                <p className="section-summary">
                  {cropLabel(crop.crop_id, lang)} • {decimalValue(crop.area).toFixed(1)} ha
                </p>
              )}

              {(mode === "advanced" || wizardStep === 1) && !collapsedCrops.has(i) && (
                <>
                  <div className="grid2">
                    <div className="field">
                      <label>{t.crop}</label>
                      <CropSelector
                        cropId={crop.crop_id}
                        lang={lang}
                        placeholder={t.cropSearchPlaceholder}
                        searchLabel={t.cropSearch}
                        noResultsLabel={t.cropNoResults}
                        onSelect={(id) => applySmartDefaults(i, id)}
                      />
                    </div>
                    <div className="field">
                      <label className="label-with-help"><span>{t.area}</span><HelpTip content={t.helpCropArea} /></label>
                      <input {...decimalInputProps()} aria-label={t.area} value={crop.area} onChange={(e) => updateCrop(i, { area: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t.season}</label>
                      <select value={crop.season ?? "spring"} onChange={(e) => updateCrop(i, { season: e.target.value as CropForm["season"] })}>
                        <option value="spring">{t.seasonSpring}</option>
                        <option value="summer">{t.seasonSummer}</option>
                        <option value="fall">{t.seasonFall}</option>
                        <option value="winter">{t.seasonWinter}</option>
                      </select>
                    </div>
                  </div>

                  {!organicMode && (
                    <div className="grid4">
                      <div className="field">
                        <label className="label-with-help">
                          <span>{t.nRate}</span>
                          {isAutoField(i, "nitrogen") && <span className="auto-badge">{t.autoBadge}</span>}
                          <HelpTip content={t.helpNitrogen} />
                        </label>
                        <input className={isAutoField(i, "nitrogen") ? "auto-field" : ""} {...decimalInputProps()} aria-label={t.nRate} value={crop.nitrogen} onChange={(e) => updateCropField(i, "nitrogen", e.target.value)} />
                      </div>
                      <div className="field">
                        <label className="label-with-help">
                          <span>{t.pRate}</span>
                          {isAutoField(i, "phosphorus") && <span className="auto-badge">{t.autoBadge}</span>}
                          <HelpTip content={t.helpPhosphorus} />
                        </label>
                        <input className={isAutoField(i, "phosphorus") ? "auto-field" : ""} {...decimalInputProps()} aria-label={t.pRate} value={crop.phosphorus} onChange={(e) => updateCropField(i, "phosphorus", e.target.value)} />
                      </div>
                      <div className="field">
                        <label className="label-with-help">
                          <span>{t.kRate}</span>
                          {isAutoField(i, "potassium") && <span className="auto-badge">{t.autoBadge}</span>}
                          <HelpTip content={t.helpPotassium} />
                        </label>
                        <input className={isAutoField(i, "potassium") ? "auto-field" : ""} {...decimalInputProps()} aria-label={t.kRate} value={crop.potassium} onChange={(e) => updateCropField(i, "potassium", e.target.value)} />
                      </div>
                      <div className="field align-end"><button className="ghost" type="button" aria-label={t.resetDefaults} onClick={() => applyDefaults(i)}>{t.resetDefaults}</button></div>
                    </div>
                  )}
                  {organicMode && (
                    <div className="grid3">
                      <div className="field">
                        <label className="label-with-help"><span>{t.compost}</span><HelpTip content={t.helpManure} /></label>
                        <input {...decimalInputProps()} aria-label={t.compost} value={crop.compost ?? "0"} onChange={(e) => updateCrop(i, { compost: e.target.value })} />
                      </div>
                      <div className="field">
                        <label className="label-with-help"><span>{t.greenManure}</span><HelpTip content={t.helpNitrogen} /></label>
                        <input {...decimalInputProps()} aria-label={t.greenManure} value={crop.greenManure ?? "0"} onChange={(e) => updateCrop(i, { greenManure: e.target.value })} />
                      </div>
                      <div className="field">
                        <label className="label-with-help"><span>{t.bioPest}</span><HelpTip content={t.helpPesticides} /></label>
                        <input {...decimalInputProps()} aria-label={t.bioPest} value={crop.bioPest ?? "0"} onChange={(e) => updateCrop(i, { bioPest: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div className="grid3">
                    {!organicMode && (
                      <div className="field">
                        <label className="label-with-help"><span>{t.manure}</span><HelpTip content={t.helpManure} /></label>
                        <input {...decimalInputProps()} aria-label={t.manure} value={crop.manure} onChange={(e) => updateCrop(i, { manure: e.target.value })} />
                      </div>
                    )}
                    <div className="field">
                      <label className="label-with-help"><span>{t.diesel}</span><HelpTip content={t.helpDiesel} /></label>
                      <input {...decimalInputProps()} aria-label={t.diesel} value={crop.diesel} onChange={(e) => updateCrop(i, { diesel: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="label-with-help">
                        <span>{t.irrigation}</span>
                        {isAutoField(i, "irrigation") && <span className="auto-badge">{t.autoBadge}</span>}
                        <HelpTip content={t.helpIrrigation} />
                      </label>
                      <input
                        className={isAutoField(i, "irrigation") ? "auto-field" : ""}
                        {...decimalInputProps()}
                        aria-label={t.irrigation}
                        value={crop.irrigation}
                        onChange={(e) => updateCropField(i, "irrigation", e.target.value)}
                        disabled={practices[i]?.irrigationMethod === "none"}
                      />
                    </div>
                    <div className="field">
                      <label className="label-with-help"><span>{t.cropYield}</span><HelpTip content={t.helpCropArea} /></label>
                      <input {...decimalInputProps()} aria-label={t.cropYield} value={crop.yield ?? "0"} onChange={(e) => updateCrop(i, { yield: e.target.value })} />
                    </div>
                  </div>

                  {schedulingMode && (
                    <div className="schedule-panel">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={crop.scheduleMode === "monthly"}
                          onChange={(e) =>
                            updateCrop(i, {
                              scheduleMode: e.target.checked ? "monthly" : "annual",
                              schedule: crop.schedule ?? defaultSchedule()
                            })
                          }
                        />
                        {t.schedulingTitle}
                      </label>
                      {crop.scheduleMode === "monthly" && crop.schedule && (
                        <div className="schedule-grids">
                          {(["fertilizer", "pesticide", "irrigation"] as const).map((key) => (
                            <div key={key} className="schedule-row">
                              <span className="schedule-label">
                                {key === "fertilizer" ? t.scheduleFertilizer : key === "pesticide" ? t.schedulePesticide : t.scheduleIrrigation}
                              </span>
                              <div className="schedule-inputs">
                                {monthLabels.map((month, mIndex) => (
                                  <label key={`${key}-${mIndex}`} className="schedule-cell">
                                    <span>{month}</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={Math.round(crop.schedule?.[key]?.[mIndex] ?? 0)}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        const schedule = crop.schedule ?? defaultSchedule();
                                        const next = schedule[key].map((v, idx) => (idx === mIndex ? value : v));
                                        updateCrop(i, { schedule: { ...schedule, [key]: next } });
                                      }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!organicMode && (
                    <>
                      <h4 className="label-with-help"><span>{t.pesticides}</span><HelpTip content={t.helpPesticides} /></h4>
                      <div className="pesticide-list">
                        {crop.pesticides.map((pItem, pIndex) => (
                          <div className="pesticide-row" key={`p-${i}-${pIndex}`}>
                            <PesticideSelector
                              cropIndex={i}
                              pesticideIndex={pIndex}
                              value={pItem.pesticide_id}
                              lang={lang}
                              placeholder={t.pesticideSearchPlaceholder}
                              onSelect={(id) => updatePesticide(i, pIndex, { pesticide_id: id })}
                            />
                            <input {...decimalInputProps()} aria-label={t.pesticideRate} value={pItem.rate} onChange={(e) => updatePesticide(i, pIndex, { rate: e.target.value })} placeholder={t.pesticideRate} />
                            <button className="ghost danger btn-with-icon" type="button" aria-label={t.remove} onClick={() => removePesticide(i, pIndex)}><Icon name="clear" className="icon-xs" />{t.remove}</button>
                          </div>
                        ))}
                        <button className="ghost btn-with-icon" type="button" aria-label={t.addPesticide} onClick={() => addPesticide(i)}><Icon name="plus" className="icon-xs" />{t.addPesticide}</button>
                      </div>
                    </>
                  )}
                </>
              )}

              {(mode === "advanced" || wizardStep === 2) && !collapsedCrops.has(i) && (
                <>
                  <div className="section-header nested">
                    <h4>{t.practices}</h4>
                    <button className="ghost" type="button" aria-label={sectionCollapsed.practices ? t.expand : t.collapse} onClick={() => toggleSection("practices")}>
                      {sectionCollapsed.practices ? t.expand : t.collapse}
                    </button>
                  </div>
                  <div className={sectionCollapsed.practices ? "section-body collapsed" : "section-body"}>
                    <div className="grid4">
                    <div className="field">
                      <label className="label-with-help"><span>{t.tillage}</span><HelpTip content={t.helpTillage} /></label>
                      <select aria-label={t.tillage} value={practices[i]?.tillage ?? "disk_tillage"} onChange={(e) => updatePractice(i, { tillage: e.target.value as Tillage })}>
                        <option value="moldboard_plowing">{tillageLabel("moldboard_plowing", lang)}</option>
                        <option value="disk_tillage">{tillageLabel("disk_tillage", lang)}</option>
                        <option value="chisel_tillage">{tillageLabel("chisel_tillage", lang)}</option>
                        <option value="strip_till">{tillageLabel("strip_till", lang)}</option>
                        <option value="ridge_till">{tillageLabel("ridge_till", lang)}</option>
                        <option value="no_till">{tillageLabel("no_till", lang)}</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label-with-help"><span>{t.irrigationMethod}</span><HelpTip content={t.helpIrrigationMethod} /></label>
                    <select aria-label={t.irrigationMethod} value={practices[i]?.irrigationMethod ?? "sprinkler"} onChange={(e) => updatePractice(i, { irrigationMethod: e.target.value as IrrigationMethod })}>
                      <option value="none">{irrigationMethodLabel("none", lang)}</option>
                      <option value="furrow_surface">{irrigationMethodLabel("furrow_surface", lang)}</option>
                      <option value="basin_flood">{irrigationMethodLabel("basin_flood", lang)}</option>
                      <option value="sprinkler">{irrigationMethodLabel("sprinkler", lang)}</option>
                        <option value="center_pivot">{irrigationMethodLabel("center_pivot", lang)}</option>
                        <option value="drip">{irrigationMethodLabel("drip", lang)}</option>
                        <option value="subsurface_drip">{irrigationMethodLabel("subsurface_drip", lang)}</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label-with-help"><span>{t.irrigationEnergy}</span><HelpTip content={t.helpIrrigationEnergy} /></label>
                      <select aria-label={t.irrigationEnergy} value={practices[i]?.irrigationEnergy ?? "grid"} onChange={(e) => updatePractice(i, { irrigationEnergy: e.target.value as IrrigationEnergy })}>
                        <option value="grid">{irrigationEnergyLabel("grid", lang)}</option>
                        <option value="diesel_pump">{irrigationEnergyLabel("diesel_pump", lang)}</option>
                        <option value="solar">{irrigationEnergyLabel("solar", lang)}</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label-with-help"><span>{t.residue}</span><HelpTip content={t.helpResidue} /></label>
                      <select aria-label={t.residue} value={practices[i]?.residue ?? "incorporate"} onChange={(e) => updatePractice(i, { residue: e.target.value as Residue })}>
                        <option value="incorporate">{residueLabel("incorporate", lang)}</option>
                        <option value="retain">{residueLabel("retain", lang)}</option>
                        <option value="burn">{residueLabel("burn", lang)}</option>
                      </select>
                    </div>
                    </div>

                    <div className="grid2">
                      <label className="check label-with-help">
                        <input type="checkbox" aria-label={t.precision} checked={practices[i]?.precisionFertilization ?? false} onChange={(e) => updatePractice(i, { precisionFertilization: e.target.checked })} />
                        <span>{t.precision}</span>
                        <HelpTip content={t.helpPrecision} />
                      </label>
                      <label className="check label-with-help">
                        <input type="checkbox" aria-label={t.coverCrop} checked={practices[i]?.coverCrop ?? false} onChange={(e) => updatePractice(i, { coverCrop: e.target.checked })} />
                        <span>{t.coverCrop}</span>
                        <HelpTip content={t.helpCover} />
                      </label>
                    </div>
                  </div>
                  {sectionCollapsed.practices && (
                    <p className="section-summary">{t.summaryPractices}</p>
                  )}
                </>
              )}
            </div>
          );
          })}

          {form.crops.length > 10 && !sectionCollapsed.crops && (
            <button className="ghost" type="button" onClick={() => setShowAllCrops((prev) => !prev)}>
              {showAllCrops ? (lang === "en" ? "Show fewer" : "Показати менше") : (lang === "en" ? "Show all crops" : "Показати всі культури")}
            </button>
          )}

          {(mode === "advanced" || wizardStep === 1 || wizardStep === 2) && sectionCollapsed.crops && (
            <p className="section-summary">
              {form.crops.length} {t.summaryCrops}
            </p>
          )}

          {(mode === "advanced" || wizardStep === 1) && !sectionCollapsed.crops && (
            <button className="ghost btn-with-icon" type="button" aria-label={t.copyLastCrop} onClick={() => duplicateCrop(form.crops.length - 1)}>
              <Icon name="plus" className="icon-xs" />
              {t.copyLastCrop}
            </button>
          )}

          {(mode === "advanced" || wizardStep === 3) && (
            <>
              <button className="primary btn-with-icon" type="button" aria-label={t.calculate} onClick={runCalculation} disabled={isCalculating}>
                <Icon name="calc" className="icon-xs" />
                {isCalculating ? (lang === "en" ? "Calculating..." : "Розрахунок...") : t.calculate}
              </button>
              <div className="action-row">
                <button className="ghost btn-with-icon" type="button" aria-label={t.clearResults} onClick={() => clearResultsOnly()}><Icon name="clear" className="icon-xs" />{t.clearResults}</button>
                <button className="ghost btn-with-icon" type="button" aria-label={t.resetInputs} onClick={resetAllInputs}><Icon name="reset" className="icon-xs" />{t.resetInputs}</button>
              </div>
            </>
          )}

          {mode === "wizard" && (
            <div className="wizard-nav">
              <button
                className="ghost"
                type="button"
                aria-label={t.prevStep}
                onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))}
                disabled={wizardStep === 0}
              >
                <Icon name="back" className="icon-xs" />
                {t.prevStep}
              </button>
              <button
                className="ghost"
                type="button"
                aria-label={t.nextStep}
                onClick={() => setWizardStep((prev) => Math.min(wizardSteps.length - 1, prev + 1))}
                disabled={wizardStep === wizardSteps.length - 1}
              >
                <Icon name="next" className="icon-xs" />
                {t.nextStep}
              </button>
            </div>
          )}
          </fieldset>

          {errors.length > 0 && (
            <div className="error-box">
              <strong>{t.errorsTitle}</strong>
              <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          </article>
          </FeatureErrorBoundary>
        )}

        {activeView === "results" && (
          <FeatureErrorBoundary language={lang} featureName="results">
            <article className="panel result-panel" aria-label={t.results}>
          <div className="panel-title-row">
            <h2 className="title-with-icon"><span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>{t.results}</h2>
            <button className="ghost btn-with-icon" type="button" aria-label={t.backToForm} onClick={() => setActiveView("form")}>
              <Icon name="back" className="icon-xs" />
              {t.backToForm}
            </button>
          </div>
          {isCalculating && (
            <div className="loading-state" role="status" aria-live="polite">
              <span className="spinner" />
              <span>{lang === "en" ? "Calculating emissions..." : "Розрахунок викидів..."}</span>
            </div>
          )}
          {!results && <p className="hint">{t.emptyState}</p>}
          {results && (
            <>
              <div className="sr-only" aria-live="polite">
                {t.total}: {results.total_emissions.toFixed(2)} tCO2e. {t.perHectare}: {results.per_hectare_emissions.toFixed(2)} tCO2e/ha.
              </div>
              <div className="print-header" aria-hidden="true">
                <div className="print-title">{t.results}</div>
                <div className="print-meta">
                  <span>{calculationDate ? calculationDate.toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US") : ""}</span>
                  <span>{t.total}: {results.total_emissions.toFixed(2)} tCO2e</span>
                  <span>{t.perHectare}: {results.per_hectare_emissions.toFixed(2)} tCO2e/ha</span>
                </div>
              </div>

              <div className="kpi-wrap">
                <div className="kpi"><span className="title-with-icon"><span className="icon-badge tone-footprint"><Icon name="footprint" className="icon-xs" /></span>{t.total}</span><strong>{results.total_emissions.toFixed(2)} tCO2e</strong></div>
                <div className="kpi"><span className="title-with-icon"><span className="icon-badge tone-perha"><Icon name="perha" className="icon-xs" /></span>{t.perHectare}</span><strong>{results.per_hectare_emissions.toFixed(2)} tCO2e/ha</strong></div>
              </div>
              <div className="result-meta">
                <span>{t.grossEmissions}: {results.total_emissions.toFixed(2)} tCO2e</span>
                <span>{t.netEmissions}: {(results.total_emissions - sequestration).toFixed(2)} tCO2e</span>
                <span>{t.settingsRegion}: {regionLabel(settingsRegion)}</span>
                <span>{t.organicMode}: {organicMode ? (lang === "en" ? "On" : "Увімкнено") : (lang === "en" ? "Off" : "Вимкнено")}</span>
                <span>{t.customFactorsActive}: {customFactorsEnabled ? (lang === "en" ? "On" : "Увімкнено") : (lang === "en" ? "Off" : "Вимкнено")}</span>
              </div>

              <section className="goal-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.goalTitle}
                  </h3>
                </div>
                <div className="benchmark-controls">
                  <div className="field">
                    <label>{t.goalTarget}</label>
                    <input
                      type="number"
                      min={0}
                      value={goalSetting.value}
                      onChange={(e) => setGoalSetting((prev) => ({ ...prev, value: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field">
                    <label>{t.goalTitle}</label>
                    <select value={goalSetting.mode} onChange={(e) => setGoalSetting((prev) => ({ ...prev, mode: e.target.value as GoalSetting["mode"] }))}>
                      <option value="percent">{t.goalModePercent}</option>
                      <option value="absolute">{t.goalModeAbsolute}</option>
                    </select>
                  </div>
                </div>
                {goalProgress && (
                  <>
                    <div className="progress-track">
                      <span style={{ width: `${Math.max(0, Math.min(100, goalProgress.progress * 100))}%` }} />
                    </div>
                    <div className="goal-meta">
                      <span>{t.goalProgress}: {(goalProgress.progress * 100).toFixed(0)}%</span>
                      <span>{t.goalRemaining}: {goalProgress.remaining.toFixed(2)} tCO2e</span>
                      {goalProgress.achieved && <span className="status-pill status-ok">{t.goalAchieved}</span>}
                    </div>
                  </>
                )}
              </section>

              <div className="action-row">
                <button className="ghost btn-with-icon" type="button" aria-label={t.exportReportTxt} onClick={handleExportPdf}>
                  <Icon name="results" className="icon-xs" />
                  {t.exportReportTxt}
                </button>
                <button className="ghost btn-with-icon" type="button" aria-label={t.exportChartsPng} onClick={handleDownloadCharts}>
                  <Icon name="results" className="icon-xs" />
                  {t.exportChartsPng}
                </button>
              </div>

              {practiceComparison && (
                <section className={`practice-compare ${practiceComparisonVisible ? "" : "hidden"}`}>
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.beforeAfterTitle}
                    </h3>
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => {
                        setPracticeComparison((prev) => {
                          if (!prev) return prev;
                          const next = { ...prev, pinned: !prev.pinned };
                          practiceComparisonRef.current = next;
                          if (next.pinned) {
                            setPracticeComparisonVisible(true);
                          } else {
                            if (practiceCompareTimerRef.current) {
                              window.clearTimeout(practiceCompareTimerRef.current);
                            }
                            practiceCompareTimerRef.current = window.setTimeout(() => {
                              if (practiceComparisonRef.current?.pinned) return;
                              setPracticeComparisonVisible(false);
                            }, 5000);
                          }
                          return next;
                        });
                      }}
                    >
                      {practiceComparison.pinned ? t.unpin : t.pin}
                    </button>
                  </div>
                  <div className="practice-compare-grid">
                    <div className="practice-compare-card">
                      <h4>{t.beforeLabel}</h4>
                      <p><strong>{t.total}:</strong> {practiceComparison.before.total_emissions.toFixed(2)} tCO2e</p>
                      <p><strong>{t.perHectare}:</strong> {practiceComparison.before.per_hectare_emissions.toFixed(2)} tCO2e/ha</p>
                    </div>
                    <div className="practice-compare-card">
                      <h4>{t.afterLabel}</h4>
                      <p><strong>{t.total}:</strong> {practiceComparison.after.total_emissions.toFixed(2)} tCO2e</p>
                      <p><strong>{t.perHectare}:</strong> {practiceComparison.after.per_hectare_emissions.toFixed(2)} tCO2e/ha</p>
                    </div>
                    <div className="practice-compare-card">
                      <h4>{t.changeLabel}</h4>
                      <p className={deltaClass(practiceComparison.after.total_emissions - practiceComparison.before.total_emissions)}>
                        <strong>{t.total}:</strong>{" "}
                        {formatDelta(practiceComparison.after.total_emissions - practiceComparison.before.total_emissions, "tCO2e")}
                        {" "}{formatPercentChange(practiceComparison.after.total_emissions - practiceComparison.before.total_emissions, practiceComparison.before.total_emissions)}
                      </p>
                      <p className={deltaClass(practiceComparison.after.per_hectare_emissions - practiceComparison.before.per_hectare_emissions)}>
                        <strong>{t.perHectare}:</strong>{" "}
                        {formatDelta(practiceComparison.after.per_hectare_emissions - practiceComparison.before.per_hectare_emissions, "tCO2e/ha")}
                        {" "}{formatPercentChange(practiceComparison.after.per_hectare_emissions - practiceComparison.before.per_hectare_emissions, practiceComparison.before.per_hectare_emissions)}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <h3 className="title-with-icon"><span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>{t.breakdown}</h3>
              <ul className="bars">
                {totals.map((item) => (
                  <li key={item.label}>
                    <div className="bar-meta"><span className="title-with-icon"><span className={`icon-badge tone-${item.icon}`}><Icon name={item.icon} className="icon-xs" /></span>{item.label}</span><span>{item.value.toFixed(2)}</span></div>
                    <div className="track"><div className="fill" style={{ width: `${Math.min(100, results.total_emissions > 0 ? (item.value / results.total_emissions) * 100 : 0)}%` }} /></div>
                  </li>
                ))}
              </ul>

              <Suspense fallback={<p className="hint">{t.loading}</p>}>
                <EmissionPieChart data={pieChartData} language={lang} svgRef={pieSvgRef} />
              </Suspense>
              <div className="chart-actions">
                <button
                  className="ghost"
                  type="button"
                  aria-label={t.downloadChartPng}
                  onClick={() => handleDownloadChart(pieSvgRef.current, "emission-breakdown")}
                >
                  {t.downloadChartPng}
                </button>
              </div>

              {impactInfo && (
                <div className={`impact ${impactInfo.cls}`}>
                  <p><strong>{t.impact}:</strong> {impactInfo.level}</p>
                  <p><strong>{t.recommendation}:</strong> {impactInfo.note}</p>
                </div>
              )}

              <section className="seasonal-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                    {t.seasonalAnalysis}
                  </h3>
                  <label className="check">
                    <input type="checkbox" checked={seasonalAnalysis} onChange={(e) => setSeasonalAnalysis(e.target.checked)} />
                    {t.seasonalAnalysis}
                  </label>
                </div>
                {seasonalAnalysis && seasonalBreakdown && (
                  <>
                    <div className="seasonal-bars">
                      {seasonalBreakdown.entries.map((item) => (
                        <div key={item.key} className="seasonal-row">
                          <span>{item.label}</span>
                          <div className="track">
                            <div className="fill" style={{ width: `${Math.min(100, results.total_emissions > 0 ? (item.value / results.total_emissions) * 100 : 0)}%` }} />
                          </div>
                          <span>{item.value.toFixed(2)} tCO2e</span>
                        </div>
                      ))}
                    </div>
                    <p className="hint">{t.seasonalTop}: {seasonalBreakdown.top.label}</p>
                  </>
                )}
              </section>

              {schedulingMode && (
                <section className="schedule-summary">
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.schedulingTitle}
                    </h3>
                  </div>
                  {!monthlyBreakdown && <p className="hint">{t.schedulingToggle}</p>}
                  {monthlyBreakdown && (
                    <div className="schedule-bars">
                      {monthlyBreakdown.months.map((value, index) => (
                        <div key={`month-${index}`} className="seasonal-row">
                          <span>{monthLabels[index]}</span>
                          <div className="track">
                            <div className="fill" style={{ width: `${Math.min(100, (value / monthlyBreakdown.max) * 100)}%` }} />
                          </div>
                          <span>{value.toFixed(2)} tCO2e</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="sequestration-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.sequestrationTitle}
                  </h3>
                </div>
                <p className="hint">{t.sequestrationHelp}</p>
                <div className="kpi-wrap">
                  <div className="kpi">
                    <span>{t.sequestrationTitle}</span>
                    <strong>-{sequestration.toFixed(2)} tCO2e</strong>
                  </div>
                  <div className="kpi">
                    <span>{t.netEmissions}</span>
                    <strong>{(results.total_emissions - sequestration).toFixed(2)} tCO2e</strong>
                  </div>
                </div>
              </section>

              <section className="weather-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.weatherTitle}
                  </h3>
                </div>
                <div className="benchmark-controls">
                  <div className="field">
                    <label>{t.weatherZone}</label>
                    <select value={climateZone} onChange={(e) => setClimateZone(e.target.value as ClimateZoneKey)}>
                      {Object.entries(climateZones).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="benchmark-grid">
                  <div className="status-pill status-ok">{t.weatherTemp}: {climateZones[climateZone].temperature}°C</div>
                  <div className="status-pill status-warn">{t.weatherPrecip}: {climateZones[climateZone].precipitation} mm</div>
                  <div className="benchmark-diff">{t.weatherIrrigationFactor}: {climateZones[climateZone].irrigationFactor.toFixed(2)}</div>
                </div>
                <p className="hint">{t.weatherHint} {climateZones[climateZone].irrigationFactor > 1 ? (lang === "en" ? "Consider drought-tolerant crops and efficient irrigation." : "Розгляньте посухостійкі культури та ефективне зрошення.") : (lang === "en" ? "Moisture levels may allow reduced irrigation inputs." : "Вологі умови можуть дозволити знизити зрошення.")}</p>
              </section>

              <section className="equipment-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.equipmentTitle}
                  </h3>
                </div>
                <div className="benchmark-grid">
                  <div className="status-pill status-ok">
                    {t.equipmentEmissions}: {equipmentEmissions.toFixed(2)} tCO2e
                  </div>
                </div>
                <p className="hint">
                  {t.equipmentHint}{" "}
                  {equipmentEmissions > 0
                    ? (lang === "en"
                      ? "Tune engines, optimize hours, and consider electrification."
                      : "Оптимізуйте години, обслуговуйте двигуни та розгляньте електрифікацію.")
                    : ""}
                </p>
              </section>

              {uncertainty && (
                <section className="uncertainty-panel">
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.uncertaintyTitle}
                    </h3>
                  </div>
                  <p className="hint">{t.uncertaintyNote}</p>
                  <div className="uncertainty-grid">
                    <div>
                      <strong>{t.total}</strong>
                      <div>{uncertainty.totalLow.toFixed(2)} - {uncertainty.totalHigh.toFixed(2)} tCO2e</div>
                    </div>
                    <div>
                      <strong>{t.perHectare}</strong>
                      <div>{uncertainty.perHaLow.toFixed(2)} - {uncertainty.perHaHigh.toFixed(2)} tCO2e/ha</div>
                    </div>
                  </div>
                  <ul className="uncertainty-list">
                    {uncertainty.categories.map((c) => (
                      <li key={c.key}>
                        <span>{c.label}</span>
                        <span>{(c.value * (1 - c.pct)).toFixed(2)} - {(c.value * (1 + c.pct)).toFixed(2)} tCO2e</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="benchmark-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.benchmarkTitle}
                  </h3>
                </div>
                <div className="benchmark-controls">
                  <div className="field">
                    <label>{t.benchmarkRegion}</label>
                    <select value={benchmarkRegion} onChange={(e) => setBenchmarkRegion(e.target.value)}>
                      {Object.keys(BENCHMARKS).map((region) => (
                        <option key={region} value={region}>{regionLabel(region)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t.benchmarkFarmType}</label>
                    <select value={benchmarkFarmType} onChange={(e) => setBenchmarkFarmType(e.target.value)}>
                      {["grain", "mixed", "livestock"].map((type) => (
                        <option key={type} value={type}>{benchmarkFarmTypeLabel(type, lang)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(() => {
                  const farmArea = Math.max(0, decimalValue(form.totalArea));
                  const benchmark = BENCHMARKS[benchmarkRegion]?.[benchmarkFarmType] ?? BENCHMARKS.Global.grain;
                  const totalBenchmark = benchmark.perHa * farmArea;
                  const totalDiff = results.total_emissions - totalBenchmark;
                  const perHaDiff = results.per_hectare_emissions - benchmark.perHa;
                  return (
                    <>
                      <p className="hint">{t.benchmarkDisclaimer}</p>
                      <div className="benchmark-grid">
                        <div className={`status-pill ${benchmarkClass(totalDiff, totalBenchmark)}`}>
                          {t.total}: {results.total_emissions.toFixed(2)} tCO2e vs {totalBenchmark.toFixed(2)}
                        </div>
                        <div className={`status-pill ${benchmarkClass(perHaDiff, benchmark.perHa)}`}>
                          {t.perHectare}: {results.per_hectare_emissions.toFixed(2)} vs {benchmark.perHa.toFixed(2)}
                        </div>
                        <div className="benchmark-diff">
                          {t.benchmarkDiff}: {totalDiff >= 0 ? "+" : ""}{totalDiff.toFixed(2)} tCO2e
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>

              <section className="carbon-credit-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
                    {t.carbonCreditTitle}
                  </h3>
                </div>
                <div className="benchmark-controls">
                  <div className="field">
                    <label>{t.carbonCreditBaseline}</label>
                    <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                      <option value="">{lang === "en" ? "Current results" : "Поточні результати"}</option>
                      {history.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.farmName || `${t.results} ${new Date(entry.timestamp).toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t.carbonCreditPrice}</label>
                    <input type="number" min={1} value={carbonPrice} onChange={(e) => setCarbonPrice(Number(e.target.value))} />
                  </div>
                </div>
                {(() => {
                  const baselineEntry = history.find((h) => h.id === baselineId);
                  const baselineEmissions = baselineEntry?.results?.total_emissions ?? results.total_emissions;
                  const creditPotential = Math.max(0, baselineEmissions - results.total_emissions);
                  const value = creditPotential * carbonPrice;
                  return (
                    <div className="benchmark-grid">
                      <div className="status-pill status-ok">
                        {creditPotential.toFixed(2)} tCO2e
                      </div>
                      <div className="benchmark-diff">
                        {t.carbonCreditValue}: {value.toFixed(0)} {lang === "en" ? "USD" : "USD"}
                      </div>
                      <p className="hint">{t.carbonCreditEligible}</p>
                      <p className="hint">{t.carbonCreditDisclaimer}</p>
                    </div>
                  );
                })()}
              </section>

              {results.crop_results.length > 0 && (
                <section className="recommendations-panel">
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.recommendationsTitle}
                    </h3>
                  </div>
                  {recommendations.length === 0 && (
                    <p className="hint">{t.recommendationNone}</p>
                  )}
                  {recommendations.length > 0 && (
                    <div className="recommendation-list">
                      <div className="recommendation-meta">
                        <span>{t.recommendationProgress}: {recommendationProgress.implemented}/{recommendationProgress.total} ({recommendationProgress.percent.toFixed(0)}%)</span>
                        <label className="check">
                          <input type="checkbox" checked={hideImplementedRecs} onChange={(e) => setHideImplementedRecs(e.target.checked)} />
                          {t.recommendationFilterImplemented}
                        </label>
                      </div>
                      <p className="hint">{t.recommendationHelp}</p>
                      {visibleRecommendations.map((rec) => (
                        <div key={rec.id} className={`recommendation-card ${rec.implemented ? "implemented" : ""}`}>
                          <div className="recommendation-main">
                            <strong>{rec.title}</strong>
                            <p>{rec.description}</p>
                            <div className="recommendation-impact">
                              {t.recommendationImpact}: {rec.impact.toFixed(2)} tCO2e ({rec.impactPercent.toFixed(1)}%)
                            </div>
                            {(() => {
                              const cost = costAssumptions[rec.id]?.cost ?? 0;
                              const savings = costAssumptions[rec.id]?.savings ?? 0;
                              const payback = savings > 0 ? cost / savings : null;
                              return (
                                <div className="recommendation-cost">
                                  {t.costBenefitCost}: {cost.toFixed(0)} {lang === "en" ? "USD" : "UAH"} • {t.costBenefitSavings}: {savings.toFixed(0)} {lang === "en" ? "USD" : "UAH"} • {t.costBenefitPayback}: {payback ? `${payback.toFixed(1)}y` : "—"}
                                </div>
                              );
                            })()}
                            <div className="recommendation-tracking">
                              <label>{t.recommendationStatus}</label>
                              <p className="hint">{t.recommendationStatusHelp}</p>
                              <select
                                value={recStatus[rec.id]?.status ?? "planned"}
                                onChange={(e) =>
                                  setRecStatus((prev) => ({ ...prev, [rec.id]: { ...prev[rec.id], status: e.target.value as "implemented" | "planned" | "na" } }))
                                }
                              >
                                <option value="implemented">{t.recommendationImplemented}</option>
                                <option value="planned">{t.recommendationPlanned}</option>
                                <option value="na">{t.recommendationNotApplicable}</option>
                              </select>
                              <label>{t.recommendationNotes}</label>
                              <p className="hint">{t.recommendationNotesHelp}</p>
                              <textarea
                                rows={2}
                                value={recStatus[rec.id]?.notes ?? ""}
                                onChange={(e) =>
                                  setRecStatus((prev) => ({ ...prev, [rec.id]: { ...prev[rec.id], notes: e.target.value } }))
                                }
                              />
                            </div>
                          </div>
                          <div className="recommendation-actions">
                            <label className="recommendation-select">
                              <input
                                type="checkbox"
                                checked={actionPlanSelection.has(rec.id)}
                                disabled={recStatus[rec.id]?.status === "na"}
                                onChange={() => toggleActionPlanSelection(rec.id)}
                                aria-label={t.actionPlanTitle}
                              />
                              {t.actionPlanTitle}
                            </label>
                            <span className="hint">{t.actionPlanSelectHelp}</span>
                            <button
                              className="ghost"
                              type="button"
                              aria-label={t.recommendationApply}
                              disabled={rec.implemented}
                              onClick={() => applyRecommendation(rec.id)}
                            >
                              {t.recommendationApply}
                            </button>
                            {rec.implemented && (
                              <span className="recommendation-status">{t.recommendationImplemented}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="action-plan-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                    {t.actionPlanTitle}
                  </h3>
                  <button className="ghost" type="button" aria-label={t.exportActionPlanTxt} onClick={handleExportActionPlanPdf} disabled={actionPlanItems.length === 0}>
                    {t.exportActionPlanTxt}
                  </button>
                </div>
                {actionPlanItems.length === 0 && <p className="hint">{t.actionPlanNoData}</p>}
                {actionPlanItems.length > 0 && (
                  <div className="action-plan-list">
                    {actionPlanItems.map((item) => (
                      <div key={`plan-${item.id}`} className="action-plan-card">
                        <div className="action-plan-header">
                          <strong>{item.title}</strong>
                          <span className="action-plan-impact">{item.impact.toFixed(2)} tCO2e</span>
                        </div>
                        <p>{item.description}</p>
                        <div className="action-plan-meta">
                          <span>{t.actionPlanDifficulty}: {labelForDifficulty(item.difficulty)}</span>
                          <span>{t.actionPlanCost}: {labelForCost(item.cost)}</span>
                          <span>{t.actionPlanTimeline}: {labelForTimeline(item.timeline)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="docs-panel">
                <div className="panel-title-row">
                  <h3 className="title-with-icon">
                    <span className="icon-badge tone-results"><Icon name="info" className="icon-sm" /></span>
                    {t.docsTitle}
                  </h3>
                </div>
                <div className="docs-faq">
                  <details>
                    <summary>{t.docsFaq1Q}</summary>
                    <p>{t.docsFaq1A}</p>
                  </details>
                  <details>
                    <summary>{t.docsFaq2Q}</summary>
                    <p>{t.docsFaq2A}</p>
                  </details>
                </div>
                <div className="docs-meta">
                  <span>{t.versionLabel}: {APP_VERSION}</span>
                </div>
                <div className="docs-changelog">
                  <h4>{t.changelogTitle}</h4>
                  <ul>
                    <li>{t.changelogItem1}</li>
                    <li>{t.changelogItem2}</li>
                  </ul>
                </div>
                <div className="docs-sources">
                  <h4>{t.dataSourcesTitle}</h4>
                  <p className="hint">{t.dataSourcesIntro}</p>
                  <ol>
                    {DATA_SOURCES.map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ol>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => downloadTextFile(DATA_SOURCES_BIB, "farm-data-sources.bib")}
                  >
                    {t.dataSourcesExport}
                  </button>
                </div>
                {compatIssues.length > 0 && (
                  <div className="compat-warning" role="status" aria-live="polite">
                    <strong>{t.compatTitle}</strong>
                    <p>{t.compatIssue}</p>
                    <ul>
                      {compatIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <h3 className="title-with-icon"><span className="icon-badge tone-crops"><Icon name="crops" className="icon-sm" /></span>{t.cropBreakdown}</h3>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>{t.crop}</th><th>{t.area}</th><th>{t.total}</th><th>{t.carbonIntensity}</th></tr></thead>
                  <tbody>
                    {results.crop_results.map((c, i) => (
                      <tr key={`r-${i}`}>
                        <td>{cropLabel(c.crop_id, lang)}</td>
                        <td>{c.area.toFixed(1)} ha</td>
                        <td>{c.total_emissions.toFixed(2)} tCO2e</td>
                        <td>{(() => {
                          const cropForm = form.crops[i];
                          const yieldVal = cropForm ? decimalValue(cropForm.yield ?? "0") : 0;
                          const totalYield = yieldVal * c.area;
                          if (totalYield <= 0) return "—";
                          return (c.total_emissions / totalYield).toFixed(2);
                        })()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {cropComparisonData.length > 1 && (
                <Suspense fallback={<p className="hint">{t.loading}</p>}>
                  <CropComparisonChart
                    title={lang === "en" ? "Emissions by crop (stacked)" : "Викиди за культурами (стек)"}
                    data={cropComparisonData}
                    language={lang}
                    svgRef={cropSvgRef}
                  />
                </Suspense>
              )}
              {cropComparisonData.length > 1 && (
                <div className="chart-actions">
                  <button
                    className="ghost"
                    type="button"
                    aria-label={t.downloadChartPng}
                    onClick={() => handleDownloadChart(cropSvgRef.current, "crop-comparison")}
                  >
                    {t.downloadChartPng}
                  </button>
                </div>
              )}

              {trendPoints.length >= 2 && (
                <Suspense fallback={<p className="hint">{t.loading}</p>}>
                  <EmissionTrendChart
                    title={lang === "en" ? "Emissions trend" : "Тренд викидів"}
                    points={trendPoints}
                    language={lang}
                    svgRef={trendSvgRef}
                  />
                </Suspense>
              )}
              {trendPoints.length >= 2 && (
                <div className="chart-actions">
                  <button
                    className="ghost"
                    type="button"
                    aria-label={t.downloadChartPng}
                    onClick={() => handleDownloadChart(trendSvgRef.current, "emissions-trend")}
                  >
                    {t.downloadChartPng}
                  </button>
                </div>
              )}

              <Suspense fallback={<p className="hint">{t.loading}</p>}>
                <PracticeHeatMap
                  title={lang === "en" ? "Practice impact heat map" : "Теплова карта практик"}
                  practices={practices}
                  language={lang}
                  svgRef={heatmapSvgRef}
                />
              </Suspense>
              <div className="chart-actions">
                <button
                  className="ghost"
                  type="button"
                  aria-label={t.downloadChartPng}
                  onClick={() => handleDownloadChart(heatmapSvgRef.current, "practice-heatmap")}
                >
                  {t.downloadChartPng}
                </button>
              </div>

              {showWhatIf && (
                <section className="whatif-panel">
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.whatIfTitle}
                    </h3>
                    <button
                      className="ghost"
                      type="button"
                      aria-label={t.whatIfReset}
                      onClick={() => {
                        setWhatIfNitrogen(100);
                        setWhatIfTillageIndex(0);
                        setWhatIfIrrigationIndex(0);
                        setWhatIfCoverIndex(0);
                        setWhatIfMessage(null);
                      }}
                    >
                      {t.whatIfReset}
                    </button>
                  </div>

                  <div className="whatif-grid">
                    <div className="whatif-control">
                      <label>{t.whatIfNitrogen}</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={whatIfNitrogen}
                        aria-label={t.whatIfNitrogen}
                        onChange={(e) => {
                          setWhatIfNitrogen(Number(e.target.value));
                          setWhatIfMessage(null);
                        }}
                      />
                      <div className="whatif-value">{whatIfNitrogen}%</div>
                      {results && (
                        <div className={`whatif-delta ${deltaClass((nitrogenDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions)}`}>
                          {formatDelta((nitrogenDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions, "tCO2e")}
                        </div>
                      )}
                    </div>

                    <div className="whatif-control">
                      <label>{t.whatIfTillage}</label>
                      <input
                        type="range"
                        min={0}
                        max={WHATIF_TILLAGE_OPTIONS.length - 1}
                        step={1}
                        value={whatIfTillageIndex}
                        aria-label={t.whatIfTillage}
                        onChange={(e) => {
                          setWhatIfTillageIndex(Number(e.target.value));
                          setWhatIfMessage(null);
                        }}
                      />
                      <div className="whatif-value">
                        {whatIfTillage === "current" ? t.whatIfCurrent : tillageLabel(whatIfTillage, lang)}
                      </div>
                      <p className="hint whatif-hint">{t.whatIfTillageHint}</p>
                      {results && (
                        <div className={`whatif-delta ${deltaClass((tillageDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions)}`}>
                          {formatDelta((tillageDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions, "tCO2e")}
                        </div>
                      )}
                    </div>

                    <div className="whatif-control">
                      <label>{t.whatIfIrrigation}</label>
                      <input
                        type="range"
                        min={0}
                        max={WHATIF_IRRIGATION_OPTIONS.length - 1}
                        step={1}
                        value={whatIfIrrigationIndex}
                        aria-label={t.whatIfIrrigation}
                        onChange={(e) => {
                          setWhatIfIrrigationIndex(Number(e.target.value));
                          setWhatIfMessage(null);
                        }}
                      />
                      <div className="whatif-value">
                        {whatIfIrrigation === "current" ? t.whatIfCurrent : irrigationMethodLabel(whatIfIrrigation, lang)}
                      </div>
                      {results && (
                        <div className={`whatif-delta ${deltaClass((irrigationDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions)}`}>
                          {formatDelta((irrigationDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions, "tCO2e")}
                        </div>
                      )}
                    </div>

                    <div className="whatif-control">
                      <label>{t.whatIfCover}</label>
                      <input
                        type="range"
                        min={0}
                        max={WHATIF_COVER_OPTIONS.length - 1}
                        step={1}
                        value={whatIfCoverIndex}
                        aria-label={t.whatIfCover}
                        onChange={(e) => {
                          setWhatIfCoverIndex(Number(e.target.value));
                          setWhatIfMessage(null);
                        }}
                      />
                      <div className="whatif-value">{coverCropLabel(whatIfCover, lang, t.whatIfCurrent)}</div>
                      {results && (
                        <div className={`whatif-delta ${deltaClass((coverDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions)}`}>
                          {formatDelta((coverDeltaResults?.total_emissions ?? results.total_emissions) - results.total_emissions, "tCO2e")}
                        </div>
                      )}
                    </div>
                  </div>

                  {results && whatIfResults && (
                    <div className="whatif-results">
                      <div className="whatif-result">
                        <span>{t.whatIfResults}</span>
                        <strong>{whatIfResults.total_emissions.toFixed(2)} tCO2e</strong>
                        <small className={deltaClass(whatIfResults.total_emissions - results.total_emissions)}>
                          {formatDelta(whatIfResults.total_emissions - results.total_emissions, "tCO2e")}
                        </small>
                      </div>
                      <div className="whatif-result">
                        <span>{t.perHectare}</span>
                        <strong>{whatIfResults.per_hectare_emissions.toFixed(2)} tCO2e/ha</strong>
                        <small className={deltaClass(whatIfResults.per_hectare_emissions - results.per_hectare_emissions)}>
                          {formatDelta(whatIfResults.per_hectare_emissions - results.per_hectare_emissions, "tCO2e/ha")}
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="whatif-actions">
                    <input
                      type="text"
                      placeholder={t.whatIfScenarioPlaceholder}
                      value={whatIfName}
                      onChange={(e) => {
                        setWhatIfName(e.target.value);
                        setWhatIfMessage(null);
                      }}
                      aria-label={t.whatIfScenarioName}
                    />
                    <button className="primary" type="button" aria-label={t.whatIfSave} onClick={handleSaveWhatIf}>
                      {t.whatIfSave}
                    </button>
                  </div>

                  {whatIfMessage && (
                    <p className={whatIfMessage.type === "success" ? "whatif-message success" : "whatif-message error"}>
                      {whatIfMessage.text}
                    </p>
                  )}
                </section>
              )}

              {results && projectionPoints.length > 0 && (
                <section className="projection-panel">
                  <div className="panel-title-row">
                    <h3 className="title-with-icon">
                      <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
                      {t.projectionTitle}
                    </h3>
                    <button className="ghost" type="button" aria-label={t.projectionExport} onClick={handleExportProjectionCsv}>
                      {t.projectionExport}
                    </button>
                  </div>

                  <div className="projection-controls">
                    <div className="field">
                      <label>{t.projectionYears}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={projectionYears}
                        aria-label={t.projectionYears}
                        onChange={(e) => {
                          const next = Math.min(10, Math.max(1, Number(e.target.value)));
                          setProjectionYears(Number.isFinite(next) ? next : 1);
                        }}
                      />
                    </div>
                  </div>

                  <h4>{t.projectionRates}</h4>
                  <div className="projection-grid">
                    <div className="field">
                      <label>{t.fertilizer}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.fertilizer} value={projectionRates.fertilizer} onChange={(e) => updateProjectionRate("fertilizer", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>{t.manureCat}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.manureCat} value={projectionRates.manure} onChange={(e) => updateProjectionRate("manure", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>{t.fuel}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.fuel} value={projectionRates.fuel} onChange={(e) => updateProjectionRate("fuel", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>{t.irrigationCat}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.irrigationCat} value={projectionRates.irrigation} onChange={(e) => updateProjectionRate("irrigation", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>{t.pesticideCat}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.pesticideCat} value={projectionRates.pesticide} onChange={(e) => updateProjectionRate("pesticide", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>{t.livestockCat}</label>
                      <input type="number" min={-50} max={50} step={1} aria-label={t.livestockCat} value={projectionRates.livestock} onChange={(e) => updateProjectionRate("livestock", e.target.value)} />
                    </div>
                  </div>

                  <div className="projection-summary">
                    <span>{t.projectionCumulative}</span>
                    <strong>{projectionCumulative.toFixed(2)} tCO2e</strong>
                  </div>

                  <div className="projection-chart">
                    <svg viewBox="0 0 520 220" role="img" aria-label={t.projectionTitle}>
                      <line x1="32" y1="188" x2="488" y2="188" stroke="currentColor" strokeOpacity="0.25" />
                      <line x1="32" y1="32" x2="32" y2="188" stroke="currentColor" strokeOpacity="0.25" />
                      <path d={projectionChart.path} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                      {projectionChart.coords.map((p) => (
                        <circle key={`proj-${p.year}`} cx={p.x} cy={p.y} r="3.2" fill="var(--primary)" />
                      ))}
                    </svg>
                    <div className="projection-axis">
                      <span>{projectionPoints[0].year}</span>
                      <span>{projectionPoints[projectionPoints.length - 1].year}</span>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table className="projection-table">
                      <thead>
                        <tr>
                          <th>{t.projectionYearLabel}</th>
                          <th>{t.total}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectionPoints.map((p) => (
                          <tr key={`proj-row-${p.year}`}>
                            <td>{p.year}</td>
                            <td>{p.total.toFixed(2)} tCO2e</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <p className="source-note">{t.disclaimer}</p>
              <div className="results-footer">
                <button className="ghost btn-with-icon" type="button" aria-label={t.backToForm} onClick={() => setActiveView("form")}>
                  <Icon name="back" className="icon-xs" />
                  {t.backToForm}
                </button>
              </div>
            </>
          )}
          </article>
          </FeatureErrorBoundary>
        )}
      </section>

      {activeView === "form" && (
      <section className="history-section">
        <article className="panel history-panel" aria-label={t.history}>
          <div className="panel-title-row">
            <h2 className="title-with-icon">
              <span className="icon-badge tone-results"><Icon name="results" className="icon-sm" /></span>
              {t.history}
            </h2>
            {historyTrend && (
              <div
                className={`trend-indicator trend-${historyTrend.direction}`}
                title={`${t.trendTitle}: ${historyTrend.previousPerHa.toFixed(2)} to ${historyTrend.latestPerHa.toFixed(2)} tCO2e/ha (${formatPercentChange(historyTrend.delta, historyTrend.previousPerHa)})`}
              >
                <span className="trend-arrow">{historyTrend.symbol}</span>
                <span>{formatPercentChange(historyTrend.delta, historyTrend.previousPerHa)}</span>
                <span className="trend-label">
                  {historyTrend.direction === "up" ? t.trendUp : historyTrend.direction === "down" ? t.trendDown : t.trendFlat}
                </span>
              </div>
            )}
          </div>

          <div className="history-filters">
            <input
              type="text"
              placeholder={t.historySearch}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              aria-label={t.historySearch}
            />
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
              aria-label={t.historyFrom}
            />
            <input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
              aria-label={t.historyTo}
            />
          </div>

          {filteredHistory.length === 0 && (
            <p className="hint">{t.historyEmpty}</p>
          )}

          {filteredHistory.length > 0 && (
            <div className="history-list">
              <div className="history-bulk">
                <label className="history-select-all">
                  <input
                    type="checkbox"
                    checked={historySelectAll}
                    onChange={toggleHistorySelectAll}
                    aria-label={lang === "en" ? "Select all history" : "Вибрати все"}
                  />
                  {lang === "en" ? "Select all" : "Вибрати все"}
                </label>
                <button
                  className="ghost"
                  type="button"
                  disabled={historySelected.size === 0}
                  onClick={handleDeleteSelectedHistory}
                  aria-label={t.historyDeleteSelected}
                >
                  {t.historyDeleteSelected} ({historySelected.size})
                </button>
                <span className="hint">{t.comparisonSelectHint}</span>
              </div>
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="history-item">
                  <div className="history-check">
                    <input
                      type="checkbox"
                      checked={historySelected.has(entry.id)}
                      onChange={() => toggleHistorySelection(entry.id)}
                      aria-label={lang === "en" ? "Select entry" : "Вибрати запис"}
                    />
                  </div>
                  <div className="history-main">
                    <div className="history-title">
                      <strong>{entry.farmName || (lang === "en" ? "Unnamed farm" : "Без назви")}</strong>
                      <span className="history-date">
                        {new Date(entry.timestamp).toLocaleDateString(lang === "ua" ? "uk-UA" : "en-US")}
                      </span>
                    </div>
                    <div className="history-metrics">
                      <span>{t.historyTotal}: {entry.results?.total_emissions?.toFixed(2) ?? "0.00"} tCO2e</span>
                      <span>{t.historyPerHa}: {entry.results?.per_hectare_emissions?.toFixed(2) ?? "0.00"} tCO2e/ha</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <label className="history-compare">
                      <input
                        type="checkbox"
                        checked={compareSelection.has(entry.id)}
                        onChange={() => toggleCompareSelection(entry.id)}
                        aria-label={t.comparisonTableTitle}
                      />
                      {t.comparisonTableTitle}
                    </label>
                    <button className="ghost" type="button" aria-label={t.historyLoad} onClick={() => handleLoadHistory(entry)}>
                      {t.historyLoad}
                    </button>
                    <button className="ghost" type="button" aria-label={t.historyExport} onClick={() => handleExportHistoryEntry(entry)}>
                      {t.historyExport}
                    </button>
                    <button className="ghost" type="button" aria-label={t.historyDelete} onClick={() => handleDeleteHistory(entry)}>
                      {t.historyDelete}
                    </button>
                  </div>
                </div>
              ))}
              {compareSelection.size > 0 && (
                <div className="comparison-table">
                  <div className="panel-title-row">
                    <h3>{t.comparisonTableTitle}</h3>
                    <button className="ghost" type="button" onClick={exportComparisonTable}>
                      {t.comparisonExport}
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table className="projection-table">
                      <thead>
                        <tr>
                          <th>{t.historyFarm}</th>
                          <th>{t.total}</th>
                          <th>{t.perHectare}</th>
                          <th>{t.fertilizer}</th>
                          <th>{t.manureCat}</th>
                          <th>{t.fuel}</th>
                          <th>{t.irrigationCat}</th>
                          <th>{t.pesticideCat}</th>
                          <th>{t.livestockCat}</th>
                          <th>{t.farmArea}</th>
                          <th>{t.livestock}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareEntries.map((entry) => {
                          const total = entry.results?.total_emissions ?? 0;
                          const perHa = entry.results?.per_hectare_emissions ?? 0;
                          const totalClass = compareExtremes
                            ? total === compareExtremes.minTotal
                              ? "delta-good"
                              : total === compareExtremes.maxTotal
                                ? "delta-bad"
                                : ""
                            : "";
                          const perHaClass = compareExtremes
                            ? perHa === compareExtremes.minPerHa
                              ? "delta-good"
                              : perHa === compareExtremes.maxPerHa
                                ? "delta-bad"
                                : ""
                            : "";
                          return (
                          <tr key={`comp-${entry.id}`}>
                            <td>{entry.farmName || (lang === "en" ? "Unnamed farm" : "Без назви")}</td>
                            <td className={totalClass}>{total.toFixed(2)} tCO2e</td>
                            <td className={perHaClass}>{perHa.toFixed(2)} tCO2e/ha</td>
                            <td>{(entry.results?.fertilizer_emissions ?? 0).toFixed(2)}</td>
                            <td>{(entry.results?.manure_emissions ?? 0).toFixed(2)}</td>
                            <td>{(entry.results?.fuel_emissions ?? 0).toFixed(2)}</td>
                            <td>{(entry.results?.irrigation_emissions ?? 0).toFixed(2)}</td>
                            <td>{(entry.results?.pesticide_emissions ?? 0).toFixed(2)}</td>
                            <td>{(entry.results?.livestock_emissions ?? 0).toFixed(2)}</td>
                            <td>{decimalValue(entry.data.totalArea || "0").toFixed(1)} ha</td>
                            <td>{entry.data.dairyCows}/{entry.data.pigs}/{entry.data.chickens}</td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </article>
      </section>
      )}

      {activeView === "form" && (
      <section className="comparison-section">
        <article className="panel comparison-panel" aria-label={t.comparison}>
          <div className="panel-title-row">
            <h2 className="title-with-icon">
              <span className="icon-badge tone-breakdown"><Icon name="breakdown" className="icon-sm" /></span>
              {t.comparison}
            </h2>
          </div>

          <div className="comparison-selects">
            <div className="comparison-select">
              <label>{t.scenarioA}</label>
              <select aria-label={t.scenarioA} value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)}>
                <option value="">{t.selectScenario}</option>
                {historyOptions.map((opt) => (
                  <option key={`left-${opt.id}`} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="comparison-select">
              <label>{t.scenarioB}</label>
              <select aria-label={t.scenarioB} value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)}>
                <option value="">{t.selectScenario}</option>
                {historyOptions.map((opt) => (
                  <option key={`right-${opt.id}`} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(!compareLeft || !compareRight) && (
            <p className="hint">{t.noComparisonData}</p>
          )}

          {compareLeft && compareRight && (
            <div className="comparison-grid">
              <div className="comparison-card">
                <h3>{t.scenarioA}</h3>
                <p><strong>{t.total}:</strong> {compareLeft.results?.total_emissions?.toFixed(2) ?? "0.00"} tCO2e</p>
                <p><strong>{t.perHectare}:</strong> {compareLeft.results?.per_hectare_emissions?.toFixed(2) ?? "0.00"} tCO2e/ha</p>
              </div>
              <div className="comparison-card">
                <h3>{t.scenarioB}</h3>
                <p><strong>{t.total}:</strong> {compareRight.results?.total_emissions?.toFixed(2) ?? "0.00"} tCO2e</p>
                <p><strong>{t.perHectare}:</strong> {compareRight.results?.per_hectare_emissions?.toFixed(2) ?? "0.00"} tCO2e/ha</p>
              </div>
              <div className="comparison-card comparison-delta">
                <h3>{t.delta}</h3>
                <p>
                  <strong>{t.total}:</strong>{" "}
                  {((compareRight.results?.total_emissions ?? 0) - (compareLeft.results?.total_emissions ?? 0)).toFixed(2)} tCO2e
                </p>
                <p>
                  <strong>{t.perHectare}:</strong>{" "}
                  {((compareRight.results?.per_hectare_emissions ?? 0) - (compareLeft.results?.per_hectare_emissions ?? 0)).toFixed(2)} tCO2e/ha
                </p>
              </div>
            </div>
          )}
        </article>
      </section>
      )}
      {showHeaderMenu && (
        <div className="header-menu-overlay" role="dialog" aria-modal="true" aria-label={t.menuLabel} onClick={() => setShowHeaderMenu(false)}>
          <div
            className="header-menu-panel"
            id={headerMenuId}
            onClick={(event) => event.stopPropagation()}
            style={menuPosition ? { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width } : undefined}
          >
            <div className="header-menu-title">
              <span>{t.menuLabel}</span>
              <button className="ghost" type="button" aria-label={t.menuClose} onClick={() => setShowHeaderMenu(false)}>
                {t.menuClose}
              </button>
            </div>
            <div className="header-menu-grid">
              <button className="ghost btn-with-icon" type="button" aria-label={t.examplesOpen} onClick={() => { setShowExamples(true); setShowHeaderMenu(false); }}>
                <Icon name="review" className="icon-xs" />
                {t.examplesOpen}
              </button>
              <button className="ghost btn-with-icon" type="button" aria-label={t.dashboardOpen} onClick={() => { setShowDashboard(true); setShowHeaderMenu(false); }}>
                <Icon name="results" className="icon-xs" />
                {t.dashboardOpen}
              </button>
              <button className="ghost btn-with-icon" type="button" aria-label={t.batchModeOpen} onClick={() => { setShowBatchMode(true); setShowHeaderMenu(false); }}>
                <Icon name="crops" className="icon-xs" />
                {t.batchModeOpen}
              </button>
              <button className="ghost btn-with-icon" type="button" aria-label={t.rotationOpen} onClick={() => { setShowRotationPlanner(true); setShowHeaderMenu(false); }}>
                <Icon name="practices" className="icon-xs" />
                {t.rotationOpen}
              </button>
              <button className="ghost btn-with-icon" type="button" aria-label={t.shortcutsOpen} onClick={() => { setShowShortcuts(true); setShowHeaderMenu(false); }}>
                <Icon name="review" className="icon-xs" />
                {t.shortcutsOpen}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={highContrast ? t.highContrastOff : t.highContrastOn}
                onClick={() => {
                  setHighContrast((prev) => !prev);
                  setShowHeaderMenu(false);
                }}
              >
                {highContrast ? t.highContrastOff : t.highContrastOn}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.settingsOpen}
                onClick={() => { setShowSettings(true); setShowHeaderMenu(false); }}
              >
                {t.settingsOpen}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.tutorialOpen}
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                  setShowHeaderMenu(false);
                }}
              >
                {t.tutorialOpen}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.helpOpen}
                onClick={() => {
                  setShowHelp((prev) => !prev);
                  setShowHeaderMenu(false);
                }}
              >
                {t.helpOpen}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.developerInfoOpen}
                onClick={() => { setShowDeveloperInfo(true); setShowHeaderMenu(false); }}
              >
                {t.developerInfoOpen}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.installApp}
                onClick={async () => {
                  if (!installPrompt) {
                    pushToast(t.installNotAvailable, "warning");
                    setShowHeaderMenu(false);
                    return;
                  }
                  try {
                    await installPrompt.prompt();
                    await installPrompt.userChoice;
                  } finally {
                    setInstallPrompt(null);
                    setShowHeaderMenu(false);
                  }
                }}
              >
                {t.installApp}
              </button>
              <button
                className="ghost btn-with-icon"
                type="button"
                aria-label={t.installGuideOpen}
                onClick={() => {
                  setShowInstallGuide(true);
                  setShowHeaderMenu(false);
                }}
              >
                {t.installGuideOpen}
              </button>
              <div className="font-controls" role="group" aria-label={t.fontSizeTitle}>
                <span className="font-label">{t.fontSizeTitle}</span>
                <button className="ghost" type="button" aria-label={t.fontSizeSmall} onClick={() => { setFontSize("small"); setShowHeaderMenu(false); }}>{t.fontSizeSmall}</button>
                <button className="ghost" type="button" aria-label={t.fontSizeMedium} onClick={() => { setFontSize("medium"); setShowHeaderMenu(false); }}>{t.fontSizeMedium}</button>
                <button className="ghost" type="button" aria-label={t.fontSizeLarge} onClick={() => { setFontSize("large"); setShowHeaderMenu(false); }}>{t.fontSizeLarge}</button>
                <button className="ghost" type="button" aria-label={t.fontSizeXL} onClick={() => { setFontSize("extra-large"); setShowHeaderMenu(false); }}>{t.fontSizeXL}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="app-footer">
        <div className="app-footer__headline">
          <span className="app-footer__title">{t.footerTitle}</span>
        </div>
        <div>
                    <span className="app-footer__meta">{t.footerCopyright}</span>
        </div>
        <nav className="app-footer__nav" aria-label={lang === "en" ? "Footer navigation" : "Нижня навігація"}>
          <button className="ghost" type="button" onClick={() => setShowPrivacyPolicy(true)}>
            {t.footerPrivacy}
          </button>
          <button className="ghost" type="button" onClick={() => setShowTerms(true)}>
            {t.footerTerms}
          </button>
          <button className="ghost" type="button" onClick={() => window.open('https://plsci.xyz', '_blank')}>
            {t.footerOtherProducts}
          </button>
        </nav>
      </footer>
    </main>
  );
}
