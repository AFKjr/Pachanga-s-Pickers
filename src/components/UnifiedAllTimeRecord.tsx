import React, { useState, useEffect } from 'react';
import { agentStatsApi, picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick } from '../types/index';
import { ATSCalculator } from '../utils/atsCalculator';

interface AgentStatsData {
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  winRate: number;
  totalResolved: number;
}

const UnifiedAllTimeRecord: React.FC = () => {
  const [moneylineStats, setMoneylineStats] = useState<AgentStatsData | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllStats();
    
    const handleRefresh = () => {
      console.log('Received refreshStats event, reloading unified stats...');
      loadAllStats();
    };

    globalEvents.on('refreshStats', handleRefresh);
    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshStats', handleRefresh);
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    setError('');

    try {
      // Load correct moneyline stats using existing API
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

      setMoneylineStats(moneylineResult.data);
      setPicks(picksResult.data || []);

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading unified stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate ATS and O/U stats using the ATS calculator
  const atsRecord = ATSCalculator.calculateComprehensiveATSRecord(picks);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="text-center py-4">
          <div className="text-gray-400">Loading all-time statistics...</div>
        </div>
      </div>
    );
  }

  if (error || !moneylineStats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          Failed to load statistics: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">All Time Record</h2>
        <p className="text-gray-400 text-sm">
          Comprehensive performance across all betting markets
        </p>
      </div>

      {/* Three Main Record Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Moneyline Record (Using Correct Existing Stats) */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Moneyline</h3>
            <span className="text-xs text-gray-400">Win/Loss Only</span>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold mb-2 ${
              moneylineStats.winRate >= 60 ? 'text-green-400' : 
              moneylineStats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {moneylineStats.winRate.toFixed(1)}%
            </div>
            <div className="text-gray-300 text-sm">
              {moneylineStats.wins}-{moneylineStats.losses}
              {moneylineStats.pushes > 0 && `-${moneylineStats.pushes}`}
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Picks:</span>
              <span className="text-white">{moneylineStats.totalPicks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Resolved:</span>
              <span className="text-white">{moneylineStats.totalResolved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pending:</span>
              <span className="text-gray-300">{moneylineStats.pending}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                moneylineStats.winRate >= 60 ? 'bg-green-500' : 
                moneylineStats.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(moneylineStats.winRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Against The Spread Record */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Against the Spread</h3>
            <span className="text-xs text-gray-400">ATS</span>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold mb-2 ${
              atsRecord.ats.winRate >= 55 ? 'text-blue-400' : 
              atsRecord.ats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {atsRecord.ats.totalResolved > 0 ? atsRecord.ats.winRate.toFixed(1) : '0.0'}%
            </div>
            <div className="text-gray-300 text-sm">
              {atsRecord.ats.wins}-{atsRecord.ats.losses}
              {atsRecord.ats.pushes > 0 && `-${atsRecord.ats.pushes}`}
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">ATS Bets:</span>
              <span className="text-white">{atsRecord.ats.totalResolved + atsRecord.ats.pushes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cover Margin:</span>
              <span className="text-white">{atsRecord.ats.coverMargin.toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Push Rate:</span>
              <span className="text-gray-300">
                {atsRecord.ats.totalResolved + atsRecord.ats.pushes > 0 ? 
                  ((atsRecord.ats.pushes / (atsRecord.ats.totalResolved + atsRecord.ats.pushes)) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                atsRecord.ats.winRate >= 55 ? 'bg-blue-500' : 
                atsRecord.ats.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(atsRecord.ats.winRate || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Over/Under Record */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Over/Under</h3>
            <span className="text-xs text-gray-400">Totals Performance</span>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold mb-2 ${
              atsRecord.overUnder.winRate >= 55 ? 'text-purple-400' : 
              atsRecord.overUnder.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {atsRecord.overUnder.totalResolved > 0 ? atsRecord.overUnder.winRate.toFixed(1) : '0.0'}%
            </div>
            <div className="text-gray-300 text-sm">
              {atsRecord.overUnder.wins}-{atsRecord.overUnder.losses}
              {atsRecord.overUnder.pushes > 0 && `-${atsRecord.overUnder.pushes}`}
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">O/U Bets:</span>
              <span className="text-white">{atsRecord.overUnder.totalResolved + atsRecord.overUnder.pushes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Total:</span>
              <span className="text-white">{atsRecord.overUnder.averageTotal.toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Push Rate:</span>
              <span className="text-gray-300">
                {atsRecord.overUnder.totalResolved + atsRecord.overUnder.pushes > 0 ? 
                  ((atsRecord.overUnder.pushes / (atsRecord.overUnder.totalResolved + atsRecord.overUnder.pushes)) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                atsRecord.overUnder.winRate >= 55 ? 'bg-purple-500' : 
                atsRecord.overUnder.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(atsRecord.overUnder.winRate || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{moneylineStats.totalPicks}</div>
          <div className="text-xs text-gray-300">Total Picks</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-lg font-bold ${atsRecord.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {atsRecord.roi.units > 0 ? '+' : ''}{atsRecord.roi.units.toFixed(1)}
          </div>
          <div className="text-xs text-gray-300">Total Units</div>
        </div>
      </div>

     
    </div>
  );
};

export default UnifiedAllTimeRecord;