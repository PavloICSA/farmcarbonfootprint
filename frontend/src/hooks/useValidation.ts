/**
 * React hook for form validation
 * 
 * Provides real-time validation with debouncing and field-level error tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { validationManager, type ValidationError, type ValidationResult } from '../lib/validation-manager';
import type { FarmForm, Lang } from '../types/storage';

export interface UseValidationOptions {
  /**
   * Debounce delay in milliseconds (default: 500ms)
   */
  debounceMs?: number;

  /**
   * Whether to validate on mount (default: false)
   */
  validateOnMount?: boolean;

  /**
   * Whether to show warnings (default: true)
   */
  showWarnings?: boolean;
}

export interface UseValidationReturn {
  /**
   * Current validation result
   */
  validation: ValidationResult;

  /**
   * Whether validation is currently running
   */
  isValidating: boolean;

  /**
   * Manually trigger validation
   */
  validate: () => void;

  /**
   * Clear all validation errors
   */
  clearErrors: () => void;

  /**
   * Get errors for a specific field
   */
  getFieldErrors: (field: string, cropIndex?: number, pesticideIndex?: number) => ValidationError[];

  /**
   * Check if a specific field has errors
   */
  hasFieldError: (field: string, cropIndex?: number, pesticideIndex?: number) => boolean;

  /**
   * Check if form can be submitted (no errors)
   */
  canSubmit: boolean;
}

const emptyValidation: ValidationResult = {
  isValid: true,
  errors: [],
  hasErrors: false,
  hasWarnings: false,
};

/**
 * Hook for form validation with debouncing
 */
export function useValidation(
  form: FarmForm,
  language: Lang,
  options: UseValidationOptions = {}
): UseValidationReturn {
  const {
    debounceMs = 500,
    validateOnMount = false,
    showWarnings = true,
  } = options;

  const [validation, setValidation] = useState<ValidationResult>(emptyValidation);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(false);

  const validate = useCallback(() => {
    setIsValidating(true);
    
    // Run validation
    const result = validationManager.validateForm(form, language);
    
    // Filter out warnings if not showing them
    if (!showWarnings) {
      result.errors = result.errors.filter(e => e.type === 'error');
      result.hasWarnings = false;
    }
    
    setValidation(result);
    setIsValidating(false);
  }, [form, language, showWarnings]);

  const clearErrors = useCallback(() => {
    setValidation(emptyValidation);
  }, []);

  const getFieldErrors = useCallback(
    (field: string, cropIndex?: number, pesticideIndex?: number): ValidationError[] => {
      return validation.errors.filter(error => {
        if (error.field !== field) return false;
        if (cropIndex !== undefined && error.cropIndex !== cropIndex) return false;
        if (pesticideIndex !== undefined && error.pesticideIndex !== pesticideIndex) return false;
        return true;
      });
    },
    [validation.errors]
  );

  const hasFieldError = useCallback(
    (field: string, cropIndex?: number, pesticideIndex?: number): boolean => {
      return getFieldErrors(field, cropIndex, pesticideIndex).length > 0;
    },
    [getFieldErrors]
  );

  // Debounced validation on form changes
  useEffect(() => {
    // Skip validation on mount unless explicitly requested
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      if (validateOnMount) {
        validate();
      }
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      validate();
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form, language, debounceMs, validate, validateOnMount]);

  const canSubmit = !validation.hasErrors;

  return {
    validation,
    isValidating,
    validate,
    clearErrors,
    getFieldErrors,
    hasFieldError,
    canSubmit,
  };
}

/**
 * Hook for single field validation (for inline validation)
 */
export function useFieldValidation(
  value: string,
  min: number,
  max: number,
  fieldName: string,
  language: Lang,
  debounceMs: number = 300
): {
  error: ValidationError | null;
  hasError: boolean;
  isValidating: boolean;
} {
  const [error, setError] = useState<ValidationError | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsValidating(true);

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const validationError = validationManager.validateNumericInput(
        value,
        min,
        max,
        fieldName,
        language
      );
      setError(validationError);
      setIsValidating(false);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, min, max, fieldName, language, debounceMs]);

  return {
    error,
    hasError: error !== null && error.type === 'error',
    isValidating,
  };
}
