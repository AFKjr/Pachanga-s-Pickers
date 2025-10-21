// supabase/functions/generate-predictions/lib/simulation/monte-carlo.ts
import type { TeamStats, GameWeather, SimulationResult } from '../types.ts';
import { SIMULATION_ITERATIONS } from '../constants.ts';
import { applyWeatherAdjustments } from '../weather/weather-adjustments.ts';
import { calculateOffensiveStrength, calculateDefensiveStrength } from './strength-calculator.ts';
import { simulatePossession } from './possession-simulator.ts';

/**
 * Add variance to strength scores to simulate coaching, motivation, execution variance
 * NFL teams don't perform at exactly their average every game
 */
function applyGameDayVariance(baseStrength: number): number {
  // Apply ±15% variance (roughly 7-15 points on 50 scale)
  // INCREASED from 10% to 15% to add more upset potential
  // This simulates: coaching decisions, motivation, execution, matchup factors
  const VARIANCE_PERCENT = 0.15;
  const variance = (Math.random() * 2 - 1) * baseStrength * VARIANCE_PERCENT;
  
  return Math.max(10, Math.min(90, baseStrength + variance));
}

/**
 * Simulate a single game with variance at multiple levels
 */
function simulateSingleGame(
  homeStats: TeamStats,
  awayStats: TeamStats,
  weather: GameWeather | null,
  cached: {
    baseHomeOffense: number;
    baseAwayOffense: number;
    baseHomeDefense: number;
    baseAwayDefense: number;
    homeWeatherAdj: any;
    awayWeatherAdj: any;
    HOME_FIELD_BOOST: number;
  }
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  // === POSSESSION CALCULATION WITH VARIANCE ===
  const homePaceRaw = homeStats.drivesPerGame;
  const awayPaceRaw = awayStats.drivesPerGame;
  
  const averagePossessions = (homePaceRaw * 0.55 + awayPaceRaw * 0.45);
  
  // INCREASED variance: ±2 possessions instead of ±1
  // This accounts for: turnovers, big plays, clock management differences
  const possessionVariance = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, +2
  const possessionsPerTeam = Math.round(averagePossessions) + possessionVariance;
  
  const finalPossessions = Math.max(8, Math.min(15, possessionsPerTeam));

  // === USE CACHED GAME-DAY VARIANCE TO TEAM STRENGTHS ===
  // Teams don't play at exactly their season average every game
  const gameHomeOffense = applyGameDayVariance(cached.baseHomeOffense);
  const gameAwayOffense = applyGameDayVariance(cached.baseAwayOffense);
  const gameHomeDefense = applyGameDayVariance(cached.baseHomeDefense);
  const gameAwayDefense = applyGameDayVariance(cached.baseAwayDefense);

  console.log('=== STRENGTH CALCULATIONS ===');
  console.log('Base home offense:', cached.baseHomeOffense);
  console.log('Base away offense:', cached.baseAwayOffense);
  console.log('Base home defense:', cached.baseHomeDefense);
  console.log('Base away defense:', cached.baseAwayDefense);
  console.log('Game home offense (with variance):', gameHomeOffense);
  console.log('Game away offense (with variance):', gameAwayOffense);

  // === SIMULATE POSSESSIONS ===
  for (let possession = 0; possession < finalPossessions; possession++) {
    const homePoints = simulatePossession(homeStats, awayStats, cached.homeWeatherAdj);
    homeScore += homePoints * cached.HOME_FIELD_BOOST;
    
    if (possession === 0) {
      console.log('=== FIRST POSSESSION DEBUG ===');
      console.log('Home possession result:', homePoints);
      console.log('Final possessions per team:', finalPossessions);
    }
  }
  
  for (let possession = 0; possession < finalPossessions; possession++) {
    const awayPoints = simulatePossession(awayStats, homeStats, cached.awayWeatherAdj);
    awayScore += awayPoints;
    
    if (possession === 0) {
      console.log('Away possession result:', awayPoints);
    }
  }

  // === ADD "CHAOS" VARIANCE ===
  // Rare events: defensive TDs, special teams TDs, safeties, missed XPs
  // Happens in ~15% of games
  if (Math.random() < 0.15) {
    const chaosPoints = Math.random() < 0.5 ? 2 : 7; // Safety or defensive TD
    if (Math.random() < 0.5) {
      homeScore += chaosPoints;
    } else {
      awayScore += chaosPoints;
    }
  }

  console.log('=== SINGLE GAME RESULT ===');
  console.log('Home score:', Math.round(homeScore));
  console.log('Away score:', Math.round(awayScore));

  return { 
    homeScore: Math.round(homeScore), 
    awayScore: Math.round(awayScore) 
  };
}

