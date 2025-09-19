import { supabase } from './supabase';
import type { Pick } from '../types';

// Profile type for updates
interface ProfileUpdate {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

// Authentication functions
export const auth = {
  signUp: async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Picks API
export const picksApi = {
  getAll: async () => {
    // First get all picks
    const { data: picksData, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .order('created_at', { ascending: false });

    if (picksError) return { data: null, error: picksError };

    // Then get profile information for each pick
    const picksWithProfiles = await Promise.all(
      (picksData || []).map(async (pick) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', pick.user_id)
          .single();
        
        return {
          ...pick,
          author_username: profile?.username || 'Anonymous',
          comments_count: 0 // We'll add this later if needed
        };
      })
    );

    return { data: picksWithProfiles, error: null };
  },

  getPinned: async () => {
    // First get pinned picks
    const { data: picksData, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false });

    if (picksError) return { data: null, error: picksError };

    // Then get profile information for each pick
    const picksWithProfiles = await Promise.all(
      (picksData || []).map(async (pick) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', pick.user_id)
          .single();
        
        return {
          ...pick,
          author_username: profile?.username || 'Anonymous',
          comments_count: 0 // We'll add this later if needed
        };
      })
    );

    return { data: picksWithProfiles, error: null };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('picks')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (pick: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('picks')
      .insert([{ ...pick, user_id: user.id }])
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<Pick>) => {
    console.log(`🔄 Updating pick ${id} with:`, updates);
    const { data, error } = await supabase
      .from('picks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    console.log(`🔄 Update result for ${id}:`, { data, error });
    return { data, error };
  },

  delete: async (id: string) => {
    console.log(`🗑️ Deleting pick ${id}`);
    const { error } = await supabase
      .from('picks')
      .delete()
      .eq('id', id);
    console.log(`🗑️ Delete result for ${id}:`, { error });
    return { error };
  },

  subscribeToPicks: (callback: (payload: any) => void) => {
    return supabase
      .channel('picks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, callback)
      .subscribe();
  }
};

// Agent Statistics API
export const agentStatsApi = {
  getOverallStats: async () => {
    console.log('📊 Fetching overall stats from database...');
    // Get all picks to calculate statistics
    const { data: picks, error } = await supabase
      .from('picks')
      .select('result, created_at')
      .order('created_at', { ascending: false });

    console.log('📊 Raw picks data:', picks);
    console.log('📊 Stats query error:', error);

    if (error) return { data: null, error };

    // Calculate statistics
    const stats = {
      totalPicks: picks?.length || 0,
      wins: picks?.filter(pick => pick.result === 'win').length || 0,
      losses: picks?.filter(pick => pick.result === 'loss').length || 0,
      pushes: picks?.filter(pick => pick.result === 'push').length || 0,
      pending: picks?.filter(pick => pick.result === 'pending').length || 0,
      winRate: 0,
      totalResolved: 0
    };

    stats.totalResolved = stats.wins + stats.losses + stats.pushes;
    stats.winRate = stats.totalResolved > 0 ? (stats.wins / stats.totalResolved) * 100 : 0;

    console.log('📊 Calculated stats:', stats);
    return { data: stats, error: null };
  },

  getRecentPerformance: async (limit: number = 10) => {
    // Get recent picks with results
    const { data: picks, error } = await supabase
      .from('picks')
      .select('result, created_at, game_info')
      .not('result', 'eq', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error };

    return { data: picks, error: null };
  }
};

// Profiles API
export const profilesApi = {
  getCurrentProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: null };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { data, error };
  },

  updateProfile: async (updates: ProfileUpdate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    return { data, error };
  }
};