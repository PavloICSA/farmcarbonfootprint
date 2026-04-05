/**
 * ValidationTooltip Component
 * 
 * Displays inline validation error and warning messages adjacent to form fields
 */

import { type ValidationError } from '../lib/validation-manager';
import './ValidationTooltip.css';

export interface ValidationTooltipProps {
  /**
   * Validation errors to display
   */
  errors: ValidationError[];

  /**
   * Whether to show the tooltip
   */
  show?: boolean;

  /**
   * Position of the tooltip relative to the field
   */
  position?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Additional CSS class
   */
  className?: string;
}

/**
 * ValidationTooltip component for displaying inline validation messages
 */
export function ValidationTooltip({
  errors,
  show = true,
  position = 'bottom',
  className = '',
}: ValidationTooltipProps) {
  // Don't render if no errors or not showing
  if (!show || errors.length === 0) {
    return null;
  }

  // Separate errors and warnings
  const errorMessages = errors.filter(e => e.type === 'error');
  const warningMessages = errors.filter(e => e.type === 'warning');

  // Determine primary type (error takes precedence)
  const primaryType = errorMessages.length > 0 ? 'error' : 'warning';

  return (
    <div
      className={`validation-tooltip validation-tooltip--${position} validation-tooltip--${primaryType} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="validation-tooltip__content">
        {errorMessages.length > 0 && (
          <div className="validation-tooltip__errors">
            {errorMessages.map((error, index) => (
              <div key={`error-${index}`} className="validation-tooltip__message">
                <span className="validation-tooltip__icon" aria-hidden="true">⚠</span>
                <span className="validation-tooltip__text">{error.message}</span>
              </div>
            ))}
          </div>
        )}
        {warningMessages.length > 0 && (
          <div className="validation-tooltip__warnings">
            {warningMessages.map((warning, index) => (
              <div key={`warning-${index}`} className="validation-tooltip__message">
                <span className="validation-tooltip__icon" aria-hidden="true">ℹ</span>
                <span className="validation-tooltip__text">{warning.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline validation message component (simpler alternative)
 */
export interface ValidationMessageProps {
  /**
   * Single error to display
   */
  error: ValidationError | null;

  /**
   * Whether to show the message
   */
  show?: boolean;

  /**
   * Additional CSS class
   */
  className?: string;
}

export function ValidationMessage({
  error,
  show = true,
  className = '',
}: ValidationMessageProps) {
  if (!show || !error) {
    return null;
  }

  const typeClass = error.type === 'error' ? 'validation-message--error' : 'validation-message--warning';

  return (
    <div
      className={`validation-message ${typeClass} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span className="validation-message__icon" aria-hidden="true">
        {error.type === 'error' ? '⚠' : 'ℹ'}
      </span>
      <span className="validation-message__text">{error.message}</span>
    </div>
  );
}
