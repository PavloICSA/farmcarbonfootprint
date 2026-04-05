import React, { useMemo, useState } from 'react';
import ChartBase from './ChartBase';
import ChartLegend, { type ChartLegendItem } from './ChartLegend';
import ChartTooltip from './ChartTooltip';
import { DataUtils, TooltipUtils } from '../lib/chart-utils';
import './CropComparisonChart.css';

export type CropComparisonSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type CropComparisonItem = {
  id: string;
  label: string;
  total: number;
  segments: CropComparisonSegment[];
};

export interface CropComparisonChartProps {
  title: string;
  data: CropComparisonItem[];
  language?: 'en' | 'ua';
  unit?: string;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

export default function CropComparisonChart({
  title,
  data,
  language = 'en',
  unit = 'tCO2e',
  className = '',
  svgRef,
}: CropComparisonChartProps) {
  const [hovered, setHovered] = useState<null | { cropId: string; key: string }>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.total - a.total);
  }, [data]);

  const maxTotal = useMemo(() => {
    return sorted.length > 0 ? Math.max(...sorted.map((d) => d.total)) : 0;
  }, [sorted]);

  const legendItems = useMemo<ChartLegendItem[]>(() => {
    if (sorted.length === 0) return [];
    const byKey = new Map<string, ChartLegendItem>();
    sorted[0].segments.forEach((seg) => {
      byKey.set(seg.key, {
        id: seg.key,
        label: seg.label,
        color: seg.color,
      });
    });
    return Array.from(byKey.values());
  }, [sorted]);

  const hoveredLabel = useMemo(() => {
    if (!hovered) return null;
    const crop = sorted.find((c) => c.id === hovered.cropId);
    const seg = crop?.segments.find((s) => s.key === hovered.key);
    if (!crop || !seg) return null;
    return { crop: crop.label, category: seg.label, value: seg.value };
  }, [hovered, sorted]);

  const setAnchorFromPointer = (event: React.PointerEvent) => {
    const approx = TooltipUtils.calculatePosition(event.clientX, event.clientY, 260, 80);
    setTooltipAnchor({ x: approx.x, y: approx.y });
  };

  if (sorted.length === 0) {
    return (
      <div className={`crop-comparison-chart crop-comparison-chart--empty ${className}`}>
        {language === 'en' ? 'No crop data to display' : 'Немає даних по культурах'}
      </div>
    );
  }

  const viewBoxWidth = 720;
  const viewBoxHeight = 450;
  const margin = { top: 36, right: 20, bottom: 70, left: 190 };
  const innerW = viewBoxWidth - margin.left - margin.right;
  const innerH = viewBoxHeight - margin.top - margin.bottom;

  const barGap = 10;
  const barH = Math.max(16, (innerH - barGap * (sorted.length - 1)) / sorted.length);
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (maxTotal * i) / tickCount);

  return (
    <div className={`crop-comparison-chart ${className}`}>
      <ChartBase
        title={title}
        description={language === 'en' ? 'Stacked emissions by crop' : 'Складені викиди за культурами'}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        aspectRatio={16 / 9}
        className="crop-comparison-chart__base"
        ref={svgRef}
      >
        {/* Axes */}
        <g className="cc-axis">
          <path d={`M ${margin.left} ${margin.top} V ${margin.top + innerH} H ${margin.left + innerW}`} />
          {ticks.map((t, i) => {
            const x = margin.left + (maxTotal === 0 ? 0 : (t / maxTotal) * innerW);
            return (
              <g key={`tick-${i}`}>
                <path className="cc-grid" d={`M ${x} ${margin.top} V ${margin.top + innerH}`} />
                <text className="cc-tick" x={x} y={margin.top + innerH + 28} textAnchor="middle">
                  {DataUtils.formatNumber(t, 0)}
                </text>
              </g>
            );
          })}
          <text className="cc-axis-label" x={margin.left + innerW / 2} y={viewBoxHeight - 16} textAnchor="middle">
            {unit}
          </text>
        </g>

        {/* Bars */}
        <g>
          {sorted.map((crop, index) => {
            const y = margin.top + index * (barH + barGap);
            let offset = 0;
            return (
              <g key={crop.id}>
                <text className="cc-crop-label" x={margin.left - 10} y={y + barH / 2 + 4} textAnchor="end">
                  {crop.label}
                </text>
                {crop.segments.map((seg) => {
                  if (seg.value <= 0) return null;
                  const w = maxTotal === 0 ? 0 : (seg.value / maxTotal) * innerW;
                  const x = margin.left + offset;
                  offset += w;
                  const isHovered = hovered?.cropId === crop.id && hovered.key === seg.key;
                  return (
                    <rect
                      key={`${crop.id}-${seg.key}`}
                      x={x}
                      y={y}
                      width={w}
                      height={barH}
                      fill={seg.color}
                      className={`cc-seg ${isHovered ? 'cc-seg--hovered' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${crop.label}: ${seg.label} ${seg.value.toFixed(2)} ${unit}`}
                      onPointerEnter={(e) => {
                        setHovered({ cropId: crop.id, key: seg.key });
                        setAnchorFromPointer(e);
                      }}
                      onPointerMove={(e) => {
                        if (hovered?.cropId === crop.id && hovered.key === seg.key) setAnchorFromPointer(e);
                      }}
                      onPointerLeave={() => setHovered(null)}
                      onPointerDown={(e) => {
                        setHovered((prev) =>
                          prev?.cropId === crop.id && prev.key === seg.key ? null : { cropId: crop.id, key: seg.key }
                        );
                        setAnchorFromPointer(e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setHovered(null);
                        if (e.key === 'Enter' || e.key === ' ') {
                          setHovered((prev) =>
                            prev?.cropId === crop.id && prev.key === seg.key ? null : { cropId: crop.id, key: seg.key }
                          );
                        }
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </ChartBase>

      <ChartTooltip
        open={hoveredLabel !== null}
        anchorX={tooltipAnchor.x}
        anchorY={tooltipAnchor.y}
        onClose={() => setHovered(null)}
      >
        {hoveredLabel && (
          <>
            <div className="tooltip-label">{hoveredLabel.crop}</div>
            <div className="tooltip-value">
              {hoveredLabel.category}: {hoveredLabel.value.toFixed(2)} {unit}
            </div>
          </>
        )}
      </ChartTooltip>

      <ChartLegend
        items={legendItems}
        hoveredId={hovered?.key ?? null}
        onHover={(id) => {
          if (id === null) {
            setHovered(null);
            return;
          }
          // Highlight by category only; keep the previously hovered crop if any.
          setHovered((prev) => (prev ? { cropId: prev.cropId, key: id } : null));
        }}
        ariaLabel={language === 'en' ? 'Chart legend' : 'Легенда діаграми'}
      />
    </div>
  );
}
