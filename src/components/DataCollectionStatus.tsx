import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DataStats {
  teamStatsOffense: number;
  teamStatsDefense: number;
  injuryReports: number;
  bettingLines: number;
  lastUpdated: {
    teamStatsOffense?: string;
    teamStatsDefense?: string;
    injuryReports?: string;
    bettingLines?: string;
  };
}

const DataCollectionStatus: React.FC = () => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDataStats();
  }, []);

  const loadDataStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get counts from all data tables
      const [offenseRes, defenseRes, injuryRes, bettingRes] = await Promise.all([
        supabase.from('team_stats_offense').select('scraped_at', { count: 'exact', head: true }),
        supabase.from('team_stats_defense').select('scraped_at', { count: 'exact', head: true }),
        supabase.from('injury_reports').select('scraped_at', { count: 'exact', head: true }),
        supabase.from('betting_lines').select('scraped_at', { count: 'exact', head: true })
      ]);

      // Get latest timestamps
      const [offenseLatest, defenseLatest, injuryLatest, bettingLatest] = await Promise.all([
        supabase.from('team_stats_offense').select('scraped_at').order('scraped_at', { ascending: false }).limit(1),
        supabase.from('team_stats_defense').select('scraped_at').order('scraped_at', { ascending: false }).limit(1),
        supabase.from('injury_reports').select('scraped_at').order('scraped_at', { ascending: false }).limit(1),
        supabase.from('betting_lines').select('scraped_at').order('scraped_at', { ascending: false }).limit(1)
      ]);

      const dataStats: DataStats = {
        teamStatsOffense: offenseRes.count || 0,
        teamStatsDefense: defenseRes.count || 0,
        injuryReports: injuryRes.count || 0,
        bettingLines: bettingRes.count || 0,
        lastUpdated: {
          teamStatsOffense: offenseLatest.data?.[0]?.scraped_at,
          teamStatsDefense: defenseLatest.data?.[0]?.scraped_at,
          injuryReports: injuryLatest.data?.[0]?.scraped_at,
          bettingLines: bettingLatest.data?.[0]?.scraped_at
        }
      };

      setStats(dataStats);
    } catch (err) {
      console.error('Error loading data stats:', err);
      setError('Failed to load data collection statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDataStats();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getDataFreshness = (timestamp?: string) => {
    if (!timestamp) return { status: 'unknown', color: 'text-gray-400' };

    const now = new Date();
    const dataTime = new Date(timestamp);
    const hoursDiff = (now.getTime() - dataTime.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 1) return { status: 'Fresh', color: 'text-green-400' };
    if (hoursDiff < 6) return { status: 'Recent', color: 'text-blue-400' };
    if (hoursDiff < 24) return { status: 'Stale', color: 'text-yellow-400' };
    return { status: 'Old', color: 'text-red-400' };
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading data collection status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          <h3 className="font-semibold mb-2">❌ Error Loading Data</h3>
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Data Collection Status</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Team Offense Stats</h3>
              <p className="text-2xl font-bold text-white">{stats?.teamStatsOffense || 0}</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${getDataFreshness(stats?.lastUpdated.teamStatsOffense).color}`}>
              {getDataFreshness(stats?.lastUpdated.teamStatsOffense).status}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Team Defense Stats</h3>
              <p className="text-2xl font-bold text-white">{stats?.teamStatsDefense || 0}</p>
            </div>
            <div className="text-2xl">🛡️</div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${getDataFreshness(stats?.lastUpdated.teamStatsDefense).color}`}>
              {getDataFreshness(stats?.lastUpdated.teamStatsDefense).status}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Injury Reports</h3>
              <p className="text-2xl font-bold text-white">{stats?.injuryReports || 0}</p>
            </div>
            <div className="text-2xl">🏥</div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${getDataFreshness(stats?.lastUpdated.injuryReports).color}`}>
              {getDataFreshness(stats?.lastUpdated.injuryReports).status}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Betting Lines</h3>
              <p className="text-2xl font-bold text-white">{stats?.bettingLines || 0}</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="mt-2">
            <span className={`text-xs ${getDataFreshness(stats?.lastUpdated.bettingLines).color}`}>
              {getDataFreshness(stats?.lastUpdated.bettingLines).status}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Timestamps */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Last Updated Times</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Team Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Offense:</span>
                <span className="text-white">{formatTimestamp(stats?.lastUpdated.teamStatsOffense)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Defense:</span>
                <span className="text-white">{formatTimestamp(stats?.lastUpdated.teamStatsDefense)}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Live Data</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Injuries:</span>
                <span className="text-white">{formatTimestamp(stats?.lastUpdated.injuryReports)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Betting Lines:</span>
                <span className="text-white">{formatTimestamp(stats?.lastUpdated.bettingLines)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extension Status */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">🔧 ESPN Scraper Extension</h4>
        <p className="text-sm mb-2">
          The ESPN data scraper extension automatically collects fresh data from ESPN pages.
          Install the extension and enable auto-scraping for continuous data updates.
        </p>
        <div className="text-xs space-y-1">
          <p><strong>Auto-scraping schedule:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Team stats: Every 2 hours</li>
            <li>Injury reports: Every hour</li>
            <li>Betting lines: Every 30 minutes</li>
            <li>Game schedules: Every 4 hours</li>
          </ul>
        </div>
      </div>

      {/* Data Usage Info */}
      <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">📈 How This Data is Used</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>AI Predictions:</strong> Team stats and injury data feed into the AI agent for better predictions</li>
          <li><strong>Betting Analysis:</strong> Live odds and lines help validate prediction confidence</li>
          <li><strong>Performance Tracking:</strong> Historical data enables trend analysis and model improvement</li>
          <li><strong>Real-time Updates:</strong> Fresh data ensures predictions are based on current information</li>
        </ul>
      </div>
    </div>
  );
};

export default DataCollectionStatus;