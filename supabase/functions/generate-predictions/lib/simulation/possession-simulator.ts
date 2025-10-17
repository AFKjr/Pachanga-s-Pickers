// supabase/functions/generate-predictions/lib/simulation/possession-simulator.ts
import type { TeamStats } from '../types.ts';
import type { WeatherAdjustmentResult } from '../weather/weather-adjustments.ts';
import { 
  calculateOffensiveStrength, 
  calculateDefensiveStrength,
  calculateRelativeAdvantage 
} from './strength-calculator.ts';

/**
 * Simulate a single possession with multiple layers of variance
 */
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
  
  // Base scoring probability (already regressed in calculateRelativeAdvantage)
  const baseScoring = calculateRelativeAdvantage(offensiveStrength, defensiveStrength);
  
  // === TURNOVER CHECK WITH VARIANCE ===
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  // Add turnover variance (some games have more, some less)
  // INCREASED: ±40% variance on turnover rate (was ±30%)
  const turnoverVariance = 0.80 + (Math.random() * 0.40); // 0.80 to 1.20
  const adjustedTurnoverChance = baseTurnoverRate * turnoverVariance;
  
  if (Math.random() < adjustedTurnoverChance) {
    return 0; // Turnover ends possession
  }
  
  // === EFFICIENCY MODIFIER WITH VARIANCE ===
  const baseEfficiency = offenseStats.yardsPerPlay / 
                        (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed);
  
  // Add execution variance (±15%)
  // Accounts for: play-calling, execution, momentum
  const efficiencyVariance = 0.90 + (Math.random() * 0.20); // 0.90 to 1.10
  const adjustedEfficiency = Math.min(0.85, baseEfficiency * efficiencyVariance);
  
  // Combine with MORE weight on variance
  // This makes individual drives less predictable
  const scoringProbability = (baseScoring * 0.65) + (adjustedEfficiency * 0.35);
  
  // === SCORING ATTEMPT ===
  if (Math.random() > scoringProbability) {
    return 0; // Drive stalls
  }
  
  // === TD vs FG WITH INCREASED VARIANCE ===
  const baseRedZone = offenseStats.redZoneEfficiency;
  const seasonalTDRate = (offenseStats.passingTds + offenseStats.rushingTds) * 1.2;
  
  // Base TD probability
  const baseTDProb = (baseRedZone * 0.8) + (seasonalTDRate * 0.2);
  
  // Add red zone variance (±20%)
  // Some drives execute perfectly, others struggle
  const redZoneVariance = 0.85 + (Math.random() * 0.30); // 0.85 to 1.15
  const adjustedTDProb = baseTDProb * redZoneVariance;
  
  const redZoneRoll = Math.random() * 100;
  
  // Touchdown
  if (redZoneRoll < adjustedTDProb) {
    // Small chance of 2-point conversion (2%) or missed XP (2%)
    const specialEvents = Math.random();
    if (specialEvents < 0.02) return 8;  // 2-pt conversion
    if (specialEvents < 0.04) return 6;  // Missed XP
    return 7;  // Normal TD
  }
  
  // Field Goal attempt
  const fieldGoalRange = adjustedTDProb + 35;
  
  if (redZoneRoll < fieldGoalRange) {
    // Small chance of missed FG (8%) or blocked FG (2%)
    const fgRoll = Math.random();
    if (fgRoll < 0.08) return 0;  // Missed FG
    if (fgRoll < 0.10) return 0;  // Blocked FG
    return 3;  // Made FG
  }
  
  // Drive reached scoring territory but failed
  return 0;
}

/**
 * Advanced possession simulator with drive outcomes
 * (Optional - for more detailed simulation)
 */
export interface DriveOutcome {
  points: number;
  outcome: 'touchdown' | 'fieldgoal' | 'turnover' | 'punt' | 'downs' | 'missed_fg';
  yards: number;
}

export function simulatePossessionDetailed(
  offenseStats: TeamStats,
  defenseStats: TeamStats,
  weatherAdjustment: WeatherAdjustmentResult | null
): DriveOutcome {
  const offensiveStrength = weatherAdjustment 
    ? weatherAdjustment.adjustedOffensiveStrength 
    : calculateOffensiveStrength(offenseStats);
    
  const defensiveStrength = weatherAdjustment
    ? weatherAdjustment.adjustedDefensiveStrength
    : calculateDefensiveStrength(defenseStats);
  
  const baseScoring = calculateRelativeAdvantage(offensiveStrength, defensiveStrength);
  
  // Estimate yards with MORE variance
  const baseYards = (offenseStats.yardsPerPlay * 10) * (baseScoring / 0.5);
  const yardsVariance = Math.floor(Math.random() * 50) - 25; // ±25 yards (was ±15)
  const yards = Math.max(0, Math.round(baseYards + yardsVariance));
  
  // Turnover check with variance
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / offenseStats.totalPlays) +
    (defenseStats.turnoversForced / defenseStats.defTotalPlays)
  ) / 2;
  
  const turnoverVariance = 0.85 + (Math.random() * 0.30);
  if (Math.random() < baseTurnoverRate * turnoverVariance) {
    return { points: 0, outcome: 'turnover', yards };
  }
  
  // Efficiency check with variance
  const baseEfficiency = offenseStats.yardsPerPlay / 
                        (offenseStats.yardsPerPlay + defenseStats.defYardsPerPlayAllowed);
  const efficiencyVariance = 0.90 + (Math.random() * 0.20);
  const scoringProbability = (baseScoring * 0.65) + (baseEfficiency * efficiencyVariance * 0.35);
  
  if (Math.random() > scoringProbability) {
    const outcome = yards > 40 ? 'downs' : 'punt';
    return { points: 0, outcome, yards };
  }
  
  // Red zone with variance
  const baseRedZone = offenseStats.redZoneEfficiency;
  const seasonalTDRate = (offenseStats.passingTds + offenseStats.rushingTds) * 1.2;
  const baseTDProb = (baseRedZone * 0.8) + (seasonalTDRate * 0.2);
  const redZoneVariance = 0.85 + (Math.random() * 0.30);
  const adjustedTDProb = baseTDProb * redZoneVariance;
  
  const redZoneRoll = Math.random() * 100;
  
  if (redZoneRoll < adjustedTDProb) {
    const points = Math.random() < 0.02 ? 8 : Math.random() < 0.02 ? 6 : 7;
    return { points, outcome: 'touchdown', yards: yards + 20 };
  }
  
  if (redZoneRoll < adjustedTDProb + 35) {
    if (Math.random() < 0.10) {
      return { points: 0, outcome: 'missed_fg', yards };
    }
    return { points: 3, outcome: 'fieldgoal', yards };
  }
  
  return { points: 0, outcome: 'downs', yards };
}
