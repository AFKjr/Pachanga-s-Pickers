/**
 * Trend Data Fetcher
 *
 * Queries YOUR database for real historical trends.
 * Generates reasoning like "They're 6-2 ATS in their last 8 games" using actual data.
 */

import { supabase } from '../lib/supabase'; // Adjust import path
import type { BettingPick } from '../types/picks.types';

/**
 * Team trend data from historical picks
 */
export interface TeamTrends {
  // ATS (Against The Spread) records
  atsRecord: {
    wins: number;
    losses: number;
    pushes: number;
    total: number;
    winRate: number;
    text: string; // "6-2 ATS in last 8 games"
  } | null;

  // Moneyline win/loss record
  mlRecord: {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
    text: string; // "7-3 in last 10 games"
  } | null;

  // Streaks
  currentStreak: {
    type: 'win' | 'loss' | 'ats_cover' | 'none';
    count: number;
    text: string; // "On a 4-game win streak"
  } | null;

  // Home/Away splits
  homeSplit: {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
    text: string; // "5-2 at home this season"
  } | null;

  awaySplit: {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
    text: string; // "3-4 on the road"
  } | null;

  // Favorite/Underdog splits
  asUnderdog: {
    atsWins: number;
    atsLosses: number;
    total: number;
    text: string; // "4-1 ATS as an underdog"
  } | null;

  asFavorite: {
    atsWins: number;
    atsLosses: number;
    total: number;
    text: string; // "5-3 ATS as a favorite"
  } | null;
}

/**
 * Configuration for trend queries
 */
interface TrendConfig {
  minGamesForTrend: number;    // Minimum games needed to show a trend
  recentGamesWindow: number;    // How many recent games to look at
  minWinRateForMention: number; // Only mention trends above this win rate
}

const DEFAULT_CONFIG: TrendConfig = {
  minGamesForTrend: 5,
  recentGamesWindow: 8,
  minWinRateForMention: 0.60 // 60% or better
};

/**
 * Fetch all trends for a team
 */
export async function fetchTeamTrends(
  teamName: string,
  config: Partial<TrendConfig> = {}
): Promise<TeamTrends> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Get recent picks for this team
  const { data: recentPicks, error } = await supabase
    .from('picks')
    .select('*')
    .or(`game_info->>home_team.eq.${teamName},game_info->>away_team.eq.${teamName}`)
    .order('game_info->game_date', { ascending: false })
    .limit(finalConfig.recentGamesWindow * 2); // Get extra for home/away splits

  if (error || !recentPicks || recentPicks.length < finalConfig.minGamesForTrend) {
    return createEmptyTrends();
  }

  // Only use games that have been completed (have results)
  const completedPicks = recentPicks.filter(p =>
    p.result !== null && p.result !== 'pending'
  );

  if (completedPicks.length < finalConfig.minGamesForTrend) {
    return createEmptyTrends();
  }

  // Calculate all trends
  return {
    atsRecord: calculateATSRecord(completedPicks, finalConfig),
    mlRecord: calculateMLRecord(completedPicks, finalConfig),
    currentStreak: calculateStreak(completedPicks),
    homeSplit: calculateHomeSplit(completedPicks, teamName, finalConfig),
    awaySplit: calculateAwaySplit(completedPicks, teamName, finalConfig),
    asUnderdog: calculateUnderdogRecord(completedPicks, teamName, finalConfig),
    asFavorite: calculateFavoriteRecord(completedPicks, teamName, finalConfig)
  };
}

/**
 * Calculate ATS (Against The Spread) record
 */
function calculateATSRecord(
  picks: BettingPick[],
  config: TrendConfig
): TeamTrends['atsRecord'] {
  // Only include picks with ATS results
  const atsGames = picks
    .filter(p => p.ats_result !== null && p.ats_result !== undefined)
    .slice(0, config.recentGamesWindow);

  if (atsGames.length < config.minGamesForTrend) {
    return null;
  }

  const wins = atsGames.filter(p => p.ats_result === 'win').length;
  const losses = atsGames.filter(p => p.ats_result === 'loss').length;
  const pushes = atsGames.filter(p => p.ats_result === 'push').length;
  const total = atsGames.length;
  const winRate = wins / (wins + losses); // Exclude pushes from win rate

  // Only return if win rate is notable
  if (winRate < config.minWinRateForMention && winRate > (1 - config.minWinRateForMention)) {
    return null;
  }

  return {
    wins,
    losses,
    pushes,
    total,
    winRate,
    text: `They're ${wins}-${losses}${pushes > 0 ? `-${pushes}` : ''} ATS in their last ${total} games`
  };
}

