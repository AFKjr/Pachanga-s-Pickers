import React, { useState, useEffect } from 'react';
import { analyzeGame } from '../lib/sportsAnalysis';
import { espnAPI } from '../lib/espnAPI';
import { useAuth } from '../contexts/AuthContext';
import { picksApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ESPNGame } from '../types';

const AdminPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [games, setGames] = useState<ESPNGame[]>([]);
  const [selectedGame, setSelectedGame] = useState(0);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check admin status when user changes
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  // Load games on component mount
  useEffect(() => {
    if (isAdmin) {
      loadGames();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminCheckLoading(false);
      return;
    }

    try {
      setAdminCheckLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setAdminCheckLoading(false);
    }
  };

  const loadGames = async () => {
    try {
      setScheduleLoading(true);
      setScheduleError('');
      const fetchedGames = await espnAPI.getCurrentWeekGames();
      setGames(fetchedGames);
      if (fetchedGames.length > 0) {
        setSelectedGame(0);
      }
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to load games');
      console.error('Error loading games:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleGenerateSchedules = async () => {
    try {
      setScheduleLoading(true);
      setScheduleError('');
      const schedule = await espnAPI.fetchCurrentWeekSchedule();
      await espnAPI.saveScheduleToDatabase(schedule);
      setGames(schedule.games);
      if (schedule.games.length > 0) {
        setSelectedGame(0);
      }
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to generate schedules');
      console.error('Error generating schedules:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleGeneratePrediction = async () => {
    if (games.length === 0) {
      setError('No games available. Please generate schedules first.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis('');
    setSaveSuccess(false);

    try {
      const game = games[selectedGame];
      const result = await analyzeGame({
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameDate: game.date,
        location: game.location,
        spread: 0, // Will be updated when odds API is integrated
        overUnder: 0, // Will be updated when odds API is integrated
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

  const handleSavePrediction = async () => {
    if (!analysis || games.length === 0) {
      setError('No analysis available to save');
      return;
    }

    setSaveLoading(true);
    setError('');
    setSaveSuccess(false);

    try {
      const game = games[selectedGame];

      // Parse the AI analysis to extract prediction details
      // This is a simplified parsing - you might want to make the AI return structured data
      const prediction = analysis.includes('Chiefs') ? 'Chiefs -3.5' :
                        analysis.includes('Warriors') ? 'Warriors +2.5' :
                        `${game.homeTeam} ML`; // Default fallback

      const confidence = analysis.includes('85%') ? 85 :
                        analysis.includes('75%') ? 75 : 70; // Default confidence

      const pickData = {
        game_info: {
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          league: 'NFL' as const,
          game_date: game.date
        },
        prediction,
        confidence,
        reasoning: analysis,
        result: 'pending' as const,
        is_pinned: false
      };

      const result = await picksApi.create(pickData);

      if (result.error) throw result.error;

      setSaveSuccess(true);
      setAnalysis(''); // Clear analysis after successful save

      // Show success message
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prediction');
    } finally {
      setSaveLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || adminCheckLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          <h3 className="font-semibold mb-2">🔐 Authentication Required</h3>
          <p>Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Show admin access denied if not admin
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          <h3 className="font-semibold mb-2">👑 Admin Access Required</h3>
          <p>You need administrator privileges to access this panel.</p>
          <p className="text-sm mt-2">Contact an administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Prediction Generator</h1>
        <p className="text-gray-400">
          Generate AI-powered NFL predictions using injury reports, DVOA, FPI, and weather data
        </p>
      </div>

      {/* Schedule Management Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📅 Game Schedules</h2>
          <button
            onClick={handleGenerateSchedules}
            disabled={scheduleLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md font-medium transition-colors"
          >
            {scheduleLoading ? '🔄 Loading...' : '📡 Generate Schedules'}
          </button>
        </div>

        {scheduleError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {scheduleError}
          </div>
        )}

        {games.length > 0 && (
          <div className="text-sm text-gray-400 mb-4">
            Loaded {games.length} games for this week
          </div>
        )}
      </div>

      {/* Game Selection and Prediction Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Game:</label>
          {games.length === 0 ? (
            <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400">
              No games loaded. Click "Generate Schedules" above.
            </div>
          ) : (
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {games.map((game, index) => (
                <option key={game.id} value={index}>
                  {game.awayTeam} @ {game.homeTeam} ({new Date(game.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={handleGeneratePrediction}
          disabled={loading || games.length === 0}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-6 py-3 rounded-md font-medium transition-colors text-lg"
        >
          {loading ? '🤖 Generating AI Prediction...' : '🎯 Generate Prediction'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {analysis && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">🤖 AI Analysis Result</h3>
            <button
              onClick={handleSavePrediction}
              disabled={saveLoading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-md font-medium transition-colors"
            >
              {saveLoading ? '💾 Saving...' : '💾 Save Prediction'}
            </button>
          </div>
          <div className="bg-gray-900 p-4 rounded border-l-4 border-primary-500">
            <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed">
              {analysis}
            </pre>
          </div>
          {saveSuccess && (
            <div className="mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
              ✅ Prediction saved successfully!
            </div>
          )}
        </div>
      )}

      <div className="mt-8 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">💡 How It Works:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>AI searches for injury reports and player availability</li>
          <li>Analyzes DVOA (Defense-adjusted Value Over Average) metrics</li>
          <li>Checks FPI (Football Power Index) rankings</li>
          <li>Considers weather conditions for outdoor games</li>
          <li>Generates predictions targeting 54-55% accuracy (beating Vegas)</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;