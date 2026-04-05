import React, { useMemo, useState } from 'react';
import ChartBase from './ChartBase';
import ChartTooltip from './ChartTooltip';
import { TooltipUtils } from '../lib/chart-utils';
import type { CropPractice } from '../types/storage';
import { buildPracticeHeatMapRows, type PracticeHeatMapRow } from '../lib/chart-data';
import './PracticeHeatMap.css';

type Lang = 'en' | 'ua';

function formatImpact(multiplier: number) {
  const pct = (multiplier - 1) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

function level(multiplier: number): 'low' | 'medium' | 'high' {
  if (multiplier <= 0.9) return 'low';
  if (multiplier <= 1.05) return 'medium';
  return 'high';
}

function tText(lang: Lang, en: string, ua: string) {
  return lang === 'en' ? en : ua;
}

function splitLabel(label: string, maxChars: number) {
  if (label.length <= maxChars) return [label];
  const parts = label.split(' ');
  if (parts.length === 1) return [label];
  const lines: string[] = [];
  let line = '';
  parts.forEach((part) => {
    const next = line ? `${line} ${part}` : part;
    if (next.length <= maxChars) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    line = part;
  });
  if (line) lines.push(line);
  if (lines.length <= 2) return lines;
  const trimmed = lines.slice(0, 2);
  trimmed[1] = `${trimmed[1].slice(0, Math.max(3, maxChars - 1))}…`;
  return trimmed;
}

export interface PracticeHeatMapProps {
  title: string;
  practices: CropPractice[];
  language?: Lang;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

export default function PracticeHeatMap({
  title,
  practices,
  language = 'en',
  className = '',
  svgRef,
}: PracticeHeatMapProps) {
  const [hovered, setHovered] = useState<null | { rowId: string; optionId: string }>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  const rows = useMemo<PracticeHeatMapRow[]>(() => buildPracticeHeatMapRows(practices, language), [practices, language]);

  const hoveredOption = useMemo(() => {
    if (!hovered) return null;
    const row = rows.find((r) => r.id === hovered.rowId);
    const opt = row?.options.find((o) => o.id === hovered.optionId);
    if (!row || !opt) return null;
    return { row: row.label, option: opt.label, multiplier: opt.multiplier };
  }, [hovered, rows]);

  const setAnchorFromPointer = (event: React.PointerEvent) => {
    const approx = TooltipUtils.calculatePosition(event.clientX, event.clientY, 260, 90);
    setTooltipAnchor({ x: approx.x, y: approx.y });
  };

  const viewBoxWidth = 1000;
  const rowHeight = 56;
  const labelW = 220;
  const cellH = 36;
  const gap = 10;
  const headerH = 72;
  const viewBoxHeight = headerH + rows.length * rowHeight + 10;

  return (
    <div className={`practice-heatmap ${className}`}>
      <ChartBase
        title={title}
        description={tText(language, 'Practice options impact heat map', 'Теплова карта впливу практик')}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        aspectRatio={16 / 9}
        className="practice-heatmap__base"
        ref={svgRef}
      >
        <g className="ph-header">
          <rect x={6} y={2} width={viewBoxWidth - 12} height={headerH - 12} rx={10} className="ph-legend-bg" />
          <text x={10} y={26} className="ph-desc">
            {tText(language, 'Colors show emissions impact vs baseline (green = lower, red = higher).', 'Кольори показують вплив на викиди щодо бази (зелений = менше, червоний = більше).')}
          </text>
          <g className="ph-legend" transform={`translate(${viewBoxWidth - 360} 6)`}>
            <g>
              <rect x={0} y={0} width={14} height={14} rx={3} className="ph-legend-swatch ph-cell--low" />
              <text x={20} y={11} className="ph-legend-text">{tText(language, 'Lower', 'Менше')}</text>
            </g>
            <g transform="translate(120 0)">
              <rect x={0} y={0} width={14} height={14} rx={3} className="ph-legend-swatch ph-cell--medium" />
              <text x={20} y={11} className="ph-legend-text">{tText(language, 'Neutral', 'Нейтр.')}</text>
            </g>
            <g transform="translate(240 0)">
              <rect x={0} y={0} width={14} height={14} rx={3} className="ph-legend-swatch ph-cell--high" />
              <text x={20} y={11} className="ph-legend-text">{tText(language, 'Higher', 'Більше')}</text>
            </g>
          </g>
        </g>
        {rows.map((row, rowIndex) => {
          const y = headerH + rowIndex * rowHeight;
          const cellW = Math.floor((viewBoxWidth - labelW - 30) / row.options.length);
          return (
            <g key={row.id} className="ph-row">
              <text x={10} y={y + cellH / 2 + 5} className="ph-label">
                {row.label}
              </text>
              {row.options.map((opt, i) => {
                const x = labelW + 10 + i * cellW;
                const isSelected = row.selectedIds.has(opt.id);
                const isHovered = hovered?.rowId === row.id && hovered.optionId === opt.id;
                const lvl = level(opt.multiplier);
                const maxChars = cellW < 110 ? 10 : 14;
                const lines = splitLabel(opt.label, maxChars);
                const lineHeight = lines.length > 1 ? 12 : 14;
                const startY = y + (lines.length > 1 ? 14 : 23);
                return (
                  <g key={`${row.id}-${opt.id}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellW - gap}
                      height={cellH}
                      rx={6}
                      className={[
                        'ph-cell',
                        `ph-cell--${lvl}`,
                        isSelected ? 'ph-cell--selected' : '',
                        isHovered ? 'ph-cell--hovered' : '',
                      ].join(' ')}
                      role="button"
                      tabIndex={0}
                      aria-label={`${row.label}: ${opt.label} (${formatImpact(opt.multiplier)})`}
                      onPointerEnter={(e) => {
                        setHovered({ rowId: row.id, optionId: opt.id });
                        setAnchorFromPointer(e);
                      }}
                      onPointerMove={(e) => {
                        if (hovered?.rowId === row.id && hovered.optionId === opt.id) setAnchorFromPointer(e);
                      }}
                      onPointerLeave={() => setHovered(null)}
                      onPointerDown={(e) => {
                        setHovered((prev) =>
                          prev?.rowId === row.id && prev.optionId === opt.id ? null : { rowId: row.id, optionId: opt.id }
                        );
                        setAnchorFromPointer(e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setHovered(null);
                        if (e.key === 'Enter' || e.key === ' ') {
                          setHovered((prev) =>
                            prev?.rowId === row.id && prev.optionId === opt.id ? null : { rowId: row.id, optionId: opt.id }
                          );
                        }
                      }}
                    />
                    <text
                      x={x + (cellW - gap) / 2}
                      y={startY}
                      textAnchor="middle"
                      className="ph-cell-text"
                      style={{ fontSize: lines.length > 1 ? 11 : 13 }}
                    >
                      {lines.map((line, idx) => (
                        <tspan key={`${row.id}-${opt.id}-${idx}`} x={x + (cellW - gap) / 2} y={startY + idx * lineHeight}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </ChartBase>

      <ChartTooltip
        open={hoveredOption !== null}
        anchorX={tooltipAnchor.x}
        anchorY={tooltipAnchor.y}
        onClose={() => setHovered(null)}
      >
        {hoveredOption && (
          <>
            <div className="tooltip-label">{hoveredOption.row}</div>
            <div className="tooltip-value">
              {hoveredOption.option}: {formatImpact(hoveredOption.multiplier)}
            </div>
          </>
        )}
      </ChartTooltip>
    </div>
  );
}
