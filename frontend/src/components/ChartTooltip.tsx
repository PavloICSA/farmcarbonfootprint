import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TooltipUtils } from '../lib/chart-utils';
import './ChartTooltip.css';

export interface ChartTooltipProps {
  open: boolean;
  anchorX: number;
  anchorY: number;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export default function ChartTooltip({
  open,
  anchorX,
  anchorY,
  children,
  className = '',
  onClose,
}: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const canClose = Boolean(onClose);

  useEffect(() => {
    if (!open || !canClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, canClose, onClose]);

  const viewport = useMemo(() => {
    if (typeof window === 'undefined') return { width: 1024, height: 768 };
    return { width: window.innerWidth, height: window.innerHeight };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = tooltipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = TooltipUtils.calculatePosition(
      anchorX,
      anchorY,
      rect.width || 160,
      rect.height || 60,
      viewport.width,
      viewport.height
    );
    setPos(next);
  }, [open, anchorX, anchorY, viewport.width, viewport.height]);

  if (!open) return null;

  return (
    <div
      ref={tooltipRef}
      className={`chart-tooltip ${className}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      role="tooltip"
    >
      {children}
    </div>
  );
}
