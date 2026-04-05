# EmissionPieChart Component

## Overview

The `EmissionPieChart` component is a lightweight, accessible SVG-based pie chart for visualizing farm emission breakdowns. It avoids external charting library dependencies to ensure reliable testing and performance.

## Features

- **Pure SVG Implementation**: No external charting library dependencies
- **Fully Accessible**: WCAG 2.1 Level AA compliant with ARIA labels and keyboard navigation
- **Bilingual Support**: English and Ukrainian labels
- **Responsive Design**: Adapts to mobile and desktop screens
- **Interactive Tooltips**: Hover to see detailed emission values and percentages
- **Legend with Highlighting**: Click legend items to highlight corresponding pie slices
- **Summary Display**: Shows total emissions prominently
- **Dark Mode Support**: Automatically adapts to system color scheme preferences
- **High Contrast Mode**: Enhanced visibility for users with visual impairments
- **Print Friendly**: Optimized styling for printing

## Installation

The component is part of the frontend package and requires React 18+.

```bash
npm install
```

## Usage

### Basic Example

```tsx
import EmissionPieChart, { PieChartData } from './components/EmissionPieChart';

const data: PieChartData[] = [
  { label: 'Fertilizer', value: 45.2, color: '#FF6B6B' },
  { label: 'Manure', value: 28.5, color: '#4ECDC4' },
  { label: 'Fuel', value: 18.3, color: '#45B7D1' },
  { label: 'Irrigation', value: 12.1, color: '#96CEB4' },
  { label: 'Pesticide', value: 5.8, color: '#FFEAA7' },
  { label: 'Livestock', value: 8.2, color: '#DFE6E9' },
  { label: 'Poultry', value: 2.1, color: '#A29BFE' }
];

export function MyChart() {
  return <EmissionPieChart data={data} language="en" />;
}
```

### With Calculation Results

```tsx
import EmissionPieChart, { PieChartData } from './components/EmissionPieChart';

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

export function ResultsDisplay(props: { results: EmissionResults }) {
  const { results } = props;

  const chartData: PieChartData[] = [
    { label: 'Fertilizer', value: results.fertilizer_emissions, color: '#FF6B6B' },
    { label: 'Manure', value: results.manure_emissions, color: '#4ECDC4' },
    { label: 'Fuel', value: results.fuel_emissions, color: '#45B7D1' },
    { label: 'Irrigation', value: results.irrigation_emissions, color: '#96CEB4' },
    { label: 'Pesticide', value: results.pesticide_emissions, color: '#FFEAA7' },
    { label: 'Livestock', value: results.livestock_emissions, color: '#DFE6E9' },
    { label: 'Poultry', value: results.poultry_emissions, color: '#A29BFE' }
  ].filter(item => item.value > 0);

  return <EmissionPieChart data={chartData} />;
}
```

### Bilingual Support

```tsx
const [language, setLanguage] = useState<'en' | 'ua'>('en');

return (
  <>
    <button onClick={() => setLanguage('en')}>English</button>
    <button onClick={() => setLanguage('ua')}>Українська</button>
    <EmissionPieChart data={data} language={language} />
  </>
);
```

## Props

### `EmissionPieChartProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `PieChartData[]` | Required | Array of emission data points |
| `language` | `'en' \| 'ua'` | `'en'` | Display language for labels |
| `className` | `string` | `''` | Additional CSS classes |

### `PieChartData`

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Category name (e.g., "Fertilizer") |
| `value` | `number` | Emission value in tCO2e |
| `color` | `string` | Hex color code for the pie slice |

## Accessibility

The component is fully accessible and includes:

- **ARIA Labels**: All interactive elements have descriptive ARIA labels
- **Keyboard Navigation**: 
  - Tab to navigate between legend items and pie slices
  - Enter/Space to toggle tooltip visibility
  - Escape to close tooltips
- **Screen Reader Support**: Tooltips announce values and percentages
- **Focus Indicators**: Clear visual focus indicators for keyboard users
- **High Contrast Mode**: Enhanced colors for users with visual impairments
- **Semantic HTML**: Proper use of roles and landmarks

## Styling

The component uses CSS custom properties for theming:

```css
--bg-secondary: Background color for the chart container
--bg-tertiary: Background color for legend and summary
--bg-hover: Hover state background
--bg-highlight: Highlighted item background
--border-color: Border colors
--border-accent: Accent border color
--text-primary: Primary text color
--text-secondary: Secondary text color
```

### Custom Styling

```tsx
<EmissionPieChart 
  data={data} 
  className="my-custom-chart"
/>
```

```css
.my-custom-chart {
  --bg-secondary: #f0f0f0;
  --border-accent: #2196f3;
}
```

## Responsive Behavior

The component automatically adapts to different screen sizes:

- **Desktop (>768px)**: Full-size pie chart with side-by-side legend
- **Tablet (480px-768px)**: Slightly smaller chart with wrapped legend
- **Mobile (<480px)**: Compact layout with stacked legend items

## Dark Mode

The component automatically detects system color scheme preferences:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles applied automatically */
}
```

## High Contrast Mode

Enhanced contrast is automatically applied when requested:

```css
@media (prefers-contrast: more) {
  /* High contrast styles applied automatically */
}
```

## Print Styles

The component includes print-optimized styles:

```css
@media print {
  /* Print-friendly styles applied automatically */
}
```

## Testing

The component includes comprehensive tests covering:

- Rendering with data
- Legend display
- Tooltip interactions
- Keyboard accessibility
- Bilingual support
- Empty data handling
- Responsive behavior
- ARIA labels
- Large datasets

Run tests with:

```bash
npm test -- EmissionPieChart.test.tsx
```

## Performance

- **No External Dependencies**: Pure SVG rendering
- **Efficient Re-renders**: Minimal state updates
- **Optimized SVG**: Efficient path generation
- **CSS Animations**: Hardware-accelerated transitions

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Examples

See `EmissionPieChart-example.tsx` for comprehensive usage examples including:

- Basic usage
- Bilingual support
- Integration with calculation results
- Responsive containers
- Empty data handling
- Scenario comparison
- Dynamic data updates

## Color Palette

The default color palette is designed for accessibility and visual distinction:

| Category | Color | Hex |
|----------|-------|-----|
| Fertilizer | Red | #FF6B6B |
| Manure | Teal | #4ECDC4 |
| Fuel | Blue | #45B7D1 |
| Irrigation | Green | #96CEB4 |
| Pesticide | Yellow | #FFEAA7 |
| Livestock | Gray | #DFE6E9 |
| Poultry | Purple | #A29BFE |

## Troubleshooting

### Chart not displaying

- Ensure `data` array is not empty
- Check that all data items have positive `value` properties
- Verify color codes are valid hex values

### Tooltips not appearing

- Ensure JavaScript is enabled
- Check browser console for errors
- Verify component is not hidden by CSS

### Accessibility issues

- Use keyboard navigation (Tab, Enter, Space)
- Enable screen reader in browser settings
- Check for focus indicators on interactive elements

## Contributing

When modifying the component:

1. Maintain accessibility standards (WCAG 2.1 Level AA)
2. Add tests for new features
3. Update this README with changes
4. Test on mobile devices
5. Verify dark mode and high contrast support

## License

Part of the Farm Carbon Footprint Web App project.
