import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import RelevanceAIAgentEmbed from './RelevanceAIAgentEmbed';
import AdminDataEntry from './AdminDataEntry';
import AdminPickResults from './AdminPickResults';

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
      {/* Relevance AI Agent Embed */}
      <RelevanceAIAgentEmbed />

      {/* Admin Data Entry */}
      <AdminDataEntry />

      {/* Admin Pick Results */}
      <AdminPickResults />

      <div className='mt-8 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded'>
        <h4 className='font-semibold mb-2'>Admin Workflow:</h4>
        <ol className='list-decimal list-inside space-y-1 text-sm'>
          <li>Use the AI agent above to generate NFL predictions</li>
          <li>Copy the agent's response and paste it in "Process Agent Output"</li>
          <li>Click "Process & Publish" to add predictions to the database</li>
          <li>Update pick results in the "Update Pick Results" section as games finish</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminPanel;
