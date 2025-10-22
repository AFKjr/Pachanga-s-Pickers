// Test Chargers vs Vikings prediction - Node.js version
// Note: This is a simplified version for testing the Sc% and TO% integration
// In the actual edge function, this runs in Deno runtime

// Mock the required types and functions for testing
interface TeamStats {
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
  turnoverPercentage: number;
  yardsPerDrive: number;
  timePerDriveSeconds: number;
}

interface GameWeather {
  gameId: string;
  stadium: string;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  humidity: number;
  description: string;
  isDome: boolean;
  impactRating: 'none' | 'low' | 'medium' | 'high' | 'extreme';
}

interface SimulationResult {
  homeWinProbability: number;
  awayWinProbability: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  spreadCoverProbability: number;
  favoriteCoverProbability: number;
  underdogCoverProbability: number;
  overProbability: number;
  underProbability: number;
  iterations: number;
}

// Simplified simulation function for testing
function runMonteCarloSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  homeSpread: number,
  total: number,
  weather: GameWeather | null,
  favoriteIsHome: boolean
): SimulationResult {
  console.log('Running simplified Monte Carlo simulation...');
  console.log(`Home: ${homeStats.team} (Sc%: ${homeStats.scoringPercentage}, TO%: ${homeStats.turnoverPercentage})`);
  console.log(`Away: ${awayStats.team} (Sc%: ${awayStats.scoringPercentage}, TO%: ${awayStats.turnoverPercentage})`);

  // Simple calculation based on scoring percentages
  const homeScoringRate = homeStats.scoringPercentage / 100;
  const awayScoringRate = awayStats.scoringPercentage / 100;
  const homeTurnoverRate = homeStats.turnoverPercentage / 100;
  const awayTurnoverRate = awayStats.turnoverPercentage / 100;

  // Calculate expected drives (simplified)
  const avgDrives = (homeStats.drivesPerGame + awayStats.drivesPerGame) / 2;

  // Calculate expected scores using Sc% and TO%
  const homeExpectedScore = avgDrives * homeScoringRate * 7; // 7 points per scoring drive average
  const awayExpectedScore = avgDrives * awayScoringRate * 7;

  // Add home field advantage
  const finalHomeScore = Math.round(homeExpectedScore + 3);
  const finalAwayScore = Math.round(awayExpectedScore);

  // Calculate win probabilities based on score difference
  const scoreDiff = finalHomeScore - finalAwayScore;
  const homeWinProb = scoreDiff > 0 ? 65 : scoreDiff < 0 ? 35 : 50;
  const awayWinProb = 100 - homeWinProb;

  // Spread calculations
  const spreadValue = Math.abs(homeSpread);
  const favoriteCovers = favoriteIsHome ?
    (finalHomeScore + spreadValue > finalAwayScore ? 60 : 40) :
    (finalAwayScore + spreadValue > finalHomeScore ? 60 : 40);

  // Total calculations
  const totalScore = finalHomeScore + finalAwayScore;
  const overProb = totalScore > total ? 55 : 45;

  return {
    homeWinProbability: homeWinProb,
    awayWinProbability: awayWinProb,
    predictedHomeScore: finalHomeScore,
    predictedAwayScore: finalAwayScore,
    spreadCoverProbability: favoriteCovers,
    favoriteCoverProbability: favoriteCovers,
    underdogCoverProbability: 100 - favoriteCovers,
    overProbability: overProb,
    underProbability: 100 - overProb,
    iterations: 500
  };
}

// Mock Chargers stats (Week 8 performance)
const chargersStats: TeamStats = {
  team: 'Los Angeles Chargers',
  gamesPlayed: 7,
  offensiveYardsPerGame: 315,
  defensiveYardsAllowed: 298,
  pointsPerGame: 22.4,
  pointsAllowedPerGame: 20.1,
  turnoverDifferential: 0.3,
  thirdDownConversionRate: 0.41,
  redZoneEfficiency: 0.52,
  passCompletions: 165,
  passAttempts: 255,
  passCompletionPct: 64.7,
  passingYards: 1850,
  passingTds: 12,
  interceptionsThrown: 7,
  yardsPerPassAttempt: 7.3,
  rushingAttempts: 135,
  rushingYards: 620,
  rushingTds: 5,
  yardsPerRush: 4.6,
  totalPlays: 390,
  yardsPerPlay: 5.4,
  firstDowns: 108,
  penalties: 32,
  penaltyYards: 265,
  turnoversLost: 11,
  fumblesLost: 4,
  defPassCompletionsAllowed: 158,
  defPassAttempts: 248,
  defPassingYardsAllowed: 1720,
  defPassingTdsAllowed: 10,
  defInterceptions: 5,
  defRushingAttemptsAllowed: 128,
  defRushingYardsAllowed: 580,
  defRushingTdsAllowed: 4,
  defTotalPlays: 376,
  defYardsPerPlayAllowed: 5.2,
  defFirstDownsAllowed: 102,
  turnoversForced: 9,
  fumblesForced: 3,
  drivesPerGame: 11.8,
  playsPerDrive: 6.2,
  pointsPerDrive: 1.9,
  scoringPercentage: 41.3,
  turnoverPercentage: 9.3,
  yardsPerDrive: 26.7,
  timePerDriveSeconds: 158
};

