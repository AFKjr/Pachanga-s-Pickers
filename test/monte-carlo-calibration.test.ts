import { runMonteCarloSimulation, determineFavorite } from '../supabase/functions/generate-predictions/lib/simulation/monte-carlo.ts';
import type { TeamStats, GameWeather } from '../supabase/functions/generate-predictions/lib/types.ts';

/**
 * Create mock team stats for testing
 * These represent average NFL teams
 */
function createMockTeamStats(overrides: Partial<TeamStats> = {}): TeamStats {
  return {
    team: 'Test Team',
    gamesPlayed: 16,
    offensiveYardsPerGame: 350,
    defensiveYardsAllowed: 320,
    pointsPerGame: 22,
    pointsAllowedPerGame: 22,
    turnoverDifferential: 0,
    thirdDownConversionRate: 40,
    redZoneEfficiency: 55,
    passCompletions: 20,
    passAttempts: 32,
    passCompletionPct: 62.5,
    passingYards: 230,
    passingTds: 1.5,
    interceptionsThrown: 0.8,
    yardsPerPassAttempt: 7.2,
    rushingAttempts: 25,
    rushingYards: 110,
    rushingTds: 1.2,
    yardsPerRush: 4.4,
    totalPlays: 57,
    yardsPerPlay: 5.5,
    firstDowns: 18,
    penalties: 6,
    penaltyYards: 50,
    turnoversLost: 1.2,
    fumblesLost: 0.5,
    defPassCompletionsAllowed: 18,
    defPassAttempts: 30,
    defPassingYardsAllowed: 200,
    defPassingTdsAllowed: 1.3,
    defInterceptions: 0.9,
    defRushingAttemptsAllowed: 22,
    defRushingYardsAllowed: 95,
    defRushingTdsAllowed: 0.8,
    defTotalPlays: 52,
    defYardsPerPlayAllowed: 5.5,
    defFirstDownsAllowed: 16,
    turnoversForced: 1.4,
    fumblesForced: 0.6,
    drivesPerGame: 11,
    playsPerDrive: 5.2,
    pointsPerDrive: 2.0,
    scoringPercentage: 35,
    yardsPerDrive: 32,
    timePerDriveSeconds: 150,
    ...overrides
  };
}

/**
 * Run a single test simulation and return results with diagnostics
 */
function runTestSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number,
  weather: GameWeather | null = null
) {
  const homeMoneyline = spread < 0 ? -150 : 150;
  const awayMoneyline = spread < 0 ? 130 : -170;
  const { favoriteIsHome } = determineFavorite(homeMoneyline, awayMoneyline);
  
  const result = runMonteCarloSimulation(
    homeStats,
    awayStats,
    spread,
    total,
    weather,
    favoriteIsHome
  );
  
  return {
    ...result,
    favoriteIsHome,
    diagnostics: {
      predictedTotal: result.predictedHomeScore + result.predictedAwayScore,
      bookmakersTotal: total,
      totalDifference: (result.predictedHomeScore + result.predictedAwayScore) - total,
      predictedMargin: favoriteIsHome 
        ? result.predictedHomeScore - result.predictedAwayScore
        : result.predictedAwayScore - result.predictedHomeScore,
      bookmakersSpread: Math.abs(spread),
      marginDifference: (favoriteIsHome 
        ? result.predictedHomeScore - result.predictedAwayScore
        : result.predictedAwayScore - result.predictedHomeScore) - Math.abs(spread)
    }
  };
}

