import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import type { Pick } from '../types';
import { getPickWeek } from '../utils/nflWeeks';
import { formatGameDate } from '../utils/dateValidation';

interface PicksDisplayProps {
  maxPicks?: number;
  showWeekFilter?: boolean;
}

const PicksDisplay: React.FC<PicksDisplayProps> = ({ 
  maxPicks = 20, 
  showWeekFilter = true 
}) => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  useEffect(() => {
    loadPicks();
    
    // Listen for global refresh events
    const handleRefreshPicks = () => {
      console.log('PicksDisplay: Refreshing picks due to global event');
      loadPicks();
    };

    globalEvents.on('refreshPicks', handleRefreshPicks);
    globalEvents.on('refreshStats', handleRefreshPicks);

    // Cleanup event listeners
    return () => {
      globalEvents.off('refreshPicks', handleRefreshPicks);
      globalEvents.off('refreshStats', handleRefreshPicks);
    };
  }, []);

  const loadPicks = async () => {
    try {
      setLoading(true);
      const { data, error } = await picksApi.getAll();
      
      if (error) {
        console.error('Failed to load picks:', error);
        return;
      }

      const allPicks = data || [];
      setPicks(allPicks);

      // Get available weeks (use getPickWeek for picks without stored week)
      const weeks = [...new Set(allPicks.map(pick => pick.week || getPickWeek(pick)).filter(Boolean))]
        .sort((a, b) => b - a); // Most recent first
      setAvailableWeeks(weeks);
      
      // Set default to most recent week
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }
    } catch (error) {
      console.error('Error loading picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win': return 'text-green-400 bg-green-900/20';
      case 'loss': return 'text-red-400 bg-red-900/20';
      case 'push': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'win': return 'W';
      case 'loss': return 'L';
      case 'push': return 'P';
      default: return '-';
    }
  };

  const filteredPicks = selectedWeek 
    ? picks.filter(pick => (pick.week || getPickWeek(pick)) === selectedWeek)
    : picks;

  const displayPicks = filteredPicks.slice(0, maxPicks);

  console.log('Displaying picks:', displayPicks.map(p => ({ 
  teams: `${p.game_info.away_team} @ ${p.game_info.home_team}`,
  prediction: p.prediction 
})));

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Recent Picks</h2>
        
        {showWeekFilter && availableWeeks.length > 0 && (
          <select
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm"
          >
            <option value="">All Weeks</option>
            {availableWeeks.map(week => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        )}
      </div>

      {displayPicks.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400">No picks available</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayPicks.map((pick) => (
            <div key={pick.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
              {/* Game Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">
                  {pick.game_info.away_team} @ {pick.game_info.home_team}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(pick.result)}`}>
                  {getResultIcon(pick.result)} {pick.result?.toUpperCase() || 'PENDING'}
                </span>
              </div>

              {/* Prediction */}
              <div className="mb-3">
                <div className="text-green-400 font-medium text-sm mb-1">
                  {pick.prediction}
                </div>
              </div>

              {/* Key reasoning (shortened and cleaned) */}
              <div className="text-gray-300 text-sm mb-3 line-clamp-2">
                
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end text-xs text-gray-400">
                <span>{formatGameDate(pick.game_info.game_date, true)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPicks.length > maxPicks && (
        <div className="text-center mt-6">
          <div className="text-gray-400 text-sm">
            Showing {maxPicks} of {filteredPicks.length} picks
          </div>
        </div>
      )}
    </div>
  );
};

export default PicksDisplay;