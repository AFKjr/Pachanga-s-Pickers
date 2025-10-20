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

  // NEW: Enhanced stats from fusion script
  // Situational offense
  thirdDownAttempts?: number;
  thirdDownConversions?: number;
  fourthDownAttempts?: number;
  fourthDownConversions?: number;
  redZoneAttempts?: number;
  redZoneTouchdowns?: number;

  // Advanced passing
  passFirstDowns?: number;
  rushFirstDowns?: number;
  penaltyFirstDowns?: number;
  expectedPointsOffense?: number;

  // Special teams
  fieldGoalAttempts?: number;
  fieldGoalsMade?: number;
  fieldGoalPct?: number;
  extraPointAttempts?: number;
  extraPointsMade?: number;
  kickoffs?: number;
  touchbacks?: number;
  touchbackPct?: number;

  // Punting
  punts?: number;
  puntYards?: number;
  puntNetYards?: number;
  puntNetYardsPerPunt?: number;
  puntsInside20?: number;
  puntsBlocked?: number;

  // Returns
  kickReturns?: number;
  kickReturnYards?: number;
  kickReturnYardsPerReturn?: number;
  puntReturns?: number;
  puntReturnYards?: number;
  puntReturnYardsPerReturn?: number;
  allPurposeYards?: number;

  // Scoring
  receivingTds?: number;
  totalTds?: number;
  twoPointConversions?: number;
  puntReturnTds?: number;
  kickReturnTds?: number;

  // Defensive situational
  defThirdDownAttempts?: number;
  defThirdDownConversions?: number;
  defFourthDownAttempts?: number;
  defFourthDownConversions?: number;
  defRedZoneAttempts?: number;
  defRedZoneTouchdowns?: number;

  // Pass rush
  qbHurries?: number;
  qbHits?: number;
  blitzes?: number;
  blitzPct?: number;

  // Defensive special teams
  defFieldGoalAttempts?: number;
  defFieldGoalsMade?: number;
  defFieldGoalPct?: number;
  defExtraPointAttempts?: number;
  defExtraPointsMade?: number;

  // Defensive punting
  defPunts?: number;
  defPuntYards?: number;
  defPuntsBlocked?: number;

  // Defensive returns
  defKickReturns?: number;
  defKickReturnYards?: number;
  defPuntReturns?: number;
  defPuntReturnYards?: number;

  // Defensive scoring
  defRushingTds?: number;
  defReceivingTds?: number;
  defTotalTds?: number;
  defTwoPointConversions?: number;
  defPuntReturnTds?: number;
  defKickReturnTds?: number;

  // Drive stats
  totalDrives?: number;
  driveScoringPct?: number;
  driveTurnoverPct?: number;
  driveStartAvg?: number;
  driveTimeAvg?: number;
  drivePointsAvg?: number;

  // Defensive drive stats
  defTotalDrives?: number;
  defDriveScoringPct?: number;
  defDriveTurnoverPct?: number;
  defDriveStartAvg?: number;
  defDriveTimeAvg?: number;
  defDrivePointsAvg?: number;
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