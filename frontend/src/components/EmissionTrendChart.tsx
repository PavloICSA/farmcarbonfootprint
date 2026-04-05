import React, { useMemo, useState } from 'react';
import ChartBase from './ChartBase';
import ChartTooltip from './ChartTooltip';
import { DataUtils, TooltipUtils } from '../lib/chart-utils';
import './EmissionTrendChart.css';

export type EmissionTrendPoint = {
  id: string;
  date: Date;
  value: number;
};

export interface EmissionTrendChartProps {
  title: string;
  points: EmissionTrendPoint[];
  language?: 'en' | 'ua';
  unit?: string;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

function formatShortDate(d: Date, language: 'en' | 'ua') {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return language === 'en' ? `${yyyy}-${mm}-${dd}` : `${dd}.${mm}.${yyyy}`;
}

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * (ys[i] ?? 0), 0);
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export default function EmissionTrendChart({
  title,
  points,
  language = 'en',
  unit = 'tCO2e',
  className = '',
  svgRef,
}: EmissionTrendChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  const sorted = useMemo(() => {
    return [...points].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-20);
  }, [points]);

  const hoveredPoint = useMemo(() => {
    if (!hoveredId) return null;
    return sorted.find((p) => p.id === hoveredId) ?? null;
  }, [hoveredId, sorted]);

  const setAnchorFromPointer = (event: React.PointerEvent) => {
    const approx = TooltipUtils.calculatePosition(event.clientX, event.clientY, 260, 80);
    setTooltipAnchor({ x: approx.x, y: approx.y });
  };

  if (sorted.length < 2) {
    return (
      <div className={`emission-trend-chart emission-trend-chart--empty ${className}`}>
        {language === 'en' ? 'Add at least 2 calculations to see a trend.' : 'Додайте щонайменше 2 розрахунки, щоб побачити тренд.'}
      </div>
    );
  }

  const viewBoxWidth = 720;
  const viewBoxHeight = 440;
  const margin = { top: 64, right: 24, bottom: 64, left: 84 };
  const innerW = viewBoxWidth - margin.left - margin.right;
  const innerH = viewBoxHeight - margin.top - margin.bottom;

  const times = sorted.map((p) => p.date.getTime());
  const values = sorted.map((p) => p.value);
  const [minT, maxT] = DataUtils.extent(times);
  const [minV, maxV] = DataUtils.extent(values);
  const paddedMinV = Math.max(0, minV * 0.95);
  const paddedMaxV = maxV * 1.05;
  const yTicks = Array.from({ length: 5 }, (_, i) => paddedMinV + ((paddedMaxV - paddedMinV) * i) / 4);

  const xOf = (t: number) => {
    if (maxT === minT) return margin.left + innerW / 2;
    return margin.left + ((t - minT) / (maxT - minT)) * innerW;
  };
  const yOf = (v: number) => {
    if (paddedMaxV === paddedMinV) return margin.top + innerH / 2;
    return margin.top + (1 - (v - paddedMinV) / (paddedMaxV - paddedMinV)) * innerH;
  };

  const path = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.date.getTime())} ${yOf(p.value)}`)
    .join(' ');

  const xs = sorted.map((p) => p.date.getTime());
  const ys = sorted.map((p) => p.value);
  const { slope, intercept } = linearRegression(xs, ys);
  const trendY1 = slope * minT + intercept;
  const trendY2 = slope * maxT + intercept;

  const dateLabels = [
    formatShortDate(sorted[0].date, language),
    formatShortDate(sorted[Math.floor(sorted.length / 2)].date, language),
    formatShortDate(sorted[sorted.length - 1].date, language),
  ];

  return (
    <div className={`emission-trend-chart ${className}`}>
      <ChartBase
        title={title}
        description={language === 'en' ? 'Total emissions over time' : 'Загальні викиди з часом'}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        aspectRatio={16 / 9}
        className="emission-trend-chart__base"
        ref={svgRef}
      >
        {/* Axes */}
        <g className="et-axis">
          <path d={`M ${margin.left} ${margin.top} V ${margin.top + innerH} H ${margin.left + innerW}`} />
          <text className="et-axis-label" x={margin.left} y={margin.top - 26}>
            {unit}
          </text>
          {yTicks.map((tick, i) => {
            const y = yOf(tick);
            return (
              <g key={`y-tick-${i}`}>
                <line className="et-grid" x1={margin.left} y1={y} x2={margin.left + innerW} y2={y} />
                <text className="et-y-tick" x={margin.left - 10} y={y + 4} textAnchor="end">
                  {DataUtils.formatNumber(tick, 0)}
                </text>
              </g>
            );
          })}
          {/* X axis date labels */}
          <text className="et-date" x={margin.left} y={margin.top + innerH + 36} textAnchor="start">{dateLabels[0]}</text>
          <text className="et-date" x={margin.left + innerW / 2} y={margin.top + innerH + 36} textAnchor="middle">{dateLabels[1]}</text>
          <text className="et-date" x={margin.left + innerW} y={margin.top + innerH + 36} textAnchor="end">{dateLabels[2]}</text>
        </g>

        {/* Trend line */}
        <path
          className="et-trend"
          d={`M ${xOf(minT)} ${yOf(trendY1)} L ${xOf(maxT)} ${yOf(trendY2)}`}
        />

        {/* Main line */}
        <path className="et-line" d={path} />

        {/* Points */}
        {sorted.map((p) => {
          const x = xOf(p.date.getTime());
          const y = yOf(p.value);
          const isHovered = hoveredId === p.id;
          return (
            <circle
              key={p.id}
              cx={x}
              cy={y}
              r={isHovered ? 6 : 4.5}
              className={`et-point ${isHovered ? 'et-point--hovered' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${formatShortDate(p.date, language)}: ${p.value.toFixed(2)} ${unit}`}
              onPointerEnter={(e) => {
                setHoveredId(p.id);
                setAnchorFromPointer(e);
              }}
              onPointerMove={(e) => {
                if (hoveredId === p.id) setAnchorFromPointer(e);
              }}
              onPointerLeave={() => setHoveredId(null)}
              onPointerDown={(e) => {
                setHoveredId((prev) => (prev === p.id ? null : p.id));
                setAnchorFromPointer(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setHoveredId(null);
                if (e.key === 'Enter' || e.key === ' ') {
                  setHoveredId((prev) => (prev === p.id ? null : p.id));
                }
              }}
            />
          );
        })}
      </ChartBase>

      <ChartTooltip
        open={hoveredPoint !== null}
        anchorX={tooltipAnchor.x}
        anchorY={tooltipAnchor.y}
        onClose={() => setHoveredId(null)}
      >
        {hoveredPoint && (
          <>
            <div className="tooltip-label">{formatShortDate(hoveredPoint.date, language)}</div>
            <div className="tooltip-value">{hoveredPoint.value.toFixed(2)} {unit}</div>
          </>
        )}
      </ChartTooltip>
    </div>
  );
}
