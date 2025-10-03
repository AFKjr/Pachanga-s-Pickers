import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from './LandingPage';

interface ProtectedContentProps {
  children: React.ReactNode;
}

const ProtectedContent: React.FC<ProtectedContentProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <>{children}</>;
};

export default ProtectedContent;