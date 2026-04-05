# Chart Utilities Library

## Overview

The Chart Utilities library provides a comprehensive set of tools for building pure SVG-based charts without external dependencies. It includes utilities for:

- SVG path generation and coordinate transformations
- Data transformation and validation
- Accessibility features
- Responsive design
- Animation and easing
- Tooltip positioning

## Installation

The utilities are part of the frontend package and can be imported directly:

```typescript
import {
  CHART_COLORS,
  SVGUtils,
  DataUtils,
  TooltipUtils,
  A11yUtils,
  AnimationUtils,
  ResponsiveUtils,
  ValidationUtils,
} from '@/lib/chart-utils';
```

## Color Palette

### CHART_COLORS

Standard color palette designed for accessibility and visual distinction:

```typescript
const CHART_COLORS = {
  fertilizer: '#FF6B6B',    // Red
  manure: '#4ECDC4',         // Teal
  fuel: '#45B7D1',           // Blue
  irrigation: '#96CEB4',     // Green
  pesticide: '#FFEAA7',      // Yellow
  livestock: '#DFE6E9',      // Light Gray
  poultry: '#A29BFE',        // Purple
  accent1: '#FF8C42',        // Orange
  accent2: '#6C5CE7',        // Indigo
  accent3: '#00B894',        // Emerald
  accent4: '#FDCB6E',        // Gold
  accent5: '#E17055',        // Coral
};
```

### getChartColor(index)

Get color by index with automatic cycling:

```typescript
getChartColor(0)  // Returns '#FF6B6B'
getChartColor(7)  // Returns '#FF8C42' (cycles through palette)
```

## SVG Utilities

### polarToCartesian(centerX, centerY, radius, angleInRadians)

Convert polar coordinates to Cartesian:

```typescript
const point = SVGUtils.polarToCartesian(100, 100, 50, Math.PI / 2);
// Returns { x: 100, y: 150 }
```

### describeArc(centerX, centerY, radius, startAngle, endAngle)

Generate SVG arc path for pie slices:

```typescript
const path = SVGUtils.describeArc(100, 100, 80, 0, Math.PI / 2);
// Returns SVG path string for quarter circle
```

### line(x1, y1, x2, y2)

Generate SVG line path:

```typescript
const path = SVGUtils.line(0, 0, 100, 100);
// Returns 'M 0 0 L 100 100'
```

### polyline(points)

Generate SVG polyline path:

```typescript
const points: [number, number][] = [[0, 0], [50, 50], [100, 0]];
const path = SVGUtils.polyline(points);
// Returns 'M 0 0 L 50 50 L 100 0'
```

### smoothCurve(points)

Generate smooth curve through points using Catmull-Rom interpolation:

```typescript
const points: [number, number][] = [[0, 0], [50, 50], [100, 0]];
const path = SVGUtils.smoothCurve(points);
// Returns smooth curve path
```

## Data Utilities

### sum(values)

Calculate total of numeric values:

```typescript
DataUtils.sum([10, 20, 30])  // Returns 60
```

### percentage(value, total)

Calculate percentage of value relative to total:

```typescript
DataUtils.percentage(25, 100)  // Returns 25
DataUtils.percentage(50, 200)  // Returns 25
```

### formatNumber(value, decimals)

Format number with specified decimal places:

```typescript
DataUtils.formatNumber(123.456, 2)  // Returns '123.46'
DataUtils.formatNumber(123.456, 1)  // Returns '123.5'
```

### sortByValue(data)

Sort data by value descending:

```typescript
const data = [
  { label: 'A', value: 10 },
  { label: 'B', value: 30 },
  { label: 'C', value: 20 },
];
const sorted = DataUtils.sortByValue(data);
// Returns data sorted by value: B (30), C (20), A (10)
```

### filterPositive(data)

Filter out zero or negative values:

