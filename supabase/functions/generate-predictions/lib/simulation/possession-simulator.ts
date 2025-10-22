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
  // Remove expensive debug logging in production
  // console.log('🔍 RED ZONE DEBUG:', { ... });

  const offensiveStrength = weatherAdjustment
    ? weatherAdjustment.adjustedOffensiveStrength
    : calculateOffensiveStrength(offenseStats);

  const defensiveStrength = weatherAdjustment
    ? weatherAdjustment.adjustedDefensiveStrength
    : calculateDefensiveStrength(defenseStats);

  // Base scoring probability (already regressed in calculateRelativeAdvantage)
  const baseScoring = calculateRelativeAdvantage(offensiveStrength, defensiveStrength);

  // === TURNOVER CHECK WITH SIMPLIFIED VARIANCE ===
  // Simplified turnover calculation to reduce computation
  const baseTurnoverRate = Math.min(0.15, Math.max(0.05,
    (offenseStats.turnoversLost / Math.max(offenseStats.totalPlays, 1)) * 0.6 +
    (defenseStats.turnoversForced / Math.max(defenseStats.defTotalPlays, 1)) * 0.4
  ));

  // Single random call for turnover check with simplified variance
  if (Math.random() < baseTurnoverRate * (0.8 + Math.random() * 0.4)) {
    return 0; // Turnover ends possession
  }

  // === SIMPLIFIED EFFICIENCY MODIFIER ===
  // Combine multiple factors into single calculation
  const efficiencyScore = (
    (offenseStats.driveScoringPct || 40) / 100 * 0.4 +
    (offenseStats.thirdDownConversionRate || 40) / 100 * 0.3 +
    Math.min(1.0, (offenseStats.expectedPointsOffense || 15) / 20) * 0.3
  );

  // Simplified scoring probability with reduced variance
  const scoringProbability = Math.min(0.65, (baseScoring * 0.6) + (efficiencyScore * 0.4));

  // === SCORING ATTEMPT ===
  if (Math.random() > scoringProbability) {
    return 0; // Drive stalls
  }

  // === TD vs FG WITH SIMPLIFIED CALCULATION ===
  const redZoneEfficiency = offenseStats.redZoneEfficiency || 55;
  const fieldGoalAccuracy = offenseStats.fieldGoalPct || 83;

  // Simplified TD probability - adjusted to favor more FGs for lower scores
  const tdProbability = Math.min(0.85, (redZoneEfficiency / 100 * 0.6) + (fieldGoalAccuracy / 100 * 0.4));

  // Single random roll for scoring type
  if (Math.random() < tdProbability) {
    // Touchdown - simplified extra point logic
    return Math.random() < 0.03 ? 6 : 7;  // 3% chance of missed XP
  }

  // Field Goal - simplified accuracy
  return Math.random() < (fieldGoalAccuracy / 100) ? 3 : 0;
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
  const baseRedZone = offenseStats.redZoneEfficiency 
    ? offenseStats.redZoneEfficiency / 100  // Convert percentage to decimal
    : 0.50;  // Fallback if missing
  const fieldGoalAccuracy = (offenseStats.defFieldGoalAttempts || 0) > 0 ?
    ((offenseStats.defFieldGoalsMade || 0) / (offenseStats.defFieldGoalAttempts || 1)) : 0.8;
  const baseTDProb = (baseRedZone * 0.7) + (fieldGoalAccuracy * 0.3);
  const redZoneVariance = 0.85 + (Math.random() * 0.30);
  const adjustedTDProb = Math.min(0.95, baseTDProb * redZoneVariance);

  const redZoneRoll = Math.random();  // ✅ 0-1 decimal

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