/**
 * Calculate moneyline win/loss record
 */
function calculateMLRecord(
  picks: BettingPick[],
  config: TrendConfig
): TeamTrends['mlRecord'] {
  const mlGames = picks
    .filter(p => p.result && p.result !== 'pending' && p.result !== 'push')
    .slice(0, config.recentGamesWindow);

  if (mlGames.length < config.minGamesForTrend) {
    return null;
  }

  const wins = mlGames.filter(p => p.result === 'win').length;
  const losses = mlGames.filter(p => p.result === 'loss').length;
  const total = mlGames.length;
  const winRate = wins / total;

  if (winRate < config.minWinRateForMention && winRate > (1 - config.minWinRateForMention)) {
    return null;
  }

  return {
    wins,
    losses,
    total,
    winRate,
    text: `They're ${wins}-${losses} in their last ${total} games`
  };
}

/**
 * Calculate current streak (win/loss/ATS)
 */
function calculateStreak(picks: BettingPick[]): TeamTrends['currentStreak'] {
  const recentGames = picks
    .filter(p => p.result && p.result !== 'pending')
    .slice(0, 10);

  if (recentGames.length < 3) {
    return null;
  }

  // Check for win streak
  let winStreak = 0;
  for (const pick of recentGames) {
    if (pick.result === 'win') {
      winStreak++;
    } else {
      break;
    }
  }

  if (winStreak >= 3) {
    return {
      type: 'win',
      count: winStreak,
      text: `On a ${winStreak}-game winning streak`
    };
  }

  // Check for ATS cover streak
  let atsStreak = 0;
  for (const pick of recentGames) {
    if (pick.ats_result === 'win') {
      atsStreak++;
    } else {
      break;
    }
  }

  if (atsStreak >= 3) {
    return {
      type: 'ats_cover',
      count: atsStreak,
      text: `Covered the spread in ${atsStreak} straight games`
    };
  }

  // Check for loss streak (only if 4+)
  let lossStreak = 0;
  for (const pick of recentGames) {
    if (pick.result === 'loss') {
      lossStreak++;
    } else {
      break;
    }
  }

  if (lossStreak >= 4) {
    return {
      type: 'loss',
      count: lossStreak,
      text: `Lost ${lossStreak} straight games`
    };
  }

  return null;
}

/**
 * Calculate home record
 */
function calculateHomeSplit(
  picks: BettingPick[],
  teamName: string,
  config: TrendConfig
): TeamTrends['homeSplit'] {
  const homeGames = picks.filter(p =>
    p.game_info.home_team === teamName &&
    p.result &&
    p.result !== 'pending'
  );

  if (homeGames.length < config.minGamesForTrend) {
    return null;
  }

  const wins = homeGames.filter(p => p.result === 'win').length;
  const losses = homeGames.filter(p => p.result === 'loss').length;
  const total = homeGames.length;
  const winRate = wins / total;

  if (winRate < config.minWinRateForMention && winRate > (1 - config.minWinRateForMention)) {
    return null;
  }

  return {
    wins,
    losses,
    total,
    winRate,
    text: `${wins}-${losses} at home this season`
  };
}

/**
 * Calculate away record
 */
function calculateAwaySplit(
  picks: BettingPick[],
  teamName: string,
  config: TrendConfig
): TeamTrends['awaySplit'] {
  const awayGames = picks.filter(p =>
    p.game_info.away_team === teamName &&
    p.result &&
    p.result !== 'pending'
  );

  if (awayGames.length < config.minGamesForTrend) {
    return null;
  }

  const wins = awayGames.filter(p => p.result === 'win').length;
  const losses = awayGames.filter(p => p.result === 'loss').length;
  const total = awayGames.length;
  const winRate = wins / total;

  if (winRate < config.minWinRateForMention && winRate > (1 - config.minWinRateForMention)) {
    return null;
  }

  return {
    wins,
    losses,
    total,
    winRate,
    text: `${wins}-${losses} on the road`
  };
}

