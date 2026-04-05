import React, { Component, ReactNode } from 'react';
import './ErrorBoundary.css';

type Lang = 'en' | 'ua';

interface ErrorBoundaryProps {
  children: ReactNode;
  language: Lang;
  featureName: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const errorMessages = {
  en: {
    title: 'Something went wrong',
    description: 'An error occurred in the {feature} section.',
    whatHappened: 'What happened?',
    whatToDo: 'What can you do?',
    tryAgain: 'Try again',
    reload: 'Reload page',
    continue: 'Continue using other features',
    dataPreserved: 'Your data has been preserved and is safe.',
    reportIssue: 'If this problem persists, please report it.',
  },
  ua: {
    title: 'Щось пішло не так',
    description: 'Сталася помилка в розділі {feature}.',
    whatHappened: 'Що сталося?',
    whatToDo: 'Що ви можете зробити?',
    tryAgain: 'Спробувати знову',
    reload: 'Перезавантажити сторінку',
    continue: 'Продовжити використання інших функцій',
    dataPreserved: 'Ваші дані збережені та в безпеці.',
    reportIssue: 'Якщо проблема не зникає, будь ласка, повідомте про неї.',
  },
};

const featureNames = {
  en: {
    form: 'form',
    results: 'results',
    charts: 'charts',
    app: 'application',
  },
  ua: {
    form: 'форми',
    results: 'результатів',
    charts: 'графіків',
    app: 'додатку',
  },
};

/**
 * Error Boundary component that catches errors in child components
 * and displays a user-friendly error message with recovery options.
 * 
 * Features:
 * - Catches React errors in child components
 * - Displays bilingual error messages
 * - Preserves user data when errors occur
 * - Provides recovery options (try again, reload, continue)
 * - Logs errors to console for debugging
 */
export class FeatureErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console for debugging
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    // Reload the page
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, language, featureName } = this.props;

    if (hasError && error) {
      const t = errorMessages[language];
      const featureLang = featureNames[language][featureName as keyof typeof featureNames['en']] || featureName;

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">{t.title}</h2>
            <p className="error-boundary-description">
              {t.description.replace('{feature}', featureLang)}
            </p>

            <div className="error-boundary-section">
              <h3>{t.whatHappened}</h3>
              <div className="error-boundary-details">
                <code>{error.message || 'Unknown error'}</code>
              </div>
            </div>

            <div className="error-boundary-section">
              <h3>{t.whatToDo}</h3>
              <ul className="error-boundary-actions-list">
                <li>{t.tryAgain}</li>
                <li>{t.reload}</li>
                <li>{t.continue}</li>
              </ul>
              <p className="error-boundary-note">{t.dataPreserved}</p>
            </div>

            <div className="error-boundary-buttons">
              <button
                type="button"
                className="primary"
                onClick={this.handleReset}
              >
                {t.tryAgain}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={this.handleReload}
              >
                {t.reload}
              </button>
            </div>

            <p className="error-boundary-footer">{t.reportIssue}</p>
          </div>
        </div>
      );
    }

    return children;
  }
}
