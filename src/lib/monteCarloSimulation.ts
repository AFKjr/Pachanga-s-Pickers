// src/lib/monteCarloSimulation.ts

/**
 * Monte Carlo Simulation for NFL Game Predictions
 * Runs 10,000+ iterations to predict game outcomes
 */

import { TeamStats, GamePredictionInput } from './externalApis';
import { SIMULATION_ITERATIONS, QUARTERS_PER_GAME, POSSESSIONS_PER_QUARTER, DEFENSIVE_STRENGTH_WEIGHTS, BETTING_CONSTANTS } from '../utils/constants';

export interface SimulationResult {
  homeWinProbability: number;
  awayWinProbability: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;
  spreadCoverProbability: number;
  overProbability: number;
  underProbability: number;
  iterations: number;
}

export interface BettingRecommendation {
  moneyline: {
    pick: string;
    confidence: 'High' | 'Medium' | 'Low';
    winProbability: number;
  };
  spread: {
    pick: string;
    line: number;
    confidence: 'High' | 'Medium' | 'Low';
    coverProbability: number;
  };
  total: {
    pick: 'Over' | 'Under';
    line: number;
    confidence: 'High' | 'Medium' | 'Low';
    probability: number;
  };
}

/**
 * Run Monte Carlo simulation for a game
 */
export function runMonteCarloSimulation(
  input: GamePredictionInput
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let spreadCovers = 0;
  let overs = 0;

  // Run simulations
  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(
      input.homeStats,
      input.awayStats
    );

    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    // Track outcomes
    if (gameResult.homeScore > gameResult.awayScore) homeWins++;
    if (gameResult.awayScore > gameResult.homeScore) awayWins++;

    // Spread analysis
    const adjustedHomeScore = gameResult.homeScore + input.spread;
    if (adjustedHomeScore > gameResult.awayScore) spreadCovers++;

    // Over/Under analysis
    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > input.total) overs++;
  }

  // Calculate statistics
  const avgHomeScore = mean(homeScores);
  const avgAwayScore = mean(awayScores);
  const stdDev = standardDeviation([...homeScores, ...awayScores]);

  return {
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(avgHomeScore),
    predictedAwayScore: Math.round(avgAwayScore),
    confidenceIntervalLow: Math.round(avgHomeScore - BETTING_CONSTANTS.STATISTICAL_CONSTANTS.CONFIDENCE_INTERVAL_Z_SCORE * stdDev),
    confidenceIntervalHigh: Math.round(avgHomeScore + BETTING_CONSTANTS.STATISTICAL_CONSTANTS.CONFIDENCE_INTERVAL_Z_SCORE * stdDev),
    spreadCoverProbability: (spreadCovers / SIMULATION_ITERATIONS) * 100,
    overProbability: (overs / SIMULATION_ITERATIONS) * 100,
    underProbability: ((SIMULATION_ITERATIONS - overs) / SIMULATION_ITERATIONS) * 100,
    iterations: SIMULATION_ITERATIONS
  };
}

/**
 * Simulate a single game
 */
function simulateSingleGame(
  homeStats: TeamStats,
  awayStats: TeamStats
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  // Simulate each quarter
  for (let quarter = 0; quarter < QUARTERS_PER_GAME; quarter++) {
    // Home team possessions
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      homeScore += simulatePossession(homeStats, awayStats);
    }

    // Away team possessions
    for (let possession = 0; possession < POSSESSIONS_PER_QUARTER / 2; possession++) {
      awayScore += simulatePossession(awayStats, homeStats);
    }
  }

  return { homeScore, awayScore };
}

/**
 * Simulate a single possession
 * Returns points scored (0, 3, or 7)
 */
