/**
 * Team Stats Helper Functions
 *
 * Utility functions for working with team statistics from the team_stats_cache table.
 */

import { supabase } from '../lib/supabase';
import type { TeamStats } from '../types/teamStats.types';
import {
  parseStatNumber,
  getOffensiveStats,
  getDefensiveStats,
  normalizeTeamName
} from '../types/teamStats.types';

/**
 * Fetch team stats from the team_stats_cache table
 */
export async function fetchTeamStats(teamName: string): Promise<TeamStats | null>
{
  const normalizedName = normalizeTeamName(teamName);

  const { data, error } = await supabase
    .from('team_stats_cache') // Your table name
    .select('*')
    .eq('team_name', normalizedName) // Your column name
    .order('week', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.warn(`No stats found for team: ${teamName} (normalized: ${normalizedName})`);
    return null;
  }

  return data as TeamStats;
}

/**
 * Fetch stats for both teams in a matchup
 */
export async function fetchMatchupStats(homeTeam: string, awayTeam: string): Promise<{
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
}> {
  const [homeStats, awayStats] = await Promise.all([
    fetchTeamStats(homeTeam),
    fetchTeamStats(awayTeam)
  ]);

  return { homeStats, awayStats };
}

/**
 * Calculate offensive advantage (positive = home team advantage)
 */
export function calculateOffensiveAdvantage(homeStats: TeamStats | null, awayStats: TeamStats | null): number | null {
  if (!homeStats || !awayStats) return null;

  const homeOffense = getOffensiveStats(homeStats);
  const awayOffense = getOffensiveStats(awayStats);

  if (!homeOffense.ppg || !awayOffense.ppg) return null;

  return homeOffense.ppg - awayOffense.ppg;
}

/**
 * Calculate defensive advantage (positive = home team advantage)
 */
export function calculateDefensiveAdvantage(homeStats: TeamStats | null, awayStats: TeamStats | null): number | null {
  if (!homeStats || !awayStats) return null;

  const homeDefense = getDefensiveStats(homeStats);
  const awayDefense = getDefensiveStats(awayStats);

  if (!homeDefense.papg || !awayDefense.papg) return null;

  // Lower PAPG is better, so reverse the subtraction
  return awayDefense.papg - homeDefense.papg;
}

/**
 * Calculate turnover advantage (positive = home team advantage)
 */
export function calculateTurnoverAdvantage(homeStats: TeamStats | null, awayStats: TeamStats | null): number | null {
  if (!homeStats || !awayStats) return null;

  const homeOffense = getOffensiveStats(homeStats);
  const awayOffense = getOffensiveStats(awayStats);

  if (homeOffense.turnoverDiff === null || awayOffense.turnoverDiff === null) return null;

  return homeOffense.turnoverDiff - awayOffense.turnoverDiff;
}

/**
 * Get team offensive ranking description
 */
export function getOffensiveRankingDescription(stats: TeamStats | null): string | null {
  if (!stats) return null;

  const ppg = parseStatNumber(stats.points_per_game);
  if (ppg === null) return null;

  if (ppg >= 27) return 'elite offense';
  if (ppg >= 23) return 'strong offense';
  if (ppg >= 20) return 'decent offense';
  return 'struggling offense';
}

/**
 * Get team defensive ranking description
 */
export function getDefensiveRankingDescription(stats: TeamStats | null): string | null {
  if (!stats) return null;

  const papg = parseStatNumber(stats.points_allowed_per_game);
  if (papg === null) return null;

  if (papg <= 18) return 'elite defense';
  if (papg <= 21) return 'strong defense';
  if (papg <= 24) return 'decent defense';
  return 'leaky defense';
}

/**
 * Check if matchup is offense vs defense favorable
 */
export function isOffenseVsDefenseMatchup(homeStats: TeamStats | null, awayStats: TeamStats | null): boolean {
  if (!homeStats || !awayStats) return false;

  const homeOffense = getOffensiveStats(homeStats);
  const awayDefense = getDefensiveStats(awayStats);

  const awayOffense = getOffensiveStats(awayStats);
  const homeDefense = getDefensiveStats(homeStats);

  // Check if home offense significantly outscores away defense
  const homeAdvantage = homeOffense.ppg && awayDefense.papg ? homeOffense.ppg - awayDefense.papg : 0;

  // Check if away offense significantly outscores home defense
  const awayAdvantage = awayOffense.ppg && homeDefense.papg ? awayOffense.ppg - homeDefense.papg : 0;

  return Math.abs(homeAdvantage - awayAdvantage) >= 7;
}

/**
 * Get efficiency metrics for a team
 */
export function getEfficiencyMetrics(stats: TeamStats | null) {
  if (!stats) return null;

  return {
    thirdDownPct: parseStatNumber(stats.third_down_conversion_rate),
    redZonePct: parseStatNumber(stats.red_zone_efficiency),
    yardsPerPlay: parseStatNumber(stats.yards_per_play),
    yardsPerPlayAllowed: parseStatNumber(stats.yards_per_play_allowed)
  };
}

/**
 * Determine if team is in top quartile for key stats
 */
export function isTopQuartileOffense(stats: TeamStats | null): boolean {
  if (!stats) return false;

  const ppg = parseStatNumber(stats.points_per_game);
  const ypg = parseStatNumber(stats.offensive_yards_per_game);

  return (ppg !== null && ppg >= 25) || (ypg !== null && ypg >= 350);
}

export function isTopQuartileDefense(stats: TeamStats | null): boolean {
  if (!stats) return false;

  const papg = parseStatNumber(stats.points_allowed_per_game);
  const yapg = parseStatNumber(stats.defensive_yards_per_game);

  return (papg !== null && papg <= 20) || (yapg !== null && yapg <= 320);
}