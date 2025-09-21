// src/components/ErrorNotification.tsx

import React from 'react';
import { AppError, formatErrorForUser } from '../utils/errorHandling';

interface ErrorNotificationProps {
  error: AppError | null;
  onClose: () => void;
  onRetry?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  error, 
  onClose, 
  onRetry 
}) => {
  if (!error) return null;

  const { title, message, action, severity, retryable } = formatErrorForUser(error);

  const severityStyles = {
    low: {
      bg: 'bg-blue-900/20 border-blue-700',
      text: 'text-blue-300',
      icon: '💡',
      titleColor: 'text-blue-200'
    },
    medium: {
      bg: 'bg-yellow-900/20 border-yellow-700',
      text: 'text-yellow-300',
      icon: '⚠️',
      titleColor: 'text-yellow-200'
    },
    high: {
      bg: 'bg-red-900/20 border-red-700',
      text: 'text-red-300',
      icon: '❌',
      titleColor: 'text-red-200'
    },
    critical: {
      bg: 'bg-red-900/40 border-red-600',
      text: 'text-red-200',
      icon: '🚨',
      titleColor: 'text-red-100'
    }
  };

  const styles = severityStyles[severity as keyof typeof severityStyles];

  return (
    <div className={`border rounded-lg p-4 mb-4 ${styles.bg}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{styles.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${styles.titleColor}`}>
              {title}
            </h4>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
          
          <p className={`mt-1 ${styles.text}`}>
            {message}
          </p>
          
          {action && (
            <p className={`mt-2 text-sm ${styles.text} opacity-75`}>
              💡 {action}
            </p>
          )}
          
          <div className="flex items-center space-x-3 mt-3">
            {retryable && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Try Again
              </button>
            )}
            
            <span className={`text-xs ${styles.text} opacity-50`}>
              Error Code: {error.code}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;