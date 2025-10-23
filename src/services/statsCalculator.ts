/**
 * Statistics Calculator Service
 *
 * Handles all statistics aggregation and calculation logic for picks.
 * Extracts shared logic from API layer to follow Single Responsibility Principle.
 */

import type { Pick } from '../types';

/**
 * Result for a single bet type (moneyline, ATS, or O/U)
 */
interface BetTypeResult {
  wins: number;
  losses: number;
  pushes: number;
  total: number;
  winRate: number;
}

/**
 * Complete statistics for all three bet types
 */
interface CompleteStats {
  moneyline: BetTypeResult;
  ats: BetTypeResult;
  overUnder: BetTypeResult;
}

/**
 * Weekly statistics include the week number
 */
interface WeeklyStats extends CompleteStats {
  week: number | null;
}

/**
 * Get stored bet result or calculate from scores if needed
 *
 * @param pick - The pick to get results for
 * @param betType - Which bet type to check ('moneyline' | 'ats' | 'ou')
 * @returns The result ('win' | 'loss' | 'push' | 'pending')
 */
async function getOrCalculateBetResult(
  pick: Pick,
  betType: 'moneyline' | 'ats' | 'ou'
): Promise<'win' | 'loss' | 'push' | 'pending'> {
  // Get the stored result field
  let storedResult: 'win' | 'loss' | 'push' | 'pending' | null | undefined;

  if (betType === 'moneyline') {
    storedResult = pick.result;
  } else if (betType === 'ats') {
    storedResult = pick.ats_result;
  } else {
    storedResult = pick.ou_result;
  }

  // If we have a valid stored result, use it
  if (storedResult && storedResult !== 'pending') {
    return storedResult;
  }

  // Otherwise, calculate from scores if available
  if (shouldCalculateFromScores(pick)) {
    const { calculateAllResultsFromScores } = await import('../utils/calculations');
    const calculated = calculateAllResultsFromScores(pick);

    if (betType === 'moneyline') {
      return calculated.moneyline || 'pending';
    } else if (betType === 'ats') {
      return calculated.ats || 'pending';
    } else {
      return calculated.overUnder || 'pending';
    }
  }

  // Default to pending if we can't calculate
  return 'pending';
}

/**
 * Determine if we should try calculating results from scores
 *
 * @param pick - The pick to check
 * @returns true if scores are available for calculation
 */
function shouldCalculateFromScores(pick: Pick): boolean {
  const hasScores = pick.game_info.home_score !== null 
    && pick.game_info.home_score !== undefined
    && pick.game_info.away_score !== null 
    && pick.game_info.away_score !== undefined;
  
  const hasPredictions = pick.prediction 
    || pick.spread_prediction 
    || pick.ou_prediction;
  
  return Boolean(hasScores && hasPredictions);
}/**
 * Aggregate statistics for a single bet type
 *
 * @param results - Array of results for this bet type
 * @returns Aggregated statistics
 */
function aggregateBetTypeStats(results: Array<'win' | 'loss' | 'push' | 'pending'>): BetTypeResult {
  const wins = results.filter(result => result === 'win').length;
  const losses = results.filter(result => result === 'loss').length;
  const pushes = results.filter(result => result === 'push').length;
  const total = wins + losses + pushes;

  return {
    wins,
    losses,
    pushes,
    total,
    winRate: calculateWinRate(wins, losses)
  };
}

/**
 * Calculate win rate percentage
 * Excludes pushes from calculation (pushes are neither wins nor losses)
 *
 * @param wins - Number of wins
 * @param losses - Number of losses
 * @returns Win rate as integer percentage (0-100)
 */
function calculateWinRate(wins: number, losses: number): number {
  const decidedGames = wins + losses;

  if (decidedGames === 0) {
    return 0;
  }

  return Math.round((wins / decidedGames) * 100);
}

/**
 * Process all picks and aggregate statistics for all bet types
 *
 * @param picks - Array of picks to process
 * @returns Complete statistics for all three bet types
 */
async function aggregateAllBetTypes(picks: Pick[]): Promise<CompleteStats> {
  // Collect results for each bet type
  const moneylineResults: Array<'win' | 'loss' | 'push' | 'pending'> = [];
  const atsResults: Array<'win' | 'loss' | 'push' | 'pending'> = [];
  const ouResults: Array<'win' | 'loss' | 'push' | 'pending'> = [];

  // Process each pick
  for (const pick of picks) {
    // Moneyline (always present)
    const mlResult = await getOrCalculateBetResult(pick, 'moneyline');
    moneylineResults.push(mlResult);

    // ATS (only if prediction exists)
    if (pick.spread_prediction) {
      const atsResult = await getOrCalculateBetResult(pick, 'ats');
      atsResults.push(atsResult);
    }

    // O/U (only if prediction exists)
    if (pick.ou_prediction) {
      const ouResult = await getOrCalculateBetResult(pick, 'ou');
      ouResults.push(ouResult);
    }
  }

  // Aggregate statistics for each bet type
  return {
    moneyline: aggregateBetTypeStats(moneylineResults),
    ats: aggregateBetTypeStats(atsResults),
    overUnder: aggregateBetTypeStats(ouResults)
  };
}

/**
 * Format complete statistics for API response
 *
 * @param stats - The aggregated statistics
 * @param week - Optional week number for weekly stats
 * @returns Formatted statistics object
 */
function formatStatsResponse(stats: CompleteStats, week?: number | null): WeeklyStats | CompleteStats {
  if (week !== undefined) {
    return {
      week,
      ...stats
    };
  }

  return stats;
}

/**
 * Calculate statistics for a set of picks
 * Main entry point for statistics calculation
 *
 * @param picks - Array of picks to calculate statistics for
 * @param week - Optional week number to include in response
 * @returns Complete statistics for all bet types
 */
export async function calculatePickStatistics(
  picks: Pick[],
  week?: number | null
): Promise<WeeklyStats | CompleteStats> {
  const stats = await aggregateAllBetTypes(picks);
  return formatStatsResponse(stats, week);
}

/**
 * Create an empty statistics object
 * Used when no picks are available
 *
 * @param week - Optional week number
 * @returns Empty statistics object
 */
export function createEmptyStats(week?: number | null): WeeklyStats | CompleteStats {
  const emptyBetType: BetTypeResult = {
    wins: 0,
    losses: 0,
    pushes: 0,
    total: 0,
    winRate: 0
  };

  const baseStats: CompleteStats = {
    moneyline: emptyBetType,
    ats: emptyBetType,
    overUnder: emptyBetType
  };

  if (week !== undefined) {
    return {
      week,
      ...baseStats
    };
  }

  return baseStats;
}

// Export types for external use
export type { BetTypeResult, CompleteStats, WeeklyStats };