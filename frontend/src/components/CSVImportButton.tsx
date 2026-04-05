/**
 * CSV Import Button Component
 * Provides UI for importing crop data from CSV files with error handling
 */

import React, { useRef, useState } from 'react';
import {
  importCropsFromCSV,
  downloadCropImportTemplate,
  CropImportResult,
} from '../lib/csv-import';
import { CropForm } from '../types/storage';

interface CSVImportButtonProps {
  onImportSuccess: (crops: CropForm[]) => void;
  onImportError?: (error: string) => void;
  language: 'en' | 'ua';
}

const translations = {
  en: {
    importButton: 'Import Crops from CSV',
    downloadTemplate: 'Download Template',
    selectFile: 'Select CSV file',
    importing: 'Importing...',
    successTitle: 'Import Successful',
    successMessage: (count: number) => `Successfully imported ${count} crop${count !== 1 ? 's' : ''}`,
    errorTitle: 'Import Failed',
    errorMessage: 'Failed to import crops from CSV',
    validationErrors: 'Validation Errors',
    warnings: 'Warnings',
    row: 'Row',
    crop: 'Crop',
    message: 'Message',
    noErrors: 'No errors',
    noWarnings: 'No warnings',
    close: 'Close',
    import: 'Import',
    cancel: 'Cancel',
  },
  ua: {
    importButton: 'Імпортувати культури з CSV',
    downloadTemplate: 'Завантажити шаблон',
    selectFile: 'Виберіть файл CSV',
    importing: 'Імпортування...',
    successTitle: 'Імпорт успішний',
    successMessage: (count: number) =>
      `Успішно імпортовано ${count} культур${count % 10 === 1 && count % 100 !== 11 ? 'у' : ''}`,
    errorTitle: 'Помилка імпорту',
    errorMessage: 'Не вдалося імпортувати культури з CSV',
    validationErrors: 'Помилки валідації',
    warnings: 'Попередження',
    row: 'Рядок',
    crop: 'Культура',
    message: 'Повідомлення',
    noErrors: 'Немає помилок',
    noWarnings: 'Немає попереджень',
    close: 'Закрити',
    import: 'Імпортувати',
    cancel: 'Скасувати',
  },
};

const t = translations;

export const CSVImportButton: React.FC<CSVImportButtonProps> = ({
  onImportSuccess,
  onImportError,
  language,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [importResult, setImportResult] = useState<CropImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await importCropsFromCSV(file);
      setImportResult(result);
      setShowResults(true);

      // If there are no errors, auto-import
      if (result.errorCount === 0 && result.successCount > 0) {
        onImportSuccess(result.crops);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onImportError?.(errorMessage);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    if (importResult && importResult.errorCount === 0 && importResult.successCount > 0) {
      onImportSuccess(importResult.crops);
      setShowResults(false);
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCropImportTemplate();
  };

  return (
    <div className="csv-import-container">
      <div className="csv-import-buttons">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="csv-import-btn"
          aria-label={t[language].importButton}
        >
          {isLoading ? t[language].importing : t[language].importButton}
        </button>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="csv-template-btn"
          aria-label={t[language].downloadTemplate}
        >
          {t[language].downloadTemplate}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-label={t[language].selectFile}
        />
      </div>

      {error && (
        <div className="csv-import-error" role="alert">
          <strong>{t[language].errorTitle}:</strong> {error}
        </div>
      )}

      {showResults && importResult && (
        <div className="csv-import-results">
          <div className="results-header">
            {importResult.errorCount === 0 ? (
              <div className="success-message">
                <strong>{t[language].successTitle}</strong>
                <p>{t[language].successMessage(importResult.successCount)}</p>
              </div>
            ) : (
              <div className="partial-message">
                <strong>{t[language].successTitle}</strong>
                <p>
                  {t[language].successMessage(importResult.successCount)} (
                  {importResult.errorCount} {importResult.errorCount === 1 ? 'error' : 'errors'})
                </p>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="results-section errors-section">
              <h4>{t[language].validationErrors}</h4>
              <div className="errors-list">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-row">
                      {t[language].row} {error.rowIndex}
                    </span>
                    {error.cropName && <span className="error-crop">{error.cropName}</span>}
                    <span className="error-message">{error.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult.warnings.length > 0 && (
            <div className="results-section warnings-section">
              <h4>{t[language].warnings}</h4>
              <div className="warnings-list">
                {importResult.warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    <span className="warning-row">
                      {t[language].row} {warning.rowIndex}
                    </span>
                    {warning.cropName && <span className="warning-crop">{warning.cropName}</span>}
                    <span className="warning-message">{warning.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="results-actions">
            {importResult.errorCount === 0 && importResult.successCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="btn-primary"
                >
                  {t[language].import}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResults(false)}
                  className="btn-secondary"
                >
                  {t[language].cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="btn-secondary"
              >
                {t[language].close}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .csv-import-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .csv-import-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .csv-import-btn,
        .csv-template-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: #f5f5f5;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }

        .csv-import-btn:hover:not(:disabled),
        .csv-template-btn:hover {
          background-color: #e0e0e0;
        }

        .csv-import-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .csv-import-error {
          padding: 0.75rem 1rem;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c33;
          font-size: 0.9rem;
        }

        .csv-import-results {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          background-color: #fafafa;
        }

        .results-header {
          margin-bottom: 1rem;
        }

        .success-message,
        .partial-message {
          padding: 0.75rem;
          border-radius: 4px;
          background-color: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .partial-message {
          background-color: #ffd;
          border-color: #ffc;
          color: #880;
        }

        .results-section {
          margin-bottom: 1rem;
        }

        .results-section h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.95rem;
          color: #333;
        }

        .errors-list,
        .warnings-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
        }

        .error-item,
        .warning-item {
          padding: 0.5rem;
          border-bottom: 1px solid #eee;
          font-size: 0.85rem;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .error-item:last-child,
        .warning-item:last-child {
          border-bottom: none;
        }

        .error-row,
        .warning-row {
          font-weight: bold;
          color: #666;
          min-width: 50px;
        }

        .error-crop,
        .warning-crop {
          color: #666;
          font-style: italic;
        }

        .error-message,
        .warning-message {
          color: #333;
          flex: 1;
        }

        .results-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #ddd;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #4CAF50;
          color: white;
          border-color: #45a049;
        }

        .btn-primary:hover {
          background-color: #45a049;
        }

        .btn-secondary {
          background-color: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover {
          background-color: #e0e0e0;
        }

        @media (max-width: 768px) {
          .csv-import-buttons {
            flex-direction: column;
          }

          .csv-import-btn,
          .csv-template-btn {
            width: 100%;
          }

          .results-actions {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CSVImportButton;
