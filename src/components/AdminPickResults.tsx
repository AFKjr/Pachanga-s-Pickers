import React, { useState, useEffect } from 'react';
import { Pick, NFLWeek } from '../types/index';
import { useSecureConfirmation } from './SecureConfirmationModal';
import { usePickManager } from '../hooks/usePickManager';
import { useOptimisticUpdates } from '../hooks/useOptimisticUpdates';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { picksApi } from '../lib/api';
import { formatGameDate } from '../utils/dateValidation';
import { calculateAllResultsFromScores } from '../utils/atsCalculator';
import { updatePickWithScores } from '../services/pickManagement';
import { globalEvents } from '../lib/events';
import ErrorNotification from './ErrorNotification';

const AdminPickResults: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  const [editingScores, setEditingScores] = useState<Record<string, { away: string; home: string }>>({});
  
  
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

  
  useEffect(() => {
    loadPicks();
    globalEvents.on('refreshPicks', loadPicks);
    return () => globalEvents.off('refreshPicks', loadPicks);
  }, [loadPicks]);

  
  useEffect(() => {
    if (allPicksFromService.length > 0) {
      setData(allPicksFromService);
      
      const weeks = getAvailableWeeks();
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }
    }
  }, [allPicksFromService, setData, getAvailableWeeks, selectedWeek]);

  
  const queueUpdateResult = (pickId: string, result: 'win' | 'loss' | 'push') => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    const updatePayload: Partial<Pick> = { result };
    
    
    if (pick.game_info.home_score != null && pick.game_info.away_score != null) {
      const results = calculateAllResultsFromScores(pick);
      updatePayload.ats_result = results.ats;
      updatePayload.ou_result = results.overUnder;
    }

    optimisticUpdate(pickId, updatePayload, pick);
  };

  
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

  
  const saveScoresForPick = (pickId: string) => {
    const editedScores = editingScores[pickId];
    if (!editedScores) return;

    
    const awayScore = editedScores.away === '' ? null : parseInt(editedScores.away, 10);
    const homeScore = editedScores.home === '' ? null : parseInt(editedScores.home, 10);

    if (awayScore === null && homeScore === null) return;
    if (awayScore !== null && (awayScore < 0 || awayScore > 99)) return;
    if (homeScore !== null && (homeScore < 0 || homeScore > 99)) return;

    queueScoreUpdate(pickId, awayScore, homeScore);

    setEditingScores(prev => {
      const updated = { ...prev };
      delete updated[pickId];
      return updated;
    });
  };

  const handleScoreKeyDown = (event: React.KeyboardEvent, pickId: string) => {
    if (event.key === 'Enter') {
      saveScoresForPick(pickId);
    }
  };

  
  const hasEditedScores = (pickId: string): boolean => {
    return editingScores[pickId] !== undefined;
  };

  
  const canSaveScores = (pickId: string): boolean => {
    const editedScores = editingScores[pickId];
    if (!editedScores) return false;
    
    const awayValue = editedScores.away;
    const homeValue = editedScores.home;
    
    
    if (awayValue === '' && homeValue === '') return false;
    
    if (awayValue !== '') {
      const away = parseInt(awayValue, 10);
      if (isNaN(away) || away < 0 || away > 99) return false;
    }
    if (homeValue !== '') {
      const home = parseInt(homeValue, 10);
      if (isNaN(home) || home < 0 || home > 99) return false;
    }
    
    return true;
  };

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

  
  const saveChanges = async () => {
    if (!hasPendingChanges()) return;

    showConfirmation({
      title: 'Save Changes',
      message: `Save ${pendingOperations.length} change(s)?`,
      confirmText: 'Save',
      level: 'medium'
    }, async () => {
      const result = await commitOperations(async (operations) => {
        
        const successfulOperations = [];
        const failedOperations = [];
        let firstError = null;

        for (const operation of operations) {
          try {
            if (operation.type === 'update' && operation.payload) {
              const { error } = await picksApi.update(operation.id, operation.payload);
              if (error) {
                throw error;
              }
              successfulOperations.push(operation);
            } else if (operation.type === 'delete') {
              
              throw new Error('Delete operations not implemented in this context');
            }
          } catch (error) {
            failedOperations.push(operation);
            if (!firstError) firstError = error;
            console.error(`Operation failed for ${operation.id}:`, error);
          }
        }

        const atomicResult = {
          success: failedOperations.length === 0,
          successfulOperations,
          failedOperations,
          error: firstError
        };

        if (!atomicResult.success) {
          const summary = `Successful: ${successfulOperations.length}, Failed: ${failedOperations.length}`;
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
      {}
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

      {}
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

      {}
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

            const isEditingScores = hasEditedScores(pick.id);
            const canSave = canSaveScores(pick.id);

            return (
                <div key={pick.id} className={`bg-gray-700 rounded-lg p-5 ${hasPending ? 'ring-2 ring-yellow-400' : ''}`}>
                {hasPending && (
                  <span className='inline-block px-2 py-1 rounded-full text-xs bg-yellow-900 text-yellow-200 mb-3'>
                    Pending
                  </span>
                )}

                <div className='flex justify-between items-start gap-4'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-3 mb-3'>
                      <span className='text-white font-medium text-base'>
                        {pick.game_info.away_team} @ {pick.game_info.home_team}
                      </span>
                      <span className='text-gray-400 text-sm'>
                        {formatGameDate(pick.game_info.game_date)}
                      </span>
                    </div>

                    <div className='text-gray-300 text-sm mb-3'>
                      {pick.prediction}
                    </div>

                    {}
                    {(pick.spread_prediction || pick.ou_prediction) && (
                      <div className='flex flex-wrap gap-2 mb-3'>
                        {pick.spread_prediction && (
                          <div className='bg-gray-600 px-2 py-1 rounded text-xs'>
                            <span className='text-gray-400'>ATS:</span>
                            <span className='text-white ml-1'>{pick.spread_prediction}</span>
                          </div>
                        )}
                        {pick.ou_prediction && (
                          <div className='bg-gray-600 px-2 py-1 rounded text-xs'>
                            <span className='text-gray-400'>O/U:</span>
                            <span className='text-white ml-1'>{pick.ou_prediction}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {}
                    <div className='flex items-center space-x-3 mb-3'>
                      <div className='flex flex-col'>
                        <label className='text-gray-400 text-xs mb-1'>Away Score</label>
                        <input
                          type='text'
                          inputMode='numeric'
                          value={
                            editingScores[pick.id]?.away !== undefined 
                              ? editingScores[pick.id].away 
                              : (pick.game_info.away_score?.toString() ?? '')
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value)) return;
                            
                            if (value !== '') {
                              const numValue = parseInt(value, 10);
                              if (numValue > 99) return;
                            }
                            
                            setEditingScores(prev => ({
                              ...prev,
                              [pick.id]: { 
                                away: value,
                                home: prev[pick.id]?.home ?? (pick.game_info.home_score?.toString() ?? '')
                              }
                            }));
                          }}
                          onKeyDown={(e) => handleScoreKeyDown(e, pick.id)}
                          className='w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          placeholder='0'
                        />
                      </div>
                      <span className='text-gray-400 text-sm mt-5'>@</span>
                      <div className='flex flex-col'>
                        <label className='text-gray-400 text-xs mb-1'>Home Score</label>
                        <input
                          type='text'
                          inputMode='numeric'
                          value={
                            editingScores[pick.id]?.home !== undefined 
                              ? editingScores[pick.id].home 
                              : (pick.game_info.home_score?.toString() ?? '')
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!/^[0-9]*$/.test(value)) return;
                            
                            if (value !== '') {
                              const numValue = parseInt(value, 10);
                              if (numValue > 99) return;
                            }
                            
                            setEditingScores(prev => ({
                              ...prev,
                              [pick.id]: { 
                                away: prev[pick.id]?.away ?? (pick.game_info.away_score?.toString() ?? ''),
                                home: value
                              }
                            }));
                          }}
                          onKeyDown={(e) => handleScoreKeyDown(e, pick.id)}
                          className='w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          placeholder='0'
                        />
                      </div>
                      
                      {}
                      {isEditingScores && (
                        <button
                          onClick={() => saveScoresForPick(pick.id)}
                          disabled={!canSave}
                          className='px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium text-white transition-colors mt-5'
                        >
                          Save Scores
                        </button>
                      )}
                    </div>

                    {}
                    {pick.game_info.home_score != null && pick.game_info.away_score != null && (
                      <div className='flex gap-2 mb-3'>
                        {(() => {
                          const results = calculateAllResultsFromScores(pick);
                          const badge = (result: string, label: string) => {
                            const color = result === 'win' ? 'bg-green-600' : 
                                        result === 'loss' ? 'bg-red-600' : 'bg-yellow-600';
                            return (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${color} text-white`}>
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

                  {}
                  <div className='flex flex-col space-y-2 min-w-[90px]'>
                    <button
                      onClick={() => queueDelete(pick.id, pick.game_info.home_team, pick.game_info.away_team)}
                      className='px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium text-white transition-colors'
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'win')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        currentResult === 'win' ? 'bg-green-700 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Win
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'loss')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        currentResult === 'loss' ? 'bg-red-700 ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Loss
                    </button>
                    <button
                      onClick={() => queueUpdateResult(pick.id, 'push')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
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

      {}
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