```typescript
const data = [
  { label: 'A', value: 10 },
  { label: 'B', value: 0 },
  { label: 'C', value: -5 },
];
const filtered = DataUtils.filterPositive(data);
// Returns only A (10)
```

### extent(values)

Calculate min and max values:

```typescript
const [min, max] = DataUtils.extent([5, 2, 8, 1, 9]);
// Returns [1, 9]
```

### scale(value, inMin, inMax, outMin, outMax)

Linear scale mapping:

```typescript
DataUtils.scale(50, 0, 100, 0, 1)  // Returns 0.5
DataUtils.scale(0, 0, 100, 0, 1)   // Returns 0
DataUtils.scale(100, 0, 100, 0, 1) // Returns 1
```

## Tooltip Utilities

### formatTooltip(label, value, unit, percentage)

Format tooltip content:

```typescript
TooltipUtils.formatTooltip('Fertilizer', 45.2);
// Returns 'Fertilizer: 45.20 tCO2e'

TooltipUtils.formatTooltip('Fertilizer', 45.2, 'tCO2e', 25.5);
// Returns 'Fertilizer: 45.20 tCO2e (25.5%)'
```

### calculatePosition(mouseX, mouseY, tooltipWidth, tooltipHeight, viewportWidth, viewportHeight)

Calculate optimal tooltip position to avoid viewport edges:

```typescript
const pos = TooltipUtils.calculatePosition(
  100, 100,  // Mouse position
  200, 50,   // Tooltip dimensions
  1024, 768  // Viewport dimensions
);
// Returns { x: 0, y: 140 } (adjusted to stay in viewport)
```

## Accessibility Utilities

### generateChartLabel(title, description)

Generate ARIA label for chart:

```typescript
A11yUtils.generateChartLabel('Emissions', 'Breakdown by category');
// Returns 'Emissions. Breakdown by category'
```

### generateDataPointLabel(label, value, unit, percentage)

Generate ARIA label for data point:

```typescript
A11yUtils.generateDataPointLabel('Fertilizer', 45.2, 'tCO2e', 25.5);
// Returns 'Fertilizer: 45.20 tCO2e, 25.5 percent'
```

### generateLegendItemLabel(label, value, unit)

Generate ARIA label for legend item:

```typescript
A11yUtils.generateLegendItemLabel('Fertilizer', 45.2);
// Returns 'Fertilizer, 45.20 tCO2e'
```

## Animation Utilities

### Easing Functions

Pre-built easing functions for animations:

```typescript
AnimationUtils.easing.linear(0.5)        // Returns 0.5
AnimationUtils.easing.easeInQuad(0.5)    // Returns 0.25
AnimationUtils.easing.easeOutQuad(0.5)   // Returns 0.75
AnimationUtils.easing.easeInOutQuad(0.5) // Returns 0.5
AnimationUtils.easing.easeInCubic(0.5)   // Returns 0.125
AnimationUtils.easing.easeOutCubic(0.5)  // Returns 0.875
```

### interpolate(start, end, progress)

Interpolate between two values:

```typescript
AnimationUtils.interpolate(0, 100, 0.5)  // Returns 50
AnimationUtils.interpolate(0, 100, 0)    // Returns 0
AnimationUtils.interpolate(0, 100, 1)    // Returns 100
```

### interpolateColor(color1, color2, progress)

Interpolate between two colors:

```typescript
const color = AnimationUtils.interpolateColor('#000000', '#FFFFFF', 0.5);
// Returns a gray color halfway between black and white
```

## Responsive Utilities

### getResponsiveDimensions(containerWidth, containerHeight)

Get responsive dimensions based on viewport:

```typescript
const dims = ResponsiveUtils.getResponsiveDimensions(400, 300);
// Returns {
//   isMobile: true,
//   isTablet: true,
//   isDesktop: false,
//   chartWidth: 400,
//   chartHeight: 180,
//   fontSize: 12,
//   padding: 16
// }
```

