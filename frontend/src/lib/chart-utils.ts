/**
 * Chart Utilities - Pure SVG Chart Foundation
 * 
 * Provides reusable utilities for creating SVG-based charts without external dependencies.
 * Supports pie charts, bar charts, line charts, and heat maps.
 */

/**
 * Standard color palette for charts
 * Designed for accessibility and visual distinction
 */
export const CHART_COLORS = {
  fertilizer: 'var(--chart-fertilizer)',    // Red
  manure: 'var(--chart-manure)',            // Teal
  fuel: 'var(--chart-fuel)',                // Blue
  irrigation: 'var(--chart-irrigation)',    // Green
  pesticide: 'var(--chart-pesticide)',      // Yellow
  livestock: 'var(--chart-livestock)',      // Light Gray
  poultry: 'var(--chart-poultry)',          // Purple
  // Additional colors for extended datasets
  accent1: 'var(--chart-accent1)',          // Orange
  accent2: 'var(--chart-accent2)',          // Indigo
  accent3: 'var(--chart-accent3)',          // Emerald
  accent4: 'var(--chart-accent4)',          // Gold
  accent5: 'var(--chart-accent5)',          // Coral
} as const;

/**
 * Get color by index with fallback to palette cycling
 */
export function getChartColor(index: number): string {
  const colors = Object.values(CHART_COLORS);
  const len = colors.length;
  const normalized = ((index % len) + len) % len;
  return colors[normalized];
}

/**
 * SVG coordinate utilities
 */
export const SVGUtils = {
  /**
   * Convert polar coordinates to Cartesian
   */
  polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInRadians: number
  ) {
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  },

  /**
   * Generate SVG arc path for pie slices
   */
  describeArc(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = this.polarToCartesian(centerX, centerY, radius, endAngle);
    const end = this.polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return [
      'M',
      centerX,
      centerY,
      'L',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArc,
      0,
      end.x,
      end.y,
      'Z',
    ].join(' ');
  },

  /**
   * Generate SVG rectangle path
   */
  rect(x: number, y: number, width: number, height: number): string {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  },

  /**
   * Generate SVG line path
   */
  line(x1: number, y1: number, x2: number, y2: number): string {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  },

  /**
   * Generate SVG polyline path
   */
  polyline(points: Array<[number, number]>): string {
    return `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')}`;
  },

  /**
   * Generate smooth curve through points (Catmull-Rom)
   */
  smoothCurve(points: Array<[number, number]>): string {
    if (points.length < 2) return '';
    if (points.length === 2) return this.line(points[0][0], points[0][1], points[1][0], points[1][1]);

    let path = `M ${points[0][0]} ${points[0][1]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`;
    }

    return path;
  },
};

/**
 * Data transformation utilities
 */
