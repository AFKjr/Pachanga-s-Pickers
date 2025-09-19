import { useEffect } from 'react';
import AgentStats from './AgentStats';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
  }, [authLoading]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pachanga's Picks</h1>
        </div>
      </div>

      {/* AI Agent Statistics */}
      <AgentStats />
    </div>
  );
};

export default HomePage;