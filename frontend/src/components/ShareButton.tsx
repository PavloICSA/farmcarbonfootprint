/**
 * ShareButton Component
 * 
 * Provides UI for sharing application state via URL encoding.
 * Includes "Share" button to generate shareable URL and "Copy link" button for clipboard.
 * 
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 64.1, 64.2, 64.3, 64.4, 64.5, 64.6, 64.7
 */

import React, { useState } from 'react';
import {
  encodeToURL,
  createShareableURL,
  copyShareableURLToClipboard,
  canEncodeToURL,
  getEncodedURLLength,
} from '../lib/url-encoder';
import { Lang } from '../types/storage';

interface ShareButtonProps {
  state: Record<string, unknown>;
  language: Lang;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

const dict = {
  en: {
    share: 'Share',
    copyLink: 'Copy Link',
    shareURL: 'Share URL',
    close: 'Close',
    copied: 'URL copied to clipboard!',
    error: 'Error',
    stateTooLarge: 'State is too large to encode in URL (exceeds 2000 character limit)',
    encodingFailed: 'Failed to encode state',
    copyFailed: 'Failed to copy URL to clipboard',
    urlLength: 'URL Length',
    characters: 'characters',
    shareableURL: 'Shareable URL',
    copyToClipboard: 'Copy to Clipboard',
    openInNewTab: 'Open in New Tab',
  },
  ua: {
    share: 'Поділитися',
    copyLink: 'Копіювати посилання',
    shareURL: 'Посилання для спільного доступу',
    close: 'Закрити',
    copied: 'Посилання скопійовано в буфер обміну!',
    error: 'Помилка',
    stateTooLarge: 'Стан занадто великий для кодування в URL (перевищує ліміт 2000 символів)',
    encodingFailed: 'Не вдалося закодувати стан',
    copyFailed: 'Не вдалося скопіювати посилання в буфер обміну',
    urlLength: 'Довжина URL',
    characters: 'символів',
    shareableURL: 'Посилання для спільного доступу',
    copyToClipboard: 'Копіювати в буфер обміну',
    openInNewTab: 'Відкрити в новій вкладці',
  },
};

export function ShareButton({
  state,
  language,
  onSuccess,
  onError,
}: ShareButtonProps) {
  const t = dict[language];
  const [isOpen, setIsOpen] = useState(false);
  const [shareURL, setShareURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlLength, setUrlLength] = useState<number>(0);

  const handleShare = () => {
    try {
      setError(null);

      // Check if state can be encoded
      if (!canEncodeToURL(state)) {
        const length = getEncodedURLLength(state);
        const errorMsg = `${t.stateTooLarge} (${length} > 2000)`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Create shareable URL
      const url = createShareableURL(state);
      setShareURL(url);
      setUrlLength(getEncodedURLLength(state));
      setIsOpen(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.encodingFailed;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setError(null);
      await copyShareableURLToClipboard(state);
      onSuccess?.(t.copied);
      setIsOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.copyFailed;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleOpenInNewTab = () => {
    if (shareURL) {
      window.open(shareURL, '_blank');
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="share-button"
        title={t.share}
        aria-label={t.share}
      >
        {t.share}
      </button>

      {isOpen && (
        <div className="share-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h2>{t.shareURL}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="share-modal-close"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            <div className="share-modal-content">
              {error && (
                <div className="share-error" role="alert">
                  <strong>{t.error}:</strong> {error}
                </div>
              )}

              {shareURL && (
                <>
                  <div className="share-url-info">
                    <p>
                      <strong>{t.urlLength}:</strong> {urlLength} {t.characters}
                    </p>
                  </div>

                  <div className="share-url-display">
                    <label htmlFor="share-url-input">{t.shareableURL}</label>
                    <input
                      id="share-url-input"
                      type="text"
                      value={shareURL}
                      readOnly
                      className="share-url-input"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>

                  <div className="share-modal-actions">
                    <button
                      onClick={handleCopyToClipboard}
                      className="share-action-button primary"
                    >
                      {t.copyToClipboard}
                    </button>
                    <button
                      onClick={handleOpenInNewTab}
                      className="share-action-button secondary"
                    >
                      {t.openInNewTab}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
