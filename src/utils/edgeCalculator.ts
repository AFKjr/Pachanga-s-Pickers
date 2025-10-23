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

// ============================================================================
// HELPER FUNCTIONS - Encapsulated Conditional Logic
// ============================================================================

/**
 * Check if odds value is valid and usable
 * 
 * @param odds - The odds value to check
 * @returns true if odds can be used for edge calculation
 */
function isValidOdds(odds: number | null | undefined): boolean {
  return odds !== null && odds !== undefined && odds !== 0;
}

/**
 * Determine which team was picked in moneyline prediction
 * 
 * @param prediction - The prediction string (e.g., "Chiefs win")
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @returns 'home' | 'away' | null
 */
function determineMoneylineTeam(
  prediction: string,
  homeTeam: string,
  awayTeam: string
): 'home' | 'away' | null {
  const predictionLower = prediction.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  
  const includesHome = predictionLower.includes(homeLower);
  const includesAway = predictionLower.includes(awayLower);
  
  if (includesHome && !includesAway) return 'home';
  if (includesAway && !includesHome) return 'away';
  
  return null; // Ambiguous or no match
}

/**
 * Get moneyline odds for the picked team
 * 
 * @param pickedTeam - Which team was picked ('home' | 'away' | null)
 * @param gameInfo - Game information containing odds
 * @returns The odds for the picked team, or null if unavailable
 */
function getMoneylineOddsForPick(
  pickedTeam: 'home' | 'away' | null,
  gameInfo: GameInfo
): number | null {
  if (pickedTeam === 'home' && isValidOdds(gameInfo.home_ml_odds)) {
    return gameInfo.home_ml_odds!;
  }
  
  if (pickedTeam === 'away' && isValidOdds(gameInfo.away_ml_odds)) {
    return gameInfo.away_ml_odds!;
  }
  
  return null;
}

/**
 * Get moneyline win probability for the picked team
 * 
 * @param pickedTeam - Which team was picked ('home' | 'away' | null)
 * @param monteCarloResults - Monte Carlo simulation results
 * @returns Win probability for the picked team
 */
function getMoneylineProbability(
  pickedTeam: 'home' | 'away' | null,
  monteCarloResults: MonteCarloResults
): number {
  if (pickedTeam === 'home') {
    return monteCarloResults.home_win_probability;
  }
  
  if (pickedTeam === 'away') {
    return monteCarloResults.away_win_probability;
  }
  
  // Fallback to generic moneyline probability
  return monteCarloResults.moneyline_probability;
}

/**
 * Determine the correct spread probability based on which side was picked
 * 
 * Uses favorite/underdog probabilities when available, with fallbacks.
 * 
 * @param pickedFavorite - Whether the favorite was picked
 * @param monteCarloResults - Monte Carlo simulation results
 * @returns The appropriate spread cover probability
 */
function determineSpreadProbability(
  pickedFavorite: boolean,
  monteCarloResults: MonteCarloResults
): number {
  if (pickedFavorite) {
    // Picked favorite - use favorite_cover_probability with fallbacks
    return monteCarloResults.favorite_cover_probability || 
           monteCarloResults.spread_cover_probability ||
           monteCarloResults.spread_probability;
  } else {
    // Picked underdog - use underdog_cover_probability with fallback calculation
    return monteCarloResults.underdog_cover_probability ||
           (100 - (monteCarloResults.favorite_cover_probability || 
                   monteCarloResults.spread_cover_probability ||
                   monteCarloResults.spread_probability));
  }
}

/**
 * Determine if the Over was picked in O/U prediction
 * 
 * @param ouPrediction - The O/U prediction string
 * @returns true if Over was picked, false if Under
 */
function isOverPicked(ouPrediction: string): boolean {
  return ouPrediction.toLowerCase().includes('over');
}

/**
 * Get the appropriate odds for the O/U pick
 * 
 * @param pickedOver - Whether Over was picked
 * @param gameInfo - Game information containing odds
 * @returns The odds for the picked side, or null if unavailable
 */
function determineOverUnderOdds(
  pickedOver: boolean,
  gameInfo: GameInfo
): number | null {
  if (pickedOver && isValidOdds(gameInfo.over_odds)) {
    return gameInfo.over_odds!;
  }
  
  if (!pickedOver && isValidOdds(gameInfo.under_odds)) {
    return gameInfo.under_odds!;
  }
  
  return null;
}

/**
 * Get the appropriate probability for the O/U pick
 * 
 * @param pickedOver - Whether Over was picked
 * @param monteCarloResults - Monte Carlo simulation results
 * @returns The probability for the picked side
 */
function getOverUnderProbability(
  pickedOver: boolean,
  monteCarloResults: MonteCarloResults
): number {
  return pickedOver 
    ? monteCarloResults.over_probability 
    : monteCarloResults.under_probability;
}

// ============================================================================
// MAIN EDGE CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate betting edges for all three bet types
 * 
 * This function is now much more readable due to extracted helper functions.
 * Each bet type calculation follows a clear pattern:
 * 1. Check if prediction exists
 * 2. Determine what was picked
 * 3. Get appropriate odds
 * 4. Get appropriate probability
 * 5. Calculate edge
 * 
 * @param pick - The pick containing predictions
 * @param monteCarloResults - Simulation results with probabilities
 * @param gameInfo - Game information with odds
 * @returns Object with edges for moneyline, spread, and O/U
 */