describe('Monte Carlo Calibration Tests', () => {
  test('Even Matchup - Should produce probabilities near 50%', () => {
    const homeStats = createMockTeamStats();
    const awayStats = createMockTeamStats();
    const spread = -2.5; // Small home field advantage
    const total = 44;
    
    const result = runTestSimulation(homeStats, awayStats, spread, total);
    
    expect(result.favoriteCoverProbability).toBeGreaterThanOrEqual(45);
    expect(result.favoriteCoverProbability).toBeLessThanOrEqual(55);
    expect(result.overProbability).toBeGreaterThanOrEqual(45);
    expect(result.overProbability).toBeLessThanOrEqual(55);
  });

  test('High-Scoring Matchup - Should show slight edge toward over', () => {
    const homeStats = createMockTeamStats({
      pointsPerGame: 28,
      yardsPerPlay: 6.2,
      thirdDownConversionRate: 45,
      redZoneEfficiency: 65
    });
    
    const awayStats = createMockTeamStats({
      pointsPerGame: 26,
      pointsAllowedPerGame: 26,
      defYardsPerPlayAllowed: 6.0
    });
    
    const spread = -3.5;
    const total = 50; // High total set by bookmaker
    
    const result = runTestSimulation(homeStats, awayStats, spread, total);
    
    expect(result.overProbability).toBeGreaterThanOrEqual(45);
    expect(result.overProbability).toBeLessThanOrEqual(60);
  });

  test('Low-Scoring Matchup - Should show slight edge toward under', () => {
    const homeStats = createMockTeamStats({
      pointsPerGame: 18,
      pointsAllowedPerGame: 17,
      yardsPerPlay: 4.8,
      thirdDownConversionRate: 35,
      redZoneEfficiency: 45
    });
    
    const awayStats = createMockTeamStats({
      pointsPerGame: 19,
      pointsAllowedPerGame: 18,
      yardsPerPlay: 4.9,
      thirdDownConversionRate: 36
    });
    
    const spread = -2.5;
    const total = 38; // Low total
    
    const result = runTestSimulation(homeStats, awayStats, spread, total);
    
    expect(result.underProbability).toBeGreaterThanOrEqual(45);
    expect(result.underProbability).toBeLessThanOrEqual(60);
  });

  test('Heavy Favorite - Spread calibrated, moneyline not', () => {
    const homeStats = createMockTeamStats({
      pointsPerGame: 30,
      pointsAllowedPerGame: 18,
      yardsPerPlay: 6.5,
      thirdDownConversionRate: 48,
      redZoneEfficiency: 68
    });
    
    const awayStats = createMockTeamStats({
      pointsPerGame: 16,
      pointsAllowedPerGame: 27,
      yardsPerPlay: 4.5,
      thirdDownConversionRate: 32,
      redZoneEfficiency: 42
    });
    
    const spread = -10.5; // Large spread
    const total = 46;
    
    const result = runTestSimulation(homeStats, awayStats, spread, total);
    
    // Spread should be calibrated
    expect(result.favoriteCoverProbability).toBeGreaterThanOrEqual(45);
    expect(result.favoriteCoverProbability).toBeLessThanOrEqual(55);
    
    // Moneyline should NOT be calibrated (should show real advantage)
    expect(result.homeWinProbability).toBeGreaterThan(65);
  });

  test('Probability Totals - Should equal 100%', () => {
    const homeStats = createMockTeamStats();
    const awayStats = createMockTeamStats();
    const spread = -3;
    const total = 44;
    
    const result = runTestSimulation(homeStats, awayStats, spread, total);
    
    const spreadTotal = result.favoriteCoverProbability + result.underdogCoverProbability;
    const ouTotal = result.overProbability + result.underProbability;
    
    expect(Math.abs(spreadTotal - 100)).toBeLessThan(0.1);
    expect(Math.abs(ouTotal - 100)).toBeLessThan(0.1);
  });

  test('Consistency - Multiple runs should be consistent', () => {
    const homeStats = createMockTeamStats();
    const awayStats = createMockTeamStats();
    const spread = -3;
    const total = 44;
    
    const results = [];
    for (let run = 0; run < 5; run++) {
      const result = runTestSimulation(homeStats, awayStats, spread, total);
      results.push(result);
    }
    
    const overProbs = results.map(r => r.overProbability);
    const avgOver = overProbs.reduce((sum, val) => sum + val, 0) / overProbs.length;
    const variance = overProbs.reduce((sum, val) => sum + Math.pow(val - avgOver, 2), 0) / overProbs.length;
    const stdDev = Math.sqrt(variance);
    
    expect(stdDev).toBeLessThan(3);
  });
});