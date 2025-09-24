import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, NFLWeek } from '../types/index';
import { getPickWeek } from '../utils/nflWeeks';
import AdminPickRevision from './AdminPickRevision';
import AdminPickResults from './AdminPickResults';
import { useErrorHandler } from '../hooks/useErrorHandler';
import ErrorNotification from './ErrorNotification';

type ViewMode = 'list' | 'results' | 'revision';

const AdminPickManager: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<NFLWeek[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPick, setSelectedPick] = useState<Pick | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { error, clearError, executeWithErrorHandling } = useErrorHandler();

  // Group picks by week
  const getPicksByWeek = (allPicks: Pick[]) => {
    const weekGroups: Record<NFLWeek, Pick[]> = {} as Record<NFLWeek, Pick[]>;
    allPicks.forEach(pick => {
      const week = getPickWeek(pick);
      if (!weekGroups[week]) {
        weekGroups[week] = [];
      }
      weekGroups[week].push(pick);
    });
    return weekGroups;
  };

  const loadAllPicks = async () => {
    await executeWithErrorHandling(async () => {
      setLoading(true);
      const { data, error } = await picksApi.getAll();

      if (error) {
        throw error;
      }

      const allPicksData = data || [];
      setPicks(allPicksData);

      // Calculate available weeks
      const weekGroups = getPicksByWeek(allPicksData);
      const weeks = Object.keys(weekGroups).map(w => parseInt(w)).sort((a, b) => b - a) as NFLWeek[];
      setAvailableWeeks(weeks);

      // Set default to most recent week
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }

      setLoading(false);
      return true;
    }, {
      operation: 'loadAllPicks',
      component: 'AdminPickManager'
    });
  };

  useEffect(() => {
    loadAllPicks();
  }, []);

  const handleRevisionComplete = (updatedPick: Pick) => {
    // Update the pick in local state
    setPicks(prev => prev.map(pick => 
      pick.id === updatedPick.id ? updatedPick : pick
    ));
    
    // Return to list view
    setViewMode('list');
    setSelectedPick(null);
    
    // Emit global events to refresh other components
    globalEvents.emit('refreshStats');
    globalEvents.emit('refreshPicks');
    console.log('Pick revision completed and refresh events emitted:', updatedPick);
  };

  const startRevision = (pick: Pick) => {
    setSelectedPick(pick);
    setViewMode('revision');
  };

  const cancelRevision = () => {
    setViewMode('list');
    setSelectedPick(null);
  };

  // Filter picks based on search and selected week
  const filteredPicks = picks.filter(pick => {
    const matchesWeek = !selectedWeek || getPickWeek(pick) === selectedWeek;
    const matchesSearch = !searchTerm || 
      pick.game_info.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.game_info.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.prediction.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesWeek && matchesSearch;
  });

  if (loading) {
    return (
      <div className='bg-gray-800 rounded-lg p-6 mb-6'>
        <div className='text-center py-8'>
          <div className='text-gray-400'>Loading picks...</div>
        </div>
      </div>
    );
  }

  // Show revision modal
  if (viewMode === 'revision' && selectedPick) {
    return (
      <AdminPickRevision
        pick={selectedPick}
        onRevisionComplete={handleRevisionComplete}
        onCancel={cancelRevision}
      />
    );
  }

  // Show results management
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

  return (
    <div className='bg-gray-800 rounded-lg p-6 mb-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Pick Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('results')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium"
          >
            Manage Results
          </button>
          <button
            onClick={loadAllPicks}
            disabled={loading}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-white text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <ErrorNotification 
          error={error} 
          onClose={clearError}
          onRetry={error.retryable ? loadAllPicks : undefined}
        />
      )}

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Filter by Week
          </label>
          <select
            value={selectedWeek || 'all'}
            onChange={(e) => setSelectedWeek(e.target.value === 'all' ? null : parseInt(e.target.value) as NFLWeek)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="all">All Weeks</option>
            {availableWeeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Picks
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams, predictions..."
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          />
        </div>
        <div className="flex items-end">
          <div className="text-sm text-gray-400">
            Showing {filteredPicks.length} of {picks.length} picks
          </div>
        </div>
      </div>

      {/* Picks List */}
      {filteredPicks.length === 0 ? (
        <div className='text-center py-8'>
          <div className='text-gray-400 mb-2'>No picks found</div>
          <div className='text-sm text-gray-500'>
            {searchTerm ? 'Try adjusting your search terms' : 'No picks match the selected filters'}
          </div>
        </div>
      ) : (
        <div className='space-y-4 max-h-96 overflow-y-auto'>
          {filteredPicks.map((pick) => (
            <div key={pick.id} className='bg-gray-700 rounded-lg p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  {/* Game Header */}
                  <div className='flex items-center space-x-3 mb-2'>
                    <h3 className='text-white font-medium'>
                      {pick.game_info.away_team} @ {pick.game_info.home_team}
                    </h3>
                    <span className='bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
                      Week {getPickWeek(pick)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pick.result === 'win' ? 'bg-green-600 text-white' :
                      pick.result === 'loss' ? 'bg-red-600 text-white' :
                      pick.result === 'push' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {pick.result || 'Pending'}
                    </span>
                    {pick.is_pinned && (
                      <span className='bg-purple-600 text-white text-xs px-2 py-1 rounded-full'>
                        Pinned
                      </span>
                    )}
                  </div>

                  {/* Pick Details */}
                  <div className='text-gray-300 text-sm mb-2'>
                    <strong>Prediction:</strong> {pick.prediction}
                  </div>
                  <div className='text-gray-300 text-sm mb-2'>
                    <strong>Confidence:</strong> {pick.confidence}%
                  </div>
                  <div className='text-gray-400 text-xs mb-2'>
                    <strong>Reasoning:</strong> {pick.reasoning.substring(0, 120)}
                    {pick.reasoning.length > 120 ? '...' : ''}
                  </div>

                  {/* Game Info */}
                  <div className='flex items-center space-x-4 text-xs text-gray-500'>
                    <span>Date: {(() => {
                      const dateStr = pick.game_info.game_date;
                      const date = new Date(dateStr + 'T12:00:00');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${month}-${day}-${year}`;
                    })()}</span>
                    {pick.game_info.spread && (
                      <span>Spread: {pick.game_info.spread > 0 ? '+' : ''}{pick.game_info.spread}</span>
                    )}
                    {pick.game_info.over_under && (
                      <span>O/U: {pick.game_info.over_under}</span>
                    )}
                    <span>Author: {pick.author_username || 'Unknown'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col space-y-2 ml-4'>
                  <button
                    onClick={() => startRevision(pick)}
                    className='px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium text-white transition-colors'
                  >
                    Revise
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(pick, null, 2));
                      console.log('📋 Pick data copied to clipboard');
                    }}
                    className='px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium text-white transition-colors'
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className='mt-6 pt-4 border-t border-gray-700'>
        <div className='text-sm text-gray-400'>
          <strong>Pick Management Features:</strong>
          <ul className='mt-2 space-y-1 text-xs'>
            <li>• <strong>Revise:</strong> Edit all pick details including prediction, confidence, reasoning, and game info</li>
            <li>• <strong>Manage Results:</strong> Update win/loss/push status and track performance</li>
            <li>• <strong>Search & Filter:</strong> Find specific picks by team, week, or prediction text</li>
            <li>• <strong>Copy Data:</strong> Export pick information for external analysis</li>
            <li>• <strong>Real-time Updates:</strong> Changes are immediately reflected across the system</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPickManager;