# ChartBase Component

## Overview

`ChartBase` is a foundational component for all SVG-based charts. It provides:

- Responsive sizing with ResizeObserver
- Loading and error states
- Accessibility features (ARIA labels, semantic HTML)
- Dark mode support
- Print-friendly styling
- Keyboard navigation support

## Installation

```typescript
import ChartBase from '@/components/ChartBase';
```

## Basic Usage

```typescript
import ChartBase from '@/components/ChartBase';

export function MyChart() {
  return (
    <ChartBase
      title="Emission Breakdown"
      description="Total emissions by category"
    >
      <circle cx="100" cy="100" r="50" fill="#FF6B6B" />
      <text x="100" y="100" textAnchor="middle">
        50 tCO2e
      </text>
    </ChartBase>
  );
}
```

## Props

### `title` (required)

Chart title for accessibility and labeling.

```typescript
<ChartBase title="Emissions Chart">
  {/* SVG content */}
</ChartBase>
```

### `description` (optional)

Detailed description for screen readers.

```typescript
<ChartBase
  title="Emissions Chart"
  description="Breakdown of farm emissions by source category"
>
  {/* SVG content */}
</ChartBase>
```

### `viewBox` (optional)

SVG viewBox attribute. Default: `"0 0 400 300"`

```typescript
<ChartBase viewBox="0 0 500 400">
  {/* SVG content */}
</ChartBase>
```

### `children` (required)

SVG elements to render inside the chart.

```typescript
<ChartBase title="Chart">
  <circle cx="50" cy="50" r="40" />
  <rect x="100" y="100" width="50" height="50" />
</ChartBase>
```

### `className` (optional)

Additional CSS classes for styling.

```typescript
<ChartBase title="Chart" className="my-custom-chart">
  {/* SVG content */}
</ChartBase>
```

### `aspectRatio` (optional)

Aspect ratio for responsive sizing. Default: `4/3`

```typescript
<ChartBase title="Chart" aspectRatio={16 / 9}>
  {/* SVG content */}
</ChartBase>
```

### `isLoading` (optional)

Show loading state. Default: `false`

```typescript
<ChartBase title="Chart" isLoading={isLoading}>
  {/* SVG content */}
</ChartBase>
```

### `error` (optional)

Show error state with message. Default: `null`

```typescript
<ChartBase title="Chart" error="Failed to load data">
  {/* SVG content */}
</ChartBase>
```

### `onReady` (optional)

Callback when chart is ready (not loading, no error).

```typescript
<ChartBase
  title="Chart"
  onReady={() => console.log('Chart ready!')}
>
  {/* SVG content */}
</ChartBase>
```

### `responsive` (optional)

Enable responsive sizing. Default: `true`

```typescript
<ChartBase title="Chart" responsive={true}>
  {/* SVG content */}
</ChartBase>
```

### `width` (optional)

Custom width (overrides responsive). Can be number or string.

```typescript
<ChartBase title="Chart" width={500}>
  {/* SVG content */}
</ChartBase>

<ChartBase title="Chart" width="100%">
  {/* SVG content */}
</ChartBase>
```

### `height` (optional)

Custom height (overrides responsive). Can be number or string.

```typescript
<ChartBase title="Chart" height={400}>
  {/* SVG content */}
</ChartBase>
```

## Examples

### Basic Pie Chart

```typescript
import ChartBase from '@/components/ChartBase';
import { SVGUtils, CHART_COLORS } from '@/lib/chart-utils';

export function PieChartExample() {
  const data = [
    { label: 'Fertilizer', value: 45.2 },
    { label: 'Manure', value: 28.5 },
    { label: 'Fuel', value: 18.3 },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2;

  return (
    <ChartBase
      title="Emission Breakdown"
      description="Total emissions by category"
      viewBox="0 0 200 200"
    >
      {data.map((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = currentAngle + sliceAngle;
        const path = SVGUtils.describeArc(100, 100, 80, currentAngle, endAngle);
        const color = Object.values(CHART_COLORS)[index];
        
        currentAngle = endAngle;
        
        return (
          <path
            key={item.label}
            d={path}
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
        );
      })}
    </ChartBase>
  );
}
```

### With Loading State

```typescript
import { useState, useEffect } from 'react';
import ChartBase from '@/components/ChartBase';

export function ChartWithLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setData([...]);
      setIsLoading(false);
    }, 2000);
  }, []);

  return (
    <ChartBase
      title="Emissions Chart"
      isLoading={isLoading}
    >
      {/* Chart content */}
    </ChartBase>
  );
}
```

