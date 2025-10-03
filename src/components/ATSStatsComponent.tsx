import React, { useState, useEffect } from 'react';
import { picksApi } from '../lib/api';
import { globalEvents } from '../lib/events';
import { Pick, NFLWeek } from '../types/index';
import { ATSCalculator } from '../utils/atsCalculator';
import { getPickWeek } from '../utils/nflWeeks';

const ATSStatsComponent: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'teams'>('overview');

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

  const filteredPicks = selectedWeek === 'all' 
    ? picks 
    : picks.filter(pick => getPickWeek(pick) === selectedWeek);

  const overallRecord = ATSCalculator.calculateComprehensiveATSRecord(filteredPicks);
  const weeklyRecords = ATSCalculator.calculateWeeklyATSRecords(picks);
  const teamRecordsObj = ATSCalculator.calculateTeamATSRecords(picks);
  
  // Convert team records object to array for rendering
  const teamRecords = Object.entries(teamRecordsObj).map(([team, record]) => ({
    team,
    record
  })).sort((a, b) => b.record.moneyline.winRate - a.record.moneyline.winRate);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Advanced Betting Analytics</h2>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as NFLWeek)}
          className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm"
        >
          <option value="all">All Weeks</option>
          {getAvailableWeeks().map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          Performance Overview
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          Weekly Breakdown
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          Team Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Moneyline Record */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Moneyline Record</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {overallRecord.moneyline.winRate.toFixed(1)}%
                </div>
                <div className="text-gray-300">
                  {overallRecord.moneyline.wins}-{overallRecord.moneyline.losses}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {overallRecord.totalPicks} total picks
                </div>
              </div>
            </div>

            {/* ATS Record */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Against The Spread</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {overallRecord.ats.winRate.toFixed(1)}%
                </div>
                <div className="text-gray-300">
                  {overallRecord.ats.wins}-{overallRecord.ats.losses}
                  {overallRecord.ats.pushes > 0 && `-${overallRecord.ats.pushes}`}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {overallRecord.ats.totalResolved + overallRecord.ats.pushes} ATS bets
                </div>
              </div>
            </div>

            {/* Over/Under Record */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Over/Under</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {overallRecord.overUnder.winRate.toFixed(1)}%
                </div>
                <div className="text-gray-300">
                  {overallRecord.overUnder.wins}-{overallRecord.overUnder.losses}
                  {overallRecord.overUnder.pushes > 0 && `-${overallRecord.overUnder.pushes}`}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {overallRecord.overUnder.totalResolved + overallRecord.overUnder.pushes} O/U bets
                </div>
              </div>
            </div>

            {/* Units Won/Lost */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Units P&L</h3>
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${overallRecord.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {overallRecord.roi.units > 0 ? '+' : ''}{overallRecord.roi.units.toFixed(1)}
                </div>
                <div className="text-gray-300">
                  Units Won/Lost
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  @ -110 odds
                </div>
              </div>
            </div>
          </div>

          {/* Performance Comparison Chart */}
          <div className="bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Comparison</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Moneyline</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(overallRecord.moneyline.winRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-medium w-12 text-right">
                    {overallRecord.moneyline.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Against Spread</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(overallRecord.ats.winRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-medium w-12 text-right">
                    {overallRecord.ats.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Over/Under</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-600 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(overallRecord.overUnder.winRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-medium w-12 text-right">
                    {overallRecord.overUnder.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Weekly Performance Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-2 text-gray-300">Week</th>
                  <th className="text-left py-2 text-gray-300">Picks</th>
                  <th className="text-left py-2 text-gray-300">Moneyline</th>
                  <th className="text-left py-2 text-gray-300">ATS</th>
                  <th className="text-left py-2 text-gray-300">O/U</th>
                  <th className="text-left py-2 text-gray-300">Units</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRecords.map(({ week, record }) => (
                  <tr key={week} className="border-b border-gray-700">
                    <td className="py-3 text-white font-medium">Week {week}</td>
                    <td className="py-3 text-gray-300">{record.totalPicks}</td>
                    <td className="py-3">
                      <span className={`${record.moneyline.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {record.moneyline.wins}-{record.moneyline.losses} ({record.moneyline.winRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`${record.ats.winRate >= 50 ? 'text-blue-400' : 'text-red-400'}`}>
                        {record.ats.wins}-{record.ats.losses}
                        {record.ats.pushes > 0 && `-${record.ats.pushes}`} ({record.ats.winRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`${record.overUnder.winRate >= 50 ? 'text-purple-400' : 'text-red-400'}`}>
                        {record.overUnder.wins}-{record.overUnder.losses}
                        {record.overUnder.pushes > 0 && `-${record.overUnder.pushes}`} ({record.overUnder.winRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`${record.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {record.roi.units > 0 ? '+' : ''}{record.roi.units.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Team Performance Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamRecords.slice(0, 12).map(teamRecord => (
              <div key={teamRecord.team} className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">{teamRecord.team}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Moneyline:</span>
                    <span className="text-green-400">
                      {teamRecord.record.moneyline.wins}-{teamRecord.record.moneyline.losses} 
                      ({teamRecord.record.moneyline.winRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">ATS:</span>
                    <span className="text-blue-400">
                      {teamRecord.record.ats.wins}-{teamRecord.record.ats.losses}
                      {teamRecord.record.ats.pushes > 0 && `-${teamRecord.record.ats.pushes}`}
                      ({teamRecord.record.ats.winRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Units:</span>
                    <span className={`${teamRecord.record.roi.units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {teamRecord.record.roi.units > 0 ? '+' : ''}{teamRecord.record.roi.units.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Games:</span>
                    <span className="text-gray-400">{teamRecord.record.totalPicks}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Advanced Analytics:</strong> Track comprehensive betting performance including moneyline wins, 
          against-the-spread (ATS) success, and over/under accuracy. ATS and O/U calculations use realistic score 
          simulations based on actual game outcomes. Units calculations assume standard -110 odds.
        </p>
      </div>
    </div>
  );
};

export default ATSStatsComponent;