function simulatePossession(
  offenseStats: TeamStats,
  defenseStats: TeamStats
): number {
  // Calculate scoring probability based on team stats
  const offensiveStrength = calculateOffensiveStrength(offenseStats);
  const defensiveStrength = calculateDefensiveStrength(defenseStats);
  
  const scoringProbability = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  // Determine if possession results in points
  const roll = Math.random();
  
  if (roll > scoringProbability) {
    return 0; // No score (punt, turnover)
  }
  
  // Determine type of score based on red zone efficiency
  const redZoneRoll = Math.random() * 100;
  
  if (redZoneRoll < offenseStats.redZoneEfficiency) {
    return 7; // Touchdown
  } else if (redZoneRoll < offenseStats.redZoneEfficiency + BETTING_CONSTANTS.STATISTICAL_CONSTANTS.FIELD_GOAL_PROBABILITY_ADDITION) {
    return 3; // Field goal
  }
  
  return 0; // Missed opportunity
}

/**
 * Calculate offensive strength score
 */
function calculateOffensiveStrength(stats: TeamStats): number {
  return (
    stats.pointsPerGame * 2 +
    stats.offensiveYardsPerGame / 10 +
    stats.thirdDownConversionRate +
    stats.redZoneEfficiency +
    stats.turnoverDifferential * 5
  );
}

/**
 * Calculate defensive strength score
 */
function calculateDefensiveStrength(stats: TeamStats): number {
  return (
    (DEFENSIVE_STRENGTH_WEIGHTS.POINTS_ALLOWED_BASE - stats.pointsAllowedPerGame) * 2 +
    (DEFENSIVE_STRENGTH_WEIGHTS.YARDS_ALLOWED_BASE - stats.defensiveYardsAllowed) / 10 +
    (DEFENSIVE_STRENGTH_WEIGHTS.THIRD_DOWN_BASE - stats.thirdDownConversionRate) +
    (DEFENSIVE_STRENGTH_WEIGHTS.RED_ZONE_BASE - stats.redZoneEfficiency) -
    stats.turnoverDifferential * DEFENSIVE_STRENGTH_WEIGHTS.TURNOVER_MULTIPLIER
  );
}

/**
 * Generate betting recommendations from simulation results
 */
export function generateRecommendations(
  input: GamePredictionInput,
  simResult: SimulationResult
): BettingRecommendation {
  // Moneyline recommendation
  const moneylinePick = simResult.homeWinProbability > simResult.awayWinProbability
    ? input.homeTeam
    : input.awayTeam;
  
  const moneylineWinProb = Math.max(simResult.homeWinProbability, simResult.awayWinProbability);
  const moneylineConfidence = getConfidenceLevel(moneylineWinProb);

  // Spread recommendation
  const spreadPick = simResult.spreadCoverProbability > 50
    ? `${input.homeTeam} ${input.spread > 0 ? '+' : ''}${input.spread}`
    : `${input.awayTeam} ${-input.spread > 0 ? '+' : ''}${-input.spread}`;
  
  const spreadConfidence = getConfidenceLevel(
    Math.max(simResult.spreadCoverProbability, 100 - simResult.spreadCoverProbability)
  );

  // Over/Under recommendation
  const totalPick: 'Over' | 'Under' = simResult.overProbability > 50 ? 'Over' : 'Under';
  const totalProb = Math.max(simResult.overProbability, simResult.underProbability);
  const totalConfidence = getConfidenceLevel(totalProb);

  return {
    moneyline: {
      pick: moneylinePick,
      confidence: moneylineConfidence,
      winProbability: moneylineWinProb
    },
    spread: {
      pick: spreadPick,
      line: input.spread,
      confidence: spreadConfidence,
      coverProbability: simResult.spreadCoverProbability
    },
    total: {
      pick: totalPick,
      line: input.total,
      confidence: totalConfidence,
      probability: totalProb
    }
  };
}

/**
 * Convert probability to confidence level
 */
function getConfidenceLevel(probability: number): 'High' | 'Medium' | 'Low' {
  if (probability >= BETTING_CONSTANTS.CONFIDENCE_THRESHOLDS.HIGH) return 'High';
  if (probability >= BETTING_CONSTANTS.CONFIDENCE_THRESHOLDS.MEDIUM) return 'Medium';
  return 'Low';
}

/**
 * Calculate mean of array
 */
function mean(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(numbers: number[]): number {
  const avg = mean(numbers);
  const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}