/**
 * Calculate underdog ATS record
 */
function calculateUnderdogRecord(
  picks: BettingPick[],
  teamName: string,
  config: TrendConfig
): TeamTrends['asUnderdog'] {
  const underdogGames = picks.filter(p => {
    const isUnderdog = p.game_info.underdog_team === teamName;
    return isUnderdog && p.ats_result && p.ats_result !== 'pending';
  });

  if (underdogGames.length < config.minGamesForTrend) {
    return null;
  }

  const atsWins = underdogGames.filter(p => p.ats_result === 'win').length;
  const atsLosses = underdogGames.filter(p => p.ats_result === 'loss').length;
  const total = underdogGames.length;
  const winRate = atsWins / (atsWins + atsLosses);

  if (winRate < config.minWinRateForMention) {
    return null;
  }

  return {
    atsWins,
    atsLosses,
    total,
    text: `${atsWins}-${atsLosses} ATS as an underdog`
  };
}

/**
 * Calculate favorite ATS record
 */
function calculateFavoriteRecord(
  picks: BettingPick[],
  teamName: string,
  config: TrendConfig
): TeamTrends['asFavorite'] {
  const favoriteGames = picks.filter(p => {
    const isFavorite = p.game_info.favorite_team === teamName;
    return isFavorite && p.ats_result && p.ats_result !== 'pending';
  });

  if (favoriteGames.length < config.minGamesForTrend) {
    return null;
  }

  const atsWins = favoriteGames.filter(p => p.ats_result === 'win').length;
  const atsLosses = favoriteGames.filter(p => p.ats_result === 'loss').length;
  const total = favoriteGames.length;
  const winRate = atsWins / (atsWins + atsLosses);

  if (winRate < config.minWinRateForMention) {
    return null;
  }

  return {
    atsWins,
    atsLosses,
    total,
    text: `${atsWins}-${atsLosses} ATS as a favorite`
  };
}

/**
 * Create empty trends object
 */
function createEmptyTrends(): TeamTrends {
  return {
    atsRecord: null,
    mlRecord: null,
    currentStreak: null,
    homeSplit: null,
    awaySplit: null,
    asUnderdog: null,
    asFavorite: null
  };
}

/**
 * Get most relevant trend for reasoning (pick the best one)
 */
export function getBestTrend(trends: TeamTrends): string | null {
  // Priority order: Streak > ATS > ML > Home/Away > Favorite/Underdog

  if (trends.currentStreak && trends.currentStreak.count >= 3) {
    return trends.currentStreak.text;
  }

  if (trends.atsRecord && trends.atsRecord.winRate >= 0.70) {
    return trends.atsRecord.text;
  }

  if (trends.mlRecord && trends.mlRecord.winRate >= 0.70) {
    return trends.mlRecord.text;
  }

  if (trends.asUnderdog && trends.asUnderdog.atsWins >= 4) {
    return trends.asUnderdog.text;
  }

  if (trends.homeSplit && trends.homeSplit.winRate >= 0.70) {
    return trends.homeSplit.text;
  }

  if (trends.atsRecord) {
    return trends.atsRecord.text;
  }

  return null;
}

/**
 * Get all available trends as an array
 */
export function getAllTrendTexts(trends: TeamTrends): string[] {
  const texts: string[] = [];

  if (trends.currentStreak) texts.push(trends.currentStreak.text);
  if (trends.atsRecord) texts.push(trends.atsRecord.text);
  if (trends.mlRecord) texts.push(trends.mlRecord.text);
  if (trends.homeSplit) texts.push(trends.homeSplit.text);
  if (trends.awaySplit) texts.push(trends.awaySplit.text);
  if (trends.asUnderdog) texts.push(trends.asUnderdog.text);
  if (trends.asFavorite) texts.push(trends.asFavorite.text);

  return texts;
}

/**
 * Example usage:
 *
 * const trends = await fetchTeamTrends('Kansas City Chiefs');
 * const bestTrend = getBestTrend(trends);
 * // Returns: "On a 4-game winning streak"
 *
 * // Or get all trends
 * const allTrends = getAllTrendTexts(trends);
 * // Returns: [
 * //   "On a 4-game winning streak",
 * //   "They're 6-2 ATS in their last 8 games",
 * //   "5-2 at home this season"
 * // ]
 */