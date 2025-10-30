/**
 * Enhanced Injury Integration for Monte Carlo Simulation
 *
 * This module enhances your existing injury impact system by:
 * 1. Separating offensive and defensive injury impacts
 * 2. Applying position-specific multipliers
 * 3. Integrating directly with strength calculations
 */

import type { TeamStats } from '../types.ts';

// Import your existing injury impact types
interface InjuryImpact {
  total_impact_points: number;
  individual_impacts: Array<{
    playerName: string;
    position: string;
    baseValue: number;
    backupDifferential: number;
    practiceStatus: string;
    statusMultiplier: number;
    impactPoints: number;
  }>;
  cluster_multipliers: Record<string, number>;
}

// Position categories for targeted adjustments
const OFFENSIVE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'T', 'G', 'C', 'FB'];
const DEFENSIVE_POSITIONS = ['DE', 'DT', 'NT', 'LB', 'OLB', 'ILB', 'CB', 'S', 'FS', 'SS'];

// Position-specific impact multipliers on team performance
const POSITION_IMPACT_MULTIPLIERS = {
  // Offense - how much each position impacts offensive efficiency
  QB: {
    offensive: 0.08,     // QB injury reduces offense by 8% per impact point
    passing: 0.12,       // Extra impact on passing stats
    rushing: 0.03        // Some impact on rushing (QB runs, defensive attention)
  },
  WR: {
    offensive: 0.04,
    passing: 0.06,
    rushing: 0.01
  },
  TE: {
    offensive: 0.04,
    passing: 0.05,
    rushing: 0.02        // TEs help in run blocking
  },
  RB: {
    offensive: 0.04,
    passing: 0.02,       // Pass protection and receiving
    rushing: 0.06
  },
  T: {                   // Tackles (offensive line)
    offensive: 0.05,
    passing: 0.06,       // Protect QB
    rushing: 0.04
  },
  G: {                   // Guards
    offensive: 0.04,
    passing: 0.03,
    rushing: 0.05        // Guards key for run game
  },
  C: {                   // Center
    offensive: 0.045,
    passing: 0.04,
    rushing: 0.045
  },

  // Defense - how much each position impacts defensive efficiency
  DE: {
    defensive: 0.05,
    passDefense: 0.06,   // Pass rush
    runDefense: 0.04
  },
  DT: {
    defensive: 0.04,
    passDefense: 0.03,
    runDefense: 0.05     // Interior run defense
  },
  LB: {
    defensive: 0.045,
    passDefense: 0.03,
    runDefense: 0.05
  },
  CB: {
    defensive: 0.045,
    passDefense: 0.06,   // Coverage
    runDefense: 0.02
  },
  S: {                   // Safety
    defensive: 0.04,
    passDefense: 0.04,
    runDefense: 0.03
  }
};

/**
 * Separates injury impacts into offensive and defensive categories
 */
function separateInjuryImpacts(injuryImpact: InjuryImpact | null) {
  if (!injuryImpact || injuryImpact.total_impact_points === 0) {
    return {
      offensiveImpacts: [],
      defensiveImpacts: [],
      totalOffensiveImpact: 0,
      totalDefensiveImpact: 0
    };
  }

  const offensiveImpacts = injuryImpact.individual_impacts.filter(impact =>
    OFFENSIVE_POSITIONS.includes(impact.position)
  );

  const defensiveImpacts = injuryImpact.individual_impacts.filter(impact =>
    DEFENSIVE_POSITIONS.includes(impact.position)
  );

  const totalOffensiveImpact = offensiveImpacts.reduce(
    (sum, impact) => sum + impact.impactPoints,
    0
  );

  const totalDefensiveImpact = defensiveImpacts.reduce(
    (sum, impact) => sum + impact.impactPoints,
    0
  );

  return {
    offensiveImpacts,
    defensiveImpacts,
    totalOffensiveImpact,
    totalDefensiveImpact
  };
}

/**
 * Calculate position-specific offensive impact multiplier
 */
function calculateOffensiveImpactMultiplier(
  offensiveImpacts: Array<{ position: string; impactPoints: number }>
): {
  generalMultiplier: number;
  passingMultiplier: number;
  rushingMultiplier: number;
} {
  let generalImpact = 0;
  let passingImpact = 0;
  let rushingImpact = 0;

  for (const injury of offensiveImpacts) {
    const multipliers = POSITION_IMPACT_MULTIPLIERS[injury.position as keyof typeof POSITION_IMPACT_MULTIPLIERS];

    if (multipliers && 'offensive' in multipliers) {
      generalImpact += injury.impactPoints * multipliers.offensive;
      passingImpact += injury.impactPoints * multipliers.passing;
      rushingImpact += injury.impactPoints * multipliers.rushing;
    }
  }

  // Cap maximum impact at 50% reduction
  return {
    generalMultiplier: Math.min(generalImpact, 0.5),
    passingMultiplier: Math.min(passingImpact, 0.6),
    rushingMultiplier: Math.min(rushingImpact, 0.5)
  };
}

