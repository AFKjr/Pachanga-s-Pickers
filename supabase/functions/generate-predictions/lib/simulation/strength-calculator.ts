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
  // Passing component (weighted 40%) - ENHANCED with fusion data
  const passingEfficiency = (
    stats.passingYards / 100 * 0.8 +           // 250 yards = 2.0
    stats.yardsPerPassAttempt * 2 +            // 7.5 YPA = 15.0
    stats.passCompletionPct / 10 +             // 65% = 6.5
    stats.passingTds * 2 -                     // 2 TDs = 4.0
    stats.interceptionsThrown * 3 +            // 1 INT = -3.0
    (stats.expectedPointsOffense || 15) * 0.1  // Expected points bonus
  ) * 0.4;
  
  // Rushing component (weighted 30%) - ENHANCED with fusion data
  const rushingEfficiency = (
    stats.rushingYards / 50 * 0.5 +            // 120 yards = 1.2
    stats.yardsPerRush * 3 +                   // 4.5 YPR = 13.5
    stats.rushingTds * 2 +                     // 1 TD = 2.0
    (stats.rushFirstDowns || 6.8) * 0.5        // Rushing first downs
  ) * 0.3;
  
  // Overall efficiency (weighted 20%) - ENHANCED with situational data
  const overallEfficiency = (
    stats.yardsPerPlay * 4 +                   // 5.5 YPP = 22.0
    stats.firstDowns / 5 +                     // 20 FD = 4.0
    (stats.thirdDownConversions || 5) / (stats.thirdDownAttempts || 12.5) * 40 + // Real 3rd down %
    (stats.redZoneTouchdowns || 2.3) / (stats.redZoneAttempts || 4.2) * 50 +     // Real red zone %
    (stats.driveScoringPct || 40) * 0.1        // Drive scoring %
  ) * 0.2;
  
  // Turnover impact (weighted 10%) - ENHANCED with detailed TO data
  const turnoverImpact = (
    -stats.turnoversLost * 4 -                 // 1 TO = -4.0
    stats.fumblesLost * 3 +                    // 1 fumble = -3.0
    stats.turnoverDifferential * 2 +           // +1 diff = +2.0
    (stats.driveTurnoverPct || 8.5) * -0.2     // Drive TO penalty
  ) * 0.1;
  
  // Special teams impact (weighted 5%) - NEW from fusion data
  const specialTeamsImpact = (
    (stats.fieldGoalPct || 83.3) * 0.1 +       // FG% bonus
    (stats.touchbackPct || 28.6) * 0.05 +      // Kickoff control
    (stats.puntNetYardsPerPunt || 40) * 0.1 +  // Punting efficiency
    (stats.allPurposeYards || 45.2) * 0.02     // Return game
  ) * 0.05;
  
  // Penalty impact (small negative factor)
  const penaltyImpact = -(stats.penaltyYards / 30);  // 60 yards = -2.0
  
  // Scoring component (direct output measure) - REDUCED weight
  const scoringComponent = stats.pointsPerGame * 0.4;  // 24 PPG = 9.6
  
  const rawStrength = Math.max(0, 
    passingEfficiency + 
    rushingEfficiency + 
    overallEfficiency + 
    turnoverImpact + 
    specialTeamsImpact +
    penaltyImpact +
    scoringComponent
  );
  
  // Normalize to 0-100 scale
  const MINIMUM_EXPECTED_RAW = 15;
  const MAXIMUM_EXPECTED_RAW = 85;
  
  const normalized = ((rawStrength - MINIMUM_EXPECTED_RAW) / 
                     (MAXIMUM_EXPECTED_RAW - MINIMUM_EXPECTED_RAW)) * 100;
  
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
  // Pass rush component (weighted 25%) - NEW: Uses fusion pass rush metrics
  // Rewards QB pressure, hits, hurries, and blitz effectiveness
  const passRush = (
    (stats.qbHurries || 0) * 2 +                    // 2 hurries = 4.0
    (stats.qbHits || 0) * 1.5 +                     // 3 hits = 4.5
    (stats.blitzPct || 0) * 0.3                     // 25% blitz = 7.5
  ) * 0.25;

  // Pass defense component (weighted 25%) - Enhanced with situational data
  // Rewards limiting yards, TDs, completions, and third down stops
  const passDefense = (
    (280 - stats.defPassingYardsAllowed) / 40 +  // 220 yards = 1.5
    -stats.defPassingTdsAllowed * 2 +            // 2 TDs = -4.0
    stats.defInterceptions * 3 +                 // 1 INT = 3.0
    (stats.defPassAttempts > 0 ?
      (100 - (stats.defPassCompletionsAllowed / stats.defPassAttempts * 100)) / 8
      : 0) +                                     // 40% comp = 7.5
    (50 - stats.defThirdDownConversions) * 0.2   // 35% = 3.0 (situational)
  ) * 0.25;

  // Rush defense component (weighted 20%) - Enhanced with stuff metrics
  // Rewards limiting yards, TDs, yards per carry, and defensive line pressure
  const rushDefense = (
    (150 - stats.defRushingYardsAllowed) / 30 +  // 100 yards = 1.67
    -stats.defRushingTdsAllowed * 2 +            // 1 TD = -2.0
    (stats.defRushingAttemptsAllowed > 0 ?
      (5.0 - (stats.defRushingYardsAllowed / stats.defRushingAttemptsAllowed)) * 4
      : 0)                                       // 3.8 YPC = 4.8
  ) * 0.20;

  // Drive efficiency defense (weighted 15%) - NEW: Fusion drive metrics
  // Rewards preventing scoring drives and red zone TDs
  const driveEfficiency = (
    (100 - (stats.defDriveScoringPct || 0)) * 0.4 +     // 25% = 30.0
    ((stats.defRedZoneAttempts || 0) > 0 ? 
      (100 - ((stats.defRedZoneTouchdowns || 0) / (stats.defRedZoneAttempts || 1)) * 100) * 0.3 : 0) +   // Red zone defense
    ((stats.defTotalDrives || 0) > 0 ? 
      ((stats.defTotalDrives || 0) - ((stats.defDriveScoringPct || 0) / 100 * (stats.defTotalDrives || 0))) / (stats.defTotalDrives || 0) * 20 : 0)
  ) * 0.15;

  // Special teams defense (weighted 10%) - NEW: Fusion special teams metrics
  // Rewards limiting return yards and field position
  const specialTeamsDefense = (
    (25 - (stats.defKickReturnYards || 0) / 10) +   // 200 yards = -15.0
    (15 - (stats.defPuntReturnYards || 0) / 10) +   // 100 yards = -10.0
    ((stats.defKickReturnTds || 0) > 0 ? -(stats.defKickReturnTds || 0) * 5 : 2) +
    ((stats.defPuntReturnTds || 0) > 0 ? -(stats.defPuntReturnTds || 0) * 5 : 2)
  ) * 0.10;

  // Turnover creation (weighted 5%) - Enhanced with fumble metrics
  // Rewards creating turnovers and defensive takeaways
  const turnoverCreation = (
    stats.turnoversForced * 4 +                  // 2 TO = 8.0
    stats.fumblesForced * 3 +                    // 1 fumble = 3.0
    stats.defInterceptions * 3                   // 1 INT = 3.0
  ) * 0.05;

  const rawStrength = Math.max(0,
    passRush +
    passDefense +
    rushDefense +
    driveEfficiency +
    specialTeamsDefense +
    turnoverCreation
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
