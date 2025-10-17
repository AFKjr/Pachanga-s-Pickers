// supabase/functions/generate-predictions/lib/simulation/strength-calculator.ts
import type { TeamStats } from '../types.ts';

/**
 * Calculate offensive strength score (0-100 scale)
 * 
 * SCALING PHILOSOPHY:
 * - Average NFL team should score ~50
 * - Elite offenses (top 3): 70-80
 * - Bad offenses (bottom 3): 25-35
 * - This prevents over-confidence in predictions
 */
export function calculateOffensiveStrength(stats: TeamStats): number {
  // Passing component (weighted 40%)
  // Uses yards, efficiency, TDs, and turnovers
  const passingEfficiency = (
    stats.passingYards / 100 * 0.8 +           // 250 yards = 2.0
    stats.yardsPerPassAttempt * 2 +            // 7.5 YPA = 15.0
    stats.passCompletionPct / 10 +             // 65% = 6.5
    stats.passingTds * 2 -                     // 2 TDs = 4.0
    stats.interceptionsThrown * 3              // 1 INT = -3.0
  ) * 0.4;
  
  // Rushing component (weighted 30%)
  // Uses yards, efficiency, and TDs
  const rushingEfficiency = (
    stats.rushingYards / 50 * 0.5 +            // 120 yards = 1.2
    stats.yardsPerRush * 3 +                   // 4.5 YPR = 13.5
    stats.rushingTds * 2                       // 1 TD = 2.0
  ) * 0.3;
  
  // Overall efficiency (weighted 20%)
  // Uses yards per play, conversions, red zone
  const overallEfficiency = (
    stats.yardsPerPlay * 4 +                   // 5.5 YPP = 22.0
    stats.firstDowns / 5 +                     // 20 FD = 4.0
    stats.thirdDownConversionRate * 0.4 +      // 40% = 16.0
    stats.redZoneEfficiency * 0.5              // 60% = 30.0
  ) * 0.2;
  
  // Turnover impact (weighted 10%)
  // Punishes giveaways, rewards differential
  const turnoverImpact = (
    -stats.turnoversLost * 4 -                 // 1 TO = -4.0
    stats.fumblesLost * 3 +                    // 1 fumble = -3.0
    stats.turnoverDifferential * 2             // +1 diff = +2.0
  ) * 0.1;
  
  // Penalty impact (small negative factor)
  const penaltyImpact = -(stats.penaltyYards / 30);  // 60 yards = -2.0
  
  // Scoring component (direct output measure)
  // REDUCED from * 2 to * 0.5 to prevent domination
  const scoringComponent = stats.pointsPerGame * 0.5;  // 24 PPG = 12.0
  
  const rawStrength = Math.max(0, 
    passingEfficiency + 
    rushingEfficiency + 
    overallEfficiency + 
    turnoverImpact + 
    penaltyImpact +
    scoringComponent
  );
  
  // Normalize to 0-100 scale
  // Based on observed NFL ranges (15-85 raw becomes 0-100)
  const MINIMUM_EXPECTED_RAW = 15;
  const MAXIMUM_EXPECTED_RAW = 85;
  
  const normalized = ((rawStrength - MINIMUM_EXPECTED_RAW) / 
                     (MAXIMUM_EXPECTED_RAW - MINIMUM_EXPECTED_RAW)) * 100;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate defensive strength score (0-100 scale)
 * 
 * SCALING PHILOSOPHY:
 * - Average NFL defense should score ~50
 * - Elite defenses (top 3): 70-80
 * - Bad defenses (bottom 3): 25-35
 * - Higher score = better defense (prevents scoring)
 */
export function calculateDefensiveStrength(stats: TeamStats): number {
  // Pass defense component (weighted 40%)
  // Rewards limiting yards, TDs, completions
  const passDefense = (
    (280 - stats.defPassingYardsAllowed) / 40 +  // 220 yards = 1.5
    -stats.defPassingTdsAllowed * 2 +            // 2 TDs = -4.0
    stats.defInterceptions * 3 +                 // 1 INT = 3.0
    (stats.defPassAttempts > 0 ?
      (100 - (stats.defPassCompletionsAllowed / stats.defPassAttempts * 100)) / 8 
      : 0)                                       // 40% comp = 7.5
  ) * 0.4;
  
  // Rush defense component (weighted 30%)
  // Rewards limiting yards, TDs, yards per carry
  const rushDefense = (
    (150 - stats.defRushingYardsAllowed) / 30 +  // 100 yards = 1.67
    -stats.defRushingTdsAllowed * 2 +            // 1 TD = -2.0
    (stats.defRushingAttemptsAllowed > 0 ?
      (5.0 - (stats.defRushingYardsAllowed / stats.defRushingAttemptsAllowed)) * 4
      : 0)                                       // 3.8 YPC = 4.8
  ) * 0.3;
  
  // Overall defense efficiency (weighted 20%)
  // Uses yards per play, first downs, third down stops
  const overallDefense = (
    (7.0 - stats.defYardsPerPlayAllowed) * 4 +   // 5.0 YPP = 8.0
    -stats.defFirstDownsAllowed / 5 +            // 18 FD = -3.6
    (50 - stats.thirdDownConversionRate) * 0.4   // 35% = 6.0
  ) * 0.2;
  
  // Turnover creation (weighted 10%)
  // Rewards creating turnovers
  const turnoverCreation = (
    stats.turnoversForced * 4 +                  // 2 TO = 8.0
    stats.fumblesForced * 3 +                    // 1 fumble = 3.0
    stats.defInterceptions * 3                   // 1 INT = 3.0
  ) * 0.1;
  
  // Points allowed component (direct output measure)
  // REDUCED from * 2 to * 0.5 to prevent domination
  const pointsComponent = (45 - stats.pointsAllowedPerGame) * 0.5;  // 20 PA = 12.5
  
  const rawStrength = Math.max(0,
    passDefense +
    rushDefense +
    overallDefense +
    turnoverCreation +
    pointsComponent
  );
  
  // Normalize to 0-100 scale
  // Based on observed NFL ranges (15-85 raw becomes 0-100)
  const MINIMUM_EXPECTED_RAW = 15;
  const MAXIMUM_EXPECTED_RAW = 85;
  
  const normalized = ((rawStrength - MINIMUM_EXPECTED_RAW) / 
                     (MAXIMUM_EXPECTED_RAW - MINIMUM_EXPECTED_RAW)) * 100;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Helper function to calculate relative strength advantage
 * Returns a value between 0.3 and 0.7 representing scoring probability
 * 
 * Used in possession simulation to determine likelihood of scoring
 */
export function calculateRelativeAdvantage(
  offensiveStrength: number,
  defensiveStrength: number
): number {
  // Base calculation: offense vs total strength
  const raw = offensiveStrength / (offensiveStrength + defensiveStrength);
  
  // Apply STRONGER regression to mean (80% weight, was 85%)
  // Prevents extreme probabilities (pulls 0.70 toward 0.50 more aggressively)
  const REGRESSION_FACTOR = 0.80; // REDUCED from 0.85 to 0.80
  const regressed = (raw * REGRESSION_FACTOR) + (0.5 * (1 - REGRESSION_FACTOR));
  
  // Clamp to reasonable range (30% to 70% scoring probability per possession)
  return Math.max(0.30, Math.min(0.70, regressed));
}