/**
 * Calculate position-specific defensive impact multiplier
 */
function calculateDefensiveImpactMultiplier(
  defensiveImpacts: Array<{ position: string; impactPoints: number }>
): {
  generalMultiplier: number;
  passDefenseMultiplier: number;
  runDefenseMultiplier: number;
} {
  let generalImpact = 0;
  let passDefenseImpact = 0;
  let runDefenseImpact = 0;

  for (const injury of defensiveImpacts) {
    const multipliers = POSITION_IMPACT_MULTIPLIERS[injury.position as keyof typeof POSITION_IMPACT_MULTIPLIERS];

    if (multipliers && 'defensive' in multipliers) {
      generalImpact += injury.impactPoints * multipliers.defensive;
      passDefenseImpact += injury.impactPoints * multipliers.passDefense;
      runDefenseImpact += injury.impactPoints * multipliers.runDefense;
    }
  }

  // Cap maximum impact at 40% reduction for defense
  return {
    generalMultiplier: Math.min(generalImpact, 0.4),
    passDefenseMultiplier: Math.min(passDefenseImpact, 0.5),
    runDefenseMultiplier: Math.min(runDefenseImpact, 0.4)
  };
}

/**
 * ENHANCED: Apply injury adjustments with position-specific impacts
 *
 * This replaces the simple applyInjuryAdjustments function in your code
 */
export function applyEnhancedInjuryAdjustments(
  teamStats: any,
  injuryImpact: InjuryImpact | null,
  isHomeTeam: boolean
): any {
  if (!injuryImpact || injuryImpact.total_impact_points === 0) {
    return teamStats;
  }

  // Separate offensive and defensive injuries
  const {
    offensiveImpacts,
    defensiveImpacts,
    totalOffensiveImpact,
    totalDefensiveImpact
  } = separateInjuryImpacts(injuryImpact);

  console.log(`🏥 ${teamStats.team} injury breakdown:`, {
    totalImpact: injuryImpact.total_impact_points,
    offensiveImpact: totalOffensiveImpact,
    defensiveImpact: totalDefensiveImpact,
    offensiveCount: offensiveImpacts.length,
    defensiveCount: defensiveImpacts.length
  });

  // Create a copy to avoid mutating original
  const adjustedStats = { ...teamStats };

  // === APPLY OFFENSIVE INJURY ADJUSTMENTS ===
  if (offensiveImpacts.length > 0) {
    const offensiveMultipliers = calculateOffensiveImpactMultiplier(offensiveImpacts);

    // Log detailed offensive impacts
    console.log(`  ⚔️ Offensive adjustments:`, {
      general: `${(offensiveMultipliers.generalMultiplier * 100).toFixed(1)}%`,
      passing: `${(offensiveMultipliers.passingMultiplier * 100).toFixed(1)}%`,
      rushing: `${(offensiveMultipliers.rushingMultiplier * 100).toFixed(1)}%`
    });

    // Apply general offensive reduction
    adjustedStats.points_per_game *= (1 - offensiveMultipliers.generalMultiplier);
    adjustedStats.offensive_yards_per_game *= (1 - offensiveMultipliers.generalMultiplier);
    adjustedStats.yards_per_play *= (1 - offensiveMultipliers.generalMultiplier);

    // Apply passing-specific reductions
    adjustedStats.passing_yards_per_game *= (1 - offensiveMultipliers.passingMultiplier);
    adjustedStats.yards_per_pass_attempt *= (1 - offensiveMultipliers.passingMultiplier);
    adjustedStats.pass_completion_pct *= (1 - offensiveMultipliers.passingMultiplier * 0.5); // Less severe

    // Apply rushing-specific reductions
    adjustedStats.rushing_yards_per_game *= (1 - offensiveMultipliers.rushingMultiplier);
    adjustedStats.yards_per_rush *= (1 - offensiveMultipliers.rushingMultiplier);

    // Situational stats are also affected
    adjustedStats.third_down_conversion_rate *= (1 - offensiveMultipliers.generalMultiplier * 0.8);
    adjustedStats.red_zone_efficiency *= (1 - offensiveMultipliers.generalMultiplier * 0.7);

    // Drives may be slightly affected (injuries can lead to more 3-and-outs)
    adjustedStats.drives_per_game *= (1 - offensiveMultipliers.generalMultiplier * 0.3);
  }

  // === APPLY DEFENSIVE INJURY ADJUSTMENTS ===
  if (defensiveImpacts.length > 0) {
    const defensiveMultipliers = calculateDefensiveImpactMultiplier(defensiveImpacts);

    console.log(`  🛡️ Defensive adjustments:`, {
      general: `${(defensiveMultipliers.generalMultiplier * 100).toFixed(1)}%`,
      passDefense: `${(defensiveMultipliers.passDefenseMultiplier * 100).toFixed(1)}%`,
      runDefense: `${(defensiveMultipliers.runDefenseMultiplier * 100).toFixed(1)}%`
    });

    // Defensive injuries make defense WORSE (allows more)
    // So we INCREASE yards/points allowed
    const inverseGeneral = 1 + defensiveMultipliers.generalMultiplier;
    const inversePass = 1 + defensiveMultipliers.passDefenseMultiplier;
    const inverseRun = 1 + defensiveMultipliers.runDefenseMultiplier;

    adjustedStats.points_allowed_per_game *= inverseGeneral;
    adjustedStats.defensive_yards_per_game *= inverseGeneral;
    adjustedStats.yards_per_play_allowed *= inverseGeneral;

    // Pass defense specific
    adjustedStats.def_passing_yards_allowed *= inversePass;
    adjustedStats.def_net_yards_per_pass *= inversePass;

    // Run defense specific
    adjustedStats.def_rushing_yards_allowed *= inverseRun;
    adjustedStats.def_yards_per_rush_allowed *= inverseRun;

    // Turnovers may be affected (injured players make fewer plays)
    if (adjustedStats.def_interceptions) {
      adjustedStats.def_interceptions *= (1 - defensiveMultipliers.generalMultiplier * 0.5);
    }
  }

  // === ACCOUNT FOR CLUSTER EFFECTS ===
  // Cluster multipliers are already baked into individual impact points,
  // but we can apply an additional variance increase for uncertainty
  const clusterCount = Object.keys(injuryImpact.cluster_multipliers || {}).length;
  if (clusterCount > 0) {
    console.log(`  🔗 Cluster effects detected: ${clusterCount} position groups affected`);

    // Cluster injuries create more variance/unpredictability
    // This is handled in the Monte Carlo variance, but we note it here
  }

  console.log(`✅ ${teamStats.team} adjusted stats applied (${injuryImpact.total_impact_points.toFixed(1)} total impact points)`);

  return adjustedStats;
}

