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

  useEffect(() => {
    if (authLoading) {
      return;
    }

    
    const handleRefresh = () => {
      console.log('HomePage: Received refresh event, updating components...');
      setRefreshKey(prev => prev + 1);
    };

    globalEvents.on('refreshStats', handleRefresh);
    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshStats', handleRefresh);
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, [authLoading]);

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <main className="flex-1">
          <PageHeader />

          <div className="max-w-7xl mx-auto px-6 space-y-8">
            {}
            <StatsDashboard key={`stats-${refreshKey}`} />

            {}
            <PicksDisplay key={`picks-${refreshKey}`} maxPicks={16} showWeekFilter={true} />
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedContent>
  );
};

export default HomePage;