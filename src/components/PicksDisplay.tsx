import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import type { BettingPick } from '../types/picks.types';
import { getPickWeek } from '../utils/nflWeeks';
import BestBetsSection from './BestBetsSection';
import SegmentedWeekSelector from './SegmentedWeekSelector';
import { calculatePickEdges } from '../utils/edgeCalculator';
import { isBestBet } from '../utils/confidenceHelpers';
import SimplifiedPickCard from './SimplifiedPickCard';

interface PicksDisplayProps {
  showWeekFilter?: boolean;
  showBestBets?: boolean;
  bestBetsThreshold?: number;
  onLoadComplete?: () => void;
}

/**
 * Confidence Legend Component
 */
const ConfidenceLegend: React.FC = () => {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 border border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white mb-0">
          Understanding Our Picks:
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">🟢</span>
            <div className="text-xs">
              <div className="text-white font-medium">Strong Bet</div>
              <div className="text-gray-500">&gt;5% edge</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🟡</span>
            <div className="text-xs">
              <div className="text-white font-medium">Moderate Bet</div>
              <div className="text-gray-500">2-5% edge</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <div className="text-xs">
              <div className="text-white font-medium">Skip</div>
              <div className="text-gray-500">&lt;2% edge</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PicksDisplay: React.FC<PicksDisplayProps> = ({ 
  showWeekFilter = true,
  showBestBets = true,
  bestBetsThreshold = 7,
  onLoadComplete
}) => {
  const [picks, setPicks] = useState<BettingPick[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [showLegend, setShowLegend] = useState(true);

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
      onLoadComplete?.();  // Notify parent that loading is complete
    }
  };

  const filteredPicks = selectedWeek 
    ? picks.filter(pick => (pick.week || getPickWeek(pick)) === selectedWeek)
    : picks;

  // Separate best bets from regular picks
  const bestBets = showBestBets ? filteredPicks.filter(pick => 
    isBestBet(
      pick.moneyline_edge || 0,
      pick.spread_edge || 0,
      pick.ou_edge || 0,
      bestBetsThreshold
    )
  ) : [];

  return (
    <div className="space-y-8">
      {/* Confidence Legend */}
      {showLegend && (
        <div className="relative">
          <ConfidenceLegend />
          <button
            onClick={() => setShowLegend(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-white text-xs"
            title="Hide legend"
          >
            ✕
          </button>
        </div>
      )}

      {/* Best Bets Section */}
      {showBestBets && bestBets.length > 0 && (
        <BestBetsSection
          picks={bestBets}
          minEdgeThreshold={bestBetsThreshold}
          maxDisplayCount={3}
        />
      )}

      {/* All Picks This Week Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              All Picks This Week
            </h2>
            <span className="px-3 py-1 bg-[#0a0a0a] text-lime-400 text-xs font-bold rounded-full border border-lime-500/30">
              {filteredPicks.length} GAMES
            </span>
          </div>

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

        {filteredPicks.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">
                No picks available for this week
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {filteredPicks.map((pick) => (
              <SimplifiedPickCard key={pick.id} pick={pick} />
            ))}
          </div>
        )}
      </div>

      {/* Show Legend Toggle (if hidden) */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="fixed bottom-6 right-6 bg-lime-500 hover:bg-lime-600 text-black px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2"
        >
          <span>?</span>
          <span>Show Legend</span>
        </button>
      )}
    </div>
  );
};

export default PicksDisplay;
