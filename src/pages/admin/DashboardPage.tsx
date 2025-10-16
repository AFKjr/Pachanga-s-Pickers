import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { picksApi } from '../../lib/api';
import type { Pick } from '../../types';

const DashboardPage: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const { data } = await picksApi.getAll();

    if (data) {
      setPicks(data);
    }

    setLoading(false);
  };

  const totalPicks = picks.length;
  const wins = picks.filter(p => p.result === 'win').length;
  const losses = picks.filter(p => p.result === 'loss').length;
  const pending = picks.filter(p => !p.result || p.result === 'pending').length;
  const winRate = totalPicks > 0 ? (wins / (wins + losses)) * 100 : 0;

  const recentPicks = picks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const thisWeekPicks = picks.filter(p => {
    const now = new Date();
    const pickDate = new Date(p.created_at);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return pickDate > weekAgo;
  }).length;

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin <span className="text-lime-400">Dashboard</span>
        </h1>
        <p className="text-gray-400">Overview of your picks and performance</p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6 hover:border-lime-500/30 transition-colors">
          <div className="text-sm text-gray-400 mb-1">Total Picks</div>
          <div className="text-3xl font-bold text-white">{totalPicks}</div>
        </div>
        
        <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6 hover:border-lime-500/30 transition-colors">
          <div className="text-sm text-gray-400 mb-1">Win Rate</div>
          <div className="text-3xl font-bold text-lime-400">
            {winRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6 hover:border-lime-500/30 transition-colors">
          <div className="text-sm text-gray-400 mb-1">Pending</div>
          <div className="text-3xl font-bold text-yellow-400">{pending}</div>
        </div>
        
        <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6 hover:border-lime-500/30 transition-colors">
          <div className="text-sm text-gray-400 mb-1">This Week</div>
          <div className="text-3xl font-bold text-lime-400">{thisWeekPicks}</div>
        </div>
      </div>

      {}
      <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/generate"
            className="bg-lime-500 hover:bg-lime-400 text-black p-6 rounded-lg transition-all text-center shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 hover:scale-105"
          >
            <div className="text-3xl mb-2">🎲</div>
            <div className="font-bold">Generate Picks</div>
            <div className="text-sm opacity-75 mt-1">Use AI to create predictions</div>
          </Link>
          
          <Link
            to="/admin/manage"
            className="bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-400 p-6 rounded-lg transition-all text-center"
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="font-bold">Manage Picks</div>
            <div className="text-sm opacity-75 mt-1">Edit existing predictions</div>
          </Link>
          
          <Link
            to="/admin/results"
            className="bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-400 p-6 rounded-lg transition-all text-center"
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold">Update Results</div>
            <div className="text-sm opacity-75 mt-1">Enter game scores</div>
          </Link>
        </div>
      </div>

      {}
      <div className="bg-[#0f0f0f] border border-lime-500/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Picks</h2>
        {recentPicks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No recent picks</div>
        ) : (
          <div className="space-y-3">
            {recentPicks.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between bg-[#0a0a0a] border border-lime-500/10 p-4 rounded-lg hover:border-lime-500/30 transition-colors">
                <div>
                  <div className="text-white font-medium">
                    {pick.game_info.away_team} @ {pick.game_info.home_team}
                  </div>
                  <div className="text-sm text-gray-400">{pick.prediction}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pick.result === 'win' ? 'bg-lime-500/20 border border-lime-500/30 text-lime-400' :
                    pick.result === 'loss' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
                    pick.result === 'push' ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' :
                    'bg-gray-500/20 border border-gray-500/30 text-gray-400'
                  }`}>
                    {pick.result || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      <div className="bg-lime-500/10 border border-lime-500/30 text-lime-300 px-4 py-3 rounded-lg">
        <h4 className="font-semibold mb-2 text-lime-400">Dashboard Tips:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Use the dashboard to get a quick overview of your picking performance</li>
          <li>Navigate to specific pages using the quick actions above</li>
          <li>All changes sync in real-time across the application</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
