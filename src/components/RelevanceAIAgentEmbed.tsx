import React, { useState, useEffect } from 'react';
import { enhancedLLMSportsAPI } from '../lib/enhancedLLMSportsAPI';
import type { ESPNGame } from '../types';

const RelevanceAIAgentEmbed: React.FC = () => {
  const [agentData, setAgentData] = useState<any>(null);
  const [games, setGames] = useState<ESPNGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Function to refresh data from agent
  const refreshAgentData = async () => {
    setIsLoading(true);
    try {
      // Query the agent for latest NFL data
      const result = await enhancedLLMSportsAPI.queryAgentPublic(
        'Get the latest NFL schedule for this week, including team matchups, dates, and any relevant game information. Focus on Week 1 of the 2025 NFL season.'
      );

      if (result) {
        setAgentData(result);
        setLastUpdate(new Date().toISOString());

        // If the result contains games, update the games state
        if (result.games && Array.isArray(result.games)) {
          setGames(result.games);
        }
      }
    } catch (error) {
      console.error('Failed to refresh agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshAgentData();
    const interval = setInterval(refreshAgentData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">🤖 Relevance AI Agent Dashboard</h1>
        <p className="text-gray-400">
          Admin interface for interacting with the AI agent to fetch and analyze NFL data
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Agent Controls</h2>
          <button
            onClick={refreshAgentData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium transition-colors"
          >
            {isLoading ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>

        {lastUpdate && (
          <p className="text-sm text-gray-400">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </p>
        )}
      </div>

      {/* Agent Chat Interface */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">💬 Agent Chat Interface</h2>
        <div className="bg-white rounded-lg overflow-hidden p-2">
          <iframe
            src="https://app.relevanceai.com/agents/bcbe5a/34240c168039-4c82-b541-9e1fea2f5e3a/d5baa11d-ce8c-4d74-8afb-547928072b58/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%23685FFF&bubble_icon=pd%2Fchat&input_placeholder_text=Type+your+message...&hide_logo=false&hide_description=false&font_family=Inter"
            width="100%"
            height="596"
            frameBorder="0"
            allow="microphone"
            className="w-full rounded"
            title="Relevance AI Agent"
          />
        </div>
      </div>

      {/* Agent Data Display */}
      {agentData && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Agent Generated Data</h2>
          <div className="bg-gray-900 p-4 rounded">
            <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap overflow-x-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(agentData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Games Display */}
      {games.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🏈 NFL Schedule (Agent Generated)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game, index) => (
              <div key={game.id || index} className="bg-gray-700 p-4 rounded">
                <div className="text-white font-semibold">
                  {game.awayTeam} @ {game.homeTeam}
                </div>
                <div className="text-gray-300 text-sm mt-1">
                  📍 {game.venue || 'TBD'}, {game.location || 'TBD'}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  📅 {game.date ? new Date(game.date).toLocaleDateString() : 'TBD'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">📋 How to Use:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Use the chat interface above to ask the agent for NFL data</li>
          <li>The agent can fetch schedules, analyze games, research teams, etc.</li>
          <li>Click "Refresh Data" to update the display with latest agent responses</li>
          <li>Data will be automatically saved to the database for user display</li>
          <li>The main page will show the agent-generated content to users</li>
        </ol>
      </div>
    </div>
  );
};

export default RelevanceAIAgentEmbed;