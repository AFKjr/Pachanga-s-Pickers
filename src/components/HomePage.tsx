import { useEffect } from 'react';
import UnifiedAllTimeRecord from './UnifiedAllTimeRecord';
import PicksDisplay from './PicksDisplay';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }
  }, [authLoading]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pachanga's Picks</h1>
        <p className="text-gray-400">
          Weekly NFL predictions with comprehensive moneyline, spread, and over/under analytics
        </p>
      </div>

      {/* Unified All-Time Record - Combines Correct Moneyline + ATS + O/U */}
      <UnifiedAllTimeRecord />

      {/* All Picks Display */}
      <PicksDisplay maxPicks={16} showWeekFilter={true} />

      {/* Enhanced Disclaimer */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-yellow-400 text-lg"></span>
          <div>
            <p className="text-gray-300 text-sm">
              <strong>Important Disclaimer:</strong> All predictions and betting analytics are for entertainment and educational purposes only.
              Past performance does not guarantee future results. ATS and O/U calculations use simulated scores based on actual game outcomes.
              When gaming, please play responsibly and within your means.
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

export default HomePage;