### With Error Handling

```typescript
import { useState } from 'react';
import ChartBase from '@/components/ChartBase';

export function ChartWithError() {
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const response = await fetch('/api/emissions');
      if (!response.ok) throw new Error('Failed to load data');
      // Process data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <ChartBase
      title="Emissions Chart"
      error={error}
    >
      {/* Chart content */}
    </ChartBase>
  );
}
```

### Responsive Chart

```typescript
import ChartBase from '@/components/ChartBase';

export function ResponsiveChart() {
  return (
    <div style={{ width: '100%', maxWidth: '800px' }}>
      <ChartBase
        title="Emissions Chart"
        responsive={true}
        aspectRatio={16 / 9}
      >
        {/* Chart content scales with container */}
      </ChartBase>
    </div>
  );
}
```

### Custom Styling

```typescript
import ChartBase from '@/components/ChartBase';
import './my-chart.css';

export function StyledChart() {
  return (
    <ChartBase
      title="Emissions Chart"
      className="my-custom-chart"
    >
      {/* Chart content */}
    </ChartBase>
  );
}
```

```css
/* my-chart.css */
.my-custom-chart {
  --chart-bg: #f5f5f5;
  --spinner-color: #2196f3;
  --error-bg: #ffebee;
  --error-border: #f44336;
}
```

## Styling

### CSS Custom Properties

Customize appearance using CSS variables:

```css
.chart-base {
  --chart-bg: Background color
  --spinner-bg: Spinner background
  --spinner-color: Spinner color
  --error-bg: Error background
  --error-border: Error border
  --error-text: Error text color
  --text-secondary: Secondary text color
  --border-color: Border color
  --focus-color: Focus indicator color
}
```

### Dark Mode

Automatically adapts to system color scheme:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles applied automatically */
}
```

### High Contrast Mode

Enhanced contrast for accessibility:

```css
@media (prefers-contrast: more) {
  /* High contrast styles applied automatically */
}
```

### Print Styles

Optimized for printing:

```css
@media print {
  /* Print-friendly styles applied automatically */
}
```

## Accessibility

### ARIA Labels

- `role="region"` - Identifies chart as a region
- `aria-label` - Chart title
- `aria-describedby` - Links to description (if provided)

### Screen Reader Support

- Chart title announced
- Description provided if available
- Loading and error states announced
- Status updates with `aria-live="polite"`

### Keyboard Navigation

- Tab to focus chart region
- Focus indicators visible
- Keyboard shortcuts supported by child components

## Responsive Behavior

### Mobile (<480px)

- Reduced padding and font sizes
- Optimized touch targets
- Simplified layout

### Tablet (480px-768px)

- Medium padding and font sizes
- Balanced layout
- Touch-friendly

### Desktop (>768px)

- Full padding and font sizes
- Optimal spacing
- Mouse-friendly

## Performance

- Uses ResizeObserver for efficient responsive sizing
- Minimal re-renders
- Efficient SVG rendering
- No external dependencies

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Testing

```typescript
import { render, screen } from '@testing-library/react';
import ChartBase from '@/components/ChartBase';

test('renders chart with title', () => {
  render(
    <ChartBase title="Test Chart">
      <circle cx="50" cy="50" r="40" />
    </ChartBase>
  );

  expect(screen.getByRole('region', { name: 'Test Chart' })).toBeInTheDocument();
});

test('shows loading state', () => {
  render(
    <ChartBase title="Test Chart" isLoading={true}>
      <circle cx="50" cy="50" r="40" />
    </ChartBase>
  );

  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('shows error state', () => {
  render(
    <ChartBase title="Test Chart" error="Failed to load">
      <circle cx="50" cy="50" r="40" />
    </ChartBase>
  );

  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

## Best Practices

1. **Always provide a title** - Required for accessibility
2. **Add descriptions** - Helps screen reader users understand the chart
3. **Handle loading states** - Show feedback during data loading
4. **Handle errors gracefully** - Display user-friendly error messages
5. **Use responsive sizing** - Adapt to different screen sizes
6. **Test accessibility** - Verify with screen readers and keyboard navigation

## Contributing

When extending ChartBase:

1. Maintain accessibility features
2. Support dark mode and high contrast
3. Keep responsive behavior
4. Add comprehensive tests
5. Update documentation

## License

Part of the Farm Carbon Footprint Web App project.
