import { useEffect } from 'react';
import AgentStats from './AgentStats';
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
        <p className="text-gray-400">Making outright winning predictions (Moneyline). No parlays. </p>
      </div>

      {/* Performance Stats */}
      <AgentStats />

      {/* All Picks Display */}
      <PicksDisplay maxPicks={16} showWeekFilter={true} />

      {/* Disclaimer */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-sm">
          <strong>Disclaimer:</strong> All predictions are for entertainment and analysis purposes only.
          Past performance does not guarantee future results. Please play responsibly. Good Luck!
        </p>
      </div>
    </div>
  );
};

export default HomePage;