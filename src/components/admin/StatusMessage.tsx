import React from 'react';

interface StatusMessageProps {
  message: string;
  onClear?: () => void;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message, onClear }) => {
  if (!message) return null;

  const isSuccess = message.includes('Successfully');
  const isWarning = message.includes('Warning');

  return (
    <div
      className={`mt-4 p-3 rounded-md flex items-center justify-between ${
        isSuccess ? 'bg-green-900 text-green-200' :
        isWarning ? 'bg-yellow-900 text-yellow-200' :
        'bg-red-900 text-red-200'
      }`}
      role="alert"
    >
      <span>{message}</span>
      {onClear && (
        <button
          onClick={onClear}
          className="ml-2 text-sm underline opacity-75 hover:opacity-100 focus:outline-none"
          aria-label="Clear message"
        >
          ✕
        </button>
      )}
    </div>
  );
};