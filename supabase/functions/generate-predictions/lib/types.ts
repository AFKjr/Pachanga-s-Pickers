// api/lib/types.ts
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
  spreadCoverProbability: number;
  overProbability: number;
  underProbability: number;
  iterations: number;
}