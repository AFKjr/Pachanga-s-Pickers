// api/lib/simulation/monte-carlo.ts
import type { TeamStats, GameWeather, SimulationResult } from '../types';
import { SIMULATION_ITERATIONS } from '../constants';
import { applyWeatherAdjustments } from '../weather/weather-adjustments';
import { calculateOffensiveStrength, calculateDefensiveStrength } from './strength-calculator';
import { simulatePossession } from './possession-simulator';

function simulateSingleGame(
  homeStats: TeamStats,
  awayStats: TeamStats,
  weather: GameWeather | null
): { homeScore: number; awayScore: number } {
  let homeScore = 0;
  let awayScore = 0;

  const homePossessions = Math.round(homeStats.drivesPerGame);
  const awayPossessions = Math.round(awayStats.drivesPerGame);
  const possessionsPerTeam = Math.round((homePossessions + awayPossessions) / 2);

  const homeWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    calculateOffensiveStrength(homeStats),
    calculateDefensiveStrength(awayStats),
    {
      passingYards: homeStats.passingYards,
      rushingYards: homeStats.rushingYards,
      yardsPerPlay: homeStats.yardsPerPlay
    }
  ) : null;

  const awayWeatherAdj = weather ? applyWeatherAdjustments(
    weather,
    calculateOffensiveStrength(awayStats),
    calculateDefensiveStrength(homeStats),
    {
      passingYards: awayStats.passingYards,
      rushingYards: awayStats.rushingYards,
      yardsPerPlay: awayStats.yardsPerPlay
    }
  ) : null;

  for (let possession = 0; possession < possessionsPerTeam; possession++) {
    homeScore += simulatePossession(homeStats, awayStats, homeWeatherAdj);
  }
  
  for (let possession = 0; possession < possessionsPerTeam; possession++) {
    awayScore += simulatePossession(awayStats, homeStats, awayWeatherAdj);
  }

  return { homeScore, awayScore };
}

export function runMonteCarloSimulation(
  homeStats: TeamStats,
  awayStats: TeamStats,
  spread: number,
  total: number,
  weather: GameWeather | null
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let spreadCovers = 0;
  let overs = 0;

  for (let iteration = 0; iteration < SIMULATION_ITERATIONS; iteration++) {
    const gameResult = simulateSingleGame(homeStats, awayStats, weather);
    
    homeScores.push(gameResult.homeScore);
    awayScores.push(gameResult.awayScore);

    if (gameResult.homeScore > gameResult.awayScore) homeWins++;
    if (gameResult.awayScore > gameResult.homeScore) awayWins++;

    const adjustedHomeScore = gameResult.homeScore + spread;
    if (adjustedHomeScore > gameResult.awayScore) spreadCovers++;

    const totalPoints = gameResult.homeScore + gameResult.awayScore;
    if (totalPoints > total) overs++;
  }

  const avgHomeScore = homeScores.reduce((acc, score) => acc + score, 0) / homeScores.length;
  const avgAwayScore = awayScores.reduce((acc, score) => acc + score, 0) / awayScores.length;

  return {
    homeWinProbability: (homeWins / SIMULATION_ITERATIONS) * 100,
    awayWinProbability: (awayWins / SIMULATION_ITERATIONS) * 100,
    predictedHomeScore: Math.round(avgHomeScore),
    predictedAwayScore: Math.round(avgAwayScore),
    spreadCoverProbability: (spreadCovers / SIMULATION_ITERATIONS) * 100,
    overProbability: (overs / SIMULATION_ITERATIONS) * 100,
    underProbability: ((SIMULATION_ITERATIONS - overs) / SIMULATION_ITERATIONS) * 100,
    iterations: SIMULATION_ITERATIONS
  };
}
