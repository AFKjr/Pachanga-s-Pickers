import { supabase } from './supabase';
import type { Pick, Post, Comment } from '../types';

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
    const { data, error } = await supabase
      .from('picks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('picks')
      .delete()
      .eq('id', id);
    return { error };
  },

  subscribeToPicks: (callback: (payload: any) => void) => {
    return supabase
      .channel('picks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, callback)
      .subscribe();
  }
};

// Posts API
export const postsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (post: Omit<Post, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...post, user_id: user.id }])
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<Post>) => {
    const { data, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    return { error };
  }
};

// Comments API
export const commentsApi = {
  getByPostId: async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  create: async (comment: Omit<Comment, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert([{ ...comment, user_id: user.id }])
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<Comment>) => {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);
    return { error };
  },

  vote: async (id: string, voteType: 'upvote' | 'downvote') => {
    const { data, error } = await supabase.rpc('vote_comment', {
      comment_id: id,
      vote_type: voteType
    });
    return { data, error };
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

// Matchup Threads API
export const matchupThreadsApi = {
  // Generate threads for current week matchups
  async generateMatchupThreads(): Promise<{ data: any[], error: any }> {
    try {
      // Get current week schedule from real data (not mock)
      const { llmSportsAPI } = await import('./llmSportsAPI');
      const schedule = await llmSportsAPI.fetchCurrentWeekSchedule();

      if (!schedule.games || schedule.games.length === 0) {
        return { data: [], error: 'No games found in schedule' };
      }

      const threads = [];

      for (const game of schedule.games) {
        // Check if thread already exists for this game
        const existingThread = await this.getThreadByGameId(game.id);
        if (existingThread.data) {
          threads.push(existingThread.data);
          continue;
        }

        // Create new thread for this matchup
        const threadData = {
          title: `${game.awayTeam} @ ${game.homeTeam} - Game Thread`,
          content: `## ${game.awayTeam} vs ${game.homeTeam}

**Date:** ${new Date(game.date).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

**Time:** ${new Date(game.date).toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
})}

**Venue:** ${game.venue}
**Location:** ${game.location}

### Discussion
Share your thoughts, predictions, and analysis for this matchup!

### Betting Lines (if available)
- Spread: TBD
- Over/Under: TBD

*This thread was automatically generated for the matchup.*`,
          game_id: game.id,
          game_info: {
            home_team: game.homeTeam,
            away_team: game.awayTeam,
            league: 'NFL',
            game_date: game.date,
            venue: game.venue,
            location: game.location
          }
        };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { data: [], error: 'User not authenticated' };
        }

        const { data, error } = await supabase
          .from('posts')
          .insert([{
            ...threadData,
            user_id: user.id,
            title: threadData.title,
            content: threadData.content
          }])
          .select(`
            *
          `)
          .single();

        if (error) {
          console.error('Error creating thread for game:', game.id, error);
          continue;
        }

        // Get the user profile separately
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        threads.push({
          ...data,
          author_username: profile?.username || 'System'
        });
      }

      return { data: threads, error: null };
    } catch (error) {
      console.error('Error generating matchup threads:', error);
      return { data: [], error };
    }
  },

  // Get thread by game ID
  async getThreadByGameId(gameId: string): Promise<{ data: any, error: any }> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *
      `)
      .eq('content', `%${gameId}%`)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return { data: [], error };
    }

    return {
      data: data ? {
        ...data,
        author_username: data.profiles?.username || 'System'
      } : null,
      error: null
    };
  },

  // Get all matchup threads
  async getAllMatchupThreads(): Promise<{ data: any[], error: any }> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .ilike('title', '%@%') // Threads with @ symbol (matchup format)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error };

    // Get profile information for each thread
    const threadsWithProfiles = await Promise.all(
      (data || []).map(async (thread) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', thread.user_id)
          .single();
        
        return {
          ...thread,
          author_username: profile?.username || 'System'
        };
      })
    );

    return { data: threadsWithProfiles, error: null };
  },

  // Get comments for a matchup thread
  async getThreadComments(threadId: string): Promise<{ data: any[], error: any }> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', threadId)
      .order('created_at', { ascending: true });

    if (error) return { data: [], error };

    // Get profile information for each comment
    const commentsWithProfiles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', comment.user_id)
          .single();
        
        return {
          ...comment,
          author_username: profile?.username || 'Anonymous'
        };
      })
    );

    return { data: commentsWithProfiles, error: null };
  }
};