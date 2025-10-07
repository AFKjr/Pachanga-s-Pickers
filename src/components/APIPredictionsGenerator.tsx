import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { picksApi } from '../lib/api';

export default function APIPredictionsGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  const generatePredictions = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setPredictions([]);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call Vercel serverless function
      const response = await fetch('/api/generate-predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to generate predictions';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } else {
          const textError = await response.text();
          errorMessage = textError || `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response. Check Vercel function deployment.');
      }

      const data = await response.json();
      
      if (!data.predictions || !Array.isArray(data.predictions)) {
        throw new Error('Invalid response format from API');
      }
      
      setPredictions(data.predictions);

      // Save predictions to database with pinned flag
      let savedCount = 0;
      const saveErrors: string[] = [];
      
      for (const prediction of data.predictions) {
        const pickToSave = {
          ...prediction,
          is_pinned: true, // Mark AI predictions as pinned
          user_id: session.user.id // Ensure user_id is set
        };
        
        const { error: saveError } = await picksApi.create(pickToSave);
        if (!saveError) {
          savedCount++;
        } else {
          console.error('Failed to save prediction:', saveError);
          saveErrors.push(`${prediction.game_info.away_team} @ ${prediction.game_info.home_team}`);
        }
      }

      if (saveErrors.length > 0) {
        setSuccess(`Saved ${savedCount} predictions. Failed: ${saveErrors.join(', ')}`);
      } else {
        setSuccess(`Successfully generated and saved ${savedCount} predictions!`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Generate Predictions from APIs
      </h2>

      <div className="mb-4">
        <p className="text-gray-300 text-sm mb-2">
          This will fetch current NFL odds and run Monte Carlo simulations to generate predictions.
        </p>
        <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
          <li>Fetches latest odds from The Odds API</li>
          <li>Retrieves team statistics from ESPN</li>
          <li>Runs 10,000 Monte Carlo simulations per game</li>
          <li>Generates moneyline, spread, and total predictions</li>
        </ul>
      </div>

      <button
        onClick={generatePredictions}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors"
      >
        {loading ? 'Generating Predictions...' : 'Generate Predictions'}
      </button>

      {error && (
        <div className="mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
          <p className="font-semibold">Success!</p>
          <p className="text-sm">{success}</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Generated Predictions ({predictions.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {predictions.map((pred, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-medium">
                      {pred.game_info.away_team} @ {pred.game_info.home_team}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {pred.game_info.game_date}
                    </p>
                  </div>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Week {pred.week}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-600 rounded p-2">
                    <p className="text-xs text-gray-300 mb-1">Moneyline</p>
                    <p className="text-sm text-white font-medium">{pred.prediction}</p>
                    <p className="text-xs text-green-400">
                      {pred.monte_carlo_results.home_win_probability > 
                       pred.monte_carlo_results.away_win_probability 
                        ? pred.monte_carlo_results.home_win_probability.toFixed(1)
                        : pred.monte_carlo_results.away_win_probability.toFixed(1)}% prob
                    </p>
                  </div>

                  <div className="bg-gray-600 rounded p-2">
                    <p className="text-xs text-gray-300 mb-1">Spread</p>
                    <p className="text-sm text-white font-medium">{pred.spread_prediction}</p>
                    <p className="text-xs text-gray-400">Line: {pred.game_info.spread}</p>
                  </div>

                  <div className="bg-gray-600 rounded p-2">
                    <p className="text-xs text-gray-300 mb-1">Total</p>
                    <p className="text-sm text-white font-medium">{pred.ou_prediction}</p>
                    <p className="text-xs text-gray-400">Line: {pred.game_info.over_under}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-300 bg-gray-600 rounded p-2">
                  <p className="font-semibold mb-1">Simulation Results:</p>
                  <p className="text-gray-400">
                    Predicted Score: {pred.monte_carlo_results.predicted_home_score} - {pred.monte_carlo_results.predicted_away_score}
                  </p>
                  <p className="text-gray-400">
                    ML: {pred.monte_carlo_results.moneyline_probability.toFixed(1)}% | ATS: {pred.monte_carlo_results.spread_probability.toFixed(1)}% | O/U: {pred.monte_carlo_results.total_probability.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">How It Works:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Fetches current NFL game odds from The Odds API</li>
          <li>Retrieves team statistics from ESPN's free API</li>
          <li>Runs 10,000 Monte Carlo simulations per game</li>
          <li>Each simulation models quarter-by-quarter scoring</li>
          <li>Analyzes offensive vs defensive matchups</li>
          <li>Generates confidence-based recommendations</li>
          <li>Saves predictions to your database</li>
        </ol>
      </div>
    </div>
  );
}