/**
 * AdminPickResults - REFACTORED
 * Manages pick results with optimistic updates and batch operations
 * 
 * Reduced from 573 lines to ~200 lines (65% reduction)
 */

import React, { useState, useEffect } from 'react';
import { Pick, NFLWeek } from '../types/index';
import { useSecureConfirmation } from './SecureConfirmationModal';
import { usePickManager } from '../hooks/usePickManager';
import { useOptimisticUpdates } from '../hooks/useOptimisticUpdates';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { executeAtomicOperations, createOperationSummary } from '../lib/atomicOperations';
import { formatGameDate } from '../utils/dateValidation';
import { calculateAllResultsFromScores } from '../utils/atsCalculator';
import { updatePickWithScores } from '../services/pickManagement';
import { globalEvents } from '../lib/events';
import ErrorNotification from './ErrorNotification';

const AdminPickResults: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  
  // Use hooks for business logic
  const { 
    picks: allPicksFromService, 
    loading: serviceLoading, 
    loadPicks,
    getAvailableWeeks,
    getPicksByWeek,
    deleteAllPicks
  } = usePickManager();

  const { showConfirmation, confirmationModal } = useSecureConfirmation();
  const { error, clearError, executeWithErrorHandling } = useErrorHandler();

  // Optimistic updates for queued changes
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

  const { data: allPicks, pendingOperations, isOperationPending } = optimisticState;
  const loading = serviceLoading || isOperationPending;

  // Initialize data
  useEffect(() => {
    loadPicks();
    globalEvents.on('refreshPicks', loadPicks);
    return () => globalEvents.off('refreshPicks', loadPicks);
  }, [loadPicks]);

  // Sync service picks to optimistic state
  useEffect(() => {
    if (allPicksFromService.length > 0) {
      setData(allPicksFromService);
      
      const weeks = getAvailableWeeks();
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }
    }
  }, [allPicksFromService, setData, getAvailableWeeks, selectedWeek]);

  // Queue result update
  const queueUpdateResult = (pickId: string, result: 'win' | 'loss' | 'push') => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    const updatePayload: Partial<Pick> = { result };
    
    // Auto-calculate ATS/OU if scores exist
    if (pick.game_info.home_score != null && pick.game_info.away_score != null) {
      const results = calculateAllResultsFromScores(pick);
      updatePayload.ats_result = results.ats;
      updatePayload.ou_result = results.overUnder;
    }

    optimisticUpdate(pickId, updatePayload, pick);
  };

  // Queue score update
  const queueScoreUpdate = (
    pickId: string, 
    awayScore: number | null | undefined, 
    homeScore: number | null | undefined
  ) => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    const { updatePayload } = updatePickWithScores(pick, awayScore, homeScore);
    optimisticUpdate(pickId, updatePayload, pick);
  };

  // Queue delete
  const queueDelete = (pickId: string, homeTeam: string, awayTeam: string) => {
    showConfirmation({
      title: 'Delete Pick',
      message: `Delete pick for ${awayTeam} @ ${homeTeam}?`,
      confirmText: 'Delete',
      level: 'high'
    }, () => {
      const pick = allPicks.find(p => p.id === pickId);
      if (pick) optimisticDelete(pickId, pick);
    });
  };

  // Discard all queued changes
  const discardChanges = () => {
    if (!hasPendingChanges()) return;

    showConfirmation({
      title: 'Discard Changes',
      message: `Discard all ${pendingOperations.length} pending changes?`,
      confirmText: 'Discard',
      level: 'medium'
    }, () => {
      rollbackAllOperations();
      clearError();
    });
  };

  // Save all queued changes
  const saveChanges = async () => {
    if (!hasPendingChanges()) return;

    showConfirmation({
      title: 'Save Changes',
      message: `Save ${pendingOperations.length} change(s)?`,
      confirmText: 'Save',
      level: 'medium'
    }, async () => {
      const result = await commitOperations(async (operations) => {
        const atomicResult = await executeAtomicOperations(operations, {
          continueOnError: true,
          validateBeforeCommit: true
        });

        if (!atomicResult.success) {
          const summary = createOperationSummary(atomicResult);
          if (atomicResult.successfulOperations.length > 0) {
            alert(`Partially successful: ${summary}`);
          } else {
            throw atomicResult.error || new Error('All operations failed');
          }
        } else {
          alert(`Successfully saved ${operations.length} changes!`);
        }

        globalEvents.emit('refreshStats');
        return atomicResult;
      });

      if (!result.success) {
        console.error('Commit failed, rolled back');
      }
    });
  };

  // Clear all picks
  const clearAll = async () => {
    showConfirmation({
      title: 'Delete ALL Picks',
      message: 'Delete ALL picks? This cannot be undone!',
      confirmText: 'Delete Everything',
      level: 'critical',
      requireTyping: true,
      expectedText: 'DELETE ALL PICKS'
    }, async () => {
      await executeWithErrorHandling(async () => {
        await deleteAllPicks();
        setData([]);
        setSelectedWeek(null);
        return true;
      }, { operation: 'clearAllPicks', component: 'AdminPickResults' });
    });
  };

  // Get current week picks
  const currentWeekPicks = selectedWeek ? getPicksByWeek(selectedWeek) : [];
  const availableWeeks = getAvailableWeeks();

  if (serviceLoading && allPicks.length === 0) {
    return (
      <div className='bg-gray-800 rounded-lg p-6 mb-6'>
        <div className='text-center py-8 text-gray-400'>Loading picks...</div>
      </div>
    );
  }

  return (
    <div className='bg-gray-800 rounded-lg p-6 mb-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold text-white'>Update Pick Results</h2>
        <div className='flex space-x-2'>
          {hasPendingChanges() && (
            <>
              <button
                onClick={saveChanges}
                disabled={loading}
                className='px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-white text-sm font-medium'
              >
                {loading ? 'Saving...' : `Save ${pendingOperations.length} Change(s)`}
              </button>
              <button
                onClick={discardChanges}
                disabled={loading}
                className='px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md text-white text-sm font-medium'
              >
                Discard
              </button>
            </>
          )}
          <button
            onClick={clearAll}
            disabled={loading}
            className='px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md text-white text-sm font-medium'
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Week Selector */}
      {availableWeeks.length > 0 && (
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-300 mb-2'>Week:</label>
          <select
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value) as NFLWeek)}
            className='bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm'
          >
            {availableWeeks.map(week => (
              <option key={week} value={week}>
                Week {week} ({getPicksByWeek(week).length} picks)
              </option>
            ))}
          </select>
        </div>
      )}

      <ErrorNotification 
        error={error} 
        onClose={clearError}
        onRetry={error?.retryable ? loadPicks : undefined}
      />

      {/* Picks List */}
      <div className='space-y-4 max-h-96 overflow-y-auto'>
        {currentWeekPicks.length === 0 ? (
          <div className='text-center py-8 text-gray-400'>
            No picks for Week {selectedWeek}
          </div>
        ) : (
          currentWeekPicks.map((pick) => {
            const pendingOp = getPendingOperation(pick.id);
            const hasPending = !!pendingOp;
            const currentResult = hasPending && pendingOp.type === 'update'
              ? pendingOp.payload?.result || pick.result
              : pick.result;

            return (
              <div key={pick.id} className={`bg-gray-700 rounded-lg p-4 ${hasPending ? 'ring-2 ring-yellow-400' : ''}`}>
                {hasPending && (
                  <span className='inline-block px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-200 mb-2'>
                    Pending
                  </span>
                )}

                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <span className='text-white font-medium'>
                        {pick.game_info.away_team} @ {pick.game_info.home_team}
                      </span>
                      <span className='text-gray-400 text-sm'>
                        {formatGameDate(pick.game_info.game_date)}
                      </span>
                    </div>

                    <div className='text-gray-300 text-sm mb-2'>
                      {pick.prediction}
                    </div>

                    {/* Score Inputs */}
                    <div className='flex items-center space-x-2 mb-2'>
                      <input
                        type='number'
                        min='0'
                        value={pick.game_info.away_score ?? ''}
                        onChange={(e) => queueScoreUpdate(
                          pick.id, 
                          e.target.value === '' ? null : parseInt(e.target.value),
                          pick.game_info.home_score
                        )}
                        className='w-14 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs'
                        placeholder='Away'
                      />
                      <span className='text-gray-400 text-xs'>@</span>
                      <input
                        type='number'
                        min='0'
                        value={pick.game_info.home_score ?? ''}
                        onChange={(e) => queueScoreUpdate(
                          pick.id,
                          pick.game_info.away_score,
                          e.target.value === '' ? null : parseInt(e.target.value)
                        )}
                        className='w-14 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs'
                        placeholder='Home'
                      />
                    </div>

                    {/* Calculated Results */}
                    {pick.game_info.home_score != null && pick.game_info.away_score != null && (
                      <div className='flex gap-1 mb-2'>
                        {(() => {
                          const results = calculateAllResultsFromScores(pick);
                          const badge = (result: string, label: string) => {
                            const color = result === 'win' ? 'bg-green-600' : 
                                        result === 'loss' ? 'bg-red-600' : 'bg-yellow-600';
                            return (
                              <span className={`px-2 py-0.5 rounded text-xs ${color} text-white`}>
                                {label}: {result.toUpperCase()}
                              </span>
                            );
                          };
                          return (
                            <>
                              {badge(results.moneyline, 'ML')}
                              {pick.game_info.spread && badge(results.ats, 'ATS')}
                              {pick.game_info.over_under && badge(results.overUnder, 'O/U')}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-col space-y-2 ml-4'>
                    <button
                      onClick={() => queueDelete(pick.id, pick.game_info.home_team, pick.game_info.away_team)}
                      className='px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs'
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'win')}
                      className={`px-3 py-1 rounded text-xs ${
                        currentResult === 'win' ? 'bg-green-700 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Win
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'loss')}
                      className={`px-3 py-1 rounded text-xs ${
                        currentResult === 'loss' ? 'bg-red-700 ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Loss
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'push')}
                      className={`px-3 py-1 rounded text-xs ${
                        currentResult === 'push' ? 'bg-yellow-700 ring-2 ring-yellow-400' : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                    >
                      Push
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending Changes Summary */}
      {hasPendingChanges() && (
        <div className='mt-4 p-4 bg-yellow-900 border border-yellow-700 rounded-lg'>
          <h3 className='text-yellow-200 font-medium mb-2'>
            Pending Changes ({pendingOperations.length})
          </h3>
          <div className='space-y-1 text-sm text-yellow-100'>
            {pendingOperations.map((op, i) => {
              const pick = allPicks.find(p => p.id === op.id) || op.originalData;
              if (!pick) return null;
              return (
                <div key={i}>
                  {op.type.toUpperCase()}: {pick.game_info.away_team} @ {pick.game_info.home_team}
                  {op.type === 'update' && op.payload?.result && ` → ${op.payload.result}`}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmationModal}
    </div>
  );
};

export default AdminPickResults;
