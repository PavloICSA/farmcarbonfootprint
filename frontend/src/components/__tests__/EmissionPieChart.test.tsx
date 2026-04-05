import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmissionPieChart, { PieChartData } from '../EmissionPieChart';

describe('EmissionPieChart', () => {
  const mockData: PieChartData[] = [
    { label: 'Fertilizer', value: 50, color: '#FF6B6B' },
    { label: 'Manure', value: 30, color: '#4ECDC4' },
    { label: 'Fuel', value: 20, color: '#45B7D1' }
  ];

  it('renders pie chart with data', () => {
    render(<EmissionPieChart data={mockData} />);
    
    const svg = screen.getByRole('img', { name: /emission breakdown pie chart/i });
    expect(svg).toBeInTheDocument();
  });

  it('renders legend with all items', () => {
    render(<EmissionPieChart data={mockData} />);
    
    mockData.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it('displays total emissions in summary', () => {
    render(<EmissionPieChart data={mockData} />);
    
    const total = mockData.reduce((sum, item) => sum + item.value, 0);
    expect(screen.getByText(`${total.toFixed(2)} tCO2e`)).toBeInTheDocument();
  });

  it('shows tooltip on legend item hover', async () => {
    const user = userEvent.setup();
    render(<EmissionPieChart data={mockData} />);
    
    const legendItems = screen.getAllByRole('button');
    await user.hover(legendItems[0]);
    
    // Tooltip should be visible with the hovered item's data
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('calculates percentages correctly', () => {
    render(<EmissionPieChart data={mockData} />);
    
    const total = 100;
    const expectedPercent = ((50 / total) * 100).toFixed(1);
    
    // Check that percentage is displayed in legend
    expect(screen.getByText(new RegExp(`${expectedPercent}%`))).toBeInTheDocument();
  });

  it('supports bilingual labels', () => {
    render(<EmissionPieChart data={mockData} language="ua" />);
    
    const svg = screen.getByRole('img', { name: /діаграма розподілу викидів/i });
    expect(svg).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<EmissionPieChart data={[]} />);
    
    expect(screen.getByText(/no data to display/i)).toBeInTheDocument();
  });

  it('handles zero values', () => {
    const dataWithZero: PieChartData[] = [
      { label: 'Fertilizer', value: 0, color: '#FF6B6B' },
      { label: 'Manure', value: 0, color: '#4ECDC4' }
    ];
    
    render(<EmissionPieChart data={dataWithZero} />);
    
    expect(screen.getByText(/no data to display/i)).toBeInTheDocument();
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<EmissionPieChart data={mockData} />);
    
    const legendItems = screen.getAllByRole('button');
    
    // Tab to first item
    await user.tab();
    expect(legendItems[0]).toHaveFocus();
    
    // Press Enter to toggle tooltip
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('applies responsive classes', () => {
    const { container } = render(<EmissionPieChart data={mockData} className="custom-class" />);
    
    const chartElement = container.querySelector('.emission-pie-chart');
    expect(chartElement).toHaveClass('custom-class');
  });

  it('displays values with correct precision', () => {
    const precisionData: PieChartData[] = [
      { label: 'Test', value: 123.456789, color: '#FF6B6B' }
    ];
    
    render(<EmissionPieChart data={precisionData} />);
    
    // Should display with 2 decimal places (appears in multiple places)
    const elements = screen.getAllByText(/123.46/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders with proper ARIA labels', () => {
    render(<EmissionPieChart data={mockData} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-label');
    
    const legend = screen.getByRole('region', { name: /chart legend/i });
    expect(legend).toBeInTheDocument();
  });

  it('handles large datasets', () => {
    const largeData: PieChartData[] = Array.from({ length: 10 }, (_, i) => ({
      label: `Category ${i + 1}`,
      value: Math.random() * 100,
      color: `hsl(${(i * 36) % 360}, 70%, 50%)`
    }));
    
    render(<EmissionPieChart data={largeData} />);
    
    largeData.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });
});
