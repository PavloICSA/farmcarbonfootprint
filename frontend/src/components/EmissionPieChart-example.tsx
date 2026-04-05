import React from 'react';
import EmissionPieChart, { PieChartData } from './EmissionPieChart';

/**
 * Example: Using EmissionPieChart with emission results
 * 
 * This example demonstrates how to integrate the EmissionPieChart component
 * with real emission calculation results.
 */

// Example 1: Basic usage with sample data
export function BasicPieChartExample() {
  const emissionData: PieChartData[] = [
    { label: 'Fertilizer', value: 45.2, color: '#FF6B6B' },
    { label: 'Manure', value: 28.5, color: '#4ECDC4' },
    { label: 'Fuel', value: 18.3, color: '#45B7D1' },
    { label: 'Irrigation', value: 12.1, color: '#96CEB4' },
    { label: 'Pesticide', value: 5.8, color: '#FFEAA7' },
    { label: 'Livestock', value: 8.2, color: '#DFE6E9' },
    { label: 'Poultry', value: 2.1, color: '#A29BFE' }
  ];

  return (
    <div>
      <h2>Farm Emission Breakdown</h2>
      <EmissionPieChart data={emissionData} language="en" />
    </div>
  );
}

// Example 2: Bilingual support
export function BilingualPieChartExample() {
  const emissionData: PieChartData[] = [
    { label: 'Fertilizer / Добриво', value: 45.2, color: '#FF6B6B' },
    { label: 'Manure / Гній', value: 28.5, color: '#4ECDC4' },
    { label: 'Fuel / Паливо', value: 18.3, color: '#45B7D1' },
    { label: 'Irrigation / Зрошення', value: 12.1, color: '#96CEB4' },
    { label: 'Pesticide / Пестицид', value: 5.8, color: '#FFEAA7' },
    { label: 'Livestock / Худоба', value: 8.2, color: '#DFE6E9' },
    { label: 'Poultry / Птиця', value: 2.1, color: '#A29BFE' }
  ];

  const [language, setLanguage] = React.useState<'en' | 'ua'>('en');

  return (
    <div>
      <div>
        <button onClick={() => setLanguage('en')}>English</button>
        <button onClick={() => setLanguage('ua')}>Українська</button>
      </div>
      <EmissionPieChart data={emissionData} language={language} />
    </div>
  );
}

// Example 3: Integration with calculation results
interface EmissionResults {
  fertilizer_emissions: number;
  manure_emissions: number;
  fuel_emissions: number;
  irrigation_emissions: number;
  pesticide_emissions: number;
  livestock_emissions: number;
  poultry_emissions: number;
  total_emissions: number;
}

export function ResultsWithPieChartExample(props: { results: EmissionResults }) {
  const { results } = props;

  // Transform calculation results to chart data
  const chartData: PieChartData[] = [
    { label: 'Fertilizer', value: results.fertilizer_emissions, color: '#FF6B6B' },
    { label: 'Manure', value: results.manure_emissions, color: '#4ECDC4' },
    { label: 'Fuel', value: results.fuel_emissions, color: '#45B7D1' },
    { label: 'Irrigation', value: results.irrigation_emissions, color: '#96CEB4' },
    { label: 'Pesticide', value: results.pesticide_emissions, color: '#FFEAA7' },
    { label: 'Livestock', value: results.livestock_emissions, color: '#DFE6E9' },
    { label: 'Poultry', value: results.poultry_emissions, color: '#A29BFE' }
  ].filter(item => item.value > 0); // Only show categories with emissions

  return (
    <div>
      <h2>Your Farm's Carbon Footprint</h2>
      <EmissionPieChart data={chartData} />
      <div>
        <p>Total: {results.total_emissions.toFixed(2)} tCO2e</p>
      </div>
    </div>
  );
}

// Example 4: Responsive container with custom styling
export function ResponsivePieChartExample() {
  const emissionData: PieChartData[] = [
    { label: 'Fertilizer', value: 45.2, color: '#FF6B6B' },
    { label: 'Manure', value: 28.5, color: '#4ECDC4' },
    { label: 'Fuel', value: 18.3, color: '#45B7D1' },
    { label: 'Irrigation', value: 12.1, color: '#96CEB4' },
    { label: 'Pesticide', value: 5.8, color: '#FFEAA7' },
    { label: 'Livestock', value: 8.2, color: '#DFE6E9' },
    { label: 'Poultry', value: 2.1, color: '#A29BFE' }
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <EmissionPieChart 
        data={emissionData} 
        className="custom-chart"
      />
    </div>
  );
}

// Example 5: Handling empty data
export function EmptyDataExample() {
  const emptyData: PieChartData[] = [];

  return (
    <div>
      <h2>No Calculations Yet</h2>
      <EmissionPieChart data={emptyData} />
      <p>Run a calculation to see your emission breakdown.</p>
    </div>
  );
}

// Example 6: Comparison of two scenarios
export function ComparisonExample() {
  const scenario1: PieChartData[] = [
    { label: 'Fertilizer', value: 45.2, color: '#FF6B6B' },
    { label: 'Manure', value: 28.5, color: '#4ECDC4' },
    { label: 'Fuel', value: 18.3, color: '#45B7D1' },
    { label: 'Irrigation', value: 12.1, color: '#96CEB4' },
    { label: 'Pesticide', value: 5.8, color: '#FFEAA7' },
    { label: 'Livestock', value: 8.2, color: '#DFE6E9' },
    { label: 'Poultry', value: 2.1, color: '#A29BFE' }
  ];

  const scenario2: PieChartData[] = [
    { label: 'Fertilizer', value: 35.2, color: '#FF6B6B' },
    { label: 'Manure', value: 22.5, color: '#4ECDC4' },
    { label: 'Fuel', value: 12.3, color: '#45B7D1' },
    { label: 'Irrigation', value: 8.1, color: '#96CEB4' },
    { label: 'Pesticide', value: 3.8, color: '#FFEAA7' },
    { label: 'Livestock', value: 6.2, color: '#DFE6E9' },
    { label: 'Poultry', value: 1.1, color: '#A29BFE' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div>
        <h3>Current Practices</h3>
        <EmissionPieChart data={scenario1} />
      </div>
      <div>
        <h3>With Recommendations</h3>
        <EmissionPieChart data={scenario2} />
      </div>
    </div>
  );
}

// Example 7: Dynamic data updates
export function DynamicDataExample() {
  const [emissions, setEmissions] = React.useState<PieChartData[]>([
    { label: 'Fertilizer', value: 45.2, color: '#FF6B6B' },
    { label: 'Manure', value: 28.5, color: '#4ECDC4' },
    { label: 'Fuel', value: 18.3, color: '#45B7D1' },
    { label: 'Irrigation', value: 12.1, color: '#96CEB4' },
    { label: 'Pesticide', value: 5.8, color: '#FFEAA7' },
    { label: 'Livestock', value: 8.2, color: '#DFE6E9' },
    { label: 'Poultry', value: 2.1, color: '#A29BFE' }
  ]);

  const handleRecalculate = () => {
    // Simulate recalculation with different values
    setEmissions(prev => 
      prev.map(item => ({
        ...item,
        value: item.value * (0.8 + Math.random() * 0.4) // Random variation
      }))
    );
  };

  return (
    <div>
      <button onClick={handleRecalculate}>Recalculate</button>
      <EmissionPieChart data={emissions} />
    </div>
  );
}