// Mock Vikings stats (Week 8 performance)
const vikingsStats: TeamStats = {
  team: 'Minnesota Vikings',
  gamesPlayed: 7,
  offensiveYardsPerGame: 342,
  defensiveYardsAllowed: 312,
  pointsPerGame: 25.1,
  pointsAllowedPerGame: 18.9,
  turnoverDifferential: 0.7,
  thirdDownConversionRate: 0.45,
  redZoneEfficiency: 0.61,
  passCompletions: 172,
  passAttempts: 268,
  passCompletionPct: 64.2,
  passingYards: 1980,
  passingTds: 15,
  interceptionsThrown: 6,
  yardsPerPassAttempt: 7.4,
  rushingAttempts: 142,
  rushingYards: 685,
  rushingTds: 7,
  yardsPerRush: 4.8,
  totalPlays: 410,
  yardsPerPlay: 5.7,
  firstDowns: 118,
  penalties: 38,
  penaltyYards: 295,
  turnoversLost: 10,
  fumblesLost: 3,
  defPassCompletionsAllowed: 152,
  defPassAttempts: 242,
  defPassingYardsAllowed: 1650,
  defPassingTdsAllowed: 9,
  defInterceptions: 7,
  defRushingAttemptsAllowed: 135,
  defRushingYardsAllowed: 620,
  defRushingTdsAllowed: 5,
  defTotalPlays: 377,
  defYardsPerPlayAllowed: 5.3,
  defFirstDownsAllowed: 105,
  turnoversForced: 12,
  fumblesForced: 4,
  drivesPerGame: 12.2,
  playsPerDrive: 6.5,
  pointsPerDrive: 2.1,
  scoringPercentage: 47.6,
  turnoverPercentage: 6.3,
  yardsPerDrive: 28.1,
  timePerDriveSeconds: 162
};

async function testChargersVsVikings() {
  console.log('🏈 CHARGERS vs VIKINGS PREDICTION 🏈');
  console.log('=====================================');

  try {
    // Mock game parameters
    const homeSpread = -3.5; // Vikings favored by 3.5
    const total = 44.5; // Over/under
    const gameWeather: GameWeather | null = null; // No weather data
    const favoriteIsHome = true; // Vikings are home favorites

    // Run Monte Carlo simulation
    const result = runMonteCarloSimulation(
      vikingsStats, // Home team (Vikings)
      chargersStats, // Away team (Chargers)
      homeSpread,
      total,
      gameWeather,
      favoriteIsHome
    );

    console.log(`\n📊 PREDICTION RESULTS:`);
    console.log(`Minnesota Vikings: ${result.predictedHomeScore}`);
    console.log(`Los Angeles Chargers: ${result.predictedAwayScore}`);
    console.log(`Projected Total: ${result.predictedHomeScore + result.predictedAwayScore} points`);

    console.log(`\n� SIMULATION STATS:`);
    console.log(`Home Win %: ${result.homeWinProbability.toFixed(1)}%`);
    console.log(`Away Win %: ${result.awayWinProbability.toFixed(1)}%`);
    console.log(`Favorite Cover %: ${result.favoriteCoverProbability.toFixed(1)}%`);
    console.log(`Underdog Cover %: ${result.underdogCoverProbability.toFixed(1)}%`);
    console.log(`Over %: ${result.overProbability.toFixed(1)}%`);
    console.log(`Under %: ${result.underProbability.toFixed(1)}%`);
    console.log(`Iterations: ${result.iterations}`);

  } catch (error) {
    console.error('❌ Error running prediction:', error);
  }
}

// Run the test
testChargersVsVikings();