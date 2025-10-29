import { useEffect, useState } from 'react';
import StatsDashboard from './StatsDashboard';
import PicksDisplay from './PicksDisplay';
import PageHeader from './PageHeader';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import ProtectedContent from './ProtectedContent';
import { globalEvents } from '../lib/events';

const HomePage = () => {
  const { loading: authLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [picksLoading, setPicksLoading] = useState(true);

  const isPageLoading = statsLoading || picksLoading;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    // Listen for refresh events from admin updates
    const handleRefresh = () => {
      console.log('HomePage: Received refresh event, updating components...');
      setStatsLoading(true);
      setPicksLoading(true);
      setRefreshKey(prev => prev + 1);
    };

    globalEvents.on('refreshStats', handleRefresh);
    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshStats', handleRefresh);
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, [authLoading]);

  const handleStatsLoadComplete = () => {
    setStatsLoading(false);
  };

  const handlePicksLoadComplete = () => {
    setPicksLoading(false);
  };

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <main className="flex-1">
          <PageHeader />

          <div className="max-w-7xl mx-auto px-6 space-y-8">
            {/* Show unified loading overlay while components load */}
            {isPageLoading && (
              <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[rgba(255,255,255,0.05)]">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-lime-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-lime-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <div className="text-gray-400 text-lg">Loading your dashboard...</div>
                </div>
              </div>
            )}

            {/* Render components but hide them visually until loaded */}
            <div className={isPageLoading ? 'hidden' : 'contents'}>
              {/* Pachanga Stats Dashboard */}
              <StatsDashboard 
                key={`stats-${refreshKey}`}
                onLoadComplete={handleStatsLoadComplete}
              />

              {/* All Picks Display */}
              <PicksDisplay 
                key={`picks-${refreshKey}`}
                showWeekFilter={true}
                onLoadComplete={handlePicksLoadComplete}
              />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedContent>
  );
};

export default HomePage;