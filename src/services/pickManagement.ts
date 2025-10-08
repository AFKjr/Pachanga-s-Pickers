/**
 * Pick Management Service
 * Handles all pick CRUD operations and business logic
 */

import { picksApi } from '../lib/api';
import { Pick, NFLWeek } from '../types';
import { getPickWeek } from '../utils/nflWeeks';
import { calculateAllResultsFromScores } from '../utils/atsCalculator';
import { AppError, createAppError } from '../utils/errorHandling';

export interface PicksByWeek {
  [week: number]: Pick[];
}

export interface PickUpdatePayload {
  result?: 'win' | 'loss' | 'push' | 'pending';
  ats_result?: 'win' | 'loss' | 'push' | 'pending';
  ou_result?: 'win' | 'loss' | 'push' | 'pending';
  game_info?: Pick['game_info'];
}

/**
 * Load all picks from the database
 */
export async function loadAllPicks(): Promise<{ data: Pick[] | null; error: AppError | null }> {
  try {
    const { data, error } = await picksApi.getAll();
    
    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: createAppError(err, {
        operation: 'loadAllPicks',
        component: 'pickManagement'
      })
    };
  }
}

/**
 * Group picks by week
 */
export function groupPicksByWeek(picks: Pick[]): PicksByWeek {
  const weekGroups: PicksByWeek = {};

  picks.forEach(pick => {
    const week = getPickWeek(pick);
    if (!weekGroups[week]) {
      weekGroups[week] = [];
    }
    weekGroups[week].push(pick);
  });

  return weekGroups;
}

/**
 * Get available weeks from picks (sorted most recent first)
 */
export function getAvailableWeeks(picks: Pick[]): NFLWeek[] {
  const weekGroups = groupPicksByWeek(picks);
  return Object.keys(weekGroups)
    .map(w => parseInt(w))
    .sort((a, b) => b - a) as NFLWeek[];
}

/**
 * Update a pick's result
 */
export async function updatePickResult(
  pickId: string,
  result: 'win' | 'loss' | 'push'
): Promise<{ data: Pick | null; error: AppError | null }> {
  try {
    const { data, error } = await picksApi.update(pickId, { result });
    
    if (error) {
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: createAppError(err, {
        operation: 'updatePickResult',
        component: 'pickManagement'
      })
    };
  }
}

/**
 * Update pick with scores and auto-calculate results
 */
export function updatePickWithScores(
  pick: Pick,
  awayScore: number | null | undefined,
  homeScore: number | null | undefined
): { updatedPick: Pick; updatePayload: PickUpdatePayload } {
  // Update the pick with new scores
  const updatedPick: Pick = {
    ...pick,
    game_info: {
      ...pick.game_info,
      away_score: awayScore ?? null,
      home_score: homeScore ?? null
    }
  };

  // Calculate results if both scores are provided
  const updatePayload: PickUpdatePayload = {
    game_info: updatedPick.game_info
  };

  if (awayScore !== undefined && awayScore !== null && 
      homeScore !== undefined && homeScore !== null) {
    const results = calculateAllResultsFromScores(updatedPick);
    
    updatedPick.result = results.moneyline;
    updatedPick.ats_result = results.ats;
    updatedPick.ou_result = results.overUnder;

    updatePayload.result = results.moneyline;
    updatePayload.ats_result = results.ats;
    updatePayload.ou_result = results.overUnder;
  }

  return { updatedPick, updatePayload };
}

/**
 * Delete a pick
 */
export async function deletePick(
  pickId: string
): Promise<{ success: boolean; error: AppError | null }> {
  try {
    const { error } = await picksApi.delete(pickId);
    
    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: createAppError(err, {
        operation: 'deletePick',
        component: 'pickManagement'
      })
    };
  }
}

/**
 * Delete all picks (admin only)
 */
export async function deleteAllPicks(): Promise<{ 
  success: boolean; 
  deletedCount: number;
  error: AppError | null 
}> {
  try {
    const { data: allPicks, error: fetchError } = await loadAllPicks();
    
    if (fetchError) {
      return { success: false, deletedCount: 0, error: fetchError };
    }

    let deletedCount = 0;
    if (allPicks) {
      for (const pick of allPicks) {
        const { success } = await deletePick(pick.id);
        if (success) {
          deletedCount++;
        }
      }
    }

    return { success: true, deletedCount, error: null };
  } catch (err) {
    return {
      success: false,
      deletedCount: 0,
      error: createAppError(err, {
        operation: 'deleteAllPicks',
        component: 'pickManagement'
      })
    };
  }
}

/**
 * Filter picks by week and search term
 */
export function filterPicks(
  picks: Pick[],
  options: {
    week?: NFLWeek | null;
    searchTerm?: string;
  }
): Pick[] {
  const { week, searchTerm } = options;

  return picks.filter(pick => {
    const matchesWeek = !week || getPickWeek(pick) === week;
    const matchesSearch = !searchTerm || 
      pick.game_info.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.game_info.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.prediction.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesWeek && matchesSearch;
  });
}

/**
 * Create a new pick
 */
export async function createPick(
  pickData: Omit<Pick, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Pick | null; error: AppError | null }> {
  try {
    const { data, error } = await picksApi.create(pickData);
    
    if (error) {
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: createAppError(err, {
        operation: 'createPick',
        component: 'pickManagement'
      })
    };
  }
}