/**
 * Determine which team is the favorite based on moneyline odds
 */
function determineFavorite(homeMoneyline: number, awayMoneyline: number): {
  favoriteIsHome: boolean;
  favoriteTeam: string;
  underdogTeam: string;
} {
  if (homeMoneyline < awayMoneyline) {
    return {
      favoriteIsHome: true,
      favoriteTeam: 'home',
      underdogTeam: 'away'
    };
  } else {
    return {
      favoriteIsHome: false,
      favoriteTeam: 'away',
      underdogTeam: 'home'
    };
  }
}

function calculateTotalCalibration(
  rawAverageTotal: number,
  bookmakersTotal: number
): number {
  const difference = rawAverageTotal - bookmakersTotal;
  return difference;
}

/**
 * Calculate calibration adjustment for spread predictions
 * 
 * Similar to total calibration - we assume bookmakers have the spread about right,
 * and use our simulation's variance to find edges rather than trying to predict
 * the exact margin of victory better than the market.
 */
function calculateSpreadCalibration(
  rawAverageMargin: number,
  bookmakersSpread: number
): number {
  const difference = rawAverageMargin - bookmakersSpread;
  return difference;
}

/**
 * Calculate the margin of victory for a given simulation iteration
 * Positive margin means favorite won by more than the spread
 */
function calculateMarginForIteration(
  homeScore: number,
  awayScore: number,
  favoriteIsHome: boolean
): number {
  if (favoriteIsHome) {
    return homeScore - awayScore;
  } else {
    return awayScore - homeScore;
  }
}

/**
 * Run Monte Carlo simulation with market-calibrated over/under probabilities
 * 
 * Key insight: We don't try to predict absolute point totals better than bookmakers.
 * Instead, we use simulation variance to find market inefficiencies.
 */
