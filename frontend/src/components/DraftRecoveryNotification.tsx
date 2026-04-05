/**
 * Draft Recovery Notification Component
 * Displays a notification when a draft is available for recovery
 */

import type { Draft } from '../types/storage';

interface DraftRecoveryNotificationProps {
  draft: Draft;
  language: 'en' | 'ua';
  onRecover: () => void;
  onDismiss: () => void;
}

const messages = {
  en: {
    title: 'Unsaved Draft Found',
    message: 'You have unsaved changes from',
    recover: 'Recover Draft',
    dismiss: 'Discard',
  },
  ua: {
    title: 'Знайдено незбережений чернетку',
    message: 'У вас є незбережені зміни від',
    recover: 'Відновити чернетку',
    dismiss: 'Відхилити',
  },
};

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date, language: 'en' | 'ua'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const locale = language === 'ua' ? 'uk-UA' : 'en-US';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Draft Recovery Notification Component
 */
export function DraftRecoveryNotification({
  draft,
  language,
  onRecover,
  onDismiss,
}: DraftRecoveryNotificationProps) {
  const t = messages[language];
  const timestamp = draft.timestamp instanceof Date 
    ? draft.timestamp 
    : new Date(draft.timestamp);

  return (
    <div className="draft-notification" role="alert" aria-live="polite">
      <div className="draft-notification-content">
        <div className="draft-notification-header">
          <strong>{t.title}</strong>
        </div>
        <p className="draft-notification-message">
          {t.message} {formatTimestamp(timestamp, language)}
        </p>
        <div className="draft-notification-actions">
          <button
            type="button"
            className="primary"
            onClick={onRecover}
            aria-label={t.recover}
          >
            {t.recover}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onDismiss}
            aria-label={t.dismiss}
          >
            {t.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
