import { supabase } from './supabase';
import { validatePickData } from '../utils/inputValidation';
import { handleSupabaseError, createAppError, AppError } from '../utils/errorHandling';
import type { Pick } from '../types';


const verifyAdminUser = async (): Promise<{ isAdmin: boolean; user: any; error?: AppError }> => {
  try {
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      const appError = handleSupabaseError(authError, {
        operation: 'verifyAdminUser',
        component: 'api.verifyAdminUser'
      });
      return { isAdmin: false, user: null, error: appError };
    }

    
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


export const picksApi = {
  getAll: async () => {
    try {
      
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

      
      const picksWithProfiles = await Promise.all(
        (picksData || []).map(async (pick) => {
          
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
            comments_count: 0 
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
    
    const { data: picksData, error: picksError } = await supabase
      .from('picks')
      .select('*')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false });

    if (picksError) return { data: null, error: picksError };

    
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
          comments_count: 0 
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
      
      const { isAdmin, user, error: adminError } = await verifyAdminUser();
      if (!isAdmin) {
        const error = adminError || createAppError(
          new Error('Admin privileges required'),
          { operation: 'createPick', component: 'api.create' },
          'ADMIN_REQUIRED'
        );
        console.error('Admin verification failed:', error);
        return { data: null, error };
      }

      
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
        console.error('Validation failed:', {
          errors: validation.errors,
          originalData: {
            homeTeam: pick.game_info.home_team,
            awayTeam: pick.game_info.away_team,
            prediction: pick.prediction,
            confidence: pick.confidence,
            week: pick.week,
            gameDate: pick.game_info.game_date
          }
        });
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
        
        confidence: validation.sanitizedData.confidence ?? 50,
        
        week: validation.sanitizedData.week,
        
        user_id: pick.user_id || user.id,
        
        result: pick.result || 'pending',
        ats_result: pick.ats_result || (pick.spread_prediction ? 'pending' : undefined),
        ou_result: pick.ou_result || (pick.ou_prediction ? 'pending' : undefined)
      };

      console.log('Attempting to save pick:', {
        game: `${sanitizedPick.game_info.away_team} @ ${sanitizedPick.game_info.home_team}`,
        week: sanitizedPick.week,
        hasSpread: !!sanitizedPick.spread_prediction,
        hasOU: !!sanitizedPick.ou_prediction,
        hasMonteCarlo: !!sanitizedPick.monte_carlo_results
      });

      const { data, error } = await supabase
        .from('picks')
        .insert([sanitizedPick])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        const appError = handleSupabaseError(error, {
          operation: 'createPick',
          component: 'api.create',
          metadata: { pickData: sanitizedPick }
        });
        return { data: null, error: appError };
      }

      console.log('Pick saved successfully:', data.id);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in create:', error);
      const appError = error instanceof AppError ? error : createAppError(error, {
        operation: 'createPick',
        component: 'api.create'
      }, 'PICK_SAVE_FAILED');
      return { data: null, error: appError };
    }
  },

  update: async (id: string, updates: Partial<Pick>) => {
    try {
      
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


export const agentStatsApi = {
  getOverallStats: async () => {
    
    const { data: picks, error } = await supabase
      .from('picks')
      .select('result, created_at')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    
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
    
    const resolvedForWinRate = stats.wins + stats.losses;
    stats.winRate = resolvedForWinRate > 0 ? (stats.wins / resolvedForWinRate) * 100 : 0;

    return { data: stats, error: null };
  },

  getRecentPerformance: async (limit: number = 10) => {
    
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


export const publicStatsApi = {
  getCurrentWeekStats: async () => {
    try {
      
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

      
      const { data: picks, error } = await supabase
        .from('picks')
        .select('result, ats_result, ou_result, game_info, prediction, spread_prediction, ou_prediction')
        .eq('week', currentWeek)
        .neq('result', 'pending');

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'getCurrentWeekStats',
          component: 'api.publicStatsApi'
        });
        return { data: null, error: appError };
      }

      
      const { calculateAllResultsFromScores } = await import('../utils/calculations');

      
      let mlWins = 0, mlLosses = 0, mlPushes = 0;
      let atsWins = 0, atsLosses = 0, atsPushes = 0;
      let ouWins = 0, ouLosses = 0, ouPushes = 0;

      
      picks?.forEach(pick => {
        
        if (pick.result === 'win') mlWins++;
        else if (pick.result === 'loss') mlLosses++;
        else if (pick.result === 'push') mlPushes++;
        
        
        let atsResult = pick.ats_result;
        let ouResult = pick.ou_result;
        
        
        if (!atsResult || atsResult === 'pending' || !ouResult || ouResult === 'pending') {
          const calculated = calculateAllResultsFromScores(pick as Pick);
          if (!atsResult || atsResult === 'pending') atsResult = calculated.ats;
          if (!ouResult || ouResult === 'pending') ouResult = calculated.overUnder;
        }
        
        
        if (atsResult === 'win') atsWins++;
        else if (atsResult === 'loss') atsLosses++;
        else if (atsResult === 'push') atsPushes++;
        
        
        if (ouResult === 'win') ouWins++;
        else if (ouResult === 'loss') ouLosses++;
        else if (ouResult === 'push') ouPushes++;
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
      
      const { data: picks, error } = await supabase
        .from('picks')
        .select('result, ats_result, ou_result, game_info, prediction, spread_prediction, ou_prediction')
        .neq('result', 'pending');

      if (error) {
        const appError = handleSupabaseError(error, {
          operation: 'getAllTimeStats',
          component: 'api.publicStatsApi'
        });
        return { data: null, error: appError };
      }

      
      const { calculateAllResultsFromScores } = await import('../utils/calculations');

      
      let mlWins = 0, mlLosses = 0, mlPushes = 0;
      let atsWins = 0, atsLosses = 0, atsPushes = 0;
      let ouWins = 0, ouLosses = 0, ouPushes = 0;

      
      picks?.forEach(pick => {
        
        if (pick.result === 'win') mlWins++;
        else if (pick.result === 'loss') mlLosses++;
        else if (pick.result === 'push') mlPushes++;
        
        
        let atsResult = pick.ats_result;
        let ouResult = pick.ou_result;
        
        
        if (!atsResult || atsResult === 'pending' || !ouResult || ouResult === 'pending') {
          const calculated = calculateAllResultsFromScores(pick as Pick);
          if (!atsResult || atsResult === 'pending') atsResult = calculated.ats;
          if (!ouResult || ouResult === 'pending') ouResult = calculated.overUnder;
        }
        
        
        if (atsResult === 'win') atsWins++;
        else if (atsResult === 'loss') atsLosses++;
        else if (atsResult === 'push') atsPushes++;
        
        
        if (ouResult === 'win') ouWins++;
        else if (ouResult === 'loss') ouLosses++;
        else if (ouResult === 'push') ouPushes++;
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


export const api = {
  picks: picksApi,
  stats: agentStatsApi,
  publicStats: publicStatsApi
};