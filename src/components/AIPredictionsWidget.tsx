import React, { useState, useEffect } from 'react';
import { enhancedLLMSportsAPI } from '../lib/enhancedLLMSportsAPI';

interface Prediction {
  matchup: string;
  winner: string;
  confidence: string;
  reasoning: string[];
  betting?: string;
}

const AIPredictionsWidget: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setIsLoading(true);
      const data = await enhancedLLMSportsAPI.getTopPredictions(3);

      if (data && data.predictions) {
        setPredictions(data.predictions);
        setLastUpdate(new Date().toLocaleString());
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'text-green-400 bg-green-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          🎯 AI Predictions
          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
            Live
          </span>
        </h3>
        <button
          onClick={loadPredictions}
          className="text-blue-400 hover:text-blue-300 text-sm underline"
        >
          Refresh
        </button>
      </div>

      {predictions.length > 0 ? (
        <div className="space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-semibold text-lg">
                  {prediction.matchup || `Game ${index + 1}`}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                  {prediction.confidence || 'Medium'}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-green-400 font-medium">
                  🏆 {prediction.winner || 'TBD'}
                </p>
              </div>

              {prediction.reasoning && prediction.reasoning.length > 0 && (
                <div className="mb-3">
                  <p className="text-gray-200 text-sm mb-2">💭 Key Factors:</p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {prediction.reasoning.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {prediction.betting && (
                <div className="text-yellow-400 text-sm">
                  💰 {prediction.betting}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-300">No predictions available</p>
          <button
            onClick={loadPredictions}
            className="mt-2 text-blue-400 hover:text-blue-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-400 text-center">
          Last updated: {lastUpdate} • Powered by Relevance AI
        </p>
      </div>
    </div>
  );
};

export default AIPredictionsWidget;