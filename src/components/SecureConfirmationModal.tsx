import React, { useState } from 'react';

export type ConfirmationLevel = 'low' | 'medium' | 'high' | 'critical';

interface SecureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  level: ConfirmationLevel;
  requireTyping?: boolean;
  expectedText?: string;
  itemCount?: number;
}

const LEVEL_STYLES = {
  low: {
    headerBg: 'bg-blue-900',
    headerBorder: 'border-blue-700',
    headerText: 'text-blue-200',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    icon: '💬'
  },
  medium: {
    headerBg: 'bg-yellow-900',
    headerBorder: 'border-yellow-700',
    headerText: 'text-yellow-200',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    icon: '⚠️'
  },
  high: {
    headerBg: 'bg-orange-900',
    headerBorder: 'border-orange-700',
    headerText: 'text-orange-200',
    confirmBg: 'bg-orange-600 hover:bg-orange-700',
    icon: '🚨'
  },
  critical: {
    headerBg: 'bg-red-900',
    headerBorder: 'border-red-700',
    headerText: 'text-red-200',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    icon: '💀'
  }
};

export const SecureConfirmationModal: React.FC<SecureConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  level,
  requireTyping = false,
  expectedText = '',
  itemCount
}) => {
  const [typedText, setTypedText] = useState('');
  const [countdown, setCountdown] = useState(level === 'critical' ? 5 : 0);
  const [isCountdownActive, setIsCountdownActive] = useState(level === 'critical');

  const styles = LEVEL_STYLES[level];
  
  // Start countdown for critical actions
  React.useEffect(() => {
    if (isOpen && level === 'critical' && isCountdownActive) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsCountdownActive(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, level, isCountdownActive]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setTypedText('');
      if (level === 'critical') {
        setCountdown(5);
        setIsCountdownActive(true);
      }
    }
  }, [isOpen, level]);

  if (!isOpen) return null;

  const canConfirm = () => {
    // Must wait for countdown on critical actions
    if (level === 'critical' && isCountdownActive) return false;
    
    // Must type expected text if required
    if (requireTyping && expectedText) {
      return typedText.toLowerCase().trim() === expectedText.toLowerCase().trim();
    }
    
    return true;
  };

  const handleConfirm = () => {
    if (canConfirm()) {
      onConfirm();
      onClose();
    }
  };

  const handleClose = () => {
    setTypedText('');
    setCountdown(0);
    setIsCountdownActive(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-600 shadow-2xl">
        {/* Header */}
        <div className={`p-4 rounded-t-lg border-b ${styles.headerBg} ${styles.headerBorder}`}>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{styles.icon}</span>
            <div>
              <h3 className={`font-bold text-lg ${styles.headerText}`}>
                {title}
              </h3>
              <div className="text-xs opacity-75 mt-1">
                {level.charAt(0).toUpperCase() + level.slice(1)} Risk Action
                {itemCount && ` (${itemCount} items affected)`}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 mb-4 leading-relaxed">{message}</p>

          {/* Critical countdown */}
          {level === 'critical' && isCountdownActive && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded">
              <div className="flex items-center space-x-2 text-red-300">
                <span className="animate-pulse">🕐</span>
                <span className="text-sm">
                  Please wait {countdown} second{countdown !== 1 ? 's' : ''} before confirming...
                </span>
              </div>
            </div>
          )}

          {/* Typing confirmation */}
          {requireTyping && expectedText && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type <span className="font-mono text-white bg-gray-700 px-1 rounded">
                  {expectedText}
                </span> to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={`Type "${expectedText}" here...`}
                autoComplete="off"
                spellCheck={false}
              />
              {typedText && typedText.toLowerCase().trim() !== expectedText.toLowerCase().trim() && (
                <p className="text-red-400 text-xs mt-1">
                  Text does not match. Please type exactly: {expectedText}
                </p>
              )}
            </div>
          )}

          {/* Additional warnings for high-risk actions */}
          {(level === 'high' || level === 'critical') && (
            <div className="mb-4 p-3 bg-gray-700 border border-gray-600 rounded">
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-yellow-400 mb-1">⚠️ Important:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>This action cannot be undone</li>
                  <li>All affected data will be permanently lost</li>
                  <li>Consider backing up data before proceeding</li>
                  {level === 'critical' && <li>This will affect all users of the system</li>}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-4 bg-gray-750 rounded-b-lg border-t border-gray-600">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className={`flex-1 px-4 py-2 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBg}`}
          >
            {isCountdownActive ? `Wait ${countdown}s...` : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for easier usage
export const useSecureConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    config: Omit<SecureConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    onConfirm: () => void;
  } | null>(null);

  const showConfirmation = (
    config: Omit<SecureConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'>,
    onConfirm: () => void
  ) => {
    setConfirmationState({
      isOpen: true,
      config,
      onConfirm
    });
  };

  const hideConfirmation = () => {
    setConfirmationState(null);
  };

  const handleConfirm = () => {
    if (confirmationState) {
      confirmationState.onConfirm();
      hideConfirmation();
    }
  };

  return {
    showConfirmation,
    confirmationModal: confirmationState && (
      <SecureConfirmationModal
        {...confirmationState.config}
        isOpen={confirmationState.isOpen}
        onClose={hideConfirmation}
        onConfirm={handleConfirm}
      />
    )
  };
};