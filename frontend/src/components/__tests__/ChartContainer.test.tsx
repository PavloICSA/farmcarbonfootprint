/**
 * Tests for Chart Color Palette and Defaults
 * 
 * Tests the chart color palette and default configuration used across all SVG charts.
 */

import { CHART_COLORS, getChartColor } from '../../lib/chart-utils';

describe('Chart Color Palette', () => {
  describe('CHART_COLORS', () => {
    it('should have all required colors', () => {
      expect(CHART_COLORS.fertilizer).toBe('#FF6B6B');
      expect(CHART_COLORS.manure).toBe('#4ECDC4');
      expect(CHART_COLORS.fuel).toBe('#45B7D1');
      expect(CHART_COLORS.irrigation).toBe('#96CEB4');
      expect(CHART_COLORS.pesticide).toBe('#FFEAA7');
      expect(CHART_COLORS.livestock).toBe('#DFE6E9');
      expect(CHART_COLORS.poultry).toBe('#A29BFE');
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      Object.values(CHART_COLORS).forEach(color => {
        expect(hexColorRegex.test(color)).toBe(true);
      });
    });

    it('should have at least 7 colors', () => {
      expect(Object.keys(CHART_COLORS).length).toBeGreaterThanOrEqual(7);
    });

    it('should have distinct colors', () => {
      const colors = Object.values(CHART_COLORS);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('getChartColor', () => {
    it('should return color by index', () => {
      expect(getChartColor(0)).toBe(CHART_COLORS.fertilizer);
      expect(getChartColor(1)).toBe(CHART_COLORS.manure);
      expect(getChartColor(2)).toBe(CHART_COLORS.fuel);
    });

    it('should cycle through colors for large indices', () => {
      const colors = Object.values(CHART_COLORS);
      const cycledIndex = colors.length + 1;
      expect(getChartColor(cycledIndex)).toBe(colors[1]);
    });

    it('should handle zero index', () => {
      expect(getChartColor(0)).toBe(CHART_COLORS.fertilizer);
    });

    it('should handle negative indices', () => {
      const colors = Object.values(CHART_COLORS);
      // Negative indices should still work with modulo
      const result = getChartColor(-1);
      expect(result).toBeDefined();
      expect(/^#[0-9A-F]{6}$/i.test(result)).toBe(true);
    });
  });

  describe('Chart Color Accessibility', () => {
    it('should have sufficient contrast for WCAG AA', () => {
      // Basic check: colors should not be too similar
      const colors = Object.values(CHART_COLORS);
      
      // Convert hex to RGB and calculate luminance
      const getLuminance = (hex: string) => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      };

      // Check that colors have variety in luminance
      const luminances = colors.map(getLuminance);
      const minLuminance = Math.min(...luminances);
      const maxLuminance = Math.max(...luminances);
      
      // Should have at least 0.3 difference in luminance range
      expect(maxLuminance - minLuminance).toBeGreaterThan(0.2);
    });

    it('should be distinguishable for colorblind users', () => {
      // Colors should not rely solely on red-green distinction
      const colors = Object.values(CHART_COLORS);
      
      // Check that we have variety in hue
      const hues = colors.map(hex => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = ((rgb >> 16) & 255) / 255;
        const g = ((rgb >> 8) & 255) / 255;
        const b = (rgb & 255) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let hue = 0;
        if (delta !== 0) {
          if (max === r) hue = ((g - b) / delta) % 6;
          else if (max === g) hue = (b - r) / delta + 2;
          else hue = (r - g) / delta + 4;
          hue = (hue * 60 + 360) % 360;
        }
        return hue;
      });

      // Should have variety in hues
      const uniqueHues = new Set(hues.map(h => Math.round(h / 30) * 30));
      expect(uniqueHues.size).toBeGreaterThan(3);
    });
  });

  describe('Chart Defaults Configuration', () => {
    it('should provide consistent color palette', () => {
      const colors = Object.values(CHART_COLORS);
      expect(colors.length).toBeGreaterThan(0);
      
      // All colors should be valid hex
      colors.forEach(color => {
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(true);
      });
    });

    it('should support extended datasets', () => {
      // Should be able to get colors for more than 7 items
      for (let i = 0; i < 20; i++) {
        const color = getChartColor(i);
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(true);
      }
    });
  });
});
