// api/lib/simulation/possession-simulator.ts
import type { TeamStats } from '../types.ts';
import type { WeatherAdjustmentResult } from '../weather/weather-adjustments.ts';
import { calculateOffensiveStrength, calculateDefensiveStrength } from './strength-calculator.ts';

export function simulatePossession(
  offenseStats: TeamStats,
  defenseStats: TeamStats,
  weatherAdjustment: WeatherAdjustmentResult | null
): number {
  const offensiveStrength = weatherAdjustment 
    ? weatherAdjustment.adjustedOffensiveStrength 
    : calculateOffensiveStrength(offenseStats);
    
  const defensiveStrength = weatherAdjustment
    ? weatherAdjustment.adjustedDefensiveStrength
    : calculateDefensiveStrength(defenseStats);
  
  const baseScoring = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  const turnoverChance = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  const turnoverRoll = Math.random();
  if (turnoverRoll < turnoverChance) return 0;
  
  const efficiencyModifier = (
    offenseStats.yardsPerPlay / (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed)
  );
  
  const scoringProbability = baseScoring * 0.7 + efficiencyModifier * 0.3;
  const scoreRoll = Math.random();
  
  if (scoreRoll > scoringProbability) return 0;
  
  const redZoneRoll = Math.random() * 100;
  const touchdownProbability = (
    offenseStats.redZoneEfficiency * 0.6 +
    (offenseStats.passingTds + offenseStats.rushingTds) * 5
  );
  
  if (redZoneRoll < touchdownProbability) return 7;
  
  const fieldGoalProbability = touchdownProbability + 35;
  if (redZoneRoll < fieldGoalProbability) return 3;
  
  return 0;
}
