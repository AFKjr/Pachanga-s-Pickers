import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, NFLWeek } from '../types/index';
import { useSecureConfirmation } from './SecureConfirmationModal';
import { getPickWeek } from '../utils/nflWeeks';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useOptimisticUpdates } from '../hooks/useOptimisticUpdates';
import { executeAtomicOperations, createOperationSummary } from '../lib/atomicOperations';
import { formatGameDate } from '../utils/dateValidation';
import ErrorNotification from './ErrorNotification';

const AdminPickResults: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<NFLWeek[]>([]);
  
  // Add secure confirmation state
  const { showConfirmation, confirmationModal } = useSecureConfirmation();
  
  // Add error handling
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();

  // Use optimistic updates for robust state management
  const {
    state: optimisticState,
    optimisticUpdate,
    optimisticDelete,
    commitOperations,
    rollbackAllOperations,
    setData,
    hasPendingChanges,
    getPendingOperation
  } = useOptimisticUpdates<Pick>();

  // Destructure optimistic state
  const { data: allPicks, pendingOperations, isOperationPending } = optimisticState;

  // Group picks by week
  const getPicksByWeek = (picks: Pick[]) => {
    const weekGroups: Record<NFLWeek, Pick[]> = {} as Record<NFLWeek, Pick[]>;

    picks.forEach(pick => {
      const week = getPickWeek(pick);
      if (!weekGroups[week]) {
        weekGroups[week] = [];
      }
      weekGroups[week].push(pick);
    });

    return weekGroups;
  };

  useEffect(() => {
    loadAllPicks();
  }, []);

  const loadAllPicks = async () => {
    const result = await executeWithErrorHandling(async () => {
      setLoading(true);
      const { data, error } = await picksApi.getAll();

      if (error) {
        throw error; // AppError from API
      }

      // Filter for picks that haven't been processed yet (pending) OR show all picks for admin management
      // This allows admins to see all picks and their current status
      const allPicksData = data || [];
      setData(allPicksData);

      // Calculate available weeks from all picks
      const weekGroups = getPicksByWeek(allPicksData);
      const weeks = Object.keys(weekGroups).map(w => parseInt(w)).sort((a, b) => b - a) as NFLWeek[]; // Most recent first
      setAvailableWeeks(weeks);

      // Set default to most recent week if not set
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }

      return true;
    }, {
      operation: 'loadAllPicks',
      component: 'AdminPickResults'
    });

    setLoading(false);
    return result;
  };

  const queueUpdateResult = (pickId: string, result: 'win' | 'loss' | 'push') => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    // Use optimistic update
    optimisticUpdate(pickId, { result }, pick);

    console.log(`Queued result update: ${pick.game_info.away_team} @ ${pick.game_info.home_team} -> ${result}`);
  };

  const queueDeletePick = (pickId: string) => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    // Use optimistic delete
    optimisticDelete(pickId, pick);

    console.log(`Queued deletion: ${pick.game_info.away_team} @ ${pick.game_info.home_team}`);
  };

  const discardAllChanges = () => {
    if (!hasPendingChanges()) return;

    showConfirmation({
      title: 'Discard Changes',
      message: `Discard all ${pendingOperations.length} pending changes? This will revert all queued updates and deletions.`,
      confirmText: 'Discard Changes',
      level: 'medium'
    }, () => {
      rollbackAllOperations();
      clearError();
      console.log('Discarded all pending changes');
    });
  };

  const saveAllChanges = async () => {
    if (!hasPendingChanges()) return;

    showConfirmation({
      title: 'Save Changes',
      message: `Save ${pendingOperations.length} change(s)? This will update the database and statistics.`,
      confirmText: 'Save Changes',
      level: 'medium'
    }, async () => {
      const result = await commitOperations(async (operations) => {
        // Use atomic operations for reliable batch processing
        const atomicResult = await executeAtomicOperations(operations, {
          continueOnError: true, // Try to save as many as possible
          validateBeforeCommit: true
        });

        if (!atomicResult.success) {
          // If some operations failed, show detailed feedback
          const summary = createOperationSummary(atomicResult);
          console.warn('Atomic operations completed with failures:', summary);
          
          if (atomicResult.successfulOperations.length > 0) {
            alert(`Partially successful: ${summary}`);
          } else {
            throw atomicResult.error || new Error('All operations failed');
          }
        } else {
          console.log(`✅ All ${operations.length} operations completed successfully`);
          alert(`Successfully saved all ${operations.length} changes!`);
        }

        // Notify other components to refresh stats
        globalEvents.emit('refreshStats');
        return atomicResult;
      });

      if (!result.success) {
        console.error('Commit operations failed, state has been rolled back');
      }
    });
  };

  const clearAllPicks = async () => {
    showConfirmation({
      title: 'Delete ALL Picks',
      message: 'Are you absolutely sure you want to delete ALL picks? This action cannot be undone and will permanently remove all prediction data, statistics, and history.',
      confirmText: 'Delete Everything',
      level: 'critical',
      requireTyping: true,
      expectedText: 'DELETE ALL PICKS'
    }, async () => {
      await executeWithErrorHandling(async () => {
        setLoading(true);

        // Get all picks
        const { data: allPicksData, error: fetchError } = await picksApi.getAll();
        if (fetchError) throw fetchError;

        // Delete all picks
        if (allPicksData) {
          for (const pick of allPicksData) {
            await picksApi.delete(pick.id);
          }
        }

        setData([]);
        setAvailableWeeks([]);
        setSelectedWeek(null);

        console.log(`Deleted ${allPicksData?.length || 0} picks`);
        setLoading(false);
        return true;
      }, {
        operation: 'clearAllPicks',
        component: 'AdminPickResults'
      });
    });
  };

  const deletePick = async (pickId: string, homeTeam: string, awayTeam: string) => {
    showConfirmation({
      title: 'Delete Pick',
      message: `Are you sure you want to delete the pick for ${awayTeam} @ ${homeTeam}? This will be queued for saving.`,
      confirmText: 'Delete Pick',
      level: 'high'
    }, () => {
      queueDeletePick(pickId);
    });
  };

  const updatePickResult = async (pickId: string, result: 'win' | 'loss' | 'push') => {
    queueUpdateResult(pickId, result);
  };

  if (loading) {
    return (
      <div className='bg-gray-800 rounded-lg p-6 mb-6'>
        <div className='text-center py-8'>
          <div className='text-gray-400'>Loading pending picks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-gray-800 rounded-lg p-6 mb-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold text-white'>📊 Update Pick Results</h2>
        <div className='flex space-x-2'>
          {hasPendingChanges() && (
            <>
              <button
                onClick={saveAllChanges}
                disabled={isOperationPending || loading}
                className='px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
              >
                {isOperationPending ? '💾 Saving...' : `💾 Save ${pendingOperations.length} Change(s)`}
              </button>
              <button
                onClick={discardAllChanges}
                disabled={isOperationPending || loading}
                className='px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
              >
                🗑️ Discard Changes
              </button>
            </>
          )}
          <button
            onClick={clearAllPicks}
            disabled={loading}
            className='px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Week Selector */}
      {availableWeeks.length > 0 && (
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-300 mb-2'>
            Select Week:
          </label>
          <select
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value) as NFLWeek)}
            className='bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            {availableWeeks.map(week => (
              <option key={week} value={week}>
                Week {week} ({getPicksByWeek(allPicks)[week]?.length || 0} picks)
              </option>
            ))}
          </select>
        </div>
      )}

      <ErrorNotification 
        error={error} 
        onClose={clearError}
        onRetry={error?.retryable ? loadAllPicks : undefined}
      />

      <div className='mb-4'>
        <p className='text-gray-400 text-sm'>
          Manage all picks and their results. Changes are queued locally and must be saved to update the database and statistics.
        </p>
      </div>

      {(() => {
        const weekGroups = getPicksByWeek(allPicks);
        const currentWeekPicks = selectedWeek ? weekGroups[selectedWeek] || [] : [];

        if (currentWeekPicks.length === 0) {
          return (
            <div className='text-center py-8'>
              <div className='text-gray-400 mb-2'>
                {selectedWeek ? `No pending picks for Week ${selectedWeek}` : 'No pending picks'}
              </div>
              {availableWeeks.length > 0 && (
                <div className='text-sm text-gray-500'>
                  Try selecting a different week above
                </div>
              )}
            </div>
          );
        }

        return (
          <div className='space-y-4 max-h-96 overflow-y-auto'>
            {currentWeekPicks.map((pick) => {
              const pendingOperation = getPendingOperation(pick.id);
              const hasPendingChange = !!pendingOperation;
              const currentResult = hasPendingChange && pendingOperation.type === 'update'
                ? pendingOperation.payload?.result || pick.result
                : pick.result;

              return (
                <div key={pick.id} className={`bg-gray-700 rounded-lg p-4 ${hasPendingChange ? 'ring-2 ring-yellow-400 bg-gray-650' : ''}`}>
                  {hasPendingChange && (
                    <div className='mb-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200'>
                        ⚠️ Pending Change
                      </span>
                    </div>
                  )}

                  {/* Current Result Status */}
                  <div className='mb-3'>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      currentResult === 'win' ? 'bg-green-900 text-green-200' :
                      currentResult === 'loss' ? 'bg-red-900 text-red-200' :
                      currentResult === 'push' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {currentResult === 'win' ? 'Win' :
                       currentResult === 'loss' ? 'Loss' :
                       currentResult === 'push' ? 'Push' :
                       'Pending'}
                    </span>
                  </div>

                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <span className='text-white font-medium'>
                          {pick.game_info.away_team} @ {pick.game_info.home_team}
                        </span>
                        <span className='text-gray-400 text-sm'>
                          {formatGameDate(pick.game_info.game_date)}
                        </span>
                        <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                          Week {getPickWeek(pick)}
                        </span>
                      </div>

                      <div className='text-gray-300 text-sm mb-2'>
                        Prediction: {pick.prediction}
                      </div>

                      <div className='text-gray-400 text-xs'>
                        Confidence: {pick.confidence}% • By: {pick.author_username || 'Unknown'}
                      </div>
                    </div>

                    <div className='flex space-x-2 ml-4'>
                      <button
                        onClick={() => deletePick(pick.id, pick.game_info.home_team, pick.game_info.away_team)}
                        disabled={isOperationPending}
                        className='px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded text-xs font-medium transition-colors'
                      >
                        {isOperationPending ? '...' : '🗑️ Delete'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'win')}
                        disabled={isOperationPending}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'win' ? 'bg-green-700 text-white ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                        }`}
                      >
                        {isOperationPending ? '...' : 'Win'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'loss')}
                        disabled={isOperationPending}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'loss' ? 'bg-red-700 text-white ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                        }`}
                      >
                        {isOperationPending ? '...' : 'Loss'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'push')}
                        disabled={isOperationPending}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'push' ? 'bg-yellow-700 text-white ring-2 ring-yellow-400' : 'bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50'
                        }`}
                      >
                        {isOperationPending ? '...' : 'Push'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {selectedWeek && (
        <div className='mt-4 text-sm text-gray-400'>
          Showing {getPicksByWeek(allPicks)[selectedWeek]?.length || 0} picks for Week {selectedWeek}
        </div>
      )}

      {hasPendingChanges() && (
        <div className='mt-4 p-4 bg-yellow-900 border border-yellow-700 rounded-lg'>
          <h3 className='text-yellow-200 font-medium mb-2'>📝 Pending Changes ({pendingOperations.length})</h3>
          <div className='space-y-1 text-sm text-yellow-100'>
            {pendingOperations.map((operation, index) => {
              const pick = allPicks.find(p => p.id === operation.id) || operation.originalData;
              if (!pick) return null;

              return (
                <div key={index} className='flex items-center justify-between'>
                  <span>
                    {operation.type === 'delete' ? '🗑️ DELETE:' : '📝 UPDATE:'} {pick.game_info.away_team} @ {pick.game_info.home_team}
                    {operation.type === 'update' && operation.payload?.result && (
                      <span className='ml-2 text-yellow-300'>
                        → {operation.payload.result === 'win' ? 'Win' : operation.payload.result === 'loss' ? 'Loss' : 'Push'}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className='mt-3 text-xs text-yellow-300'>
            💡 Click "Save Changes" to commit all changes to the database, or "Discard Changes" to revert.
          </div>
        </div>
      )}
      {confirmationModal}
    </div>
  );
};

export default AdminPickResults;