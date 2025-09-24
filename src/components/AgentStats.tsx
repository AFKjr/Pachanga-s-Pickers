import React, { useState, useEffect } from 'react';
import { agentStatsApi } from '../lib/api';
import { globalEvents } from '../lib/events';

interface AgentStatsData {
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  winRate: number;
  totalResolved: number;
}

const AgentStats: React.FC = () => {
  const [stats, setStats] = useState<AgentStatsData | null>(null);
  const [recentPicks, setRecentPicks] = useState<any[]>([]);
  const [allRecentPicks, setAllRecentPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecentResultsModal, setShowRecentResultsModal] = useState(false);

  useEffect(() => {
    loadStats();

    // Listen for refresh events from admin panel
    const handleRefresh = () => {
      console.log('🔄 Received refreshStats event, reloading stats...');
      loadStats();
    };

    globalEvents.on('refreshStats', handleRefresh);

    // Cleanup event listener
    return () => {
      globalEvents.off('refreshStats', handleRefresh);
    };
  }, []);

  const loadAllRecentPicks = async () => {
    setModalLoading(true);
    try {
      const result = await agentStatsApi.getRecentPerformance(20); // Load more picks for modal
      if (result.data) {
        setAllRecentPicks(result.data);
      }
    } catch (err) {
      console.error('Failed to load all recent picks:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const openRecentResultsModal = () => {
    setShowRecentResultsModal(true);
    loadAllRecentPicks();
  };

  const loadStats = async () => {
    console.log('Loading agent stats...');
    setLoading(true);
    setError('');

    try {
      const [statsResult, recentResult] = await Promise.all([
        agentStatsApi.getOverallStats(),
        agentStatsApi.getRecentPerformance(5)
      ]);

      console.log('Stats API result:', statsResult);
      console.log('Recent picks result:', recentResult);

      if (statsResult.error) {
        throw new Error('Failed to load stats: ' + statsResult.error.message);
      }

      if (statsResult.data) {
        console.log('Setting stats:', statsResult.data);
        setStats(statsResult.data);
      }

      if (recentResult.data) {
        console.log('Setting recent picks:', recentResult.data);
        setRecentPicks(recentResult.data);
      }

      if (recentResult.error) {
        console.error('Failed to load recent picks:', recentResult.error);
      }

      setStats(statsResult.data);
      setRecentPicks(recentResult.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      case 'push': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return 'W';
      case 'loss': return 'L';
      case 'push': return 'P';
      default: return '-';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="text-center py-4">
          <div className="text-gray-400">Loading agent statistics...</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          Failed to load agent statistics
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">All Time Record</h2>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.totalPicks}</div>
          <div className="text-sm text-gray-300">Total Picks</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
          <div className="text-sm text-gray-300">Wins</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
          <div className="text-sm text-gray-300">Losses</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.pushes}</div>
          <div className="text-sm text-gray-300">Pushes</div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Win Rate</div>
            <div className="text-sm text-gray-400">
              {stats.totalResolved} resolved picks
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${stats.winRate >= 60 ? 'text-green-400' : stats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">
              {stats.pending} pending
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${stats.winRate >= 60 ? 'bg-green-500' : stats.winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(stats.winRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Recent Performance */}
      {recentPicks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Recent Results</h3>
            <button
              onClick={openRecentResultsModal}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {recentPicks.map((pick, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getResultIcon(pick.result)}</span>
                  <div>
                    <div className="text-sm text-white">
                      {pick.game_info?.away_team} vs {pick.game_info?.home_team}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(pick.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${getResultColor(pick.result)}`}>
                  {pick.result?.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Performance Tracking:</strong> These statistics represent my personal historical performance.
          Past results do not guarantee future outcomes. Always play responsibly.
        </p>
      </div>

      {/* Recent Results Modal */}
      {showRecentResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">All Recent Results</h2>
              <button
                onClick={() => setShowRecentResultsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body with Scrollable Content */}
            <div className="p-6">
              {modalLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">Loading recent results...</div>
                </div>
              ) : (
                <div className="results-scroll-container">
                  <div className="space-y-3">
                    {allRecentPicks.length > 0 ? (
                      allRecentPicks.map((pick, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getResultIcon(pick.result)}</span>
                              <div>
                                <div className="text-white font-medium">
                                  {pick.game_info?.away_team} vs {pick.game_info?.home_team}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(pick.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-medium px-2 py-1 rounded ${getResultColor(pick.result)} bg-opacity-20`}>
                              {pick.result?.toUpperCase()}
                            </div>
                          </div>
                          
                          {/* Additional details for modal view */}
                          {pick.prediction && (
                            <div className="text-sm text-gray-300 mb-1">
                              <strong>Prediction:</strong> {pick.prediction}
                            </div>
                          )}
                          
                          {pick.confidence && (
                            <div className="text-sm text-gray-400">
                              <strong>Confidence:</strong> {pick.confidence}%
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        No recent results available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStats;