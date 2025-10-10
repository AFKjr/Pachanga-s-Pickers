/**
 * AdminPickManager - REFACTORED VERSION
 * 
 * This is a clean, "dumb" component that uses hooks for all business logic.
 * Compare with the original AdminPickManager.tsx to see the improvements.
 * 
 * Key changes:
 * - All business logic moved to services/hooks
 * - Component focused on presentation only
 * - Reduced from 463 lines to ~150 lines
 * - Much easier to test and maintain
 */

import React, { useState, useEffect } from 'react';
import { NFLWeek } from '../types';
import AdminPickRevision from './AdminPickRevision';
import AdminPickResults from './AdminPickResults';
import { usePickManager, useDuplicateDetection } from '../hooks';
import ErrorNotification from './ErrorNotification';
import { globalEvents } from '../lib/events';
import { getPickWeek } from '../utils/nflWeeks';

type ViewMode = 'list' | 'results' | 'revision';

const AdminPickManagerRefactored: React.FC = () => {
  // Use custom hooks for all business logic
  const {
    picks,
    loading,
    error: pickError,
    loadPicks,
    filterPicks,
    clearError: clearPickError
  } = usePickManager();

  const {
    duplicateCount,
    hasDuplicates,
    cleaning,
    cleanDuplicates,
    error: duplicateError,
    clearError: clearDuplicateError
  } = useDuplicateDetection(picks);

  // Local UI state only
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPick, setSelectedPick] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get available weeks from picks using proper week calculation
  const availableWeeks = [...new Set(picks.map(pick => getPickWeek(pick) as NFLWeek))].sort((a, b) => b - a);

  // Set default week on load
  useEffect(() => {
    if (!selectedWeek && availableWeeks.length > 0) {
      setSelectedWeek(availableWeeks[0]);
    }
  }, [availableWeeks, selectedWeek]);

  // Load picks on mount
  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  // Filter picks using the service
  const filteredPicks = filterPicks({ week: selectedWeek, searchTerm });

  // Handle duplicate cleanup
  const handleCleanDuplicates = async () => {
    if (!confirm(`Remove ${duplicateCount} duplicate picks? The oldest pick for each game will be kept.`)) {
      return;
    }

    const result = await cleanDuplicates();

    if (result.success) {
      alert(`Successfully removed ${result.deletedCount} duplicate picks!`);
      await loadPicks();
      globalEvents.emit('refreshStats');
      globalEvents.emit('refreshPicks');
    } else {
      alert(`Partially successful: ${result.deletedCount} deleted, ${result.failedCount} failed.`);
    }
  };

  // Handle revision completion
  const handleRevisionComplete = () => {
    setViewMode('list');
    setSelectedPick(null);
    globalEvents.emit('refreshStats');
    globalEvents.emit('refreshPicks');
  };

  // Handle revision cancellation
  const cancelRevision = () => {
    setViewMode('list');
    setSelectedPick(null);
  };

  // Handle pick revision start
  const startRevision = (pick: any) => {
    setSelectedPick(pick);
    setViewMode('revision');
  };

  // Render loading state
  if (loading) {
    return (
      <div className='bg-gray-800 rounded-lg p-6 mb-6'>
        <div className='text-center py-8'>
          <div className='text-gray-400'>Loading picks...</div>
        </div>
      </div>
    );
  }

  // Render revision view
  if (viewMode === 'revision' && selectedPick) {
    return (
      <AdminPickRevision
        pick={selectedPick}
        onRevisionComplete={handleRevisionComplete}
        onCancel={cancelRevision}
      />
    );
  }

  // Render results view
  if (viewMode === 'results') {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white text-sm font-medium"
          >
            ← Back to Pick Manager
          </button>
        </div>
        <AdminPickResults />
      </div>
    );
  }

  // Render main list view
  return (
    <div className='bg-gray-800 rounded-lg p-6 mb-6'>
      {/* Error notifications */}
      {pickError && (
        <ErrorNotification error={pickError} onClose={clearPickError} />
      )}
      {duplicateError && (
        <ErrorNotification error={duplicateError} onClose={clearDuplicateError} />
      )}

      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Pick Management</h2>
        <div className="flex space-x-2">
          {hasDuplicates && (
            <button
              onClick={handleCleanDuplicates}
              disabled={cleaning || loading}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-md text-white text-sm font-medium"
              title={`Remove ${duplicateCount} duplicate picks`}
            >
              {cleaning ? 'Cleaning...' : `🧹 Clean ${duplicateCount} Duplicates`}
            </button>
          )}
          <button
            onClick={() => setViewMode('results')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium"
          >
            Manage Results
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedWeek || ''}
          onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) as NFLWeek : null)}
          className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">All Weeks</option>
          {availableWeeks.map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search teams or predictions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400"
        />
      </div>

      {/* Picks list */}
      <div className="space-y-4">
        {filteredPicks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No picks found matching your filters.
          </div>
        ) : (
          filteredPicks.map(pick => (
            <div key={pick.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-semibold">
                    {pick.game_info.away_team} @ {pick.game_info.home_team}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    {pick.prediction}
                  </div>
                  {/* ATS and O/U Predictions */}
                  {(pick.spread_prediction || pick.ou_prediction) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pick.spread_prediction && (
                        <div className="bg-gray-600 px-2 py-0.5 rounded text-xs">
                          <span className="text-gray-400">ATS:</span>
                          <span className="text-white ml-1">{pick.spread_prediction}</span>
                        </div>
                      )}
                      {pick.ou_prediction && (
                        <div className="bg-gray-600 px-2 py-0.5 rounded text-xs">
                          <span className="text-gray-400">O/U:</span>
                          <span className="text-white ml-1">{pick.ou_prediction}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(pick.game_info.game_date).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => startRevision(pick)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPickManagerRefactored;
