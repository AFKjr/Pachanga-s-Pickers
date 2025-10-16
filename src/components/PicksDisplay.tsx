import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import type { Pick } from '../types';
import { getPickWeek } from '../utils/nflWeeks';
import HorizontalPickCard from './HorizontalPickCard';
import SegmentedWeekSelector from './SegmentedWeekSelector';
import { calculatePickEdges } from '../utils/edgeCalculator';

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
      
      // Calculate edges for each pick
      const picksWithEdges = allPicks.map(pick => {
        if (pick.monte_carlo_results && pick.game_info) {
          const edges = calculatePickEdges(pick, pick.monte_carlo_results, pick.game_info);
          return {
            ...pick,
            moneyline_edge: edges.moneyline_edge,
            spread_edge: edges.spread_edge,
            ou_edge: edges.ou_edge
          };
        }
        return pick;
      });
      
      setPicks(picksWithEdges);

      const weeks = [...new Set(picksWithEdges.map(pick => pick.week || getPickWeek(pick)).filter(Boolean))]
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
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Recent Picks</h2>
        
        {showWeekFilter && availableWeeks.length > 0 && (
          <SegmentedWeekSelector
            selectedWeek={selectedWeek}
            availableWeeks={availableWeeks}
            onChange={setSelectedWeek}
            showAllOption={true}
            maxVisibleWeeks={5}
          />
        )}
      </div>

      {displayPicks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No picks available</div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2">
          {displayPicks.map((pick) => (
            <HorizontalPickCard 
              key={pick.id} 
              pick={pick}
            />
          ))}
        </div>
      )}

      {filteredPicks.length > maxPicks && (
        <div className="text-center mt-8 pt-6 border-t border-[rgba(255,255,255,0.05)]">
          <div className="text-gray-400 text-sm">
            Showing {maxPicks} of {filteredPicks.length} picks
          </div>
        </div>
      )}
    </div>
  );
};

export default PicksDisplay;
