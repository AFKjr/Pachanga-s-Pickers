/**
 * Improved Pick Types with Stronger Type Safety
 *
 * This file provides:
 * - Branded types for numeric values
 * - Strict union types
 * - Type guards for runtime validation
 * - Clear nullability
 */

// Confidence is 0-100, stored as decimal(5,2)
export type ConfidenceScore = number;

// NFL weeks are 1-18
export type NFLWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

// Result types
export type BetResult = 'win' | 'loss' | 'push' | 'pending' | null;

// Weather impact rating
export type WeatherImpact = 'none' | 'low' | 'medium' | 'high' | 'extreme';

/**
 * Game information with required and optional fields clearly defined
 */
export interface GameInfo {
  // Required fields
  home_team: string;
  away_team: string;
  league: string;
  game_date: string;

  // Optional betting lines
  spread?: number | null;
  over_under?: number | null;

  // Optional game results
  home_score?: number | null;
  away_score?: number | null;

  // Optional odds at time of prediction (American format)
  home_ml_odds?: number | null;
  away_ml_odds?: number | null;
  spread_odds?: number | null;
  over_odds?: number | null;
  under_odds?: number | null;

  // Optional favorite/underdog information
  favorite_team?: string | null;
  underdog_team?: string | null;
  favorite_is_home?: boolean | null;
}

/**
 * Monte Carlo simulation results with all probabilities
 */
export interface MonteCarloResults {
  // Win probabilities
  moneyline_probability: number;
  home_win_probability: number;
  away_win_probability: number;

  // Spread probabilities
  spread_probability: number;
  spread_cover_probability: number; // DEPRECATED
  favorite_cover_probability: number;
  underdog_cover_probability: number;

  // Total probabilities
  total_probability: number;
  over_probability: number;
  under_probability: number;

  // Predicted scores
  predicted_home_score: number;
  predicted_away_score: number;
}

/**
 * Weather information
 */
export interface WeatherInfo {
  temperature: number;
  wind_speed: number;
  condition: string;
  impact_rating: WeatherImpact;
  description: string;
}

/**
 * Complete pick with all fields
 */
export interface BettingPick {
  // Database fields
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;

  // Game information
  week: NFLWeek;
  schedule_id: string | null;
  game_info: GameInfo;

  // Predictions
  prediction: string;
  spread_prediction?: string | null;
  ou_prediction?: string | null;

  // Confidence and reasoning
  confidence: ConfidenceScore;
  reasoning: string;

  // Results
  result: BetResult;
  ats_result?: BetResult | null;
  ou_result?: BetResult | null;

  // Edge values
  moneyline_edge?: number | null;
  spread_edge?: number | null;
  ou_edge?: number | null;

  // Monte Carlo results
  monte_carlo_results?: MonteCarloResults | null;

  // Weather
  weather?: WeatherInfo | null;
  weather_impact?: string | null;

  // UI/Display fields (added by queries)
  is_pinned?: boolean;
  author_username?: string;
  comments_count?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid NFL week
 */
export function isValidNFLWeek(value: number): value is NFLWeek {
  return Number.isInteger(value) && value >= 1 && value <= 18;
}

/**
 * Type guard to check if a value is a valid confidence score
 */
export function isValidConfidence(value: number): value is ConfidenceScore {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

/**
 * Type guard to check if a value is a valid bet result
 */
export function isValidBetResult(value: string | null): value is BetResult {
  return value === null || ['win', 'loss', 'push', 'pending'].includes(value);
}

/**
 * Type guard to check if a value is a valid weather impact
 */
export function isValidWeatherImpact(value: string): value is WeatherImpact {
  return ['none', 'low', 'medium', 'high', 'extreme'].includes(value);
}

// ============================================================================
// BRANDED TYPE CREATORS
// ============================================================================

/**
 * Create a confidence score (with validation)
 */
export function createConfidenceScore(value: number): ConfidenceScore {
  if (!isValidConfidence(value)) {
    throw new Error(`Invalid confidence score: ${value}. Must be between 0 and 100.`);
  }
  return value;
}

/**
 * Validate and create NFL week (with validation)
 */
export function createNFLWeek(value: number): NFLWeek {
  if (!isValidNFLWeek(value)) {
    throw new Error(`Invalid NFL week: ${value}. Must be between 1 and 18.`);
  }
  return value;
}

// ============================================================================
// CONSTANTS WITH CONST ASSERTIONS
// ============================================================================

/**
 * Bet types (moneyline, spread, total)
 */
export const BET_TYPES = ['moneyline', 'spread', 'total'] as const;
export type BetType = typeof BET_TYPES[number];

/**
 * Result statuses
 */
export const RESULT_STATUS = {
  WIN: 'win',
  LOSS: 'loss',
  PUSH: 'push',
  PENDING: 'pending'
} as const;
export type ResultStatus = typeof RESULT_STATUS[keyof typeof RESULT_STATUS];

/**
 * Weather impact levels
 */
export const WEATHER_IMPACT_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme'
} as const;

/**
 * NFL weeks array (for iteration)
 */
export const NFL_WEEKS: ReadonlyArray<NFLWeek> = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
] as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pick creation data (without generated fields)
 */
export type PickInsert = Omit<BettingPick, 'id' | 'created_at' | 'updated_at'>;

/**
 * Pick update data (all fields optional except id)
 */
export type PickUpdate = Partial<Omit<BettingPick, 'id' | 'created_at'>> & {
  id: string;
};

/**
 * Pick with required Monte Carlo results
 */
export type PickWithMonteCarlo = BettingPick & {
  monte_carlo_results: MonteCarloResults;
};

/**
 * Pick with required scores (completed game)
 */
export type CompletedPick = BettingPick & {
  game_info: GameInfo & {
    home_score: number;
    away_score: number;
  };
};

/**
 * Type guard for PickWithMonteCarlo
 */
export function hasMonteCarloResults(pick: BettingPick): pick is PickWithMonteCarlo {
  return pick.monte_carlo_results !== null && pick.monte_carlo_results !== undefined;
}

/**
 * Type guard for CompletedPick
 */
export function isCompletedPick(pick: BettingPick): pick is CompletedPick {
  return pick.game_info.home_score !== null
    && pick.game_info.home_score !== undefined
    && pick.game_info.away_score !== null
    && pick.game_info.away_score !== undefined;
}