import React from 'react';

interface ProcessingActionsProps {
  onProcess: () => void;
  onCleanDuplicates: () => void;
  canProcess: boolean;
  isProcessing: boolean;
}

export const ProcessingActions: React.FC<ProcessingActionsProps> = ({
  onProcess,
  onCleanDuplicates,
  canProcess,
  isProcessing
}) => {
  return (
    <div className="flex space-x-4">
      <button
        onClick={onProcess}
        disabled={!canProcess || isProcessing}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby="process-help"
      >
        {isProcessing ? 'Processing...' : 'Process & Publish'}
      </button>

      <button
        onClick={onCleanDuplicates}
        disabled={isProcessing}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-describedby="clean-help"
      >
        🧹 Clean Duplicates
      </button>

      <div className="sr-only">
        <p id="process-help">Process the agent text and save predictions to database</p>
        <p id="clean-help">Remove duplicate predictions from the database</p>
      </div>
    </div>
  );
};