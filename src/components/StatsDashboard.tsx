import React, { useState, useEffect } from 'react';
import { agentStatsApi, picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { ATSCalculator } from '../utils/atsCalculator';
import { getPickWeek } from '../utils/nflWeeks';

interface BetTypeStats {
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  units: number;
}

interface WeekStats {
  week: number;
  moneyline: BetTypeStats;
  ats: BetTypeStats;
  overUnder: BetTypeStats;
  totalPicks: number;
}

interface AllTimeStats {
  moneyline: BetTypeStats;
  ats: BetTypeStats;
  overUnder: BetTypeStats;
  totalPicks: number;
  totalUnits: number;
}

const StatCard: React.FC<{
  label: string;
  record: string;
  winRate: number;
  units: number;
  pushes?: number;
}> = ({ label, record, winRate, units, pushes }) => {

  const getWinRateColor = (rate: number): string => {
    if (rate >= 60) return 'text-lime-400';
    if (rate >= 52.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(132,204,22,0.3)] transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </h3>
        {pushes !== undefined && pushes > 0 && (
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
            {pushes} push{pushes !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className={`text-3xl font-bold mb-1 ${getWinRateColor(winRate)}`}>
            {winRate.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm font-medium">{record}</div>
        </div>

        <div className="pt-3 border-t border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Units</span>
            <span className={`text-sm font-bold ${units >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
              {units > 0 ? '+' : ''}{units.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              winRate >= 60 ? 'bg-lime-500' :
              winRate >= 52.4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(winRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const CurrentWeekDashboard: React.FC<{ 
  weekStats: WeekStats;
  selectedWeek: number | null;
  availableWeeks: number[];
  onWeekChange: (week: number) => void;
}> = ({ weekStats, selectedWeek, availableWeeks, onWeekChange }) => {
  const totalWins = weekStats.moneyline.wins + weekStats.ats.wins + weekStats.overUnder.wins;
  const totalLosses = weekStats.moneyline.losses + weekStats.ats.losses + weekStats.overUnder.losses;
  const totalPushes = weekStats.ats.pushes + weekStats.overUnder.pushes;
  const totalResolved = totalWins + totalLosses;
  const overallWinRate = totalResolved > 0 ? (totalWins / totalResolved) * 100 : 0;

  // Check for hot streak (3+ wins in a row on any bet type)
  const hasHotStreak = weekStats.moneyline.wins >= 3 || weekStats.ats.wins >= 3 || weekStats.overUnder.wins >= 3;

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Week {weekStats.week} Performance
            </h2>
            <p className="text-sm text-gray-400">
              {weekStats.totalPicks} games analyzed
            </p>
          </div>

          <div className="flex items-center gap-4">
            {availableWeeks.length > 1 && (
              <select
                value={selectedWeek || ''}
                onChange={(e) => onWeekChange(parseInt(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm hover:border-lime-500 transition-colors"
              >
                {availableWeeks.map(week => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            )}

            {hasHotStreak && (
              <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <div className="text-lime-400 font-bold text-sm">Hot Streak</div>
                    <div className="text-xs text-lime-300/70">3+ wins</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overall Stats Bar */}
      <div className="px-6 py-4 bg-[#0f0f0f] border-b border-[rgba(255,255,255,0.05)]">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Overall</div>
            <div className="text-2xl font-bold text-white">
              {totalWins}-{totalLosses}{totalPushes > 0 ? `-${totalPushes}` : ''}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
            <div className={`text-2xl font-bold ${
              overallWinRate >= 60 ? 'text-lime-400' :
              overallWinRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {overallWinRate.toFixed(1)}%
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Units</div>
            <div className={`text-2xl font-bold ${
              weekStats.moneyline.units + weekStats.ats.units + weekStats.overUnder.units >= 0
                ? 'text-lime-400'
                : 'text-red-400'
            }`}>
              {weekStats.moneyline.units + weekStats.ats.units + weekStats.overUnder.units > 0 ? '+' : ''}
              {(weekStats.moneyline.units + weekStats.ats.units + weekStats.overUnder.units).toFixed(1)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Break Even</div>
            <div className={`text-2xl font-bold ${
              overallWinRate >= 52.4 ? 'text-lime-400' : 'text-gray-500'
            }`}>
              52.4%
            </div>
          </div>
        </div>
      </div>

      {/* Bet Type Breakdown */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="MONEYLINE"
            record={`${weekStats.moneyline.wins}-${weekStats.moneyline.losses}`}
            winRate={weekStats.moneyline.winRate}
            units={weekStats.moneyline.units}
          />

          <StatCard
            label="AGAINST THE SPREAD"
            record={`${weekStats.ats.wins}-${weekStats.ats.losses}`}
            winRate={weekStats.ats.winRate}
            units={weekStats.ats.units}
            pushes={weekStats.ats.pushes}
          />

          <StatCard
            label="OVER/UNDER"
            record={`${weekStats.overUnder.wins}-${weekStats.overUnder.losses}`}
            winRate={weekStats.overUnder.winRate}
            units={weekStats.overUnder.units}
            pushes={weekStats.overUnder.pushes}
          />
        </div>
      </div>
    </div>
  );
};

const AllTimeDashboard: React.FC<{ stats: AllTimeStats; isExpanded: boolean; onToggle: () => void }> = ({ 
  stats, 
  isExpanded, 
  onToggle 
}) => {  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[rgba(255,255,255,0.05)] overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1f1f1f] transition-colors"
      >
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-lg font-bold text-white text-left">All-Time Record</h3>
            <p className="text-xs text-gray-500 text-left">{stats.totalPicks} total picks</p>
          </div>

          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-gray-500">ML: </span>
              <span className="text-white font-medium">
                {stats.moneyline.wins}-{stats.moneyline.losses}
              </span>
              <span className={`ml-2 ${
                stats.moneyline.winRate >= 60 ? 'text-lime-400' :
                stats.moneyline.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                ({stats.moneyline.winRate.toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-gray-500">ATS: </span>
              <span className="text-white font-medium">
                {stats.ats.wins}-{stats.ats.losses}
              </span>
              <span className={`ml-2 ${
                stats.ats.winRate >= 55 ? 'text-lime-400' :
                stats.ats.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                ({stats.ats.winRate.toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-gray-500">O/U: </span>
              <span className="text-white font-medium">
                {stats.overUnder.wins}-{stats.overUnder.losses}
              </span>
              <span className={`ml-2 ${
                stats.overUnder.winRate >= 55 ? 'text-lime-400' :
                stats.overUnder.winRate >= 52.4 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                ({stats.overUnder.winRate.toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-gray-500">Units: </span>
              <span className={`font-bold ${stats.totalUnits >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                {stats.totalUnits > 0 ? '+' : ''}{stats.totalUnits.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-[rgba(255,255,255,0.05)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <StatCard
              label="MONEYLINE"
              record={`${stats.moneyline.wins}-${stats.moneyline.losses}`}
              winRate={stats.moneyline.winRate}
              units={stats.moneyline.units}
            />

            <StatCard
              label="AGAINST THE SPREAD"
              record={`${stats.ats.wins}-${stats.ats.losses}`}
              winRate={stats.ats.winRate}
              units={stats.ats.units}
              pushes={stats.ats.pushes}
            />

            <StatCard
              label="OVER/UNDER"
              record={`${stats.overUnder.wins}-${stats.overUnder.losses}`}
              winRate={stats.overUnder.winRate}
              units={stats.overUnder.units}
              pushes={stats.overUnder.pushes}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Main Stats Dashboard Component
const StatsDashboard: React.FC = () => {
  const [allTimeExpanded, setAllTimeExpanded] = React.useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  useEffect(() => {
    loadStats();

    const handleRefresh = () => {
      loadStats();
    };

    globalEvents.on('refreshStats', handleRefresh);
    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshStats', handleRefresh);
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, [selectedWeek]);

  const loadStats = async () => {
    setLoading(true);
    setError('');

    try {
      // Load moneyline stats and picks
      const [moneylineResult, picksResult] = await Promise.all([
        agentStatsApi.getOverallStats(),
        picksApi.getAll()
      ]);

      if (moneylineResult.error) {
        throw new Error('Failed to load moneyline stats: ' + moneylineResult.error.message);
      }

      if (picksResult.error) {
        throw new Error('Failed to load picks: ' + picksResult.error.message);
      }

      const picks = picksResult.data || [];
      const moneylineStats = moneylineResult.data;

      // Calculate ATS and O/U stats
      const atsRecord = ATSCalculator.calculateComprehensiveATSRecord(picks);

      // Calculate available weeks from picks data
      const weeks = [...new Set(picks.map(pick => getPickWeek(pick)).filter(week => week !== null))] as number[];
      weeks.sort((a, b) => b - a); // Sort descending (most recent first)
      setAvailableWeeks(weeks);

      // Set default selected week to the most recent week with picks
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(weeks[0]);
      }

      // Use selected week or default to most recent
      const currentWeek = selectedWeek || weeks[0] || 7;

      // Calculate weekly stats (current week picks)
      const currentWeekPicks = picks.filter(pick => getPickWeek(pick) === currentWeek);

      // Calculate weekly moneyline stats
      const weekMoneylineWins = currentWeekPicks.filter(pick => pick.result === 'win').length;
      const weekMoneylineLosses = currentWeekPicks.filter(pick => pick.result === 'loss').length;
      const weekMoneylineResolved = weekMoneylineWins + weekMoneylineLosses;
      const weekMoneylineWinRate = weekMoneylineResolved > 0 ? (weekMoneylineWins / weekMoneylineResolved) * 100 : 0;

      // Calculate weekly ATS stats
      const weekAtsWins = currentWeekPicks.filter(pick => pick.ats_result === 'win').length;
      const weekAtsLosses = currentWeekPicks.filter(pick => pick.ats_result === 'loss').length;
      const weekAtsPushes = currentWeekPicks.filter(pick => pick.ats_result === 'push').length;
      const weekAtsResolved = weekAtsWins + weekAtsLosses;
      const weekAtsWinRate = weekAtsResolved > 0 ? (weekAtsWins / weekAtsResolved) * 100 : 0;

      // Calculate weekly O/U stats
      const weekOuWins = currentWeekPicks.filter(pick => pick.ou_result === 'win').length;
      const weekOuLosses = currentWeekPicks.filter(pick => pick.ou_result === 'loss').length;
      const weekOuPushes = currentWeekPicks.filter(pick => pick.ou_result === 'push').length;
      const weekOuResolved = weekOuWins + weekOuLosses;
      const weekOuWinRate = weekOuResolved > 0 ? (weekOuWins / weekOuResolved) * 100 : 0;

      // Create week stats object
      const currentWeekStats: WeekStats = {
        week: currentWeek,
        moneyline: {
          wins: weekMoneylineWins,
          losses: weekMoneylineLosses,
          pushes: 0,
          winRate: weekMoneylineWinRate,
          units: weekMoneylineWins * 0.9 - weekMoneylineLosses * 1.0 // Simplified unit calculation
        },
        ats: {
          wins: weekAtsWins,
          losses: weekAtsLosses,
          pushes: weekAtsPushes,
          winRate: weekAtsWinRate,
          units: weekAtsWins * 0.9 - weekAtsLosses * 1.0
        },
        overUnder: {
          wins: weekOuWins,
          losses: weekOuLosses,
          pushes: weekOuPushes,
          winRate: weekOuWinRate,
          units: weekOuWins * 0.9 - weekOuLosses * 1.0
        },
        totalPicks: currentWeekPicks.length
      };

      // Create all-time stats object
      const allTimeStatsData: AllTimeStats = {
        moneyline: {
          wins: moneylineStats.wins,
          losses: moneylineStats.losses,
          pushes: moneylineStats.pushes,
          winRate: moneylineStats.winRate,
          units: moneylineStats.wins * 0.9 - moneylineStats.losses * 1.0
        },
        ats: {
          wins: atsRecord.ats.wins,
          losses: atsRecord.ats.losses,
          pushes: atsRecord.ats.pushes,
          winRate: atsRecord.ats.winRate,
          units: atsRecord.ats.wins * 0.9 - atsRecord.ats.losses * 1.0
        },
        overUnder: {
          wins: atsRecord.overUnder.wins,
          losses: atsRecord.overUnder.losses,
          pushes: atsRecord.overUnder.pushes,
          winRate: atsRecord.overUnder.winRate,
          units: atsRecord.overUnder.wins * 0.9 - atsRecord.overUnder.losses * 1.0
        },
        totalPicks: picks.length,
        totalUnits: (moneylineStats.wins + atsRecord.ats.wins + atsRecord.overUnder.wins) * 0.9 -
                   (moneylineStats.losses + atsRecord.ats.losses + atsRecord.overUnder.losses) * 1.0
      };

      setWeekStats(currentWeekStats);
      setAllTimeStats(allTimeStatsData);

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (error || !allTimeStats) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[rgba(255,255,255,0.05)]">
        <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-3 rounded">
          Failed to load statistics: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Current Week */}
        {weekStats && (
          <CurrentWeekDashboard 
            weekStats={weekStats}
            selectedWeek={selectedWeek}
            availableWeeks={availableWeeks}
            onWeekChange={setSelectedWeek}
          />
        )}      {/* All-Time (Collapsible) */}
      <AllTimeDashboard
        stats={allTimeStats}
        isExpanded={allTimeExpanded}
        onToggle={() => setAllTimeExpanded(!allTimeExpanded)}
      />
    </div>
  );
};export default StatsDashboard;