### getResponsiveFontSize(baseSize, containerWidth)

Get responsive font size:

```typescript
ResponsiveUtils.getResponsiveFontSize(14, 400)   // Returns 11.2 (mobile)
ResponsiveUtils.getResponsiveFontSize(14, 600)   // Returns 12.6 (tablet)
ResponsiveUtils.getResponsiveFontSize(14, 1200)  // Returns 14 (desktop)
```

### getResponsiveStrokeWidth(baseWidth, containerWidth)

Get responsive stroke width:

```typescript
ResponsiveUtils.getResponsiveStrokeWidth(2, 400)   // Returns 1.6 (mobile)
ResponsiveUtils.getResponsiveStrokeWidth(2, 600)   // Returns 1.8 (tablet)
ResponsiveUtils.getResponsiveStrokeWidth(2, 1200)  // Returns 2 (desktop)
```

## Validation Utilities

### validateChartData(data)

Validate chart data:

```typescript
const result = ValidationUtils.validateChartData([
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
]);
// Returns { valid: true, errors: [] }

const invalid = ValidationUtils.validateChartData([
  { label: 'A', value: -10 },
]);
// Returns { valid: false, errors: ['Item 0: value cannot be negative'] }
```

### isValidHexColor(color)

Validate hex color code:

```typescript
ValidationUtils.isValidHexColor('#FF6B6B')  // Returns true
ValidationUtils.isValidHexColor('FF6B6B')   // Returns false
ValidationUtils.isValidHexColor('#GGGGGG')  // Returns false
```

### isValidDimension(value)

Validate dimension value:

```typescript
ValidationUtils.isValidDimension(100)   // Returns true
ValidationUtils.isValidDimension(0)     // Returns false
ValidationUtils.isValidDimension(-100)  // Returns false
ValidationUtils.isValidDimension(NaN)   // Returns false
```

## Usage Examples

### Creating a Pie Chart

```typescript
import { SVGUtils, DataUtils, CHART_COLORS } from '@/lib/chart-utils';

const data = [
  { label: 'Fertilizer', value: 45.2 },
  { label: 'Manure', value: 28.5 },
  { label: 'Fuel', value: 18.3 },
];

const total = DataUtils.sum(data.map(d => d.value));
let currentAngle = -Math.PI / 2;

data.forEach((item, index) => {
  const sliceAngle = (item.value / total) * 2 * Math.PI;
  const endAngle = currentAngle + sliceAngle;
  
  const path = SVGUtils.describeArc(100, 100, 80, currentAngle, endAngle);
  const color = CHART_COLORS[Object.keys(CHART_COLORS)[index]];
  
  // Render SVG path with color
  currentAngle = endAngle;
});
```

### Creating a Line Chart

```typescript
import { SVGUtils, DataUtils, ResponsiveUtils } from '@/lib/chart-utils';

const data = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 120 },
  { date: '2024-01-03', value: 110 },
];

const [minValue, maxValue] = DataUtils.extent(data.map(d => d.value));
const dims = ResponsiveUtils.getResponsiveDimensions(400, 300);

const points = data.map((item, index) => [
  (index / (data.length - 1)) * 300,
  300 - DataUtils.scale(item.value, minValue, maxValue, 0, 200),
]);

const path = SVGUtils.smoothCurve(points);
// Render SVG path
```

## Testing

All utilities include comprehensive tests. Run tests with:

```bash
npm test -- chart-utils.test.ts
```

## Performance Considerations

- All utilities are pure functions with no side effects
- Coordinate transformations use efficient math operations
- Data transformations create new arrays (immutable)
- Validation functions short-circuit on first error

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Contributing

When adding new utilities:

1. Keep functions pure and side-effect free
2. Add comprehensive JSDoc comments
3. Include unit tests
4. Update this README
5. Ensure TypeScript types are correct

## License

Part of the Farm Carbon Footprint Web App project.
