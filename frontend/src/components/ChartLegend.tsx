import React from 'react';
import { A11yUtils } from '../lib/chart-utils';
import './ChartLegend.css';

export type ChartLegendItem = {
  id: string;
  label: string;
  color: string;
  value?: number;
  valueText?: string;
  unit?: string;
};

export interface ChartLegendProps {
  items: ChartLegendItem[];
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  onToggle?: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

export default function ChartLegend({
  items,
  hoveredId = null,
  onHover,
  onToggle,
  ariaLabel,
  className = '',
}: ChartLegendProps) {
  return (
    <div className={`chart-legend ${className}`} role="region" aria-label={ariaLabel}>
      {items.map((item) => {
        const isHighlighted = hoveredId === item.id;
        const aria = item.value !== undefined
          ? A11yUtils.generateLegendItemLabel(item.label, item.value, item.unit)
          : item.label;
        return (
          <button
            key={item.id}
            type="button"
            className={`chart-legend__item ${isHighlighted ? 'chart-legend__item--highlighted' : ''}`}
            onMouseEnter={() => onHover?.(item.id)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(item.id)}
            onBlur={() => onHover?.(null)}
            onClick={() => onToggle?.(item.id)}
            aria-label={aria}
          >
            <span className="chart-legend__swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span className="chart-legend__label">{item.label}</span>
            {(item.valueText || item.value !== undefined) && (
              <span className="chart-legend__value">
                {item.valueText ?? `${item.value?.toFixed(2)} ${item.unit ?? 'tCO2e'}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
