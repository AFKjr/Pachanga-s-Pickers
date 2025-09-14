import React, { useState } from 'react';
import { analyzeGame } from '../lib/sportsAnalysis';

interface GameData {
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  location: string;
  spread: string;
  overUnder: string;
}

const AdminPanel: React.FC = () => {
  const [gameData, setGameData] = useState<GameData>({
    homeTeam: '',
    awayTeam: '',
    gameDate: '',
    location: '',
    spread: '',
    overUnder: '',
  });

  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGameData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAnalyze = async () => {
    if (!gameData.homeTeam || !gameData.awayTeam || !gameData.gameDate) {
      setError('Please fill in at least home team, away team, and game date.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const result = await analyzeGame({
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.awayTeam,
        gameDate: gameData.gameDate,
        location: gameData.location || undefined,
        spread: gameData.spread ? parseFloat(gameData.spread) : undefined,
        overUnder: gameData.overUnder ? parseFloat(gameData.overUnder) : undefined,
      });

      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setGameData({
      homeTeam: '',
      awayTeam: '',
      gameDate: '',
      location: '',
      spread: '',
      overUnder: '',
    });
    setAnalysis('');
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Sports Analysis Admin</h1>
        <p className="text-gray-400">
          Generate AI-powered predictions using injury reports, DVOA, FPI, and weather data
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Game Analysis</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Home Team</label>
            <input
              type="text"
              name="homeTeam"
              value={gameData.homeTeam}
              onChange={handleInputChange}
              placeholder="e.g., Kansas City Chiefs"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Away Team</label>
            <input
              type="text"
              name="awayTeam"
              value={gameData.awayTeam}
              onChange={handleInputChange}
              placeholder="e.g., Buffalo Bills"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Game Date</label>
            <input
              type="datetime-local"
              name="gameDate"
              value={gameData.gameDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={gameData.location}
              onChange={handleInputChange}
              placeholder="e.g., Kansas City, MO"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Current Spread</label>
            <input
              type="number"
              name="spread"
              value={gameData.spread}
              onChange={handleInputChange}
              step="0.5"
              placeholder="e.g., -3.5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Over/Under</label>
            <input
              type="number"
              name="overUnder"
              value={gameData.overUnder}
              onChange={handleInputChange}
              step="0.5"
              placeholder="e.g., 47.5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-6 py-2 rounded-md font-medium transition-colors"
          >
            {loading ? 'Analyzing...' : 'Generate AI Prediction'}
          </button>

          <button
            onClick={handleClear}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {analysis && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">AI Analysis Result</h3>
          <div className="bg-gray-900 p-4 rounded border-l-4 border-primary-500">
            <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm">
              {analysis}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">Setup Required:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Add your OpenAI API key to <code className="bg-blue-800 px-1 rounded">VITE_OPENAI_API_KEY</code></li>
          <li>Add your Google CSE ID to <code className="bg-blue-800 px-1 rounded">VITE_GOOGLE_CSE_ID</code></li>
          <li>Add your Google API key to <code className="bg-blue-800 px-1 rounded">VITE_GOOGLE_API_KEY</code></li>
          <li>Add your OpenWeather API key to <code className="bg-blue-800 px-1 rounded">VITE_OPENWEATHER_API_KEY</code></li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;