// supabase/functions/generate-predictions/lib/types.ts

export interface FavoriteInfo {
  favoriteIsHome: boolean;
  favoriteTeam: string;
  underdogTeam: string;
}

// ============================================================================
// BUG FIX #7: Stats Quality Indicators
// ============================================================================

export enum StatsQuality {
  REAL_DATA = 'real',           // Fetched from database with actual team stats
  PARTIAL_DATA = 'partial',     // Some fields missing, filled with defaults
  DEFAULT_DATA = 'default',     // No data found, using league averages
  STALE_DATA = 'stale'          // Data exists but is outdated
}

export interface TeamStatsMetadata {
  quality: StatsQuality;
  source: string;
  lastUpdated?: Date;
  missingFields?: string[];
  warnings?: string[];
}

export interface TeamStatsWithMetadata {
  stats: TeamStats;
  metadata: TeamStatsMetadata;
}

export interface TeamStats {
  team: string;
  gamesPlayed: number;
  offensiveYardsPerGame: number;
  defensiveYardsAllowed: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversionRate: number;
  redZoneEfficiency: number;
  passCompletions: number;
  passAttempts: number;
  passCompletionPct: number;
  passingYards: number;
  passingTds: number;
  interceptionsThrown: number;
  yardsPerPassAttempt: number;
  rushingAttempts: number;
  rushingYards: number;
  rushingTds: number;
  yardsPerRush: number;
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  penalties: number;
  penaltyYards: number;
  turnoversLost: number;
  fumblesLost: number;
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  turnoversForced: number;
  fumblesForced: number;
  drivesPerGame: number;
  playsPerDrive: number;
  pointsPerDrive: number;
  scoringPercentage: number;
  yardsPerDrive: number;
  timePerDriveSeconds: number;
}

export interface OddsData {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

export interface WeatherConditions {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  humidity: number;
  description: string;
}

export interface GameWeather extends WeatherConditions {
  gameId: string;
  stadium: string;
  isDome: boolean;
  impactRating: 'none' | 'low' | 'medium' | 'high' | 'extreme';
}

export interface SimulationResult {
  homeWinProbability: number;
  awayWinProbability: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  spreadCoverProbability: number;  // DEPRECATED: Use favoriteCoverProbability instead
  favoriteCoverProbability: number;  // NEW: Probability favorite covers the spread
  underdogCoverProbability: number;  // NEW: Probability underdog covers the spread
  overProbability: number;
  underProbability: number;
  iterations: number;
}