import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick } from '../types/index';
import { useSecureConfirmation } from './SecureConfirmationModal';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { validatePickData } from '../utils/inputValidation';
import ErrorNotification from './ErrorNotification';

interface PickRevisionProps {
  pick: Pick;
  onRevisionComplete?: (updatedPick: Pick) => void;
  onCancel?: () => void;
}

const AdminPickRevision: React.FC<PickRevisionProps> = ({ 
  pick, 
  onRevisionComplete, 
  onCancel 
}) => {
  
  const [formData, setFormData] = useState({
    prediction: pick.prediction,
    spreadPrediction: pick.spread_prediction || '', // NEW: Spread prediction text
    ouPrediction: pick.ou_prediction || '', // NEW: O/U prediction text
    confidence: pick.confidence,
    reasoning: pick.reasoning,
    result: pick.result || 'pending',
    homeTeam: pick.game_info.home_team,
    awayTeam: pick.game_info.away_team,
    gameDate: pick.game_info.game_date,
    spread: pick.game_info.spread?.toString() || '',
    overUnder: pick.game_info.over_under?.toString() || '',
    week: pick.week || 1,
    isPinned: pick.is_pinned || false,
    homeMLOdds: pick.game_info.home_ml_odds?.toString() || '',
    awayMLOdds: pick.game_info.away_ml_odds?.toString() || '',
    spreadOdds: pick.game_info.spread_odds?.toString() || '',
    overOdds: pick.game_info.over_odds?.toString() || '',
    underOdds: pick.game_info.under_odds?.toString() || ''
  });

  const [weatherOverride, setWeatherOverride] = useState({
    temperature: pick.weather?.temperature || '',
    windSpeed: pick.weather?.wind_speed || '',
    condition: pick.weather?.condition || ''
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { showConfirmation, confirmationModal } = useSecureConfirmation();
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();

  useEffect(() => {
    const originalData = {
      prediction: pick.prediction,
      spreadPrediction: pick.spread_prediction || '',
      ouPrediction: pick.ou_prediction || '',
      confidence: pick.confidence,
      reasoning: pick.reasoning,
      result: pick.result || 'pending',
      homeTeam: pick.game_info.home_team,
      awayTeam: pick.game_info.away_team,
      gameDate: pick.game_info.game_date,
      spread: pick.game_info.spread?.toString() || '',
      overUnder: pick.game_info.over_under?.toString() || '',
      week: pick.week || 1,
      isPinned: pick.is_pinned || false,
      homeMLOdds: pick.game_info.home_ml_odds?.toString() || '',
      awayMLOdds: pick.game_info.away_ml_odds?.toString() || '',
      spreadOdds: pick.game_info.spread_odds?.toString() || '',
      overOdds: pick.game_info.over_odds?.toString() || '',
      underOdds: pick.game_info.under_odds?.toString() || ''
    };

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasChanges);
  }, [formData, pick]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    clearError();
  };

  const validateAndSave = async () => {
    const validation = validatePickData({
      homeTeam: formData.homeTeam,
      awayTeam: formData.awayTeam,
      prediction: formData.prediction,
      reasoning: formData.reasoning,
      confidence: formData.confidence as number,
      week: formData.week as number,
      gameDate: formData.gameDate
    });

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const extractNumber = (text: string, defaultValue?: number): number | undefined => {
      const match = text.match(/[-+]?\d+\.?\d*/);
      return match ? parseFloat(match[0]) : defaultValue;
    };

    const spreadValue = formData.spreadPrediction ? extractNumber(formData.spreadPrediction, formData.spread ? parseFloat(formData.spread) : undefined) : (formData.spread ? parseFloat(formData.spread) : undefined);
    const ouValue = formData.ouPrediction ? extractNumber(formData.ouPrediction, formData.overUnder ? parseFloat(formData.overUnder) : undefined) : (formData.overUnder ? parseFloat(formData.overUnder) : undefined);

    const parseOdds = (value: string): number | undefined => {
      const num = parseInt(value);
      return isNaN(num) ? undefined : num;
    };

    const updates: Partial<Pick> = {
      prediction: validation.sanitizedData.prediction,
      spread_prediction: formData.spreadPrediction || undefined,
      ou_prediction: formData.ouPrediction || undefined,
      confidence: validation.sanitizedData.confidence,
      reasoning: validation.sanitizedData.reasoning,
      result: formData.result as 'win' | 'loss' | 'push' | 'pending',
      week: validation.sanitizedData.week,
      is_pinned: formData.isPinned,
      game_info: {
        home_team: validation.sanitizedData.homeTeam,
        away_team: validation.sanitizedData.awayTeam,
        league: pick.game_info.league,
        game_date: validation.sanitizedData.gameDate,
        spread: spreadValue,
        over_under: ouValue,
        home_score: pick.game_info.home_score,
        away_score: pick.game_info.away_score,
        
        home_ml_odds: parseOdds(formData.homeMLOdds),
        away_ml_odds: parseOdds(formData.awayMLOdds),
        spread_odds: parseOdds(formData.spreadOdds),
        over_odds: parseOdds(formData.overOdds),
        under_odds: parseOdds(formData.underOdds),
        
        favorite_team: pick.game_info.favorite_team,
        underdog_team: pick.game_info.underdog_team,
        favorite_is_home: pick.game_info.favorite_is_home
      }
    };

    
    if (weatherOverride.temperature !== '' || weatherOverride.windSpeed !== '' || weatherOverride.condition) {
      updates.weather = {
        temperature: typeof weatherOverride.temperature === 'number' ? weatherOverride.temperature : (pick.weather?.temperature || 72),
        wind_speed: typeof weatherOverride.windSpeed === 'number' ? weatherOverride.windSpeed : (pick.weather?.wind_speed || 0),
        condition: weatherOverride.condition || pick.weather?.condition || 'Clear',
        impact_rating: pick.weather?.impact_rating || 'none',
        description: pick.weather?.description || 'Manually overridden'
      };
      updates.weather_impact = `Manual override: ${updates.weather.temperature}°F, ${updates.weather.wind_speed}mph ${updates.weather.condition}`;
    }

    const { data, error } = await picksApi.update(pick.id, updates);
    if (error) throw error;

    
    globalEvents.emit('refreshStats');
    globalEvents.emit('refreshPicks');

    return data;
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    showConfirmation({
      title: 'Save Pick Revision',
      message: `Save changes to ${formData.awayTeam} @ ${formData.homeTeam}? This will update the published prediction.`,
      confirmText: 'Save Changes',
      level: 'medium'
    }, async () => {
      const result = await executeWithErrorHandling(async () => {
        setSaving(true);
        const updatedPick = await validateAndSave();
        setSaving(false);
        
        if (updatedPick && onRevisionComplete) {
          onRevisionComplete(updatedPick);
        }
        
        return true;
      }, {
        operation: 'savePickRevision',
        component: 'AdminPickRevision'
      });

      if (result) {
      }
      setSaving(false);
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      showConfirmation({
        title: 'Discard Changes',
        message: 'Discard all unsaved changes to this pick?',
        confirmText: 'Discard Changes',
        level: 'medium'
      }, () => {
        if (onCancel) onCancel();
      });
    } else {
      if (onCancel) onCancel();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Revise Pick: {formData.awayTeam} @ {formData.homeTeam}
        </h2>
        {hasChanges && (
          <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
            Unsaved Changes
          </span>
        )}
      </div>

      {error && (
        <ErrorNotification 
          error={error} 
          onClose={clearError}
          onRetry={error.retryable ? handleSave : undefined}
        />
      )}

      {}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Away Team
          </label>
          <input
            type="text"
            value={formData.awayTeam}
            onChange={(e) => handleInputChange('awayTeam', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Home Team
          </label>
          <input
            type="text"
            value={formData.homeTeam}
            onChange={(e) => handleInputChange('homeTeam', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
        </div>
      </div>

      {}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Game Date
          </label>
          <input
            type="date"
            value={formData.gameDate.split('T')[0]}
            onChange={(e) => handleInputChange('gameDate', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Week
          </label>
          <select
            value={formData.week}
            onChange={(e) => handleInputChange('week', parseInt(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Result Status
          </label>
          <select
            value={formData.result}
            onChange={(e) => handleInputChange('result', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="pending">Pending</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="push">Push</option>
          </select>
        </div>
      </div>

      {}
      <div className="space-y-4">
        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Prediction (Moneyline)
          </label>
          <input
            type="text"
            value={formData.prediction}
            onChange={(e) => handleInputChange('prediction', e.target.value)}
            placeholder="e.g., Cardinals to win"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
        </div>

        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Spread Prediction
          </label>
          <input
            type="text"
            value={formData.spreadPrediction}
            onChange={(e) => handleInputChange('spreadPrediction', e.target.value)}
            placeholder="e.g., Cardinals -3.5 to cover"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
          <div className="mt-1 text-xs text-gray-400">
            Current spread: {formData.spread || 'Not set'} • Edit in prediction text (e.g., "Cardinals -3.5")
          </div>
        </div>

        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Over/Under Prediction
          </label>
          <input
            type="text"
            value={formData.ouPrediction}
            onChange={(e) => handleInputChange('ouPrediction', e.target.value)}
            placeholder="e.g., Under 46.5"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
          <div className="mt-1 text-xs text-gray-400">
            Current total: {formData.overUnder || 'Not set'} • Edit in prediction text (e.g., "Under 46.5")
          </div>
        </div>
      </div>

      {}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-300">Manual Odds Entry</h3>
          <span className="text-xs text-blue-400">American odds format (e.g., -110, +150)</span>
        </div>
        
        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Moneyline Odds</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{formData.homeTeam}</label>
              <input
                type="number"
                value={formData.homeMLOdds}
                onChange={(e) => handleInputChange('homeMLOdds', e.target.value)}
                placeholder="-150"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{formData.awayTeam}</label>
              <input
                type="number"
                value={formData.awayMLOdds}
                onChange={(e) => handleInputChange('awayMLOdds', e.target.value)}
                placeholder="+130"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
          </div>
        </div>

        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Spread Odds</label>
          <input
            type="number"
            value={formData.spreadOdds}
            onChange={(e) => handleInputChange('spreadOdds', e.target.value)}
            placeholder="-110"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          />
          <div className="mt-1 text-xs text-gray-400">
            Typically -110 for both sides
          </div>
        </div>

        {}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Over/Under Odds</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Over</label>
              <input
                type="number"
                value={formData.overOdds}
                onChange={(e) => handleInputChange('overOdds', e.target.value)}
                placeholder="-110"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Under</label>
              <input
                type="number"
                value={formData.underOdds}
                onChange={(e) => handleInputChange('underOdds', e.target.value)}
                placeholder="-110"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-950 rounded p-3 text-xs text-blue-200">
          <strong className="block mb-1">💡 Auto Edge Calculation:</strong>
          When you save these odds, edge values will be automatically calculated based on Monte Carlo probabilities.
          Edge = Model Probability - Implied Probability from odds.
        </div>
      </div>

      {}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Weather Override (Optional)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Temp (°F)"
            value={weatherOverride.temperature || ''}
            onChange={(e) => setWeatherOverride({...weatherOverride, temperature: parseInt(e.target.value)})}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          />
          <input
            type="number"
            placeholder="Wind (mph)"
            value={weatherOverride.windSpeed || ''}
            onChange={(e) => setWeatherOverride({...weatherOverride, windSpeed: parseInt(e.target.value)})}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          />
          <select
            value={weatherOverride.condition || ''}
            onChange={(e) => setWeatherOverride({...weatherOverride, condition: e.target.value})}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          >
            <option value="">Condition</option>
            <option value="Clear">Clear</option>
            <option value="Clouds">Cloudy</option>
            <option value="Rain">Rain</option>
            <option value="Snow">Snow</option>
          </select>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          Current: {pick.weather_impact || 'No weather data'} • Leave blank to keep existing weather
        </div>
      </div>

      {}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Reasoning
        </label>
        <textarea
          value={formData.reasoning}
          onChange={(e) => handleInputChange('reasoning', e.target.value)}
          rows={4}
          placeholder="Analysis and reasoning for this prediction..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
      </div>

      {}
      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isPinned}
            onChange={(e) => handleInputChange('isPinned', e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-blue-600"
          />
          <span className="text-sm text-gray-300">Pin this pick</span>
        </label>
      </div>

      {}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>

      {}
      {hasChanges && (
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
          <h4 className="text-yellow-200 font-medium text-sm mb-2">Pending Changes:</h4>
          <ul className="text-yellow-100 text-xs space-y-1">
            {formData.prediction !== pick.prediction && (
              <li>• Prediction: "{pick.prediction}" → "{formData.prediction}"</li>
            )}
            {formData.result !== (pick.result || 'pending') && (
              <li>• Result: {pick.result || 'pending'} → {formData.result}</li>
            )}
            {formData.reasoning !== pick.reasoning && (
              <li>• Reasoning updated</li>
            )}
            {formData.homeTeam !== pick.game_info.home_team && (
              <li>• Home Team: {pick.game_info.home_team} → {formData.homeTeam}</li>
            )}
            {formData.awayTeam !== pick.game_info.away_team && (
              <li>• Away Team: {pick.game_info.away_team} → {formData.awayTeam}</li>
            )}
            {formData.homeMLOdds !== (pick.game_info.home_ml_odds?.toString() || '') && (
              <li>• Home ML Odds: {pick.game_info.home_ml_odds || 'none'} → {formData.homeMLOdds || 'none'} (Edge will recalculate)</li>
            )}
            {formData.awayMLOdds !== (pick.game_info.away_ml_odds?.toString() || '') && (
              <li>• Away ML Odds: {pick.game_info.away_ml_odds || 'none'} → {formData.awayMLOdds || 'none'} (Edge will recalculate)</li>
            )}
            {formData.spreadOdds !== (pick.game_info.spread_odds?.toString() || '') && (
              <li>• Spread Odds: {pick.game_info.spread_odds || 'none'} → {formData.spreadOdds || 'none'} (Edge will recalculate)</li>
            )}
            {formData.overOdds !== (pick.game_info.over_odds?.toString() || '') && (
              <li>• Over Odds: {pick.game_info.over_odds || 'none'} → {formData.overOdds || 'none'} (Edge will recalculate)</li>
            )}
            {formData.underOdds !== (pick.game_info.under_odds?.toString() || '') && (
              <li>• Under Odds: {pick.game_info.under_odds || 'none'} → {formData.underOdds || 'none'} (Edge will recalculate)</li>
            )}
          </ul>
        </div>
      )}

      {confirmationModal}
    </div>
  );
};

export default AdminPickRevision;