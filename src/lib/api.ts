import { supabase } from './supabase';
import { validatePickData } from '../utils/inputValidation';
import { handleSupabaseError, createAppError, AppError } from '../utils/errorHandling';
import type { Pick } from '../types';

// Admin verification helper function
const verifyAdminUser = async (): Promise<{ isAdmin: boolean; user: any; error?: AppError }> => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      const appError = handleSupabaseError(authError, {
        operation: 'verifyAdminUser',
        component: 'api.verifyAdminUser'
      });
      return { isAdmin: false, user: null, error: appError };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      const appError = handleSupabaseError(profileError, {
        operation: 'getProfile',
        component: 'api.verifyAdminUser',
        metadata: { userId: user.id }
      });
      return { isAdmin: false, user, error: appError };
    }

    const isAdmin = profile?.is_admin || false;
    if (!isAdmin) {
      const appError = createAppError(
        new Error('Admin privileges required'),
        {
          operation: 'checkAdminPrivileges',
          component: 'api.verifyAdminUser',
          metadata: { userId: user.id }
        },
        'ADMIN_REQUIRED'
      );
      return { isAdmin: false, user, error: appError };
    }

    return { isAdmin, user };
  } catch (err) {
    const appError = createAppError(err, {
      operation: 'verifyAdminUser',
      component: 'api.verifyAdminUser'
    });
    return { isAdmin: false, user: null, error: appError };
  }
};

// Picks API
export const picksApi = {
  getAll: async () => {
    try {
      // First get all picks
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .order('created_at', { ascending: false });

      if (picksError) {
        throw handleSupabaseError(picksError, {
          operation: 'getAllPicks',
          component: 'api.getAll'
        });
      }

      // Then get profile information for each pick
      const picksWithProfiles = await Promise.all(
        (picksData || []).map(async (pick) => {
          // Skip profile fetch if user_id is null
          if (!pick.user_id) {
            return {
              ...pick,
              author_username: 'Anonymous',
              comments_count: 0
            };
          }

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
    } catch (error) {
      if (error instanceof AppError) {
        return { data: null, error };
      }
      const appError = createAppError(error, {
        operation: 'getAllPicks',
        component: 'api.getAll'
      }, 'PICK_LOAD_FAILED');
      return { data: null, error: appError };
    }
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
    try {
      // Verify admin privileges
      const { isAdmin, user, error: adminError } = await verifyAdminUser();
      if (!isAdmin) {
        const error = adminError || createAppError(
          new Error('Admin privileges required'),
          { operation: 'createPick', component: 'api.create' },
          'ADMIN_REQUIRED'
        );
        return { data: null, error };
      }

      // Validate pick data
      const validation = validatePickData({
        homeTeam: pick.game_info.home_team,
        awayTeam: pick.game_info.away_team,
        prediction: pick.prediction,
        reasoning: pick.reasoning,
        confidence: pick.confidence as number,
        week: pick.week as number,
        gameDate: pick.game_info.game_date
      });

      if (!validation.isValid) {
        const error = createAppError(
          new Error(`Invalid pick data: ${validation.errors.join(', ')}`),
          { 
            operation: 'createPick', 
            component: 'api.create',
            metadata: { validationErrors: validation.errors }
          },
          'VALIDATION_FAILED'
        );
        return { data: null, error };
      }

      // Use sanitized data for database insertion
      const sanitizedPick = {
        ...pick,
        game_info: {
          ...pick.game_info,
          home_team: validation.sanitizedData.homeTeam,
          away_team: validation.sanitizedData.awayTeam,
          game_date: validation.sanitizedData.gameDate
        },
        prediction: validation.sanitizedData.prediction,
        reasoning: validation.sanitizedData.reasoning,
        confidence: validation.sanitizedData.confidence as any,
        week: validation.sanitizedData.week as any,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('picks')
        .insert([sanitizedPick])
        .select()
        .single();

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'createPick',
          component: 'api.create',
          metadata: { pickData: sanitizedPick }
        });
        return { data: null, error: appError };
      }

      return { data, error: null };
    } catch (error) {
      const appError = error instanceof AppError ? error : createAppError(error, {
        operation: 'createPick',
        component: 'api.create'
      }, 'PICK_SAVE_FAILED');
      return { data: null, error: appError };
    }
  },

  update: async (id: string, updates: Partial<Pick>) => {
    try {
      // Verify admin privileges
      const { isAdmin, error: adminError } = await verifyAdminUser();
      if (!isAdmin) {
        const error = adminError || createAppError(
          new Error('Admin privileges required'),
          { operation: 'updatePick', component: 'api.update', metadata: { pickId: id } },
          'ADMIN_REQUIRED'
        );
        return { data: null, error };
      }

      const { data, error } = await supabase
        .from('picks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'updatePick',
          component: 'api.update',
          metadata: { pickId: id, updates }
        });
        return { data: null, error: appError };
      }

      return { data, error: null };
    } catch (error) {
      const appError = error instanceof AppError ? error : createAppError(error, {
        operation: 'updatePick',
        component: 'api.update',
        metadata: { pickId: id }
      }, 'PICK_UPDATE_FAILED');
      return { data: null, error: appError };
    }
  },

  delete: async (id: string) => {
    try {
      // Verify admin privileges
      const { isAdmin, error: adminError } = await verifyAdminUser();
      if (!isAdmin) {
        const error = adminError || createAppError(
          new Error('Admin privileges required'),
          { operation: 'deletePick', component: 'api.delete', metadata: { pickId: id } },
          'ADMIN_REQUIRED'
        );
        return { error };
      }

      const { error } = await supabase
        .from('picks')
        .delete()
        .eq('id', id);

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'deletePick',
          component: 'api.delete',
          metadata: { pickId: id }
        });
        return { error: appError };
      }

      return { error: null };
    } catch (error) {
      const appError = error instanceof AppError ? error : createAppError(error, {
        operation: 'deletePick',
        component: 'api.delete',
        metadata: { pickId: id }
      }, 'PICK_DELETE_FAILED');
      return { error: appError };
    }
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
    // Get all picks to calculate statistics
    const { data: picks, error } = await supabase
      .from('picks')
      .select('result, created_at')
      .order('created_at', { ascending: false });

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
    // For moneyline win rate, exclude pushes since they are neither wins nor losses
    const resolvedForWinRate = stats.wins + stats.losses;
    stats.winRate = resolvedForWinRate > 0 ? (stats.wins / resolvedForWinRate) * 100 : 0;

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

