import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import RelevanceAIAgentEmbed from './RelevanceAIAgentEmbed';

const AdminPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  // Check admin status when user changes
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminCheckLoading(false);
      return;
    }

    try {
      setAdminCheckLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setAdminCheckLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || adminCheckLoading) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center py-8'>
          <div className='text-gray-400'>Loading admin panel...</div>
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4'>
          <h3 className='font-semibold mb-2'>🔐 Authentication Required</h3>
          <p>Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Show admin access denied if not admin
  if (!isAdmin) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4'>
          <h3 className='font-semibold mb-2'>👑 Admin Access Required</h3>
          <p>You need administrator privileges to access this panel.</p>
          <p className='text-sm mt-2'>Contact an administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>🤖 AI Admin Dashboard</h1>
        <p className='text-gray-400'>
          Use the Relevance AI agent below to generate predictions, analyze games, and research teams
        </p>
      </div>

      {/* Relevance AI Agent Embed */}
      <RelevanceAIAgentEmbed />

      <div className='mt-8 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded'>
        <h4 className='font-semibold mb-2'>💡 How to Use the AI Agent:</h4>
        <ul className='list-disc list-inside space-y-1 text-sm'>
          <li><strong>Generate Predictions:</strong> Ask 'Generate predictions for this week\'s NFL games'</li>
          <li><strong>Game Analysis:</strong> Ask 'Analyze the Chiefs vs Bills matchup'</li>
          <li><strong>Team Research:</strong> Ask 'Research injuries for the Kansas City Chiefs'</li>
          <li><strong>Betting Analysis:</strong> Ask 'What\'s the betting analysis for tonight\'s games?'</li>
          <li><strong>Save Predictions:</strong> The agent automatically saves predictions to the database</li>
          <li><strong>User Comments:</strong> Users can comment on AI-generated predictions on the home page</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
