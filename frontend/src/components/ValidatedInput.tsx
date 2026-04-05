/**
 * ValidatedInput Component
 * 
 * Input field with built-in validation and error display
 */

import { type InputHTMLAttributes } from 'react';
import { useFieldValidation } from '../hooks/useValidation';
import { ValidationMessage } from './ValidationTooltip';
import type { Lang } from '../types/storage';

export interface ValidatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Input value
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Minimum allowed value
   */
  min?: number;

  /**
   * Maximum allowed value
   */
  max?: number;

  /**
   * Field name for validation messages
   */
  fieldName: string;

  /**
   * Current language
   */
  language: Lang;

  /**
   * Input type (default: text with decimal inputMode)
   */
  inputType?: 'text' | 'number';

  /**
   * Whether to show validation messages
   */
  showValidation?: boolean;

  /**
   * Debounce delay for validation (ms)
   */
  debounceMs?: number;

  /**
   * Additional CSS class for the wrapper
   */
  wrapperClassName?: string;

  /**
   * Label for the input
   */
  label?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;
}

/**
 * Input component with built-in validation
 */
export function ValidatedInput({
  value,
  onChange,
  min = 0,
  max = 1000000,
  fieldName,
  language,
  inputType = 'text',
  showValidation = true,
  debounceMs = 300,
  wrapperClassName = '',
  label,
  required = false,
  className = '',
  ...inputProps
}: ValidatedInputProps) {
  const { error, hasError } = useFieldValidation(
    value,
    min,
    max,
    fieldName,
    language,
    debounceMs
  );

  const fieldClass = hasError ? 'field--has-error' : error ? 'field--has-warning' : '';

  return (
    <div className={`field ${fieldClass} ${wrapperClassName}`}>
      {label && (
        <label>
          {label}
          {required && <span className="field__required" aria-label="required"> *</span>}
        </label>
      )}
      <input
        type={inputType}
        inputMode={inputType === 'text' ? 'decimal' : undefined}
        value={value}
        onChange={onChange}
        className={className}
        aria-invalid={hasError}
        aria-required={required}
        {...inputProps}
      />
      {showValidation && error && (
        <ValidationMessage error={error} show={true} />
      )}
    </div>
  );
}

/**
 * Select component with validation support
 */
export interface ValidatedSelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /**
   * Select value
   */
  value: string | number;

  /**
   * Change handler
   */
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  /**
   * Select options
   */
  children: React.ReactNode;

  /**
   * Label for the select
   */
  label?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Additional CSS class for the wrapper
   */
  wrapperClassName?: string;

  /**
   * Error message to display
   */
  error?: string | null;
}

export function ValidatedSelect({
  value,
  onChange,
  children,
  label,
  required = false,
  wrapperClassName = '',
  error,
  className = '',
  ...selectProps
}: ValidatedSelectProps) {
  const hasError = !!error;
  const fieldClass = hasError ? 'field--has-error' : '';

  return (
    <div className={`field ${fieldClass} ${wrapperClassName}`}>
      {label && (
        <label>
          {label}
          {required && <span className="field__required" aria-label="required"> *</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={className}
        aria-invalid={hasError}
        aria-required={required}
        {...selectProps}
      >
        {children}
      </select>
      {error && (
        <ValidationMessage
          error={{ field: 'select', message: error, type: 'error' }}
          show={true}
        />
      )}
    </div>
  );
}