export const DataUtils = {
  /**
   * Calculate total of numeric values
   */
  sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  },

  /**
   * Calculate percentage of value relative to total
   */
  percentage(value: number, total: number): number {
    return total === 0 ? 0 : (value / total) * 100;
  },

  /**
   * Format number with specified decimal places
   */
  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  },

  /**
   * Sort data by value descending
   */
  sortByValue<T extends { value: number }>(data: T[]): T[] {
    return [...data].sort((a, b) => b.value - a.value);
  },

  /**
   * Filter out zero or negative values
   */
  filterPositive<T extends { value: number }>(data: T[]): T[] {
    return data.filter(item => item.value > 0);
  },

  /**
   * Group data by category
   */
  groupBy<T>(data: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    data.forEach(item => {
      const key = keyFn(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    return groups;
  },

  /**
   * Calculate min and max values
   */
  extent(values: number[]): [number, number] {
    return [Math.min(...values), Math.max(...values)];
  },

  /**
   * Linear scale mapping
   */
  scale(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  },
};

/**
 * Tooltip positioning utilities
 */
export const TooltipUtils = {
  /**
   * Calculate optimal tooltip position to avoid viewport edges
   */
  calculatePosition(
    mouseX: number,
    mouseY: number,
    tooltipWidth: number,
    tooltipHeight: number,
    viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportHeight: number = typeof window !== 'undefined' ? window.innerHeight : 768
  ): { x: number; y: number } {
    let x = mouseX - tooltipWidth / 2;
    let y = mouseY - tooltipHeight - 10;

    // Adjust for left edge
    if (x < 10) {
      x = 10;
    }

    // Adjust for right edge
    if (x + tooltipWidth > viewportWidth - 10) {
      x = viewportWidth - tooltipWidth - 10;
    }

    // Adjust for top edge
    if (y < 10) {
      y = mouseY + 10;
    }

    // Adjust for bottom edge
    if (y + tooltipHeight > viewportHeight - 10) {
      y = viewportHeight - tooltipHeight - 10;
    }

    return { x, y };
  },

  /**
   * Format tooltip content
   */
  formatTooltip(label: string, value: number, unit: string = 'tCO2e', percentage?: number): string {
    let content = `${label}: ${value.toFixed(2)} ${unit}`;
    if (percentage !== undefined) {
      content += ` (${percentage.toFixed(1)}%)`;
    }
    return content;
  },
};

/**
 * Accessibility utilities
 */
export const A11yUtils = {
  /**
   * Generate ARIA label for chart
   */
  generateChartLabel(title: string, description: string): string {
    return `${title}. ${description}`;
  },

  /**
   * Generate ARIA label for data point
   */
  generateDataPointLabel(label: string, value: number, unit: string = 'tCO2e', percentage?: number): string {
    let text = `${label}: ${value.toFixed(2)} ${unit}`;
    if (percentage !== undefined) {
      text += `, ${percentage.toFixed(1)} percent`;
    }
    return text;
  },

  /**
   * Generate ARIA label for legend item
   */
  generateLegendItemLabel(label: string, value: number, unit: string = 'tCO2e'): string {
    return `${label}, ${value.toFixed(2)} ${unit}`;
  },
};

/**
 * Animation utilities
 */
export const AnimationUtils = {
  /**
   * Easing functions for animations
   */
  easing: {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
  },

  /**
   * Interpolate between two values
   */
  interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  },

  /**
   * Interpolate between two colors (hex)
   */
  interpolateColor(color1: string, color2: string, progress: number): string {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 255;
    const g1 = (c1 >> 8) & 255;
    const b1 = c1 & 255;

    const r2 = (c2 >> 16) & 255;
    const g2 = (c2 >> 8) & 255;
    const b2 = c2 & 255;

    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  },
};

/**
 * Responsive utilities
 */
export const ResponsiveUtils = {
  /**
   * Get responsive dimensions based on viewport
   */
  getResponsiveDimensions(containerWidth: number, containerHeight: number) {
    const isMobile = containerWidth < 480;
    const isTablet = containerWidth < 768;

    return {
      isMobile,
      isTablet,
      isDesktop: !isTablet,
      chartWidth: containerWidth,
      chartHeight: isMobile ? containerHeight * 0.6 : containerHeight,
      fontSize: isMobile ? 12 : 14,
      padding: isMobile ? 16 : 24,
    };
  },

  /**
   * Get responsive font size
   */
  getResponsiveFontSize(baseSize: number, containerWidth: number): number {
    if (containerWidth < 480) return baseSize * 0.8;
    if (containerWidth < 768) return baseSize * 0.9;
    return baseSize;
  },

  /**
   * Get responsive stroke width
   */
  getResponsiveStrokeWidth(baseWidth: number, containerWidth: number): number {
    if (containerWidth < 480) return baseWidth * 0.8;
    if (containerWidth < 768) return baseWidth * 0.9;
    return baseWidth;
  },
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate chart data
   */
  validateChartData<T extends { value: number }>(data: T[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Data array cannot be empty');
      return { valid: false, errors };
    }

    data.forEach((item, index) => {
      if (typeof item.value !== 'number') {
        errors.push(`Item ${index}: value must be a number`);
      }
      if (item.value < 0) {
        errors.push(`Item ${index}: value cannot be negative`);
      }
      if (!isFinite(item.value)) {
        errors.push(`Item ${index}: value must be finite`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate color hex code
   */
  isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  },

  /**
   * Validate dimensions
   */
  isValidDimension(value: number): boolean {
    return typeof value === 'number' && value > 0 && isFinite(value);
  },
};

export default {
  CHART_COLORS,
  getChartColor,
  SVGUtils,
  DataUtils,
  TooltipUtils,
  A11yUtils,
  AnimationUtils,
  ResponsiveUtils,
  ValidationUtils,
};