export function runMonteCarloSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number,
  weather: GameWeather | null,
  favoriteIsHome: boolean
): SimulationResult {
  console.log('=== TEAM STATS DEBUG ===');
  console.log('Home team stats:', {
    drivesPerGame: homeStats.drivesPerGame,
    passingYards: homeStats.passingYards,
    rushingYards: homeStats.rushingYards,
    yardsPerPlay: homeStats.yardsPerPlay,
    pointsPerGame: homeStats.pointsPerGame
  });
  console.log('Away team stats:', {
    drivesPerGame: awayStats.drivesPerGame,
    passingYards: awayStats.passingYards,
    rushingYards: awayStats.rushingYards,
    yardsPerPlay: awayStats.yardsPerPlay,
    pointsPerGame: awayStats.pointsPerGame
  });

  // === CACHE EXPENSIVE CALCULATIONS OUTSIDE THE LOOP ===
  const baseHomeOffense = calculateOffensiveStrength(homeStats);
  const baseAwayOffense = calculateOffensiveStrength(awayStats);
  const baseHomeDefense = calculateDefensiveStrength(homeStats);
  const baseAwayDefense = calculateDefensiveStrength(awayStats);

  // Cache weather adjustments
  const homeWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    baseHomeOffense,
    baseAwayDefense,
    {
      passingYards: homeStats.passingYards,
      rushingYards: homeStats.rushingYards,
      yardsPerPlay: homeStats.yardsPerPlay
    }
  ) : null;

  const awayWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    baseAwayOffense,
    baseHomeDefense,
    {
      passingYards: awayStats.passingYards,
      rushingYards: awayStats.rushingYards,
      yardsPerPlay: awayStats.yardsPerPlay
    }
  ) : null;

  // Cache home field advantage calculation
  const BASE_HOME_ADVANTAGE = 1.03;
  const homeFieldVariance = 0.97 + (Math.random() * 0.06); // 0.97 to 1.03 (±3%)
  const HOME_FIELD_BOOST = BASE_HOME_ADVANTAGE * homeFieldVariance;

  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;
  let favoriteCovers = 0;
  let rawOvers = 0;

  // Run raw simulations first
  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(homeStats, awayStats, weather, {
      baseHomeOffense,
      baseAwayOffense,
      baseHomeDefense,
      baseAwayDefense,
      homeWeatherAdj,
      awayWeatherAdj,
      HOME_FIELD_BOOST
    });
    
    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    // Win probability
    if (gameResult.homeScore > gameResult.awayScore) {
      homeWins++;
    } else if (gameResult.awayScore > gameResult.homeScore) {
      awayWins++;
    } else {
      ties++;
    }

    // Spread coverage
    const favoriteScore = favoriteIsHome ? gameResult.homeScore : gameResult.awayScore;
    const underdogScore = favoriteIsHome ? gameResult.awayScore : gameResult.homeScore;
    
    const margin = favoriteScore - underdogScore;
    const spreadValue = Math.abs(spread);
    
    if (margin > spreadValue) {
      favoriteCovers++;
    }

    // Count raw overs (before calibration)
    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) rawOvers++;
  }

  const rawAverageHomeScore = homeScores.reduce((sum, score) => sum + score, 0) / homeScores.length;
  const rawAverageAwayScore = awayScores.reduce((sum, score) => sum + score, 0) / awayScores.length;
  const rawAverageTotal = rawAverageHomeScore + rawAverageAwayScore;

  // === CRITICAL FIX: CALIBRATE TO MARKET ===
  // Calculate how much our model differs from bookmaker's total
  const totalCalibration = calculateTotalCalibration(rawAverageTotal, total);
  
  // Apply calibration to center our distribution on the bookmaker's line
  const calibratedHomeScores = homeScores.map(score => score - (totalCalibration / 2));
  const calibratedAwayScores = awayScores.map(score => score - (totalCalibration / 2));
  
  // Now count overs using calibrated scores
  let calibratedOvers = 0;
  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const calibratedTotal = calibratedHomeScores[iteration] + calibratedAwayScores[iteration];
    if (calibratedTotal > total) {
      calibratedOvers++;
    }
  }

  // Calculate final probabilities using calibrated results
  const overProbability = (calibratedOvers / SIMULATION_ITERATIONS) * 100;
  const underProbability = ((SIMULATION_ITERATIONS - calibratedOvers) / SIMULATION_ITERATIONS) * 100;

  // SPREAD CALIBRATION
  // Calculate the raw margin from our simulation
  const rawAverageMargin = favoriteIsHome 
    ? rawAverageHomeScore - rawAverageAwayScore
    : rawAverageAwayScore - rawAverageHomeScore;
  
  const spreadValue = Math.abs(spread);
  
  // Calculate how much our predicted margin differs from the bookmaker's spread
  const marginCalibration = calculateSpreadCalibration(rawAverageMargin, spreadValue);
  
  // Recalculate spread coverage with calibrated margins
  let calibratedFavoriteCovers = 0;
  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const rawHomeScore = homeScores[iteration];
    const rawAwayScore = awayScores[iteration];
    
    // Calculate margin and apply calibration
    const rawMargin = calculateMarginForIteration(rawHomeScore, rawAwayScore, favoriteIsHome);
    
    const calibratedMargin = rawMargin - marginCalibration;
    
    // Check if favorite covers the spread with calibrated margin
    if (calibratedMargin > spreadValue) {
      calibratedFavoriteCovers++;
    }
  }
  
  const calibratedFavoriteCoverProbability = (calibratedFavoriteCovers / SIMULATION_ITERATIONS) * 100;
  const calibratedUnderdogCoverProbability = 100 - calibratedFavoriteCoverProbability;

  const favoriteCoverProbability = calibratedFavoriteCoverProbability;
  const underdogCoverProbability = calibratedUnderdogCoverProbability;

  return {
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(rawAverageHomeScore),
    predictedAwayScore: Math.round(rawAverageAwayScore),
    spreadCoverProbability: favoriteCoverProbability,
    favoriteCoverProbability: favoriteCoverProbability,
    underdogCoverProbability: underdogCoverProbability,
    overProbability: overProbability,
    underProbability: underProbability,
    iterations: SIMULATION_ITERATIONS
  };
}

export { determineFavorite };
