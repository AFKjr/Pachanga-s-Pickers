import React from 'react';

const AIPredictionsWidget: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">AI Predictions</h3>
      <div className="text-gray-400 text-center py-8">
        <p>AI prediction functionality has been disabled.</p>
        <p className="text-sm mt-2">External API integrations have been removed.</p>
      </div>
    </div>
  );
};

export default AIPredictionsWidget;