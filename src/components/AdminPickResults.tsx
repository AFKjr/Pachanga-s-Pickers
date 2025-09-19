import React, { useState, useEffect } from 'react';
import { picksApi, agentStatsApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, NFLWeek } from '../types/index';

interface PendingChange {
  id: string;
  type: 'update' | 'delete';
  result?: 'win' | 'loss' | 'push';
  originalPick?: Pick;
}

const AdminPickResults: React.FC = () => {
  const [allPicks, setAllPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<NFLWeek[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [saving, setSaving] = useState(false);

  // Get NFL week from stored week data or fallback to date calculation
  const getNFLWeek = (pick: Pick): NFLWeek => {
    // Use stored week if available
    if (pick.week) {
      console.log(`Using stored week ${pick.week} for ${pick.game_info.away_team} @ ${pick.game_info.home_team}`);
      return pick.week;
    }

    // Fallback to date calculation if week not stored
    const gameDateObj = new Date(pick.game_info.game_date);
    const seasonStart = new Date('2025-09-05'); // NFL Season starts Thursday, September 5, 2025 (Week 1)

    // Calculate days since season start
    const daysDiff = Math.floor((gameDateObj.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));

    // NFL weeks are typically 7 days, with some adjustments for byes and scheduling
    const week = Math.floor(daysDiff / 7) + 1;

    const calculatedWeek = Math.max(1, Math.min(18, week)) as NFLWeek;
    console.log(`Calculated week ${calculatedWeek} for ${pick.game_info.away_team} @ ${pick.game_info.home_team} (date: ${pick.game_info.game_date}, daysDiff: ${daysDiff})`);

    return calculatedWeek;
  };

  // Group picks by week
  const getPicksByWeek = (picks: Pick[]) => {
    const weekGroups: Record<NFLWeek, Pick[]> = {} as Record<NFLWeek, Pick[]>;

    picks.forEach(pick => {
      const week = getNFLWeek(pick);
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
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await picksApi.getAll();

      if (error) {
        throw new Error('Failed to load picks: ' + error.message);
      }

      // Filter for picks that haven't been processed yet (pending) OR show all picks for admin management
      // This allows admins to see all picks and their current status
      const allPicks = data || [];
      setAllPicks(allPicks);

      // Clear any pending changes since we're loading fresh data
      setPendingChanges([]);

      // Calculate available weeks from all picks
      const weekGroups = getPicksByWeek(allPicks);
      const weeks = Object.keys(weekGroups).map(w => parseInt(w)).sort((a, b) => b - a) as NFLWeek[]; // Most recent first
      setAvailableWeeks(weeks);

      // Set default to most recent week if not set
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const queueUpdateResult = (pickId: string, result: 'win' | 'loss' | 'push') => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    // Check if this pick already has a pending change
    const existingChangeIndex = pendingChanges.findIndex(change => change.id === pickId);

    if (existingChangeIndex >= 0) {
      // Update existing change
      const updatedChanges = [...pendingChanges];
      updatedChanges[existingChangeIndex] = {
        ...updatedChanges[existingChangeIndex],
        type: 'update',
        result
      };
      setPendingChanges(updatedChanges);
    } else {
      // Add new change
      setPendingChanges(prev => [...prev, {
        id: pickId,
        type: 'update',
        result,
        originalPick: pick
      }]);
    }

    // Update local state optimistically
    setAllPicks(prev => prev.map(p =>
      p.id === pickId ? { ...p, result } : p
    ));

    console.log(`Queued result update: ${pick.game_info.away_team} @ ${pick.game_info.home_team} -> ${result}`);
  };

  const queueDeletePick = (pickId: string) => {
    const pick = allPicks.find(p => p.id === pickId);
    if (!pick) return;

    // Check if this pick already has a pending change
    const existingChangeIndex = pendingChanges.findIndex(change => change.id === pickId);

    if (existingChangeIndex >= 0) {
      // If it was an update, change to delete
      const updatedChanges = [...pendingChanges];
      updatedChanges[existingChangeIndex] = {
        ...updatedChanges[existingChangeIndex],
        type: 'delete'
      };
      setPendingChanges(updatedChanges);
    } else {
      // Add new delete change
      setPendingChanges(prev => [...prev, {
        id: pickId,
        type: 'delete',
        originalPick: pick
      }]);
    }

    // Remove from local state optimistically
    setAllPicks(prev => prev.filter(p => p.id !== pickId));

    console.log(`Queued deletion: ${pick.game_info.away_team} @ ${pick.game_info.home_team}`);
  };

  const discardAllChanges = () => {
    if (!confirm('Discard all pending changes? This will revert all queued updates and deletions.')) {
      return;
    }

    // Restore original picks that were deleted
    const deletedPicks = pendingChanges
      .filter(change => change.type === 'delete' && change.originalPick)
      .map(change => change.originalPick!);

    // Restore original results for updated picks
    const updatedPicks = pendingChanges
      .filter(change => change.type === 'update' && change.originalPick)
      .map(change => change.originalPick!);

    // Restore all picks to their original state
    setAllPicks(prev => {
      const restored = [...prev];
      
      // Add back deleted picks
      deletedPicks.forEach(pick => {
        if (!restored.find(p => p.id === pick.id)) {
          restored.push(pick);
        }
      });

      // Restore original results for updated picks
      updatedPicks.forEach(originalPick => {
        const index = restored.findIndex(p => p.id === originalPick.id);
        if (index >= 0) {
          restored[index] = originalPick;
        }
      });

      return restored;
    });

    // Clear pending changes
    setPendingChanges([]);
    setError(null);

    console.log('Discarded all pending changes');
  };

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) return;

    if (!confirm(`Save ${pendingChanges.length} change(s)? This will update the database and statistics.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let successCount = 0;

      for (const change of pendingChanges) {
        try {
          if (change.type === 'update' && change.result) {
            console.log(`Updating pick ${change.id} to result: ${change.result}`);
            const { data, error } = await picksApi.update(change.id, { result: change.result });
            if (error) {
              console.error(`Update failed for pick ${change.id}:`, error);
              throw error;
            } else {
              console.log(`Successfully updated pick ${change.id}:`, data);
            }
          } else if (change.type === 'delete') {
            console.log(`Deleting pick ${change.id}`);
            const { error } = await picksApi.delete(change.id);
            if (error) {
              console.error(`Delete failed for pick ${change.id}:`, error);
              throw error;
            } else {
              console.log(`Successfully deleted pick ${change.id}`);
            }
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to ${change.type} pick ${change.id}:`, err);
        }
      }

      // Clear pending changes
      setPendingChanges([]);

      // Notify other components to refresh stats
      globalEvents.emit('refreshStats');

      console.log(`Successfully saved ${successCount}/${pendingChanges.length} changes`);

      if (successCount === pendingChanges.length) {
        alert(`✅ Successfully saved all ${successCount} changes!`);
      } else {
        alert(`⚠️ Saved ${successCount}/${pendingChanges.length} changes. Check console for details.`);
      }

    } catch (err: any) {
      setError('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearAllPicks = async () => {
    if (!confirm('Are you sure you want to delete ALL picks? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all picks
      const { data: allPicks, error: fetchError } = await picksApi.getAll();
      if (fetchError) throw fetchError;

      // Delete all picks
      if (allPicks) {
        for (const pick of allPicks) {
          await picksApi.delete(pick.id);
        }
      }

      setAllPicks([]);
      setAvailableWeeks([]);
      setSelectedWeek(null);
      setPendingChanges([]);

      console.log(`Deleted ${allPicks?.length || 0} picks`);
    } catch (err: any) {
      setError('Failed to clear picks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    console.log('🧪 Testing database connection...');

    try {
      // Test getting all picks
      const { data: picks, error: getError } = await picksApi.getAll();
      console.log('📋 Current picks in database:', picks?.length || 0);
      console.log('📋 Sample pick:', picks?.[0]);

      if (getError) {
        console.error('❌ Failed to get picks:', getError);
        return;
      }

      // Test updating a pick (if any exist)
      if (picks && picks.length > 0) {
        const testPick = picks[0];
        console.log('🔄 Testing update on pick:', testPick.id);

        const { data: updatedPick, error: updateError } = await picksApi.update(testPick.id, {
          result: testPick.result === 'win' ? 'loss' : 'win'
        });

        if (updateError) {
          console.error('❌ Failed to update pick:', updateError);
        } else {
          console.log('✅ Successfully updated pick:', updatedPick);

          // Revert the change
          await picksApi.update(testPick.id, { result: testPick.result });
          console.log('🔄 Reverted test change');
        }
      }

      // Test stats calculation
      const { data: stats, error: statsError } = await agentStatsApi.getOverallStats();
      console.log('📊 Current stats:', stats);

      if (statsError) {
        console.error('❌ Failed to get stats:', statsError);
      }

    } catch (err) {
      console.error('❌ Database test failed:', err);
    }
  };

  const deletePick = async (pickId: string, homeTeam: string, awayTeam: string) => {
    if (!confirm(`Are you sure you want to delete the pick for ${awayTeam} @ ${homeTeam}? This will be queued for saving.`)) {
      return;
    }
    queueDeletePick(pickId);
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
          {pendingChanges.length > 0 && (
            <>
              <button
                onClick={saveAllChanges}
                disabled={saving || loading}
                className='px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
              >
                {saving ? '💾 Saving...' : `💾 Save ${pendingChanges.length} Change(s)`}
              </button>
              <button
                onClick={discardAllChanges}
                disabled={saving || loading}
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
          <button
            onClick={() => {
              console.log('🔔 Testing global events...');
              globalEvents.emit('refreshStats');
              alert('Global refresh event emitted! Check console for stats reload.');
            }}
            disabled={loading}
            className='px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
          >
            🔔 Test Events
          </button>
          <button
            onClick={testDatabaseConnection}
            disabled={loading}
            className='px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md text-white text-sm font-medium transition-colors'
          >
            🧪 Test DB
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

      {error && (
        <div className='bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}

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
              const hasPendingChange = pendingChanges.some(change => change.id === pick.id);
              const currentResult = hasPendingChange
                ? pendingChanges.find(change => change.id === pick.id)?.result || pick.result
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
                      {currentResult === 'win' ? '✅ Win' :
                       currentResult === 'loss' ? '❌ Loss' :
                       currentResult === 'push' ? '⚖️ Push' :
                       '⏳ Pending'}
                    </span>
                  </div>

                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <span className='text-white font-medium'>
                          {pick.game_info.away_team} @ {pick.game_info.home_team}
                        </span>
                        <span className='text-gray-400 text-sm'>
                          {new Date(pick.game_info.game_date).toLocaleDateString()}
                        </span>
                        <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                          Week {getNFLWeek(pick)}
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
                        disabled={updating === pick.id}
                        className='px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded text-xs font-medium transition-colors'
                      >
                        {updating === pick.id ? '...' : '🗑️ Delete'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'win')}
                        disabled={updating === pick.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'win' ? 'bg-green-700 text-white ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                        }`}
                      >
                        {updating === pick.id ? '...' : '✅ Win'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'loss')}
                        disabled={updating === pick.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'loss' ? 'bg-red-700 text-white ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                        }`}
                      >
                        {updating === pick.id ? '...' : '❌ Loss'}
                      </button>
                      <button
                        onClick={() => updatePickResult(pick.id, 'push')}
                        disabled={updating === pick.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          currentResult === 'push' ? 'bg-yellow-700 text-white ring-2 ring-yellow-400' : 'bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50'
                        }`}
                      >
                        {updating === pick.id ? '...' : '⚖️ Push'}
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

      {pendingChanges.length > 0 && (
        <div className='mt-4 p-4 bg-yellow-900 border border-yellow-700 rounded-lg'>
          <h3 className='text-yellow-200 font-medium mb-2'>📝 Pending Changes ({pendingChanges.length})</h3>
          <div className='space-y-1 text-sm text-yellow-100'>
            {pendingChanges.map((change, index) => {
              const pick = allPicks.find(p => p.id === change.id) || change.originalPick;
              if (!pick) return null;

              return (
                <div key={index} className='flex items-center justify-between'>
                  <span>
                    {change.type === 'delete' ? '🗑️' : '📝'} {pick.game_info.away_team} @ {pick.game_info.home_team}
                    {change.type === 'update' && change.result && (
                      <span className='ml-2 text-yellow-300'>
                        → {change.result === 'win' ? '✅ Win' : change.result === 'loss' ? '❌ Loss' : '⚖️ Push'}
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
    </div>
  );
};

export default AdminPickResults;