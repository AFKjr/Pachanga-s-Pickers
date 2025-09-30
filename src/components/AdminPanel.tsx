import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import RelevanceAIAgentEmbed from './RelevanceAIAgentEmbed';
import AdminDataEntry from './AdminDataEntry';
import AdminPickResults from './AdminPickResults';
import AdminPickManager from './AdminPickManager';
import DataCollectionStatus from './DataCollectionStatus.tsx';

const AdminPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'manage' | 'results' | 'data-collection'>('generate');

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
      {/* Tab Navigation */}
      <div className='mb-6'>
        <div className='flex space-x-1 bg-gray-800 p-1 rounded-lg'>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            🤖 Generate Picks
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Manage Picks
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Update Results
          </button>
          <button
            onClick={() => setActiveTab('data-collection')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'data-collection'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Data Collection
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' && (
        <>
          {/* Relevance AI Agent Embed */}
          <RelevanceAIAgentEmbed />

          {/* Admin Data Entry */}
          <AdminDataEntry />

          <div className='mt-8 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded'>
            <h4 className='font-semibold mb-2'>Pick Generation Workflow:</h4>
            <ol className='list-decimal list-inside space-y-1 text-sm'>
              <li>Use the AI agent above to generate NFL predictions</li>
              <li>Copy the agent's response and paste it in "Process Agent Output"</li>
              <li>Click "Process & Publish" to add predictions to the database</li>
              <li>Switch to other tabs to manage existing picks or update results</li>
            </ol>
          </div>
        </>
      )}

      {activeTab === 'manage' && (
        <>
          <AdminPickManager />
          <div className='mt-8 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded'>
            <h4 className='font-semibold mb-2'>Pick Management Features:</h4>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              <li><strong>Revise Picks:</strong> Edit predictions, confidence, reasoning, and game details</li>
              <li><strong>Search & Filter:</strong> Find picks by team, week, or prediction text</li>
              <li><strong>Export Data:</strong> Copy pick information for external analysis</li>
              <li><strong>Pin Important Picks:</strong> Highlight key predictions for users</li>
            </ul>
          </div>
        </>
      )}

      {activeTab === 'results' && (
        <>
          <AdminPickResults />
          <div className='mt-8 bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded'>
            <h4 className='font-semibold mb-2'>Results Management:</h4>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              <li><strong>Update Results:</strong> Mark picks as Win, Loss, or Push</li>
              <li><strong>Batch Operations:</strong> Update multiple picks at once</li>
              <li><strong>Statistics Tracking:</strong> Performance metrics are automatically calculated</li>
              <li><strong>Real-time Updates:</strong> Changes immediately update statistics and displays</li>
            </ul>
          </div>
        </>
      )}

      {activeTab === 'data-collection' && (
        <DataCollectionStatus />
      )}
    </div>
  );
};

export default AdminPanel;