/**
 * Calculate increased variance due to injury uncertainty
 * Use this in your Monte Carlo simulation's applyGameDayVariance
 */
export function calculateInjuryVarianceMultiplier(
  injuryImpact: InjuryImpact | null
): number {
  if (!injuryImpact || injuryImpact.total_impact_points === 0) {
    return 1.0;
  }

  // Base variance increase
  let varianceMultiplier = 1.0;

  // Add variance for total injury impact (more injuries = more uncertainty)
  varianceMultiplier += injuryImpact.total_impact_points * 0.03;

  // Add additional variance for cluster injuries (communication breakdown)
  const clusterCount = Object.keys(injuryImpact.cluster_multipliers || {}).length;
  varianceMultiplier += clusterCount * 0.1;

  // Cap maximum variance increase at 50%
  return Math.min(varianceMultiplier, 1.5);
}

/**
 * Integration helper: Get summary of injury impacts for logging
 */
export function getInjurySummary(
  teamName: string,
  injuryImpact: InjuryImpact | null
): string {
  if (!injuryImpact || injuryImpact.total_impact_points === 0) {
    return `${teamName}: No significant injuries`;
  }

  const { offensiveImpacts, defensiveImpacts, totalOffensiveImpact, totalDefensiveImpact } =
    separateInjuryImpacts(injuryImpact);

  const parts: string[] = [];

  if (offensiveImpacts.length > 0) {
    const keyInjuries = offensiveImpacts
      .filter(i => i.impactPoints > 0.5)
      .map(i => `${i.playerName} (${i.position})`)
      .slice(0, 3)
      .join(', ');

    parts.push(`OFF: ${totalOffensiveImpact.toFixed(1)}pts (${keyInjuries})`);
  }

  if (defensiveImpacts.length > 0) {
    const keyInjuries = defensiveImpacts
      .filter(i => i.impactPoints > 0.5)
      .map(i => `${i.playerName} (${i.position})`)
      .slice(0, 3)
      .join(', ');

    parts.push(`DEF: ${totalDefensiveImpact.toFixed(1)}pts (${keyInjuries})`);
  }

  const clusterCount = Object.keys(injuryImpact.cluster_multipliers || {}).length;
  if (clusterCount > 0) {
    parts.push(`${clusterCount} clusters`);
  }

  return `${teamName}: ${parts.join(' | ')} | Total: ${injuryImpact.total_impact_points.toFixed(1)}pts`;
}