import React, { useMemo, useState } from 'react';
import ChartBase from './ChartBase';
import ChartLegend from './ChartLegend';
import ChartTooltip from './ChartTooltip';
import { TooltipUtils } from '../lib/chart-utils';
import './EmissionPieChart.css';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface EmissionPieChartProps {
  data: PieChartData[];
  language?: 'en' | 'ua';
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

// SVG pie chart implementation - avoids Recharts testing issues
export function EmissionPieChart({
  data,
  language = 'en',
  className = '',
  svgRef
}: EmissionPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className={`emission-pie-chart ${className}`}>
        <div className="pie-chart-empty">
          {language === 'en' ? 'No data to display' : 'Немає даних для відображення'}
        </div>
      </div>
    );
  }

  // Generate pie slices
  const slices = generatePieSlices(data, total);

  const legendItems = useMemo(() => {
    return data.map((item, index) => {
      const percent = total === 0 ? 0 : (item.value / total) * 100;
      return {
        id: String(index),
        label: item.label,
        color: item.color,
        value: item.value,
        unit: 'tCO2e',
        valueText: `${item.value.toFixed(2)} tCO2e (${percent.toFixed(1)}%)`,
      };
    });
  }, [data, total]);

  const setAnchorFromPointer = (event: React.PointerEvent) => {
    const approx = TooltipUtils.calculatePosition(event.clientX, event.clientY, 220, 80);
    setTooltipAnchor({ x: approx.x, y: approx.y });
  };

  const setAnchorFromRect = (rect: DOMRect) => {
    const approx = TooltipUtils.calculatePosition(rect.left + rect.width / 2, rect.top, 220, 80);
    setTooltipAnchor({ x: approx.x, y: approx.y });
  };

  return (
    <div className={`emission-pie-chart ${className}`}>
      <ChartBase
        title={language === 'en' ? 'Emission breakdown pie chart' : 'Діаграма розподілу викидів'}
        description={language === 'en' ? 'Emissions by category' : 'Викиди за категоріями'}
        viewBox="0 0 200 200"
        aspectRatio={1}
        className="pie-chart-container"
        ref={svgRef}
      >
      {data.map((item, index) => {
        const slice = slices[index];
        if (!slice) return null;
        return (
          <g key={`slice-${index}`}>
            <path
              d={slice.path}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
              className={`pie-slice ${hoveredIndex === index ? 'hovered' : ''}`}
              onPointerEnter={(e) => {
                setHoveredIndex(index);
                setAnchorFromPointer(e);
              }}
              onPointerMove={(e) => {
                if (hoveredIndex === index) setAnchorFromPointer(e);
              }}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={(e) => {
                // Touch support: tap toggles tooltip visibility.
                setHoveredIndex(hoveredIndex === index ? null : index);
                setAnchorFromPointer(e);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${item.label}: ${item.value.toFixed(2)} tCO2e (${((item.value / total) * 100).toFixed(1)}%)`}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setHoveredIndex(null);
                if (e.key === 'Enter' || e.key === ' ') {
                  setHoveredIndex(hoveredIndex === index ? null : index);
                  const rect = (e.currentTarget as SVGPathElement).getBoundingClientRect();
                  setAnchorFromRect(rect);
                }
              }}
            />
          </g>
        );
      })}
      </ChartBase>

      <ChartTooltip
        open={hoveredIndex !== null}
        anchorX={tooltipAnchor.x}
        anchorY={tooltipAnchor.y}
        onClose={() => setHoveredIndex(null)}
      >
        {hoveredIndex !== null && (
          <>
            <div className="tooltip-label">{data[hoveredIndex].label}</div>
            <div className="tooltip-value">{data[hoveredIndex].value.toFixed(2)} tCO2e</div>
            <div className="tooltip-percent">
              {((data[hoveredIndex].value / total) * 100).toFixed(1)}%
            </div>
          </>
        )}
      </ChartTooltip>

      {/* Legend */}
      <ChartLegend
        items={legendItems}
        hoveredId={hoveredIndex === null ? null : String(hoveredIndex)}
        onHover={(id) => {
          if (id === null) {
            setHoveredIndex(null);
            return;
          }
          const index = Number(id);
          if (!Number.isFinite(index)) return;
          setHoveredIndex(index);
        }}
        onToggle={(id) => {
          const index = Number(id);
          if (!Number.isFinite(index)) return;
          setHoveredIndex(hoveredIndex === index ? null : index);
        }}
        ariaLabel={language === 'en' ? 'Chart legend' : 'Легенда діаграми'}
      />

      {/* Total summary */}
      <div className="pie-summary">
        <div className="summary-label">
          {language === 'en' ? 'Total Emissions' : 'Загальні викиди'}
        </div>
        <div className="summary-value">{total.toFixed(2)} tCO2e</div>
      </div>
    </div>
  );
}

interface PieSlice {
  path: string;
  startAngle: number;
  endAngle: number;
}

function generatePieSlices(data: PieChartData[], total: number): Array<PieSlice | null> {
  const slices: Array<PieSlice | null> = [];
  let currentAngle = -Math.PI / 2; // Start at top

  data.forEach((item) => {
    if (item.value <= 0 || total <= 0) {
      slices.push(null);
      return;
    }
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;
    const path = describeArc(100, 100, 80, currentAngle, endAngle);
    slices.push({
      path,
      startAngle: currentAngle,
      endAngle
    });
    currentAngle = endAngle;
  });

  return slices;
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 1e-6) {
    return describeFullCircle(centerX, centerY, radius);
  }
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;

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
    'Z'
  ].join(' ');
}

function describeFullCircle(centerX: number, centerY: number, radius: number): string {
  return [
    'M',
    centerX,
    centerY - radius,
    'A',
    radius,
    radius,
    0,
    1,
    1,
    centerX,
    centerY + radius,
    'A',
    radius,
    radius,
    0,
    1,
    1,
    centerX,
    centerY - radius,
    'Z'
  ].join(' ');
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInRadians: number
) {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

export default EmissionPieChart;