// Public Stats API - No authentication required
export const publicStatsApi = {
  getCurrentWeekStats: async () => {
    try {
      // Import dynamically to avoid circular dependencies
      const { getCurrentNFLWeek } = await import('../utils/nflWeeks');
      const currentWeek = getCurrentNFLWeek();
      
      if (!currentWeek) {
        return { 
          data: { 
            week: null,
            moneyline: { wins: 0, losses: 0, pushes: 0, total: 0, winRate: 0 },
            ats: { wins: 0, losses: 0, pushes: 0, total: 0, winRate: 0 },
            overUnder: { wins: 0, losses: 0, pushes: 0, total: 0, winRate: 0 }
          }, 
          error: null 
        };
      }

      // Fetch completed picks for current week (now with stored results)
      const { data: picks, error } = await supabase
        .from('picks')
        .select('result, ats_result, ou_result')
        .eq('week', currentWeek)
        .neq('result', 'pending');

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'getCurrentWeekStats',
          component: 'api.publicStatsApi'
        });
        return { data: null, error: appError };
      }

      // Initialize counters for all three bet types
      let mlWins = 0, mlLosses = 0, mlPushes = 0;
      let atsWins = 0, atsLosses = 0, atsPushes = 0;
      let ouWins = 0, ouLosses = 0, ouPushes = 0;

      // Count results from stored database values
      picks?.forEach(pick => {
        // Moneyline
        if (pick.result === 'win') mlWins++;
        else if (pick.result === 'loss') mlLosses++;
        else if (pick.result === 'push') mlPushes++;
        
        // ATS (use stored value)
        if (pick.ats_result === 'win') atsWins++;
        else if (pick.ats_result === 'loss') atsLosses++;
        else if (pick.ats_result === 'push') atsPushes++;
        
        // O/U (use stored value)
        if (pick.ou_result === 'win') ouWins++;
        else if (pick.ou_result === 'loss') ouLosses++;
        else if (pick.ou_result === 'push') ouPushes++;
      });

      const mlTotal = mlWins + mlLosses + mlPushes;
      const atsTotal = atsWins + atsLosses + atsPushes;
      const ouTotal = ouWins + ouLosses + ouPushes;

      return {
        data: {
          week: currentWeek,
          moneyline: {
            wins: mlWins,
            losses: mlLosses,
            pushes: mlPushes,
            total: mlTotal,
            winRate: mlTotal > 0 ? Math.round((mlWins / (mlWins + mlLosses)) * 100) : 0
          },
          ats: {
            wins: atsWins,
            losses: atsLosses,
            pushes: atsPushes,
            total: atsTotal,
            winRate: atsTotal > 0 ? Math.round((atsWins / (atsWins + atsLosses)) * 100) : 0
          },
          overUnder: {
            wins: ouWins,
            losses: ouLosses,
            pushes: ouPushes,
            total: ouTotal,
            winRate: ouTotal > 0 ? Math.round((ouWins / (ouWins + ouLosses)) * 100) : 0
          }
        },
        error: null
      };
    } catch (error) {
      const appError = createAppError(error, {
        operation: 'getCurrentWeekStats',
        component: 'api.publicStatsApi'
      }, 'PICK_LOAD_FAILED');
      return { data: null, error: appError };
    }
  },

  getAllTimeStats: async () => {
    try {
      // Fetch ALL completed picks (no week filter, now with stored results)
      const { data: picks, error } = await supabase
        .from('picks')
        .select('result, ats_result, ou_result')
        .neq('result', 'pending');

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'getAllTimeStats',
          component: 'api.publicStatsApi'
        });
        return { data: null, error: appError };
      }

      // Initialize counters for all three bet types
      let mlWins = 0, mlLosses = 0, mlPushes = 0;
      let atsWins = 0, atsLosses = 0, atsPushes = 0;
      let ouWins = 0, ouLosses = 0, ouPushes = 0;

      // Count results from stored database values
      picks?.forEach(pick => {
        // Moneyline
        if (pick.result === 'win') mlWins++;
        else if (pick.result === 'loss') mlLosses++;
        else if (pick.result === 'push') mlPushes++;
        
        // ATS (use stored value)
        if (pick.ats_result === 'win') atsWins++;
        else if (pick.ats_result === 'loss') atsLosses++;
        else if (pick.ats_result === 'push') atsPushes++;
        
        // O/U (use stored value)
        if (pick.ou_result === 'win') ouWins++;
        else if (pick.ou_result === 'loss') ouLosses++;
        else if (pick.ou_result === 'push') ouPushes++;
      });

      const mlTotal = mlWins + mlLosses + mlPushes;
      const atsTotal = atsWins + atsLosses + atsPushes;
      const ouTotal = ouWins + ouLosses + ouPushes;

      return {
        data: {
          moneyline: {
            wins: mlWins,
            losses: mlLosses,
            pushes: mlPushes,
            total: mlTotal,
            winRate: mlTotal > 0 ? Math.round((mlWins / (mlWins + mlLosses)) * 100) : 0
          },
          ats: {
            wins: atsWins,
            losses: atsLosses,
            pushes: atsPushes,
            total: atsTotal,
            winRate: atsTotal > 0 ? Math.round((atsWins / (atsWins + atsLosses)) * 100) : 0
          },
          overUnder: {
            wins: ouWins,
            losses: ouLosses,
            pushes: ouPushes,
            total: ouTotal,
            winRate: ouTotal > 0 ? Math.round((ouWins / (ouWins + ouLosses)) * 100) : 0
          }
        },
        error: null
      };
    } catch (error) {
      const appError = createAppError(error, {
        operation: 'getAllTimeStats',
        component: 'api.publicStatsApi'
      }, 'PICK_LOAD_FAILED');
      return { data: null, error: appError };
    }
  }
};

// Simplified API export - only what you actually use
export const api = {
  picks: picksApi,
  stats: agentStatsApi,
  publicStats: publicStatsApi
};