export function calculatePickEdges(
  pick: Pick,
  monteCarloResults: MonteCarloResults,
  gameInfo: GameInfo
): {
  moneyline_edge: number;
  spread_edge: number;
  ou_edge: number;
} {
  const EDGE_REDUCTION_FACTOR = 0.3;
  
  // ===== MONEYLINE EDGE =====
  let moneylineEdge = 0;
  
  if (monteCarloResults.moneyline_probability && pick.prediction) {
    const pickedTeam = determineMoneylineTeam(
      pick.prediction,
      gameInfo.home_team,
      gameInfo.away_team
    );
    
    const odds = getMoneylineOddsForPick(pickedTeam, gameInfo);
    
    if (odds !== null) {
      const probability = getMoneylineProbability(pickedTeam, monteCarloResults);
      moneylineEdge = calculateEdge(probability, odds);
    }
  }

  // ===== SPREAD EDGE =====
  let spreadEdge = 0;
  
  if (pick.spread_prediction && isValidOdds(gameInfo.spread_odds)) {
    const pickedFavorite = isPickingFavorite(
      pick.spread_prediction,
      gameInfo.favorite_team || ''
    );
    
    const probability = determineSpreadProbability(pickedFavorite, monteCarloResults);
    spreadEdge = calculateEdge(probability, gameInfo.spread_odds!);
  }

  // ===== OVER/UNDER EDGE =====
  let ouEdge = 0;
  
  if (monteCarloResults.total_probability && pick.ou_prediction) {
    const pickedOver = isOverPicked(pick.ou_prediction);
    const odds = determineOverUnderOdds(pickedOver, gameInfo);
    
    if (odds !== null) {
      const probability = getOverUnderProbability(pickedOver, monteCarloResults);
      ouEdge = calculateEdge(probability, odds);
    }
  }
  
  // Apply reduction factor and return
  return {
    moneyline_edge: Number((moneylineEdge * EDGE_REDUCTION_FACTOR).toFixed(2)),
    spread_edge: Number((spreadEdge * EDGE_REDUCTION_FACTOR).toFixed(2)),
    ou_edge: Number((ouEdge * EDGE_REDUCTION_FACTOR).toFixed(2))
  };
}

// ============================================================================
// DISPLAY UTILITIES (unchanged from original)
// ============================================================================

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
  // Helper function to safely calculate edge (skip extremes)
  const safeCalculateEdge = (probability: number, odds: number | null | undefined): number => {
    if (!odds && odds !== 0) return 0;
    if (probability <= 0.1 || probability >= 99.9) {
      // Don't calculate edges for near-certain outcomes
      return probability > 50 ? 100 : -100;  // Just return max/min edge
    }
    return calculateEdge(probability, odds);
  };

  return {
    moneyline: {
      home: safeCalculateEdge(monteCarloResults.home_win_probability, gameInfo.home_ml_odds),
      away: safeCalculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds)
    },
    spread: {
      favorite: safeCalculateEdge(monteCarloResults.spread_cover_probability, gameInfo.spread_odds),
      underdog: safeCalculateEdge(100 - monteCarloResults.spread_cover_probability, gameInfo.spread_odds)
    },
    total: {
      over: safeCalculateEdge(monteCarloResults.over_probability, gameInfo.over_odds),
      under: safeCalculateEdge(monteCarloResults.under_probability, gameInfo.under_odds)
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
  const NEGATIVE_EDGE = 0;
  const STRONG_EDGE_THRESHOLD = 5;
  const GOOD_EDGE_THRESHOLD = 3;
  const MARGINAL_EDGE_THRESHOLD = 1;
  const STRONG_CONFIDENCE_THRESHOLD = 65;
  const GOOD_CONFIDENCE_THRESHOLD = 60;
  const MARGINAL_CONFIDENCE_THRESHOLD = 70;
  
  // Negative edge = avoid (red)
  if (edge < NEGATIVE_EDGE) return 'red';
  
  // Strong bet: high edge + solid confidence
  if (edge >= STRONG_EDGE_THRESHOLD && confidence >= STRONG_CONFIDENCE_THRESHOLD) return 'lime';
  
  // Good bet: decent edge + okay confidence
  if (edge >= GOOD_EDGE_THRESHOLD && confidence >= GOOD_CONFIDENCE_THRESHOLD) return 'lime';
  
  // Marginal: low edge or lower confidence
  if (edge >= MARGINAL_EDGE_THRESHOLD || confidence >= MARGINAL_CONFIDENCE_THRESHOLD) return 'yellow';
  
  // Weak: very low edge and low confidence
  return 'yellow';
}

/**
 * Get CSS color class for edge-based confidence bar
 */
export function getEdgeColorClass(edge: number): string {
  const BASELINE_CONFIDENCE = 70;
  const color = getConfidenceBarColor(BASELINE_CONFIDENCE, edge);
  
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
  const HIGH_EDGE_THRESHOLD = 5;
  const MEDIUM_EDGE_THRESHOLD = 3;
  const BREAK_EVEN = 0;
  
  if (edge >= HIGH_EDGE_THRESHOLD) return 'text-lime-400';
  if (edge >= MEDIUM_EDGE_THRESHOLD) return 'text-yellow-400';
  if (edge >= BREAK_EVEN) return 'text-gray-400';
  return 'text-red-400';
}

/**
 * Format edge value for display
 */
export function formatEdge(edge?: number | null): string {
  if (edge === undefined || edge === null) return '+0.0%';
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${edge.toFixed(1)}%`;
}
