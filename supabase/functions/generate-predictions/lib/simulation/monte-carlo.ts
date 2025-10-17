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
  weather: GameWeather | null
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

  // === APPLY GAME-DAY VARIANCE TO TEAM STRENGTHS ===
  // Teams don't play at exactly their season average every game
  const baseHomeOffense = calculateOffensiveStrength(homeStats);
  const baseAwayOffense = calculateOffensiveStrength(awayStats);
  const baseHomeDefense = calculateDefensiveStrength(homeStats);
  const baseAwayDefense = calculateDefensiveStrength(awayStats);
  
  // Simulate "showing up" variance
  const gameHomeOffense = applyGameDayVariance(baseHomeOffense);
  const gameAwayOffense = applyGameDayVariance(baseAwayOffense);
  const gameHomeDefense = applyGameDayVariance(baseHomeDefense);
  const gameAwayDefense = applyGameDayVariance(baseAwayDefense);

  // === WEATHER ADJUSTMENTS (applied to game-day strength) ===
  const homeWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    gameHomeOffense,
    gameAwayDefense,
    {
      passingYards: homeStats.passingYards,
      rushingYards: homeStats.rushingYards,
      yardsPerPlay: homeStats.yardsPerPlay
    }
  ) : null;

  const awayWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    gameAwayOffense,
    gameHomeDefense,
    {
      passingYards: awayStats.passingYards,
      rushingYards: awayStats.rushingYards,
      yardsPerPlay: awayStats.yardsPerPlay
    }
  ) : null;

  // === HOME FIELD ADVANTAGE WITH VARIANCE ===
  // Home field advantage isn't always exactly 3%
  // Sometimes crowd is louder, sometimes it's quiet
  const BASE_HOME_ADVANTAGE = 1.03;
  const homeFieldVariance = 0.97 + (Math.random() * 0.06); // 0.97 to 1.03 (±3%)
  const HOME_FIELD_BOOST = BASE_HOME_ADVANTAGE * homeFieldVariance;

  // === SIMULATE POSSESSIONS ===
  for (let possession = 0; possession < finalPossessions; possession++) {
    const homePoints = simulatePossession(homeStats, awayStats, homeWeatherAdj);
    homeScore += homePoints * HOME_FIELD_BOOST;
  }
  
  for (let possession = 0; possession < finalPossessions; possession++) {
    awayScore += simulatePossession(awayStats, homeStats, awayWeatherAdj);
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

/**
 * Run Monte Carlo simulation with increased variance
 */
export function runMonteCarloSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number,
  weather: GameWeather | null,
  favoriteIsHome: boolean
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;
  let favoriteCovers = 0;
  let overs = 0;

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(homeStats, awayStats, weather);
    
    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    // Win probability
    if (gameResult.homeScore > gameResult.awayScore) {
      homeWins++;
    } else if (gameResult.awayScore > gameResult.homeScore) {
      awayWins++;
    } else {
      ties++; // Track ties (rare but possible with variance)
    }

    // Spread coverage
    const favoriteScore = favoriteIsHome ? gameResult.homeScore : gameResult.awayScore;
    const underdogScore = favoriteIsHome ? gameResult.awayScore : gameResult.homeScore;
    
    const margin = favoriteScore - underdogScore;
    const spreadValue = Math.abs(spread);
    
    if (margin > spreadValue) {
      favoriteCovers++;
    }

    // Over/Under
    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) overs++;
  }

  const avgHomeScore = homeScores.reduce((acc, score) => acc + score, 0) / homeScores.length;
  const avgAwayScore = awayScores.reduce((acc, score) => acc + score, 0) / awayScores.length;

  const favoriteCoverProb = (favoriteCovers / SIMULATION_ITERATIONS) * 100;
  const underdogCoverProb = ((SIMULATION_ITERATIONS - favoriteCovers) / SIMULATION_ITERATIONS) * 100;

  return {
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(avgHomeScore),
    predictedAwayScore: Math.round(avgAwayScore),
    spreadCoverProbability: favoriteCoverProb,
    favoriteCoverProbability: favoriteCoverProb,
    underdogCoverProbability: underdogCoverProb,
    overProbability: (overs / SIMULATION_ITERATIONS) * 100,
    underProbability: ((SIMULATION_ITERATIONS - overs) / SIMULATION_ITERATIONS) * 100,
    iterations: SIMULATION_ITERATIONS
  };
}

export { determineFavorite };
