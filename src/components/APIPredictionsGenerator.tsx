import { NFLWeek } from '../types';
import { usePredictionGeneration } from '../hooks/usePredictionGeneration';

export default function APIPredictionsGenerator() {
  const {
    loading,
    error,
    success,
    predictions,
    targetWeek,
    setTargetWeek,
    generatePredictions
  } = usePredictionGeneration();

  return (
    <div className='bg-gray-800 rounded-lg p-6 mb-6'>
      <h2 className='text-xl font-semibold text-white mb-4'>
        Generate Monte Carlo Predictions
      </h2>

      <p className='text-gray-300 text-sm mb-4'>
        Generates live predictions using 10,000 Monte Carlo simulations per game with current odds, imported team stats, and weather data.
      </p>

      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-300 mb-2'>
          Target Week (Optional - leave empty for all upcoming games)
        </label>
        <select
          value={targetWeek || ''}
          onChange={(e) => setTargetWeek(e.target.value ? parseInt(e.target.value) as NFLWeek : null)}
          className='bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          <option value=''>All Weeks (Default)</option>
          {Array.from({ length: 18 }, (_, index) => index + 1).map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
      </div>

      <button
        onClick={generatePredictions}
        disabled={loading}
        className='px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white font-medium transition-colors'
      >
        {loading ? 'Generating...' : 'Generate Predictions'}
      </button>

      {error && (
        <div className='mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded'>
          <p className='font-semibold'>Error</p>
          <p className='text-sm'>{error}</p>
        </div>
      )}

      {success && (
        <div className='mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded'>
          <p className='font-semibold'>Success!</p>
          <p className='text-sm'>{success}</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className='mt-6'>
          <h3 className='text-lg font-semibold text-white mb-3'>
            Generated ({predictions.length})
          </h3>
          <div className='space-y-3 max-h-96 overflow-y-auto'>
            {predictions.map((prediction, index) => (
              <div key={index} className='bg-gray-700 rounded-lg p-4'>
                <div className='flex justify-between mb-2'>
                  <div>
                    <h4 className='text-white font-medium'>
                      {prediction.game_info.away_team} @ {prediction.game_info.home_team}
                    </h4>
                    <p className='text-xs text-gray-400'>{prediction.game_info.game_date}</p>
                  </div>
                  <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded h-fit'>
                    Week {prediction.week}
                  </span>
                </div>

                <div className='grid grid-cols-3 gap-3 mb-3'>
                  <div className='bg-gray-600 rounded p-2'>
                    <p className='text-xs text-gray-300 mb-1'>Moneyline</p>
                    <p className='text-sm text-white font-medium'>{prediction.prediction}</p>
                  </div>
                  <div className='bg-gray-600 rounded p-2'>
                    <p className='text-xs text-gray-300 mb-1'>Spread</p>
                    <p className='text-sm text-white font-medium'>{prediction.spread_prediction}</p>
                  </div>
                  <div className='bg-gray-600 rounded p-2'>
                    <p className='text-xs text-gray-300 mb-1'>Total</p>
                    <p className='text-sm text-white font-medium'>{prediction.ou_prediction}</p>
                  </div>
                </div>

                <div className='text-xs text-gray-300 bg-gray-600 rounded p-2 mb-2'>
                  <p>Score: {prediction.monte_carlo_results.predicted_home_score} - {prediction.monte_carlo_results.predicted_away_score}</p>
                  <p>Confidence: ML {prediction.monte_carlo_results.moneyline_probability.toFixed(1)}% | ATS {prediction.monte_carlo_results.spread_probability.toFixed(1)}% | O/U {prediction.monte_carlo_results.total_probability.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
