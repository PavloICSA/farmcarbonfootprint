/**
 * ChartBase - Base component for all SVG charts
 * 
 * Provides common functionality for all chart types:
 * - Responsive sizing
 * - Accessibility features
 * - Dark mode support
 * - Print-friendly styling
 * - Error handling
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import './ChartBase.css';

export interface ChartBaseProps {
  /** Chart title for accessibility */
  title: string;
  /** Chart description for accessibility */
  description?: string;
  /** SVG viewBox dimensions */
  viewBox?: string;
  /** Chart content (SVG elements) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Aspect ratio (width:height) */
  aspectRatio?: number;
  /** Show loading state */
  isLoading?: boolean;
  /** Show error state */
  error?: string | null;
  /** Callback when chart is ready */
  onReady?: () => void;
  /** Enable responsive behavior */
  responsive?: boolean;
  /** Custom width (overrides responsive) */
  width?: number | string;
  /** Custom height (overrides responsive) */
  height?: number | string;
}

/**
 * Base chart component with common functionality
 */
export const ChartBase = React.forwardRef<SVGSVGElement, ChartBaseProps>(
  (
    {
      title,
      description,
      viewBox = '0 0 400 300',
      children,
      className = '',
      aspectRatio = 4 / 3,
      isLoading = false,
      error = null,
      onReady,
      responsive = true,
      width,
      height,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
    const descriptionId = useId();

    // Handle responsive sizing
    useEffect(() => {
      if (!responsive || !containerRef.current) return;

      const updateDimensions = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width > 0) {
            setDimensions({
              width: rect.width,
              height: rect.width / aspectRatio,
            });
          }
        }
      };

      updateDimensions();
      
      // Only use ResizeObserver if available (not in test environment)
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
      }

      // Fallback for older browsers: update on window resize/orientation changes.
      window.addEventListener('resize', updateDimensions);
      window.addEventListener('orientationchange', updateDimensions);
      return () => {
        window.removeEventListener('resize', updateDimensions);
        window.removeEventListener('orientationchange', updateDimensions);
      };
    }, [responsive, aspectRatio]);

    // Call onReady callback when chart is ready
    useEffect(() => {
      if (!isLoading && !error && onReady) {
        onReady();
      }
    }, [isLoading, error, onReady]);

    const chartWidth = width || (responsive ? dimensions.width : 400);
    const chartHeight = height || (responsive ? dimensions.height : 300);

    return (
      <div
        ref={containerRef}
        className={`chart-base ${className}`}
        role="region"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
      >
        {description && (
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
        )}

        {isLoading && (
          <div className="chart-loading" role="status" aria-live="polite">
            <div className="chart-spinner" />
            <span>Loading chart...</span>
          </div>
        )}

        {error && (
          <div className="chart-error" role="alert">
            <span className="chart-error-icon">⚠️</span>
            <span className="chart-error-message">{error}</span>
          </div>
        )}

        {!isLoading && !error && (
          <svg
            ref={ref}
            viewBox={viewBox}
            width={chartWidth}
            height={chartHeight}
            className="chart-svg"
            role="img"
            aria-label={title}
            preserveAspectRatio="xMidYMid meet"
          >
            {children}
          </svg>
        )}
      </div>
    );
  }
);

ChartBase.displayName = 'ChartBase';

export default ChartBase;
