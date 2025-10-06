import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { publicStatsApi } from '../lib/api';
import { globalEvents } from '../lib/events';

interface BetTypeStats {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  winRate: number;
}

interface WeekStats {
  week: number | null;
  moneyline: BetTypeStats;
  ats: BetTypeStats;
  overUnder: BetTypeStats;
}

interface AllTimeStats {
  moneyline: BetTypeStats;
  ats: BetTypeStats;
  overUnder: BetTypeStats;
}

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch current week and all-time stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      const [weekResult, allTimeResult] = await Promise.all([
        publicStatsApi.getCurrentWeekStats(),
        publicStatsApi.getAllTimeStats()
      ]);
      
      if (weekResult.data && !weekResult.error) {
        setWeekStats(weekResult.data);
      }
      
      if (allTimeResult.data && !allTimeResult.error) {
        setAllTimeStats(allTimeResult.data);
      }
      
      setStatsLoading(false);
    };

    fetchStats();

    // Listen for stats refresh events from admin updates
    const handleRefresh = () => {
      fetchStats();
    };
    
    globalEvents.on('refreshStats', handleRefresh);

    // Refresh stats every 5 minutes (during live games)
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      globalEvents.off('refreshStats', handleRefresh);
    };
  }, []);

  // If user is already logged in, don't show landing page
  if (user) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Pachanga Picks
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Smart, data-driven NFL predictions to give you an edge in your betting decisions
            </p>

            {/* Value Propositions */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-3xl mb-3"></div>
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-sm text-gray-400">
                  Comprehensive ATS, Over/Under, and Moneyline tracking with real performance metrics
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-3xl mb-3"></div>
                <h3 className="text-lg font-semibold mb-2">Proven Track Record</h3>
                <p className="text-sm text-gray-400">
                  Transparent results with detailed weekly breakdowns and historical performance
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-3xl mb-3"></div>
                <h3 className="text-lg font-semibold mb-2">Expert Insights</h3>
                <p className="text-sm text-gray-400">
                  In-depth analysis and reasoning behind every pick to help you make informed decisions
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-lg transition-colors"
            >
              Get Free Access
            </button>

            <p className="text-sm text-gray-400 mt-4">
              No credit card required. Always free.
            </p>
          </div>

          {/* Weekly Performance Section */}
          <div className="max-w-4xl mx-auto mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">
              {statsLoading ? 'Loading Performance...' : weekStats?.week ? `Week ${weekStats.week} Performance` : 'This Week\'s Performance'}
            </h2>
            
            {statsLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-800 p-6 rounded-lg text-center animate-pulse">
                    <div className="h-8 bg-gray-700 rounded mb-3"></div>
                    <div className="h-10 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-24 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : weekStats && (weekStats.moneyline.total > 0 || weekStats.ats.total > 0 || weekStats.overUnder.total > 0) ? (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Moneyline Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-green-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Moneyline</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {weekStats.moneyline.wins}-{weekStats.moneyline.losses}
                    {weekStats.moneyline.pushes > 0 && `-${weekStats.moneyline.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {weekStats.moneyline.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {weekStats.moneyline.total} picks
                  </div>
                </div>

                {/* ATS Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Against The Spread</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {weekStats.ats.wins}-{weekStats.ats.losses}
                    {weekStats.ats.pushes > 0 && `-${weekStats.ats.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {weekStats.ats.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {weekStats.ats.total} picks
                  </div>
                </div>

                {/* Over/Under Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-purple-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Over/Under</h3>
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {weekStats.overUnder.wins}-{weekStats.overUnder.losses}
                    {weekStats.overUnder.pushes > 0 && `-${weekStats.overUnder.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {weekStats.overUnder.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {weekStats.overUnder.total} picks
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400">
                  No completed picks yet for this week. Check back after games are played!
                </p>
              </div>
            )}
          </div>

          {/* All-Time Performance Section */}
          {allTimeStats && (allTimeStats.moneyline.total > 0 || allTimeStats.ats.total > 0 || allTimeStats.overUnder.total > 0) && (
            <div className="max-w-4xl mx-auto mt-16">
              <h2 className="text-2xl font-bold text-center mb-8">All-Time Performance</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Moneyline Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-green-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Moneyline</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {allTimeStats.moneyline.wins}-{allTimeStats.moneyline.losses}
                    {allTimeStats.moneyline.pushes > 0 && `-${allTimeStats.moneyline.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {allTimeStats.moneyline.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {allTimeStats.moneyline.total} picks
                  </div>
                </div>

                {/* ATS Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Against The Spread</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {allTimeStats.ats.wins}-{allTimeStats.ats.losses}
                    {allTimeStats.ats.pushes > 0 && `-${allTimeStats.ats.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {allTimeStats.ats.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {allTimeStats.ats.total} picks
                  </div>
                </div>

                {/* Over/Under Stats */}
                <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-purple-500">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Over/Under</h3>
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {allTimeStats.overUnder.wins}-{allTimeStats.overUnder.losses}
                    {allTimeStats.overUnder.pushes > 0 && `-${allTimeStats.overUnder.pushes}`}
                  </div>
                  <div className="text-xl text-gray-400 mb-1">
                    {allTimeStats.overUnder.winRate}% Win Rate
                  </div>
                  <div className="text-sm text-gray-500">
                    {allTimeStats.overUnder.total} picks
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ko-fi Support Section */}
          <div className="max-w-2xl mx-auto mt-16 bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-4">Support the Work</h3>
            <p className="text-gray-300 mb-6">
              All picks and insights are completely free. If you find value in the analysis,
              consider supporting with a Ko-fi donation.
            </p>
            {/* Add Ko-fi button here when you have your Ko-fi link */}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default LandingPage;