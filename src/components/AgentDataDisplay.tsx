import React, { useState, useEffect } from 'react';
import { enhancedLLMSportsAPI } from '../lib/enhancedLLMSportsAPI';
import type { ESPNGame } from '../types';

const AgentDataDisplay: React.FC = () => {
  const [agentData, setAgentData] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [games, setGames] = useState<ESPNGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    loadAgentData();
  }, []);

  // Helper function to parse and format predictions
  const formatPredictions = (predictionsData: any) => {
    if (typeof predictionsData === 'string') {
      return predictionsData;
    }

    if (predictionsData && predictionsData.predictions) {
      return predictionsData.predictions.map((pred: any, index: number) =>
        `🎯 **${pred.matchup || `Game ${index + 1}`}**\n` +
        `🏆 Predicted Winner: ${pred.winner || 'TBD'}\n` +
        `📊 Confidence: ${pred.confidence || 'Medium'}\n` +
        `💭 Key Factors: ${pred.reasoning ? pred.reasoning.join(' • ') : 'Analysis pending'}\n` +
        `💰 Betting: ${pred.betting || 'N/A'}\n\n`
      ).join('');
    }

    return JSON.stringify(predictionsData, null, 2);
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      setIsLoading(true);

      // Try to load from database first
      const schedule = await enhancedLLMSportsAPI.loadScheduleFromDatabase();
      if (schedule && schedule.games.length > 0) {
        setGames(schedule.games);
        setLastUpdate(schedule.lastUpdated);
      }

      // Get top predictions from agent
      const topPredictions = await enhancedLLMSportsAPI.getTopPredictions(5);
      if (topPredictions) {
        setPredictions(topPredictions);
        // Save predictions to database for persistence
        await enhancedLLMSportsAPI.savePredictionsToDatabase(topPredictions);
      }

      // Also try to get fresh agent data
      const freshData = await enhancedLLMSportsAPI.queryAgentPublic(
        'Get the latest NFL schedule and analysis for this week. Include any important updates or insights.'
      );

      if (freshData) {
        setAgentData(freshData);
        if (freshData.games) {
          setGames(freshData.games);
        }
      }
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading AI-generated content...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Insights Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🤖 AI Agent Insights</h2>
            <p className="text-blue-200">
              Latest NFL analysis and predictions powered by our AI agent
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-300">
              Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never'}
            </p>
            <button
              onClick={loadAgentData}
              className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm text-white transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* AI Predictions Section */}
      {predictions && (
        <div className="bg-gradient-to-r from-green-900 to-blue-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">🎯 AI Predictions</h3>
            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              This Week
            </span>
          </div>

          <div className="bg-black/20 rounded-lg p-4">
            <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {formatPredictions(predictions)}
            </pre>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-green-200 text-sm">
              🤖 Powered by Relevance AI Agent • Updated in real-time
            </p>
            <button
              onClick={loadAgentData}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm font-medium transition-colors"
            >
              🔄 Refresh Predictions
            </button>
          </div>
        </div>
      )}

      {/* Agent Analysis Display */}
      {agentData && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">📊 Agent Analysis</h3>
          <div className="bg-gray-900 p-4 rounded">
            <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">
              {typeof agentData === 'string' ? agentData : JSON.stringify(agentData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* NFL Schedule Display */}
      {games.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🏈 This Week's NFL Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.slice(0, 12).map((game, index) => (
              <div key={game.id || index} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors">
                <div className="text-white font-semibold text-lg mb-2">
                  {game.awayTeam} @ {game.homeTeam}
                </div>
                <div className="text-gray-300 text-sm mb-1">
                  📍 {game.venue || 'Stadium TBD'}
                </div>
                <div className="text-gray-300 text-sm mb-1">
                  📍 {game.location || 'Location TBD'}
                </div>
                <div className="text-gray-400 text-sm">
                  📅 {game.date ? new Date(game.date).toLocaleDateString() : 'Date TBD'}
                  {game.date && ` at ${new Date(game.date).toLocaleTimeString()}`}
                </div>
              </div>
            ))}
          </div>

          {games.length > 12 && (
            <p className="text-center text-gray-400 mt-4">
              ... and {games.length - 12} more games this week
            </p>
          )}
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Want to See More AI Analysis?</h3>
        <p className="text-gray-400 mb-4">
          Our AI agent continuously analyzes NFL data to provide insights and predictions.
        </p>
        <div className="flex justify-center">
          <a
            href="/agent"
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-white font-medium transition-colors"
          >
            🤖 Chat with AI Agent
          </a>
        </div>
      </div>
    </div>
  );
};

export default AgentDataDisplay;