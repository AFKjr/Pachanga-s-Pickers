import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { publicStatsApi } from '../lib/api';

interface WeekStats {
  week: number | null;
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  winRate: number;
}

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch current week stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await publicStatsApi.getCurrentWeekStats();
      if (data && !error) {
        setWeekStats(data);
      }
      setStatsLoading(false);
    };

    fetchStats();

    // Refresh stats every 5 minutes (during live games)
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
                {statsLoading ? (
                  <p className="text-sm text-gray-400">Loading current week results...</p>
                ) : weekStats && weekStats.total > 0 ? (
                  <p className="text-sm text-gray-400">
                    Week {weekStats.week}: <span className="text-green-400 font-semibold">{weekStats.wins}-{weekStats.losses}</span>
                    {weekStats.pushes > 0 && `-${weekStats.pushes}`} ({weekStats.winRate}% win rate)
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Transparent results with detailed weekly breakdowns and historical performance
                  </p>
                )}
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

          {/* Social Proof / Stats Preview */}
          {weekStats && weekStats.total > 0 && (
            <div className="max-w-3xl mx-auto mt-16">
              <h2 className="text-2xl font-bold text-center mb-8">
                Week {weekStats.week} Performance
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {weekStats.winRate}%
                  </div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {weekStats.wins}-{weekStats.losses}
                    {weekStats.pushes > 0 && `-${weekStats.pushes}`}
                  </div>
                  <div className="text-sm text-gray-400">Record</div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {weekStats.total}
                  </div>
                  <div className="text-sm text-gray-400">Completed Picks</div>
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