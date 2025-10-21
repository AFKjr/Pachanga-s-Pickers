import React, { useState } from 'react';
import { NFLWeek, Pick } from '../types';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';

interface ManualGameEntryProps {
  defaultWeek?: NFLWeek;
  onSuccess?: () => void;
}

const ManualGameEntry: React.FC<ManualGameEntryProps> = ({ defaultWeek, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    week: defaultWeek || 1,
    homeTeam: '',
    awayTeam: '',
    gameDate: '',
    homeMLOdds: '',
    awayMLOdds: '',
    spread: '',
    spreadOdds: '',
    total: '',
    overOdds: '',
    underOdds: '',
    prediction: '',
    spreadPrediction: '',
    ouPrediction: '',
    reasoning: 'Manually entered game',
    confidence: 50
  });

  const nflTeams = [
    'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
    'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
    'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
    'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
    'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
    'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
    'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
    'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.homeTeam || !formData.awayTeam) {
      setError('Both home and away teams are required');
      return;
    }

    if (formData.homeTeam === formData.awayTeam) {
      setError('Home and away teams must be different');
      return;
    }

    if (!formData.gameDate) {
      setError('Game date is required');
      return;
    }

    if (!formData.prediction) {
      setError('Moneyline prediction is required');
      return;
    }

    setSaving(true);

    try {
      // Parse numeric values
      const homeMLOdds = formData.homeMLOdds ? parseInt(formData.homeMLOdds) : undefined;
      const awayMLOdds = formData.awayMLOdds ? parseInt(formData.awayMLOdds) : undefined;
      const spread = formData.spread ? parseFloat(formData.spread) : undefined;
      const spreadOdds = formData.spreadOdds ? parseInt(formData.spreadOdds) : -110;
      const total = formData.total ? parseFloat(formData.total) : undefined;
      const overOdds = formData.overOdds ? parseInt(formData.overOdds) : -110;
      const underOdds = formData.underOdds ? parseInt(formData.underOdds) : -110;

      // Build pick object
      const newPick: Omit<Pick, 'id' | 'created_at' | 'updated_at'> = {
        schedule_id: null,
        game_info: {
          home_team: formData.homeTeam,
          away_team: formData.awayTeam,
          league: 'NFL',
          game_date: formData.gameDate,
          spread: spread,
          over_under: total,
          home_score: null,
          away_score: null,
          home_ml_odds: homeMLOdds,
          away_ml_odds: awayMLOdds,
          spread_odds: spreadOdds,
          over_odds: overOdds,
          under_odds: underOdds,
          favorite_team: spread && spread < 0 ? formData.homeTeam : formData.awayTeam,
          underdog_team: spread && spread < 0 ? formData.awayTeam : formData.homeTeam,
          favorite_is_home: spread ? spread < 0 : undefined
        },
        prediction: formData.prediction,
        spread_prediction: formData.spreadPrediction || undefined,
        ou_prediction: formData.ouPrediction || undefined,
        confidence: formData.confidence,
        reasoning: formData.reasoning,
        result: 'pending',
        ats_result: formData.spreadPrediction ? 'pending' : undefined,
        ou_result: formData.ouPrediction ? 'pending' : undefined,
        week: formData.week as NFLWeek,
        monte_carlo_results: undefined,
        weather: null,
        weather_impact: undefined,
        user_id: '', // Will be set by API
        moneyline_edge: undefined,
        spread_edge: undefined,
        ou_edge: undefined
      };

      const { data, error: saveError } = await picksApi.create(newPick);

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save pick');
      }

      // Success
      console.log('Manual game saved successfully:', data);
      
      // Reset form
      setFormData({
        week: defaultWeek || 1,
        homeTeam: '',
        awayTeam: '',
        gameDate: '',
        homeMLOdds: '',
        awayMLOdds: '',
        spread: '',
        spreadOdds: '',
        total: '',
        overOdds: '',
        underOdds: '',
        prediction: '',
        spreadPrediction: '',
        ouPrediction: '',
        reasoning: 'Manually entered game',
        confidence: 50
      });

      // Close modal
      setIsOpen(false);

      // Notify parent and refresh
      if (onSuccess) {
        onSuccess();
      }
      globalEvents.emit('refreshPicks');
      globalEvents.emit('refreshStats');

      alert('Game added successfully!');
    } catch (err) {
      console.error('Error saving manual game:', err);
      setError(err instanceof Error ? err.message : 'Failed to save game');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm font-medium flex items-center gap-2"
      >
        <span>➕</span>
        Add Missing Game
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Add Missing Game</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-600 text-white p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Week and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Week *
                </label>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={formData.week}
                  onChange={(e) => handleInputChange('week', parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.gameDate}
                  onChange={(e) => handleInputChange('gameDate', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  required
                />
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Away Team *
                </label>
                <select
                  value={formData.awayTeam}
                  onChange={(e) => handleInputChange('awayTeam', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  required
                >
                  <option value="">Select Away Team</option>
                  {nflTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Home Team *
                </label>
                <select
                  value={formData.homeTeam}
                  onChange={(e) => handleInputChange('homeTeam', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  required
                >
                  <option value="">Select Home Team</option>
                  {nflTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Moneyline Odds */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Moneyline</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Away ML Odds
                  </label>
                  <input
                    type="number"
                    placeholder="-110"
                    value={formData.awayMLOdds}
                    onChange={(e) => handleInputChange('awayMLOdds', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Home ML Odds
                  </label>
                  <input
                    type="number"
                    placeholder="-110"
                    value={formData.homeMLOdds}
                    onChange={(e) => handleInputChange('homeMLOdds', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ML Pick *
                  </label>
                  <select
                    value={formData.prediction}
                    onChange={(e) => handleInputChange('prediction', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select Winner</option>
                    <option value={formData.awayTeam + ' to win'} disabled={!formData.awayTeam}>
                      {formData.awayTeam || 'Away Team'} to win
                    </option>
                    <option value={formData.homeTeam + ' to win'} disabled={!formData.homeTeam}>
                      {formData.homeTeam || 'Home Team'} to win
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Spread */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Spread (Optional)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Spread (Home)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="-3.5"
                    value={formData.spread}
                    onChange={(e) => handleInputChange('spread', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Spread Odds
                  </label>
                  <input
                    type="number"
                    placeholder="-110"
                    value={formData.spreadOdds}
                    onChange={(e) => handleInputChange('spreadOdds', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Spread Pick
                  </label>
                  <input
                    type="text"
                    placeholder="Team Name +3.5"
                    value={formData.spreadPrediction}
                    onChange={(e) => handleInputChange('spreadPrediction', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Over/Under */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Over/Under (Optional)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="45.5"
                    value={formData.total}
                    onChange={(e) => handleInputChange('total', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Over Odds
                  </label>
                  <input
                    type="number"
                    placeholder="-110"
                    value={formData.overOdds}
                    onChange={(e) => handleInputChange('overOdds', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Under Odds
                  </label>
                  <input
                    type="number"
                    placeholder="-110"
                    value={formData.underOdds}
                    onChange={(e) => handleInputChange('underOdds', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    O/U Pick
                  </label>
                  <input
                    type="text"
                    placeholder="Over 45.5"
                    value={formData.ouPrediction}
                    onChange={(e) => handleInputChange('ouPrediction', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="border-t border-gray-700 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.confidence}
                    onChange={(e) => handleInputChange('confidence', parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reasoning
                  </label>
                  <input
                    type="text"
                    value={formData.reasoning}
                    onChange={(e) => handleInputChange('reasoning', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add Game'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualGameEntry;
