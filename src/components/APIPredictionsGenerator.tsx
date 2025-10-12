/**
 * APIPredictionsGenerator - REFACTORED with Week Selection
 * Generates AI predictions from API with week selection capability
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePickManager } from '../hooks/usePickManager';

export default function APIPredictionsGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  // NEW: Week selection state
  const [mode, setMode] = useState<'live' | 'historical'>('live');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [useStoredOdds, setUseStoredOdds] = useState(false);

  const { createPick } = usePickManager();

  const generatePredictions = async () => {
    // Validation: Historical mode requires week selection
    if (mode === 'historical' && !selectedWeek) {
      setError('Please select a week for historical mode');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setPredictions([]);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Build request body
      const requestBody = mode === 'historical' && selectedWeek
        ? { targetWeek: selectedWeek, useStoredOdds }
        : {};

      console.log(`Calling /api/generate-predictions in ${mode} mode...`, requestBody);

      // Call API
      const response = await fetch('/api/generate-predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.error('API Error - Content-Type:', contentType);

        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          console.error('API Error Data:', errorData);
          throw new Error(errorData.error || errorData.details || errorData.hint || 'API error');
        }
        const textError = await response.text();
        console.error('API Error Text:', textError);
        throw new Error(textError || `HTTP ${response.status}: Failed to generate predictions`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid API response format');
      }

      const data = await response.json();
      if (!data.predictions || !Array.isArray(data.predictions)) {
        throw new Error('Invalid response format');
      }

      setPredictions(data.predictions);

      // Save using hook
      let savedCount = 0;
      const saveErrors: string[] = [];

      for (const prediction of data.predictions) {
        const pickData = {
          ...prediction,
          is_pinned: true,
          user_id: session.user.id
        };

        const saved = await createPick(pickData);
        if (saved) {
          savedCount++;
        } else {
          saveErrors.push(`${prediction.game_info.away_team} @ ${prediction.game_info.home_team}`);
        }
      }

      if (saveErrors.length > 0) {
        setSuccess(`Saved ${savedCount}/${data.predictions.length}. Failed: ${saveErrors.join(', ')}`);
      } else {
        const modeText = mode === 'historical' ? `Week ${selectedWeek}` : 'upcoming games';
        setSuccess(`Successfully saved ${savedCount} predictions for ${modeText}!`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Generate Monte Carlo Predictions
      </h2>

      <p className="text-gray-300 text-sm mb-4">
        Generates predictions using 10,000 Monte Carlo simulations per game with live odds, imported team stats, and weather data.
      </p>

      {/* Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Prediction Mode
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode('live');
              setSelectedWeek(null);
              setUseStoredOdds(false);
            }}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🔴</span>
              <span>Live (Upcoming Games)</span>
            </div>
          </button>
          <button
            onClick={() => setMode('historical')}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'historical'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>📅</span>
              <span>Historical (Specific Week)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Week Selector (only show in historical mode) */}
      {mode === 'historical' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Week
            </label>
            <select
              value={selectedWeek || ''}
              onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loading}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="">Choose a week...</option>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>
          
          {/* NEW: Stored Odds Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useStoredOdds}
                onChange={(e) => setUseStoredOdds(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300">
                Use stored historical odds (True Historical Mode)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-6">
              {useStoredOdds 
                ? '✅ Will use odds captured when Week ' + (selectedWeek || '?') + ' games were originally played'
                : '⚠️ Will use current odds from The Odds API (Hybrid Mode)'}
            </p>
          </div>
        </>
      )}

      {/* Mode Description */}
      <div className={`mb-4 px-4 py-2 rounded text-sm ${
        mode === 'live'
          ? 'bg-blue-900 border border-blue-700 text-blue-200'
          : useStoredOdds
            ? 'bg-purple-900 border border-purple-700 text-purple-200'
            : 'bg-yellow-900 border border-yellow-700 text-yellow-200'
      }`}>
        {mode === 'live' ? (
          <>
            <p className="font-semibold">📊 Live Mode:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Fetches current NFL games from The Odds API</li>
              <li>Uses latest available team stats</li>
              <li>Captures live odds at time of generation</li>
            </ul>
          </>
        ) : useStoredOdds ? (
          <>
            <p className="font-semibold">�️ True Historical Mode:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Uses Week {selectedWeek || '?'} team stats from database</li>
              <li>Uses odds stored when Week {selectedWeek || '?'} was originally played</li>
              <li>Generates predictions as they would have been at that time</li>
              <li>Requires: Week {selectedWeek || '?'} must have been generated previously</li>
            </ul>
          </>
        ) : (
          <>
            <p className="font-semibold">📅 Hybrid Historical Mode:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Uses Week {selectedWeek || '?'} team stats from database</li>
              <li>Uses current odds from The Odds API</li>
              <li>Useful for "what-if" analysis or backtesting</li>
            </ul>
          </>
        )}
      </div>

      {/* Prerequisites Info */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-2 rounded text-sm mb-4">
        <p className="font-semibold">📊 Prerequisites:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Import {mode === 'historical' ? `Week ${selectedWeek || '[X]'}` : 'latest'} stats via Team Stats → CSV Import</li>
          <li>Ensure ODDS_API_KEY is set in environment variables</li>
          <li>Optional: Set OPENWEATHER_API_KEY for weather adjustments</li>
        </ul>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePredictions}
        disabled={loading || (mode === 'historical' && !selectedWeek)}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors"
      >
        {loading ? 'Generating...' : `Generate ${mode === 'live' ? 'Live' : `Week ${selectedWeek || '?'}`} Predictions`}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
          <p className="font-semibold">Success!</p>
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Predictions List */}
      {predictions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Generated ({predictions.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {predictions.map((pred, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <h4 className="text-white font-medium">
                      {pred.game_info.away_team} @ {pred.game_info.home_team}
                    </h4>
                    <p className="text-xs text-gray-400">{pred.game_info.game_date}</p>
                  </div>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded h-fit">
                    Week {pred.week}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <PredictionCard
                    title="Moneyline"
                    prediction={pred.prediction}
                    probability={Math.max(
                      pred.monte_carlo_results.home_win_probability,
                      pred.monte_carlo_results.away_win_probability
                    )}
                  />
                  <PredictionCard
                    title="Spread"
                    prediction={pred.spread_prediction}
                    line={pred.game_info.spread}
                  />
                  <PredictionCard
                    title="Total"
                    prediction={pred.ou_prediction}
                    line={pred.game_info.over_under}
                  />
                </div>

                <div className="text-xs text-gray-300 bg-gray-600 rounded p-2">
                  <p>Score: {pred.monte_carlo_results.predicted_home_score} - {pred.monte_carlo_results.predicted_away_score}</p>
                  <p>Confidence: ML {pred.monte_carlo_results.moneyline_probability.toFixed(1)}% | ATS {pred.monte_carlo_results.spread_probability.toFixed(1)}% | O/U {pred.monte_carlo_results.total_probability.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component
const PredictionCard: React.FC<{
  title: string;
  prediction: string;
  probability?: number;
  line?: number;
}> = ({ title, prediction, probability, line }) => (
  <div className="bg-gray-600 rounded p-2">
    <p className="text-xs text-gray-300 mb-1">{title}</p>
    <p className="text-sm text-white font-medium">{prediction}</p>
    {probability && (
      <p className="text-xs text-green-400">{probability.toFixed(1)}% prob</p>
    )}
    {line !== undefined && (
      <p className="text-xs text-gray-400">Line: {line}</p>
    )}
  </div>
);
