import { buildCropComparisonChartData, buildEmissionPieChartData, buildEmissionTrendPoints, buildPracticeHeatMapRows } from '../chart-data';

describe('chart-data', () => {
  test('buildEmissionPieChartData returns all categories', () => {
    const results: any = {
      fertilizer_emissions: 1,
      manure_emissions: 2,
      fuel_emissions: 3,
      irrigation_emissions: 4,
      pesticide_emissions: 5,
      livestock_emissions: 6,
      total_emissions: 21,
      per_hectare_emissions: 2.1,
      num_crops: 1,
      crop_results: [],
    };

    const data = buildEmissionPieChartData({
      results,
      labels: {
        fertilizer: 'Fertilizer',
        manure: 'Manure',
        fuel: 'Fuel',
        irrigation: 'Irrigation',
        pesticide: 'Pesticide',
        livestock: 'Livestock',
        poultry: 'Poultry',
      },
      animalBreakdown: { livestock: 5, poultry: 1 },
    });

    expect(data).toHaveLength(7);
    expect(data.map((d) => d.label)).toEqual(['Fertilizer', 'Manure', 'Fuel', 'Irrigation', 'Pesticide', 'Livestock', 'Poultry']);
    expect(data.find((d) => d.label === 'Livestock')?.value).toBe(5);
    expect(data.find((d) => d.label === 'Poultry')?.value).toBe(1);
  });

  test('buildCropComparisonChartData builds stacked segments per crop', () => {
    const results: any = {
      crop_results: [
        { crop_id: 1, fertilizer_emissions: 1, manure_emissions: 0, fuel_emissions: 2, irrigation_emissions: 0, pesticide_emissions: 0, total_emissions: 3 },
        { crop_id: 2, fertilizer_emissions: 4, manure_emissions: 0, fuel_emissions: 0, irrigation_emissions: 0, pesticide_emissions: 1, total_emissions: 5 },
      ],
    };

    const data = buildCropComparisonChartData({
      results,
      getCropLabel: (id) => (id === 1 ? 'Wheat' : 'Corn'),
      labels: {
        fertilizer: 'Fertilizer',
        manure: 'Manure',
        fuel: 'Fuel',
        irrigation: 'Irrigation',
        pesticide: 'Pesticide',
      },
    });

    expect(data).toHaveLength(2);
    expect(data[0].segments).toHaveLength(5);
    expect(data[0].label).toBe('Wheat');
  });

  test('buildEmissionTrendPoints returns up to 20 points', () => {
    const history: any[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      timestamp: new Date(2024, 0, i + 1),
      results: { total_emissions: i },
      data: {},
      practices: [],
      metadata: { version: '0.1.0' },
    }));
    const points = buildEmissionTrendPoints(history);
    expect(points).toHaveLength(20);
  });

  test('buildPracticeHeatMapRows supports bilingual labels', () => {
    const practices: any[] = [
      {
        tillage: 'disk_tillage',
        precisionFertilization: true,
        coverCrop: false,
        irrigationMethod: 'sprinkler',
        irrigationEnergy: 'grid',
        residue: 'retain',
      },
    ];
    const en = buildPracticeHeatMapRows(practices, 'en');
    const ua = buildPracticeHeatMapRows(practices, 'ua');
    expect(en[0].label).toBeTruthy();
    expect(ua[0].label).toBeTruthy();
    expect(en[0].label).not.toEqual(ua[0].label);
  });
});

