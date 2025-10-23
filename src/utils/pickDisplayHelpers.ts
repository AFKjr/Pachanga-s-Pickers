/**
 * Pick Display Helper Functions
 *
 * Utility functions for the simplified UX that focuses on showing
 * the ONE best bet per game with clear confidence indicators.
 */

import type { BettingPick } from '../types/picks.types';

// Edge thresholds for confidence levels
const EDGE_THRESHOLDS = {
  STRONG: 5,    // >5% edge = strong bet
  MODERATE: 2,  // 2-5% edge = moderate bet
  WEAK: 0       // <2% edge = skip
} as const;

// Confidence badge types
export type ConfidenceLevel = 'strong' | 'moderate' | 'weak';

export interface ConfidenceBadge {
  level: ConfidenceLevel;
  label: string;
  icon: string;
}

export interface BetTypeDetails {
  type: 'moneyline' | 'spread' | 'ou';
  prediction: string;
  line?: string;
  probability: number;
  edge: number;
  odds?: number;
}

/**
 * Get the best bet from a pick (highest edge)
 */
export function getBestBet(pick: BettingPick): BetTypeDetails | null {
  const bets: BetTypeDetails[] = [];

  // Moneyline bet
  if (pick.prediction && pick.moneyline_edge !== null && pick.moneyline_edge !== undefined) {
    bets.push({
      type: 'moneyline',
      prediction: pick.prediction,
      probability: pick.monte_carlo_results?.moneyline_probability || 0,
      edge: pick.moneyline_edge,
      odds: pick.game_info?.home_ml_odds || pick.game_info?.away_ml_odds || undefined
    });
  }

  // Spread bet
  if (pick.spread_prediction && pick.spread_edge !== null && pick.spread_edge !== undefined) {
    bets.push({
      type: 'spread',
      prediction: pick.spread_prediction,
      line: pick.game_info?.spread ? `${pick.game_info.spread > 0 ? '+' : ''}${pick.game_info.spread}` : undefined,
      probability: pick.monte_carlo_results?.favorite_cover_probability || pick.monte_carlo_results?.underdog_cover_probability || 0,
      edge: pick.spread_edge,
      odds: pick.game_info?.spread_odds || undefined
    });
  }

  // Over/Under bet
  if (pick.ou_prediction && pick.ou_edge !== null && pick.ou_edge !== undefined) {
    bets.push({
      type: 'ou',
      prediction: pick.ou_prediction,
      line: pick.game_info?.over_under ? `${pick.game_info.over_under}` : undefined,
      probability: pick.monte_carlo_results?.over_probability || pick.monte_carlo_results?.under_probability || 0,
      edge: pick.ou_edge,
      odds: pick.game_info?.over_odds || pick.game_info?.under_odds || undefined
    });
  }

  if (bets.length === 0) return null;

  // Return bet with highest edge
  return bets.reduce((best, current) =>
    current.edge > best.edge ? current : best
  );
}

/**
 * Get all bet types for a pick (for expandable view)
 */
export function getAllBetTypes(pick: BettingPick): BetTypeDetails[] {
  const bets: BetTypeDetails[] = [];

  // Moneyline bet
  if (pick.prediction && pick.moneyline_edge !== null && pick.moneyline_edge !== undefined) {
    bets.push({
      type: 'moneyline',
      prediction: pick.prediction,
      probability: pick.monte_carlo_results?.moneyline_probability || 0,
      edge: pick.moneyline_edge,
      odds: pick.game_info?.home_ml_odds || pick.game_info?.away_ml_odds || undefined
    });
  }

  // Spread bet
  if (pick.spread_prediction && pick.spread_edge !== null && pick.spread_edge !== undefined) {
    bets.push({
      type: 'spread',
      prediction: pick.spread_prediction,
      line: pick.game_info?.spread ? `${pick.game_info.spread > 0 ? '+' : ''}${pick.game_info.spread}` : undefined,
      probability: pick.monte_carlo_results?.favorite_cover_probability || pick.monte_carlo_results?.underdog_cover_probability || 0,
      edge: pick.spread_edge,
      odds: pick.game_info?.spread_odds || undefined
    });
  }

  // Over/Under bet
  if (pick.ou_prediction && pick.ou_edge !== null && pick.ou_edge !== undefined) {
    bets.push({
      type: 'ou',
      prediction: pick.ou_prediction,
      line: pick.game_info?.over_under ? `${pick.game_info.over_under}` : undefined,
      probability: pick.monte_carlo_results?.over_probability || pick.monte_carlo_results?.under_probability || 0,
      edge: pick.ou_edge,
      odds: pick.game_info?.over_odds || pick.game_info?.under_odds || undefined
    });
  }

  return bets;
}

/**
 * Get confidence badge based on edge
 */
export function getConfidenceBadge(edge: number): ConfidenceBadge {
  if (edge >= EDGE_THRESHOLDS.STRONG) {
    return { level: 'strong', label: 'STRONG BET', icon: '🟢' };
  } else if (edge >= EDGE_THRESHOLDS.MODERATE) {
    return { level: 'moderate', label: 'MODERATE BET', icon: '🟡' };
  } else {
    return { level: 'weak', label: 'SKIP', icon: '🔴' };
  }
}

/**
 * Get CSS classes for confidence badge
 */
export function getConfidenceBadgeClasses(badge: ConfidenceBadge) {
  switch (badge.level) {
    case 'strong':
      return {
        background: 'bg-lime-900/20',
        border: 'border-lime-500/50',
        text: 'text-lime-400'
      };
    case 'moderate':
      return {
        background: 'bg-yellow-900/20',
        border: 'border-yellow-500/50',
        text: 'text-yellow-400'
      };
    case 'weak':
      return {
        background: 'bg-red-900/20',
        border: 'border-red-500/50',
        text: 'text-red-400'
      };
  }
}

/**
 * Format edge for display
 */
export function formatEdgeDisplay(edge: number): string {
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${edge.toFixed(1)}%`;
}

/**
 * Get display name for bet type
 */
export function getBetTypeDisplayName(type: string): string {
  switch (type) {
    case 'moneyline':
      return 'Moneyline';
    case 'spread':
      return 'Spread';
    case 'ou':
      return 'Over/Under';
    default:
      return type;
  }
}

/**
 * Format game date for display
 */
export function formatGameDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get reasoning preview (truncated)
 */
export function getReasoningPreview(reasoning: string, maxLength: number = 120): string {
  if (reasoning.length <= maxLength) return reasoning;
  return reasoning.substring(0, maxLength - 3) + '...';
}

/**
 * Format odds for display
 */
export function formatOdds(odds: number): string {
  if (odds > 0) return `+${odds}`;
  return odds.toString();
}

/**
 * Check if a pick has any bets with positive edge
 */
export function hasPositiveEdgeBets(pick: BettingPick): boolean {
  const bets = getAllBetTypes(pick);
  return bets.some(bet => bet.edge > 0);
}

/**
 * Get the number of bet types available for a pick
 */
export function getBetCount(pick: BettingPick): number {
  return getAllBetTypes(pick).length;
}