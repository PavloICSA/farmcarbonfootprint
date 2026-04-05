/**
 * JSON Import Button Component
 * Provides file upload UI for importing farm data from JSON files
 * Displays error messages and success confirmations
 */

import React, { useRef, useState } from 'react';
import { importFromJSONFile, JSONImportResult } from '../lib/json-import';
import { FarmForm, CropPractice } from '../types/storage';

export interface JSONImportButtonProps {
  onImportSuccess: (data: { farmForm: FarmForm; practices: CropPractice[] }) => void;
  onImportError?: (error: string) => void;
  onImportWarning?: (warnings: string[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * JSON Import Button Component
 * Handles file selection, validation, and import with user feedback
 */
export const JSONImportButton: React.FC<JSONImportButtonProps> = ({
  onImportSuccess,
  onImportError,
  onImportWarning,
  disabled = false,
  className = '',
  label = 'Import JSON',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await importFromJSONFile(file);

      if (result.success && result.data) {
        // Success
        setSuccess(true);
        onImportSuccess(result.data);

        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          onImportWarning?.(result.warnings);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        // Error
        const errorMsg = result.error || 'Unknown error during import';
        setError(errorMsg);
        onImportError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onImportError?.(errorMsg);
    } finally {
      setIsLoading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`json-import-button ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Import JSON file"
        disabled={disabled || isLoading}
      />

      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? 'Importing...' : label}
        title="Import farm data from a JSON file"
      >
        {isLoading ? 'Importing...' : label}
      </button>

      {error && (
        <div className="import-error" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="error-dismiss"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="import-success" role="status">
          <span className="success-icon">✓</span>
          <span className="success-message">Data imported successfully</span>
        </div>
      )}
    </div>
  );
};

export default JSONImportButton;
