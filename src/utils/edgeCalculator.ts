// src/utils/edgeCalculator.ts
import { Pick, MonteCarloResults, GameInfo } from '../types';

/**
 * Convert American odds to decimal odds
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    return (100 / Math.abs(americanOdds)) + 1;
  }
  return (americanOdds / 100) + 1;
}

/**
 * Convert decimal odds to implied probability
 */
export function oddsToImpliedProbability(americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return (1 / decimal) * 100;
}

/**
 * Calculate betting edge using Expected Value formula
 * 
 * This represents the expected profit per dollar wagered over the long term.
 * 
 * Formula: Edge = (Model Probability × Decimal Odds) - 1
 * 
 * @param modelProbability - Win probability from Monte Carlo (0-100 scale, e.g., 65 = 65%)
 * @param americanOdds - American format odds (e.g., -110, +150)
 * @returns Edge as percentage of stake (e.g., 15.5 = +15.5% expected profit per bet)
 * 
 * @example
 * // Favorite: 65% model probability, -110 odds
 * calculateEdge(65, -110) // Returns ~24.1%
 * // Interpretation: Expect to profit $24.10 per $100 wagered long-term
 * 
 * @example
 * // Underdog: 40% model probability, +200 odds
 * calculateEdge(40, 200) // Returns 20%
 * // Interpretation: Expect to profit $20 per $100 wagered long-term
 * 
 * @example
 * // No edge: Model matches market
 * calculateEdge(52.38, -110) // Returns ~0%
 * // Interpretation: Break-even bet, no advantage
 */
export function calculateEdge(
  modelProbability: number,  // 0-100 scale (e.g., 65 means 65%)
  americanOdds: number        // American odds format (e.g., -110, +200)
): number {
  // Temporary debug logging
  if (modelProbability === 0 || modelProbability === 100) {
    console.log('Edge case probability detected:', {
      probability: modelProbability,
      odds: americanOdds,
      stackTrace: new Error().stack
    });
  }

  // Input validation - return 0 for invalid inputs
  if (modelProbability < 0 || modelProbability > 100) {
    console.warn(`Invalid model probability: ${modelProbability}. Must be between 0-100.`);
    return 0;
  }
  
  if (!americanOdds || americanOdds === 0) {
    console.warn('Missing or invalid odds. Cannot calculate edge.');
    return 0;
  }
  
  // Convert probability from percentage to decimal (65% → 0.65)
  const probabilityDecimal = modelProbability / 100;
  
  // Convert American odds to decimal format
  const decimalOdds = americanToDecimal(americanOdds);
  
  // Calculate Expected Value per $1 wagered
  // EV Formula: (Probability of Win × Payout) - (Probability of Loss × Stake)
  // Simplified: (Probability × Decimal Odds) - 1
  // 
  // Example: 65% win chance at -110 odds (1.909 decimal)
  // EV = (0.65 × 1.909) - 1 = 1.241 - 1 = 0.241 = 24.1% edge
  const expectedValuePerDollar = (probabilityDecimal * decimalOdds) - 1;
  
  // Return as percentage
  return expectedValuePerDollar * 100;
}

/**
 * Extract spread value from prediction string
 * Examples: "Chiefs -7.5" → -7.5, "Browns +3" → 3
 */
