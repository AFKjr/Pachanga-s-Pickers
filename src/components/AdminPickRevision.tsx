import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, GameInfo, ConfidenceLevel, NFLWeek } from '../types/index';
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
  // Form state for all editable fields
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
    isPinned: pick.is_pinned || false
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { showConfirmation, confirmationModal } = useSecureConfirmation();
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();

  // Track changes
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
      isPinned: pick.is_pinned || false
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
    // Validate all data
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

    // Extract spread and O/U values from prediction text
    const extractNumber = (text: string, defaultValue?: number): number | undefined => {
      const match = text.match(/[-+]?\d+\.?\d*/);
      return match ? parseFloat(match[0]) : defaultValue;
    };

    const spreadValue = formData.spreadPrediction ? extractNumber(formData.spreadPrediction, formData.spread ? parseFloat(formData.spread) : undefined) : (formData.spread ? parseFloat(formData.spread) : undefined);
    const ouValue = formData.ouPrediction ? extractNumber(formData.ouPrediction, formData.overUnder ? parseFloat(formData.overUnder) : undefined) : (formData.overUnder ? parseFloat(formData.overUnder) : undefined);

    // Prepare update payload
    const updates: Partial<Pick> = {
      prediction: validation.sanitizedData.prediction,
      spread_prediction: formData.spreadPrediction || undefined,
      ou_prediction: formData.ouPrediction || undefined,
      confidence: validation.sanitizedData.confidence as ConfidenceLevel,
      reasoning: validation.sanitizedData.reasoning,
      result: formData.result as 'win' | 'loss' | 'push' | 'pending',
      week: validation.sanitizedData.week as NFLWeek,
      is_pinned: formData.isPinned,
      game_info: {
        home_team: validation.sanitizedData.homeTeam,
        away_team: validation.sanitizedData.awayTeam,
        league: pick.game_info.league,
        game_date: validation.sanitizedData.gameDate,
        spread: spreadValue,
        over_under: ouValue
      } as GameInfo
    };

    console.log('Saving pick revision:', updates);

    const { data, error } = await picksApi.update(pick.id, updates);
    if (error) throw error;

    // Emit events to refresh other components
    globalEvents.emit('refreshStats');
    globalEvents.emit('refreshPicks');
    console.log('📡 Emitted refresh events after pick revision');

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
        console.log('Pick revision saved successfully');
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

      {/* Game Information */}
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

      {/* Game Details */}
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

      {/* Predictions Section */}
      <div className="space-y-4">
        {/* Moneyline Prediction */}
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

        {/* Spread Prediction */}
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

        {/* O/U Prediction */}
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

      {/* Reasoning */}
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

      {/* Options */}
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

      {/* Action Buttons */}
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

      {/* Change Summary */}
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
          </ul>
        </div>
      )}

      {confirmationModal}
    </div>
  );
};

export default AdminPickRevision;