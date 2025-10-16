/**
 * APIPredictionsGenerator - Generate live predictions with edge calculations
 * Generates AI predictions for upcoming games with betting edge analysis
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePickManager } from '../hooks/usePickManager';
import { EdgeCalculator } from '../utils/predictionEngine';
import { NFLWeek } from '../types';

export default function APIPredictionsGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [targetWeek, setTargetWeek] = useState<NFLWeek | null>(null);

  const { createPick } = usePickManager();

  const generatePredictions = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setPredictions([]);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('Calling /api/generate-predictions...');

      // Call Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/generate-predictions`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetWeek: targetWeek
        })
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
        setSuccess(`Successfully saved ${savedCount} predictions for upcoming games!`);
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

      {/* Week Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Target Week (Optional - leave empty for all upcoming games)
        </label>
        <select
          value={targetWeek || ''}
          onChange={(e) => setTargetWeek(e.target.value ? parseInt(e.target.value) as NFLWeek : null)}
          className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Weeks (Default)</option>
          {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePredictions}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors"
      >
        {loading ? 'Generating...' : 'Generate Predictions'}
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

                <div className="text-xs text-gray-300 bg-gray-600 rounded p-2 mb-2">
                  <p>Score: {pred.monte_carlo_results.predicted_home_score} - {pred.monte_carlo_results.predicted_away_score}</p>
                  <p>Confidence: ML {pred.monte_carlo_results.moneyline_probability.toFixed(1)}% | ATS {pred.monte_carlo_results.spread_probability.toFixed(1)}% | O/U {pred.monte_carlo_results.total_probability.toFixed(1)}%</p>
                </div>
                
                {/* Edge Analysis */}
                <EdgeAnalysisDisplay prediction={pred} />
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

// Edge Analysis Component
const EdgeAnalysisDisplay: React.FC<{ prediction: any }> = ({ prediction }) => {
  const { game_info, monte_carlo_results } = prediction;
  
  // Calculate edges for each bet type
  const calculateBetEdge = (probability: number, americanOdds: number) => {
    if (!americanOdds || americanOdds === 0) return null;
    return EdgeCalculator.analyzeEdge(probability / 100, americanOdds);
  };

  // Moneyline edge (use higher probability team)
  const homeWinProb = monte_carlo_results.home_win_probability;
  const awayWinProb = monte_carlo_results.away_win_probability;
  const mlProb = Math.max(homeWinProb, awayWinProb);
  const mlOdds = homeWinProb > awayWinProb ? game_info.home_ml : game_info.away_ml;
  const mlEdge = mlOdds ? calculateBetEdge(mlProb, mlOdds) : null;

  // Spread edge
  const spreadProb = monte_carlo_results.spread_probability;
  const spreadEdge = calculateBetEdge(spreadProb, -110); // Standard -110 odds

  // Total edge
  const totalProb = monte_carlo_results.total_probability;
  const totalEdge = calculateBetEdge(totalProb, -110); // Standard -110 odds

  // Helper to get edge color
  const getEdgeColor = (edgePercentage: number) => {
    if (edgePercentage >= 5) return 'text-green-400';
    if (edgePercentage >= 2) return 'text-yellow-400';
    return 'text-gray-400';
  };

  // Helper to get recommendation badge
  const getRecommendationBadge = (recommendation: string) => {
    if (recommendation === 'Strong Bet') return 'bg-green-600';
    if (recommendation === 'Moderate Bet') return 'bg-yellow-600';
    return 'bg-gray-600';
  };

  return (
    <div className="bg-gray-700 rounded p-3 border border-gray-600">
      <p className="text-xs font-semibold text-gray-300 mb-2">📊 Betting Edge Analysis</p>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Moneyline Edge */}
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400 mb-1">Moneyline</p>
          {mlEdge ? (
            <>
              <p className={`font-semibold ${getEdgeColor(mlEdge.edgePercentage)}`}>
                {mlEdge.edge > 0 ? '+' : ''}{mlEdge.edgePercentage.toFixed(1)}% edge
              </p>
              <p className="text-gray-400 mt-1">
                Implied: {mlEdge.impliedProbability.toFixed(1)}%
              </p>
              <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getRecommendationBadge(mlEdge.recommendation)}`}>
                {mlEdge.recommendation}
              </span>
              {mlEdge.kellyStake > 0 && (
                <p className="text-green-400 mt-1">
                  Kelly: {(mlEdge.kellyStake * 100).toFixed(1)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500">No odds</p>
          )}
        </div>

        {/* Spread Edge */}
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400 mb-1">Spread</p>
          {spreadEdge ? (
            <>
              <p className={`font-semibold ${getEdgeColor(spreadEdge.edgePercentage)}`}>
                {spreadEdge.edge > 0 ? '+' : ''}{spreadEdge.edgePercentage.toFixed(1)}% edge
              </p>
              <p className="text-gray-400 mt-1">
                Implied: {spreadEdge.impliedProbability.toFixed(1)}%
              </p>
              <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getRecommendationBadge(spreadEdge.recommendation)}`}>
                {spreadEdge.recommendation}
              </span>
              {spreadEdge.kellyStake > 0 && (
                <p className="text-green-400 mt-1">
                  Kelly: {(spreadEdge.kellyStake * 100).toFixed(1)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500">Error</p>
          )}
        </div>

        {/* Total Edge */}
        <div className="bg-gray-800 rounded p-2">
          <p className="text-gray-400 mb-1">Over/Under</p>
          {totalEdge ? (
            <>
              <p className={`font-semibold ${getEdgeColor(totalEdge.edgePercentage)}`}>
                {totalEdge.edge > 0 ? '+' : ''}{totalEdge.edgePercentage.toFixed(1)}% edge
              </p>
              <p className="text-gray-400 mt-1">
                Implied: {totalEdge.impliedProbability.toFixed(1)}%
              </p>
              <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getRecommendationBadge(totalEdge.recommendation)}`}>
                {totalEdge.recommendation}
              </span>
              {totalEdge.kellyStake > 0 && (
                <p className="text-green-400 mt-1">
                  Kelly: {(totalEdge.kellyStake * 100).toFixed(1)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500">Error</p>
          )}
        </div>
      </div>

      {/* Best Bet Recommendation */}
      {((mlEdge?.edgePercentage ?? 0) > 3 || (spreadEdge?.edgePercentage ?? 0) > 3 || (totalEdge?.edgePercentage ?? 0) > 3) && (
        <div className="mt-2 bg-green-900 border border-green-700 text-green-200 rounded px-2 py-1.5">
          <p className="text-xs font-semibold">⭐ Best Value:</p>
          <p className="text-xs">
            {mlEdge && (mlEdge.edgePercentage ?? 0) >= Math.max(spreadEdge?.edgePercentage || 0, totalEdge?.edgePercentage || 0) && 'Moneyline '}
            {spreadEdge && (spreadEdge.edgePercentage ?? 0) >= Math.max(mlEdge?.edgePercentage || 0, totalEdge?.edgePercentage || 0) && 'Spread '}
            {totalEdge && (totalEdge.edgePercentage ?? 0) >= Math.max(mlEdge?.edgePercentage || 0, spreadEdge?.edgePercentage || 0) && 'Over/Under '}
            ({Math.max(mlEdge?.edgePercentage || 0, spreadEdge?.edgePercentage || 0, totalEdge?.edgePercentage || 0).toFixed(1)}% edge)
          </p>
        </div>
      )}
    </div>
  );
};