export function extractSpreadValue(spreadPrediction: string): number {
  // Match patterns like "-7.5", "+3.5", "-7", "+3"
  const match = spreadPrediction.match(/([+-]?\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

/**
 * Determine if the spread prediction is picking the favorite team
 * Examples: 
 *   - "Chiefs -7.5", favoriteTeam="Kansas City Chiefs" → true
 *   - "Raiders +7.5", favoriteTeam="Kansas City Chiefs" → false
 */
export function isPickingFavorite(spreadPrediction: string, favoriteTeam: string): boolean {
  if (!favoriteTeam) {
    // Fallback: if no favorite team specified, assume negative spread = favorite
    const spreadValue = extractSpreadValue(spreadPrediction);
    return spreadValue < 0;
  }
  
  // Check if the spread prediction includes the favorite team name
  const predictionLower = spreadPrediction.toLowerCase();
  const favoriteWords = favoriteTeam.toLowerCase().split(' ');
  
  // Check if any significant word from favorite team name appears in prediction
  return favoriteWords.some(word => {
    // Skip common short words like "the"
    if (word.length <= 2) return false;
    return predictionLower.includes(word);
  });
}

export function calculatePickEdges(
  pick: Pick,
  monteCarloResults: MonteCarloResults,
  gameInfo: GameInfo
): {
  moneyline_edge: number;
  spread_edge: number;
  ou_edge: number;
} {
  // ===== MONEYLINE EDGE =====
  let moneylineEdge = 0;
  if (monteCarloResults.moneyline_probability) {
    const predictedHome = pick.prediction.toLowerCase().includes(gameInfo.home_team.toLowerCase());
    const predictedAway = pick.prediction.toLowerCase().includes(gameInfo.away_team.toLowerCase());

    // Require stored odds - no fallbacks to hard-coded values
    if (predictedHome && (gameInfo.home_ml_odds || gameInfo.home_ml_odds === 0)) {
      moneylineEdge = calculateEdge(monteCarloResults.home_win_probability, gameInfo.home_ml_odds);
    } else if (predictedAway && (gameInfo.away_ml_odds || gameInfo.away_ml_odds === 0)) {
      moneylineEdge = calculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds);
    } else if (monteCarloResults.moneyline_probability) {
      // Skip edge calculation if no odds available
      moneylineEdge = 0;
    }
  }

  // ===== SPREAD EDGE (BOOKMAKER STYLE) =====
  let spreadEdge = 0;
  if (pick.spread_prediction && (gameInfo.spread_odds || gameInfo.spread_odds === 0)) {
    // Determine which side was picked using favorite team information
    const pickedFavorite = isPickingFavorite(
      pick.spread_prediction,
      gameInfo.favorite_team || ''
    );
    
    // Use correct probability based on which side was picked
    let probability: number;
    if (pickedFavorite) {
      // Picked favorite - use favorite_cover_probability (or fallback to spread_cover_probability)
      probability = monteCarloResults.favorite_cover_probability || 
                    monteCarloResults.spread_cover_probability ||
                    monteCarloResults.spread_probability;
    } else {
      // Picked underdog - use underdog_cover_probability (or calculate from favorite)
      probability = monteCarloResults.underdog_cover_probability ||
                    (100 - (monteCarloResults.favorite_cover_probability || 
                            monteCarloResults.spread_cover_probability ||
                            monteCarloResults.spread_probability));
    }
    
    spreadEdge = calculateEdge(probability, gameInfo.spread_odds);
  }

  // ===== OVER/UNDER EDGE =====
  let ouEdge = 0;
  if (monteCarloResults.total_probability && pick.ou_prediction) {
    const pickedOver = pick.ou_prediction.toLowerCase().includes('over');

    // Require stored O/U odds - no fallbacks
    let ouOdds: number | null = null;
    if (pickedOver && (gameInfo.over_odds || gameInfo.over_odds === 0)) {
      ouOdds = gameInfo.over_odds;
    } else if (!pickedOver && (gameInfo.under_odds || gameInfo.under_odds === 0)) {
      ouOdds = gameInfo.under_odds;
    }

    if (ouOdds !== null) {
      const prob = pickedOver ? monteCarloResults.over_probability : monteCarloResults.under_probability;
      ouEdge = calculateEdge(prob, ouOdds);
    }
    // Skip if no odds available
  }
  
  return {
    moneyline_edge: Number(moneylineEdge.toFixed(2)),
    spread_edge: Number(spreadEdge.toFixed(2)),
    ou_edge: Number(ouEdge.toFixed(2))
  };
}

/**
 * Calculate edge for BOTH sides of a bet (for display purposes)
 */
export function calculateBothSidesEdge(
  monteCarloResults: MonteCarloResults,
  gameInfo: GameInfo
): {
  moneyline: { home: number; away: number };
  spread: { favorite: number; underdog: number };
  total: { over: number; under: number };
} {
  return {
    moneyline: {
      home: gameInfo.home_ml_odds 
        ? calculateEdge(monteCarloResults.home_win_probability, gameInfo.home_ml_odds)
        : 0,
      away: gameInfo.away_ml_odds
        ? calculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds)
        : 0
    },
    spread: {
      favorite: gameInfo.spread_odds
        ? calculateEdge(monteCarloResults.spread_cover_probability, gameInfo.spread_odds)
        : 0,
      underdog: gameInfo.spread_odds
        ? calculateEdge(100 - monteCarloResults.spread_cover_probability, gameInfo.spread_odds)
        : 0
    },
    total: {
      over: gameInfo.over_odds
        ? calculateEdge(monteCarloResults.over_probability, gameInfo.over_odds)
        : 0,
      under: gameInfo.under_odds
        ? calculateEdge(monteCarloResults.under_probability, gameInfo.under_odds)
        : 0
    }
  };
}

/**
 * Determine confidence bar color based on edge and confidence
 */
export function getConfidenceBarColor(
  confidence: number,
  edge: number
): 'lime' | 'yellow' | 'red' {
  
  // Negative edge = avoid (red)
  if (edge < 0) return 'red';
  
  // Strong bet: high edge + solid confidence
  if (edge >= 5 && confidence >= 65) return 'lime';
  
  // Good bet: decent edge + okay confidence
  if (edge >= 3 && confidence >= 60) return 'lime';
  
  // Marginal: low edge or lower confidence
  if (edge >= 1 || confidence >= 70) return 'yellow';
  
  // Weak: very low edge and low confidence
  return 'yellow';
}

/**
 * Get CSS color class for edge-based confidence bar
 */
export function getEdgeColorClass(edge: number): string {
  const color = getConfidenceBarColor(70, edge); // Use 70 as baseline confidence
  
  switch (color) {
    case 'lime':
      return 'bg-lime-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get text color class for edge display
 */
export function getEdgeTextColor(edge: number): string {
  if (edge >= 5) return 'text-lime-400';
  if (edge >= 3) return 'text-yellow-400';
  if (edge >= 0) return 'text-gray-400';
  return 'text-red-400';
}

/**
 * Format edge value for display
 */
export function formatEdge(edge?: number): string {
  if (edge === undefined || edge === null) return '+0.0%';
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${edge.toFixed(1)}%`;
}
