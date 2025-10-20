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
 * Enhanced with fusion data for drive-level intelligence
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

  // === TURNOVER CHECK WITH ENHANCED VARIANCE ===
  // Use fusion drive metrics for more accurate turnover modeling
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / Math.max(offenseStats.totalPlays, 1)) * 0.6 +
    (defenseStats.turnoversForced / Math.max(defenseStats.defTotalPlays, 1)) * 0.4
  );

  // Add turnover variance (±40% variance on turnover rate)
  const turnoverVariance = 0.80 + (Math.random() * 0.40); // 0.80 to 1.20
  const adjustedTurnoverChance = baseTurnoverRate * turnoverVariance;

  if (Math.random() < adjustedTurnoverChance) {
    return 0; // Turnover ends possession
  }

  // === EFFICIENCY MODIFIER WITH FUSION DATA ===
  // Enhanced with drive scoring percentage and third down efficiency
  const baseEfficiency = (
    offenseStats.driveScoringPct / 100 * 0.4 +           // Drive scoring success
    (100 - offenseStats.thirdDownConversions) / 100 * 0.3 + // Third down efficiency
    offenseStats.expectedPointsOffense / 3.0 * 0.3         // Expected points per drive
  );

  // Add execution variance (±15%)
  const efficiencyVariance = 0.90 + (Math.random() * 0.20); // 0.90 to 1.10
  const adjustedEfficiency = Math.min(0.85, baseEfficiency * efficiencyVariance);

  // Combine with MORE weight on variance for unpredictability
  const scoringProbability = (baseScoring * 0.60) + (adjustedEfficiency * 0.40);

  // === SCORING ATTEMPT ===
  if (Math.random() > scoringProbability) {
    return 0; // Drive stalls
  }

  // === TD vs FG WITH FUSION DATA ===
  // Use red zone scoring percentage and field goal accuracy from fusion
  const baseRedZone = (offenseStats.defRedZoneAttempts || 0) > 0 ?
    ((offenseStats.defRedZoneTouchdowns || 0) / (offenseStats.defRedZoneAttempts || 1)) : 0.5;
  const fieldGoalAccuracy = (offenseStats.defFieldGoalAttempts || 0) > 0 ?
    ((offenseStats.defFieldGoalsMade || 0) / (offenseStats.defFieldGoalAttempts || 1)) : 0.8;

  // Base TD probability weighted toward red zone success
  const baseTDProb = (baseRedZone * 0.7) + (fieldGoalAccuracy * 0.3);

  // Add red zone variance (±20%)
  const redZoneVariance = 0.85 + (Math.random() * 0.30); // 0.85 to 1.15
  const adjustedTDProb = Math.min(0.95, baseTDProb * redZoneVariance);

  const redZoneRoll = Math.random() * 100;

  // Touchdown - use two-point conversion rate from fusion
  if (redZoneRoll < adjustedTDProb) {
    const twoPointRate = (offenseStats.twoPointConversions || 0) / Math.max((offenseStats.twoPointConversions || 0) + (offenseStats.totalTds || 1), 1);
    const specialEvents = Math.random();
    if (specialEvents < twoPointRate) return 8;  // 2-pt conversion
    if (specialEvents < 0.04) return 6;  // Missed XP (conservative estimate)
    return 7;  // Normal TD
  }

  // Field Goal attempt - use actual field goal percentage
  const fieldGoalRange = adjustedTDProb + (fieldGoalAccuracy * 35);

  if (redZoneRoll < fieldGoalRange) {
    // Use actual field goal miss rate from fusion data
    const fgMissRate = 1 - fieldGoalAccuracy;
    const fgRoll = Math.random();
    if (fgRoll < fgMissRate) return 0;  // Missed FG
    if (fgRoll < fgMissRate + 0.02) return 0;  // Blocked FG (small chance)
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

  // Estimate yards with fusion data - use expected points and drive efficiency
  const baseYards = (offenseStats.expectedPointsOffense * 8) + (offenseStats.driveScoringPct * 2);
  const yardsVariance = Math.floor(Math.random() * 50) - 25; // ±25 yards
  const yards = Math.max(0, Math.round(baseYards + yardsVariance));

  // Turnover check with enhanced fusion metrics
  const baseTurnoverRate = (
    (offenseStats.turnoversLost / Math.max(offenseStats.totalPlays, 1)) * 0.6 +
    (defenseStats.turnoversForced / Math.max(defenseStats.defTotalPlays, 1)) * 0.4
  );

  const turnoverVariance = 0.85 + (Math.random() * 0.30);
  if (Math.random() < baseTurnoverRate * turnoverVariance) {
    return { points: 0, outcome: 'turnover', yards };
  }

  // Efficiency check with fusion drive metrics
  const baseEfficiency = (
    offenseStats.driveScoringPct / 100 * 0.4 +
    (100 - offenseStats.thirdDownConversions) / 100 * 0.3 +
    offenseStats.expectedPointsOffense / 3.0 * 0.3
  );
  const efficiencyVariance = 0.90 + (Math.random() * 0.20);
  const scoringProbability = (baseScoring * 0.60) + (baseEfficiency * efficiencyVariance * 0.40);

  if (Math.random() > scoringProbability) {
    const outcome = yards > 40 ? 'downs' : 'punt';
    return { points: 0, outcome, yards };
  }

  // Red zone with fusion data
  const baseRedZone = (offenseStats.defRedZoneAttempts || 0) > 0 ?
    ((offenseStats.defRedZoneTouchdowns || 0) / (offenseStats.defRedZoneAttempts || 1)) : 0.5;
  const fieldGoalAccuracy = (offenseStats.defFieldGoalAttempts || 0) > 0 ?
    ((offenseStats.defFieldGoalsMade || 0) / (offenseStats.defFieldGoalAttempts || 1)) : 0.8;
  const baseTDProb = (baseRedZone * 0.7) + (fieldGoalAccuracy * 0.3);
  const redZoneVariance = 0.85 + (Math.random() * 0.30);
  const adjustedTDProb = Math.min(0.95, baseTDProb * redZoneVariance);

  const redZoneRoll = Math.random() * 100;

  if (redZoneRoll < adjustedTDProb) {
    const twoPointRate = (offenseStats.twoPointConversions || 0) / Math.max((offenseStats.twoPointConversions || 0) + (offenseStats.totalTds || 1), 1);
    const points = Math.random() < twoPointRate ? 8 :
                  Math.random() < 0.02 ? 6 : 7;
    return { points, outcome: 'touchdown', yards: yards + 20 };
  }

  if (redZoneRoll < adjustedTDProb + (fieldGoalAccuracy * 35)) {
    if (Math.random() < (1 - fieldGoalAccuracy)) {
      return { points: 0, outcome: 'missed_fg', yards };
    }
    return { points: 3, outcome: 'fieldgoal', yards };
  }

  return { points: 0, outcome: 'downs', yards };
}
