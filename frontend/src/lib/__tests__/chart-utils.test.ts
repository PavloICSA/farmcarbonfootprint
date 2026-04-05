import {
  CHART_COLORS,
  getChartColor,
  SVGUtils,
  DataUtils,
  TooltipUtils,
  A11yUtils,
  AnimationUtils,
  ResponsiveUtils,
  ValidationUtils,
} from '../chart-utils';

describe('Chart Utilities', () => {
  describe('CHART_COLORS', () => {
    it('should have all required colors', () => {
      expect(CHART_COLORS.fertilizer).toBe('var(--chart-fertilizer)');
      expect(CHART_COLORS.manure).toBe('var(--chart-manure)');
      expect(CHART_COLORS.fuel).toBe('var(--chart-fuel)');
      expect(CHART_COLORS.irrigation).toBe('var(--chart-irrigation)');
      expect(CHART_COLORS.pesticide).toBe('var(--chart-pesticide)');
      expect(CHART_COLORS.livestock).toBe('var(--chart-livestock)');
      expect(CHART_COLORS.poultry).toBe('var(--chart-poultry)');
    });

    it('should have CSS variable-based colors', () => {
      Object.values(CHART_COLORS).forEach(color => {
        expect(color.startsWith('var(--chart-')).toBe(true);
      });
    });
  });

  describe('getChartColor', () => {
    it('should return color by index', () => {
      expect(getChartColor(0)).toBe(CHART_COLORS.fertilizer);
      expect(getChartColor(1)).toBe(CHART_COLORS.manure);
    });

    it('should cycle through colors for large indices', () => {
      const colors = Object.values(CHART_COLORS);
      expect(getChartColor(colors.length)).toBe(colors[0]);
      expect(getChartColor(colors.length + 1)).toBe(colors[1]);
    });
  });

  describe('SVGUtils', () => {
    describe('polarToCartesian', () => {
      it('should convert polar to cartesian coordinates', () => {
        const result = SVGUtils.polarToCartesian(100, 100, 50, 0);
        expect(result.x).toBeCloseTo(150, 1);
        expect(result.y).toBeCloseTo(100, 1);
      });

      it('should handle 90 degree angle', () => {
        const result = SVGUtils.polarToCartesian(100, 100, 50, Math.PI / 2);
        expect(result.x).toBeCloseTo(100, 1);
        expect(result.y).toBeCloseTo(150, 1);
      });
    });

    describe('describeArc', () => {
      it('should generate valid SVG arc path', () => {
        const path = SVGUtils.describeArc(100, 100, 80, 0, Math.PI / 2);
        expect(path).toContain('M');
        expect(path).toContain('L');
        expect(path).toContain('A');
        expect(path).toContain('Z');
      });

      it('should handle large arcs', () => {
        const path = SVGUtils.describeArc(100, 100, 80, 0, Math.PI * 1.5);
        expect(path).toContain('1'); // Large arc flag
      });
    });

    describe('line', () => {
      it('should generate SVG line path', () => {
        const path = SVGUtils.line(0, 0, 100, 100);
        expect(path).toBe('M 0 0 L 100 100');
      });
    });

    describe('polyline', () => {
      it('should generate SVG polyline path', () => {
        const points: [number, number][] = [[0, 0], [50, 50], [100, 0]];
        const path = SVGUtils.polyline(points);
        expect(path).toContain('M 0 0');
        expect(path).toContain('L 50 50');
        expect(path).toContain('L 100 0');
      });
    });

    describe('smoothCurve', () => {
      it('should generate smooth curve through points', () => {
        const points: [number, number][] = [[0, 0], [50, 50], [100, 0]];
        const path = SVGUtils.smoothCurve(points);
        expect(path).toContain('M');
        expect(path).toContain('C');
      });

      it('should handle two points', () => {
        const points: [number, number][] = [[0, 0], [100, 100]];
        const path = SVGUtils.smoothCurve(points);
        expect(path).toBe('M 0 0 L 100 100');
      });
    });
  });

  describe('DataUtils', () => {
    describe('sum', () => {
      it('should calculate sum of values', () => {
        expect(DataUtils.sum([1, 2, 3, 4, 5])).toBe(15);
      });

      it('should handle empty array', () => {
        expect(DataUtils.sum([])).toBe(0);
      });
    });

    describe('percentage', () => {
      it('should calculate percentage', () => {
        expect(DataUtils.percentage(25, 100)).toBe(25);
        expect(DataUtils.percentage(50, 200)).toBe(25);
      });

      it('should handle zero total', () => {
        expect(DataUtils.percentage(50, 0)).toBe(0);
      });
    });

    describe('formatNumber', () => {
      it('should format number with decimals', () => {
        expect(DataUtils.formatNumber(123.456, 2)).toBe('123.46');
        expect(DataUtils.formatNumber(123.456, 1)).toBe('123.5');
      });
    });

    describe('sortByValue', () => {
      it('should sort data by value descending', () => {
        const data = [
          { label: 'A', value: 10 },
          { label: 'B', value: 30 },
          { label: 'C', value: 20 },
        ];
        const sorted = DataUtils.sortByValue(data);
        expect(sorted[0].value).toBe(30);
        expect(sorted[1].value).toBe(20);
        expect(sorted[2].value).toBe(10);
      });
    });

    describe('filterPositive', () => {
      it('should filter out zero and negative values', () => {
        const data = [
          { label: 'A', value: 10 },
          { label: 'B', value: 0 },
          { label: 'C', value: -5 },
          { label: 'D', value: 20 },
        ];
        const filtered = DataUtils.filterPositive(data);
        expect(filtered).toHaveLength(2);
        expect(filtered[0].value).toBe(10);
        expect(filtered[1].value).toBe(20);
      });
    });

    describe('extent', () => {
      it('should calculate min and max', () => {
        const [min, max] = DataUtils.extent([5, 2, 8, 1, 9]);
        expect(min).toBe(1);
        expect(max).toBe(9);
      });
    });

    describe('scale', () => {
      it('should map value from one range to another', () => {
        expect(DataUtils.scale(50, 0, 100, 0, 1)).toBe(0.5);
        expect(DataUtils.scale(0, 0, 100, 0, 1)).toBe(0);
        expect(DataUtils.scale(100, 0, 100, 0, 1)).toBe(1);
      });
    });
  });

  describe('TooltipUtils', () => {
    describe('formatTooltip', () => {
      it('should format tooltip content', () => {
        const content = TooltipUtils.formatTooltip('Fertilizer', 45.2);
        expect(content).toContain('Fertilizer');
        expect(content).toContain('45.20');
        expect(content).toContain('tCO2e');
      });

      it('should include percentage when provided', () => {
        const content = TooltipUtils.formatTooltip('Fertilizer', 45.2, 'tCO2e', 25.5);
        expect(content).toContain('25.5%');
      });
    });
  });

  describe('A11yUtils', () => {
    describe('generateChartLabel', () => {
      it('should generate accessible chart label', () => {
        const label = A11yUtils.generateChartLabel('Emissions', 'Breakdown by category');
        expect(label).toContain('Emissions');
        expect(label).toContain('Breakdown by category');
      });
    });

    describe('generateDataPointLabel', () => {
      it('should generate accessible data point label', () => {
        const label = A11yUtils.generateDataPointLabel('Fertilizer', 45.2);
        expect(label).toContain('Fertilizer');
        expect(label).toContain('45.20');
      });

      it('should include percentage in spoken form', () => {
        const label = A11yUtils.generateDataPointLabel('Fertilizer', 45.2, 'tCO2e', 25.5);
        expect(label).toContain('25.5 percent');
      });
    });
  });

  describe('AnimationUtils', () => {
    describe('easing functions', () => {
      it('should have linear easing', () => {
        expect(AnimationUtils.easing.linear(0.5)).toBe(0.5);
      });

      it('should have easeInQuad', () => {
        expect(AnimationUtils.easing.easeInQuad(0.5)).toBe(0.25);
      });

      it('should have easeOutQuad', () => {
        expect(AnimationUtils.easing.easeOutQuad(0.5)).toBe(0.75);
      });
    });

    describe('interpolate', () => {
      it('should interpolate between values', () => {
        expect(AnimationUtils.interpolate(0, 100, 0.5)).toBe(50);
        expect(AnimationUtils.interpolate(0, 100, 0)).toBe(0);
        expect(AnimationUtils.interpolate(0, 100, 1)).toBe(100);
      });
    });

    describe('interpolateColor', () => {
      it('should interpolate between colors', () => {
        const color = AnimationUtils.interpolateColor('#000000', '#FFFFFF', 0.5);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('ResponsiveUtils', () => {
    describe('getResponsiveDimensions', () => {
      it('should identify mobile viewport', () => {
        const dims = ResponsiveUtils.getResponsiveDimensions(400, 300);
        expect(dims.isMobile).toBe(true);
        expect(dims.isTablet).toBe(true);
        expect(dims.isDesktop).toBe(false);
      });

      it('should identify tablet viewport', () => {
        const dims = ResponsiveUtils.getResponsiveDimensions(600, 400);
        expect(dims.isMobile).toBe(false);
        expect(dims.isTablet).toBe(true);
        expect(dims.isDesktop).toBe(false);
      });

      it('should identify desktop viewport', () => {
        const dims = ResponsiveUtils.getResponsiveDimensions(1200, 800);
        expect(dims.isMobile).toBe(false);
        expect(dims.isTablet).toBe(false);
        expect(dims.isDesktop).toBe(true);
      });
    });

    describe('getResponsiveFontSize', () => {
      it('should scale font size for mobile', () => {
        expect(ResponsiveUtils.getResponsiveFontSize(14, 400)).toBeCloseTo(11.2, 1);
      });

      it('should scale font size for tablet', () => {
        expect(ResponsiveUtils.getResponsiveFontSize(14, 600)).toBeCloseTo(12.6, 1);
      });

      it('should not scale font size for desktop', () => {
        expect(ResponsiveUtils.getResponsiveFontSize(14, 1200)).toBe(14);
      });
    });
  });

  describe('ValidationUtils', () => {
    describe('validateChartData', () => {
      it('should validate correct data', () => {
        const data = [
          { label: 'A', value: 10 },
          { label: 'B', value: 20 },
        ];
        const result = ValidationUtils.validateChartData(data);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-array data', () => {
        const result = ValidationUtils.validateChartData(null as any);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('array');
      });

      it('should reject empty array', () => {
        const result = ValidationUtils.validateChartData([]);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('empty');
      });

      it('should reject negative values', () => {
        const data = [{ label: 'A', value: -10 }];
        const result = ValidationUtils.validateChartData(data);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('negative');
      });
    });

    describe('isValidHexColor', () => {
      it('should validate hex colors', () => {
        expect(ValidationUtils.isValidHexColor('#FF6B6B')).toBe(true);
        expect(ValidationUtils.isValidHexColor('#000000')).toBe(true);
        expect(ValidationUtils.isValidHexColor('#FFFFFF')).toBe(true);
      });

      it('should reject invalid hex colors', () => {
        expect(ValidationUtils.isValidHexColor('FF6B6B')).toBe(false);
        expect(ValidationUtils.isValidHexColor('#FF6B6')).toBe(false);
        expect(ValidationUtils.isValidHexColor('#GGGGGG')).toBe(false);
      });
    });

    describe('isValidDimension', () => {
      it('should validate positive dimensions', () => {
        expect(ValidationUtils.isValidDimension(100)).toBe(true);
        expect(ValidationUtils.isValidDimension(0.5)).toBe(true);
      });

      it('should reject invalid dimensions', () => {
        expect(ValidationUtils.isValidDimension(0)).toBe(false);
        expect(ValidationUtils.isValidDimension(-100)).toBe(false);
        expect(ValidationUtils.isValidDimension(Infinity)).toBe(false);
        expect(ValidationUtils.isValidDimension(NaN)).toBe(false);
      });
    });
  });
});
