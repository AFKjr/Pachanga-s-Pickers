import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, NFLWeek } from '../types/index';
import { ATSCalculator } from '../utils/atsCalculator';
import { getPickWeek } from '../utils/nflWeeks';
import { formatGameDate } from '../utils/dateValidation';

const EnhancedHomePage: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | 'all'>('all');
  const [activeStatsTab, setActiveStatsTab] = useState<'overview' | 'recent' | 'efficiency'>('overview');
  const [showDetailedPicks, setShowDetailedPicks] = useState(false);

  useEffect(() => {
    loadPicks();
    
    const handleRefresh = () => {
      loadPicks();
    };

    globalEvents.on('refreshStats', handleRefresh);
    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshStats', handleRefresh);
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, []);

  const loadPicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await picksApi.getAll();
      
      if (error) {
        console.error('Failed to load picks:', error);
        return;
      }

      setPicks(data || []);
    } catch (error) {
      console.error('Error loading picks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableWeeks = () => {
    const weeks = [...new Set(picks.map(pick => getPickWeek(pick)))].sort((a, b) => b - a);
    return weeks;
  };

  const getFilteredPicks = () => {
    if (selectedWeek === 'all') return picks;
    return picks.filter(pick => getPickWeek(pick) === selectedWeek);
  };

  const filteredPicks = getFilteredPicks();
  const overallRecord = ATSCalculator.calculateComprehensiveATSRecord(filteredPicks);
  const recentForm = ATSCalculator.getRecentForm(picks, 10);
  const bettingEfficiency = ATSCalculator.calculateBettingEfficiency(filteredPicks);
  const weeklyRecords = ATSCalculator.calculateWeeklyATSRecords(picks);

  // Get recent picks for display
  const recentPicks = picks
    .filter(pick => pick.result && pick.result !== 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Get upcoming picks
  const upcomingPicks = picks
    .filter(pick => !pick.result || pick.result === 'pending')
    .sort((a, b) => new Date(a.game_info.game_date).getTime() - new Date(b.game_info.game_date).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'win': return 'W';
      case 'loss': return 'L';
      case 'push': return 'P';
      default: return '?';
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Pachanga's Picks</h1>
        <p className="text-gray-400 text-lg">
          Professional NFL predictions with comprehensive betting analytics
        </p>
        
        {/* Week Filter */}
        <div className="flex justify-center">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as NFLWeek)}
            className="bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white"
          >
            <option value="all">All Time</option>
            {getAvailableWeeks().map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Performance Dashboard */}
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveStatsTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeStatsTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            Performance Overview
          </button>
          <button
            onClick={() => setActiveStatsTab('recent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeStatsTab === 'recent'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            🔥 Recent Form
          </button>
          <button
            onClick={() => setActiveStatsTab('efficiency')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeStatsTab === 'efficiency'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            Betting Insights
          </button>
        </div>

        {/* Overview Tab */}
        {activeStatsTab === 'overview' && (
          <div className="space-y-6">
            {/* Main Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {overallRecord.moneyline.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Moneyline Win Rate</div>
                <div className="text-xs text-gray-400 mt-1">
                  {overallRecord.moneyline.wins}-{overallRecord.moneyline.losses}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {overallRecord.ats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Against Spread</div>
                <div className="text-xs text-gray-400 mt-1">
                  {overallRecord.ats.wins}-{overallRecord.ats.losses}
                  {overallRecord.ats.pushes > 0 && `-${overallRecord.ats.pushes}`}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {overallRecord.overUnder.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Over/Under</div>
                <div className="text-xs text-gray-400 mt-1">
                  {overallRecord.overUnder.wins}-{overallRecord.overUnder.losses}
                  {overallRecord.overUnder.pushes > 0 && `-${overallRecord.overUnder.pushes}`}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {overallRecord.roi.units > 0 ? '+' : ''}{overallRecord.roi.units.toFixed(1)}
                </div>
                <div className="text-sm text-gray-300">Units Won/Lost</div>
                <div className="text-xs text-gray-400 mt-1">
                  {overallRecord.totalPicks} total picks
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Form Tab */}
        {activeStatsTab === 'recent' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {recentForm.moneyline.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Last 10 Games</div>
                <div className="text-xs text-gray-400 mt-1">Moneyline</div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {recentForm.ats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">Last 10 ATS</div>
                <div className="text-xs text-gray-400 mt-1">Against Spread</div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {recentForm.roi.units > 0 ? '+' : ''}{recentForm.roi.units.toFixed(1)}
                </div>
                <div className="text-sm text-gray-300">Recent Units</div>
                <div className="text-xs text-gray-400 mt-1">Profit/Loss</div>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Results</h3>
              <div className="space-y-3">
                {recentPicks.map((pick) => (
                  <div key={pick.id} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getResultIcon(pick.result)}</span>
                      <div>
                        <div className="text-white font-medium">
                          {pick.game_info.away_team} @ {pick.game_info.home_team}
                        </div>
                        <div className="text-sm text-gray-300">{pick.prediction}</div>
                        <div className="text-xs text-gray-400">
                          {formatGameDate(pick.game_info.game_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(pick.result)}`}>
                        {pick.result?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Betting Efficiency Tab */}
        {activeStatsTab === 'efficiency' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Betting Metrics */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Betting Efficiency</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Break-even Rate (-110)</span>
                    <span className="text-yellow-400 font-medium">52.38%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Actual Win Rate</span>
                    <span className={`font-medium ${overallRecord.moneyline.winRate >= 52.38 ? 'text-green-400' : 'text-red-400'}`}>
                      {overallRecord.moneyline.winRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Edge vs Break-even</span>
                    <span className={`font-medium ${bettingEfficiency.actualAdvantage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bettingEfficiency.actualAdvantage > 0 ? '+' : ''}{bettingEfficiency.actualAdvantage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Kelly % Suggestion</span>
                    <span className="text-blue-400 font-medium">
                      {bettingEfficiency.kellyPercent.toFixed(1)}% of bankroll
                    </span>
                  </div>
                </div>
              </div>

              {/* ROI Analysis */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ROI Analysis</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${overallRecord.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {overallRecord.roi.units > 0 ? '+' : ''}{overallRecord.roi.units.toFixed(2)} Units
                    </div>
                    <div className="text-sm text-gray-400">
                      Total Return ({overallRecord.totalPicks} picks)
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">If betting $100/game:</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-lg font-bold ${overallRecord.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {overallRecord.roi.units > 0 ? '+' : ''}${(overallRecord.roi.units * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Performance Trend */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Performance Trend</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyRecords.slice(0, 8).map(({ week, record }) => (
                  <div key={week} className="bg-gray-600 rounded-lg p-3 text-center">
                    <div className="text-sm font-medium text-white mb-1">Week {week}</div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-300">
                        ML: {record.moneyline.winRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-300">
                        ATS: {record.ats.winRate.toFixed(0)}%
                      </div>
                      <div className={`text-xs font-medium ${record.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {record.roi.units > 0 ? '+' : ''}{record.roi.units.toFixed(1)}u
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Games */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Value Analysis</h3>
              <div className="mb-4">
                <p className="text-gray-300 text-sm mt-1">
                  Value games won: <span className="text-green-400 font-medium">
                  {bettingEfficiency.valueGames} games
                  </span>
                </p>
              </div>
              <div className="text-xs text-gray-400">
                <strong>Note:</strong> Value games represent picks where the analysis identified strong betting opportunities.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Picks Section */}
      {upcomingPicks.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">🔮 Upcoming Picks</h2>
            <button
              onClick={() => setShowDetailedPicks(!showDetailedPicks)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showDetailedPicks ? 'Show Less' : 'Show Details'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingPicks.map(pick => (
              <div key={pick.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white font-semibold text-sm">
                    {pick.game_info.away_team} @ {pick.game_info.home_team}
                  </div>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    Week {getPickWeek(pick)}
                  </span>
                </div>

                {/* Prediction */}
                <div className="mb-3">
                  <div className="text-green-400 font-medium text-sm mb-1">
                    {pick.prediction}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatGameDate(pick.game_info.game_date, true)}</span>
                  </div>
                </div>

                {/* Betting Lines (if available) */}
                {(pick.game_info.spread || pick.game_info.over_under) && (
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      {pick.game_info.spread && (
                        <span>Spread: {pick.game_info.spread > 0 ? '+' : ''}{pick.game_info.spread}</span>
                      )}
                      {pick.game_info.over_under && (
                        <span>O/U: {pick.game_info.over_under}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Analysis (expandable) */}
                {showDetailedPicks && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="text-xs text-gray-300 line-clamp-3">
                      {pick.reasoning.substring(0, 120)}
                      {pick.reasoning.length > 120 ? '...' : ''}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-yellow-400 text-lg">Warning</span>
          <div>
            <p className="text-gray-300 text-sm">
              <strong>Important Disclaimer:</strong> All predictions and betting analytics are for entertainment and educational purposes only.
              Past performance does not guarantee future results. ATS and O/U calculations use estimated scores for demonstration.
              Please gamble responsibly and within your means.
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Betting efficiency metrics assume standard -110 odds. Actual sportsbook odds may vary.
              Always verify current lines before placing any wagers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedHomePage;