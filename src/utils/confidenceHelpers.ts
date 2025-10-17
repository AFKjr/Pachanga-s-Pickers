// src/utils/confidenceHelpers.ts

/**
 * Confidence badge configuration for authoritative bet display
 */
export interface ConfidenceBadge {
  text: string;
  color: string;
  icon: string;
  priority: number;
}

/**
 * Get confidence badge based on edge and confidence level
 * Returns null if bet doesn't meet minimum thresholds for a badge
 */
export function getConfidenceBadge(
  edge: number,
  confidence: number
): ConfidenceBadge | null {
  // High Confidence: Very strong edge with high probability
  if (edge >= 7 && confidence >= 65) {
    return {
      text: 'HIGH CONFIDENCE',
      color: 'bg-lime-500 text-black',
      icon: '⚡',
      priority: 1
    };
  }

  // Strong Edge: Good edge with solid probability
  if (edge >= 5 && confidence >= 60) {
    return {
      text: 'STRONG EDGE',
      color: 'bg-lime-500 text-black',
      icon: '💎',
      priority: 2
    };
  }

  // Value Play: Meaningful edge with decent probability
  if (edge >= 3 && confidence >= 55) {
    return {
      text: 'VALUE PLAY',
      color: 'bg-yellow-500 text-black',
      icon: '⭐',
      priority: 3
    };
  }

  // No badge for marginal or negative edges
  return null;
}

/**
 * Get text color class based on edge value
 */
export function getEdgeTextColorClass(edge: number): string {
  if (edge >= 5) return 'text-lime-400';
  if (edge >= 3) return 'text-yellow-400';
  if (edge >= 0) return 'text-gray-400';
  return 'text-red-400';
}

/**
 * Get progress bar color class based on edge value
 */
export function getEdgeBarColorClass(edge: number): string {
  if (edge >= 5) return 'bg-lime-500';
  if (edge >= 3) return 'bg-yellow-500';
  return 'bg-gray-500';
}

/**
 * Determine if a pick qualifies as a "best bet"
 */
export function isBestBet(
  moneylineEdge: number = 0,
  spreadEdge: number = 0,
  totalEdge: number = 0,
  threshold: number = 7
): boolean {
  const maxEdge = Math.max(moneylineEdge, spreadEdge, totalEdge);
  return maxEdge >= threshold;
}

/**
 * Get the highest edge value from a pick
 */
export function getMaxEdge(
  moneylineEdge: number = 0,
  spreadEdge: number = 0,
  totalEdge: number = 0
): number {
  return Math.max(moneylineEdge, spreadEdge, totalEdge);
}

/**
 * Filter picks to only those with meaningful edge on at least one bet type
 */
export function hasPlayableBet(
  moneylineEdge: number = 0,
  spreadEdge: number = 0,
  totalEdge: number = 0,
  minEdgeThreshold: number = 1
): boolean {
  return moneylineEdge >= minEdgeThreshold ||
         spreadEdge >= minEdgeThreshold ||
         totalEdge >= minEdgeThreshold;
}

/**
 * Sort picks by highest edge (for prioritization)
 */
export function comparePicksByEdge(
  pickA: { moneyline_edge?: number; spread_edge?: number; ou_edge?: number },
  pickB: { moneyline_edge?: number; spread_edge?: number; ou_edge?: number }
): number {
  const maxEdgeA = getMaxEdge(
    pickA.moneyline_edge,
    pickA.spread_edge,
    pickA.ou_edge
  );
  const maxEdgeB = getMaxEdge(
    pickB.moneyline_edge,
    pickB.spread_edge,
    pickB.ou_edge
  );
  return maxEdgeB - maxEdgeA; // Sort descending (highest edge first)
}

/**
 * Categorize edge strength for UI display
 */
export type EdgeStrength = 'elite' | 'strong' | 'good' | 'marginal' | 'weak' | 'negative';

export function categorizeEdge(edge: number): EdgeStrength {
  if (edge >= 7) return 'elite';
  if (edge >= 5) return 'strong';
  if (edge >= 3) return 'good';
  if (edge >= 1) return 'marginal';
  if (edge >= 0) return 'weak';
  return 'negative';
}

/**
 * Get descriptive text for edge strength
 */
export function getEdgeDescription(edge: number): string {
  const category = categorizeEdge(edge);

  const descriptions: Record<EdgeStrength, string> = {
    elite: 'Exceptional value',
    strong: 'Strong edge',
    good: 'Good value',
    marginal: 'Slight edge',
    weak: 'Minimal edge',
    negative: 'No value'
  };

  return descriptions[category];
}