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
    
    const handleRefreshPicks = () => {
      loadPicks();
    };

    globalEvents.on('refreshPicks', handleRefreshPicks);
    globalEvents.on('refreshStats', handleRefreshPicks);

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

      const weeks = [...new Set(allPicks.map(pick => pick.week || getPickWeek(pick)).filter(Boolean))]
        .sort((a, b) => b - a);
      setAvailableWeeks(weeks);
      
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
                <div className="text-white font-semibold text-sm">
                  {pick.game_info.away_team} @ {pick.game_info.home_team}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(pick.result)}`}>
                  {getResultIcon(pick.result)} {pick.result?.toUpperCase() || 'PENDING'}
                </span>
              </div>

              {/* Moneyline Prediction */}
              <div className="mb-3">
                <div className="text-green-400 font-medium text-sm mb-1">
                  {pick.prediction}
                </div>
                
                {/* Spread & O/U Predictions with Lines */}
                {(pick.spread_prediction || pick.ou_prediction) && (
                  <div className="space-y-2 mt-2">
                    {pick.spread_prediction && (
                      <div className="bg-gray-600 px-2 py-1.5 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-300 mr-1">ATS:</span>
                            <span className="text-white font-medium">{pick.spread_prediction}</span>
                          </div>
                          {pick.game_info.spread !== undefined && (
                            <span className="text-gray-400">
                              Line: {pick.game_info.spread > 0 ? '+' : ''}{pick.game_info.spread}
                            </span>
                          )}
                        </div>
                        {pick.ats_result && pick.ats_result !== 'pending' && (
                          <div className={`mt-1 text-xs font-medium ${
                            pick.ats_result === 'win' ? 'text-green-400' :
                            pick.ats_result === 'loss' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            ATS: {pick.ats_result.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {pick.ou_prediction && (
                      <div className="bg-gray-600 px-2 py-1.5 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-300 mr-1">O/U:</span>
                            <span className="text-white font-medium">{pick.ou_prediction}</span>
                          </div>
                          {pick.game_info.over_under !== undefined && (
                            <span className="text-gray-400">
                              Line: {pick.game_info.over_under}
                            </span>
                          )}
                        </div>
                        {pick.ou_result && pick.ou_result !== 'pending' && (
                          <div className={`mt-1 text-xs font-medium ${
                            pick.ou_result === 'win' ? 'text-green-400' :
                            pick.ou_result === 'loss' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            O/U: {pick.ou_result.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Odds Source */}
              <div className="text-xs text-gray-500 mb-2 flex items-center">
                <span className="mr-1">📊</span>
                <span>Odds via DraftKings</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-600">
                <span>{formatGameDate(pick.game_info.game_date, true)}</span>
                <span className="text-blue-400">{pick.confidence}% confidence</span>
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