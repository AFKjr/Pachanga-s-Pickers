// Pick-related types with strong type safety
import type { BettingPick } from './picks.types';
export type {
  BettingPick,
  PickInsert,
  PickUpdate,
  PickWithMonteCarlo,
  CompletedPick,
  GameInfo,
  MonteCarloResults,
  WeatherInfo,
  ConfidenceScore,
  NFLWeek,
  BetResult,
  WeatherImpact,
  BetType,
  ResultStatus
} from './picks.types';

// Team stats types
export type {
  TeamStats
} from './teamStats.types';

export {
  parseStatNumber,
  getOffensiveStats,
  getDefensiveStats,
  hasStrongOffense,
  hasStrongDefense,
  getOffensiveRankTier,
  getDefensiveRankTier,
  normalizeTeamName
} from './teamStats.types';

// Define our Pick type to avoid conflicts with TypeScript's built-in Pick
export type { BettingPick as Pick } from './picks.types';

// Type guards and branded type creators
export {
  isValidNFLWeek,
  isValidConfidence,
  isValidBetResult,
  isValidWeatherImpact,
  createConfidenceScore,
  createNFLWeek,
  hasMonteCarloResults,
  isCompletedPick
} from './picks.types';

// Constants
export {
  BET_TYPES,
  RESULT_STATUS,
  WEATHER_IMPACT_LEVELS,
  NFL_WEEKS
} from './picks.types';

// API response types and utilities
export type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse
} from './api.types';

// API utility functions
export {
  isSuccess,
  isError,
  unwrapResponse,
  getDataOrDefault,
  getDataOrNull,
  mapResponse,
  chainResponse,
  combineResponses,
  collectResponses,
  retryApiCall,
  withTimeout
} from './api.types';

// Legacy type aliases for backward compatibility
// TODO: Gradually migrate away from these

// UI Component Props (keeping these for now)
export interface PickCardProps {
  pick: import('./picks.types').BettingPick;
  showComments?: boolean;
  onCommentClick?: () => void;
}

// Mock Data Types
export type MockPick = BettingPick & {
  comments_count?: number;
  is_pinned?: boolean;
};