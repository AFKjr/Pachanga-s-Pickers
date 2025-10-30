/**
 * Enhanced Injury Integration for Monte Carlo Simulation
 *
 * This module enhances your existing injury impact system by:
 * 1. Separating offensive and defensive injury impacts
 * 2. Applying position-specific multipliers
 * 3. Integrating directly with strength calculations
 */

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
  injuryImpact: InjuryImpact | null
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

// Legacy interfaces for backward compatibility
export interface PlayerInjury {
  name: string;
  position: string;
  playerTier: 'ELITE' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR';
  backupTier: 'ELITE' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR';
  practiceParticipation: string;
  gameStatus: string;
  isGreenDotDefender?: boolean;
  injury?: string;
}

export interface PlayerImpact {
  playerName: string;
  position: string;
  baseValue: number;
  backupDifferential: number;
  practiceStatus: string;
  statusMultiplier: number;
  impactPoints: number;
}

export interface TeamInjuryAnalysis {
  individualImpacts: PlayerImpact[];
  baseImpact: number;
  clusterMultipliers: Record<string, number>;
  clusterAdjustment: number;
  totalImpact: number;
}

export interface GameInjuryAnalysis {
  openingLine: number;
  homeTeam: string;
  awayTeam: string;
  homeInjuryImpact: number;
  awayInjuryImpact: number;
  netInjuryImpact: number;
  adjustedLine: number;
  lineMovement: number;
  homeAnalysis: TeamInjuryAnalysis;
  awayAnalysis: TeamInjuryAnalysis;
}

// Position value constants (in points on the betting line)
export const POSITION_VALUES = {
  // Offense
  QUARTERBACK_ELITE: 7.0,
  QUARTERBACK_ABOVE_AVERAGE: 4.5,
  QUARTERBACK_AVERAGE: 3.0,
  QUARTERBACK_BELOW_AVERAGE: 1.5,

  // Elite skill players
  WIDE_RECEIVER_ELITE: 2.0,
  TIGHT_END_ELITE: 2.0,
  RUNNING_BACK_ELITE: 1.5,

  // Above average skill players
  WIDE_RECEIVER_ABOVE_AVERAGE: 1.5,
  TIGHT_END_ABOVE_AVERAGE: 1.0,
  RUNNING_BACK_ABOVE_AVERAGE: 1.0,

  // Average skill players
  WIDE_RECEIVER_AVERAGE: 0.75,
  TIGHT_END_AVERAGE: 0.5,
  RUNNING_BACK_AVERAGE: 0.5,

  // Offensive line
  LEFT_TACKLE_ELITE: 1.5,
  LEFT_TACKLE_AVERAGE: 1.0,
  CENTER_ELITE: 1.0,
  CENTER_AVERAGE: 0.5,
  GUARD_AVERAGE: 0.5,
  RIGHT_TACKLE_AVERAGE: 0.75,

  // Defense - Pass rushers (most impactful)
  EDGE_RUSHER_ELITE: 1.5,
  EDGE_RUSHER_ABOVE_AVERAGE: 1.0,
  DEFENSIVE_TACKLE_ELITE: 1.0,

  // Defense - Secondary
  CORNERBACK_ELITE: 1.0,
  CORNERBACK_AVERAGE: 0.5,
  SAFETY_ELITE: 1.0,
  SAFETY_AVERAGE: 0.5,

  // Defense - Linebackers
  LINEBACKER_ELITE: 1.0,
  LINEBACKER_ABOVE_AVERAGE: 0.75,
  LINEBACKER_AVERAGE: 0.5,

  // Special adjustments
  GREEN_DOT_DEFENDER: 0.5, // Defensive play caller
  FULLBACK: 0.25,
  KICKER: 0.25
};

// Practice status multipliers
export const PRACTICE_STATUS_MULTIPLIERS = {
  OUT: 1.0,                              // Full impact
  DOUBTFUL: 0.85,                        // 85% chance of missing
  QUESTIONABLE_DNP: 0.65,                // Did not practice, questionable
  QUESTIONABLE_LIMITED: 0.40,            // Limited practice, questionable
  QUESTIONABLE_FULL: 0.15,               // Full practice, questionable
  PROBABLE: 0.10,                        // Minimal impact
  HEALTHY: 0.0                           // No impact
};

// Position groupings for cluster injury analysis
export const POSITION_GROUPS = {
  OFFENSIVE_LINE: ['T', 'G', 'C'],
  SECONDARY: ['CB', 'S'],
  WIDE_RECEIVERS: ['WR'],
  LINEBACKERS: ['LB'],
  DEFENSIVE_LINE: ['DE', 'DT']
};

/**
 * Calculates the starter-to-backup differential
 * This represents the quality gap between the injured starter and their replacement
 */
export function calculateBackupDifferential(
  starterTier: string,
  backupTier: string
): number {
  const tierValues = {
    ELITE: 10,
    ABOVE_AVERAGE: 7,
    AVERAGE: 5,
    BELOW_AVERAGE: 3,
    POOR: 1
  };

  const starterValue = tierValues[starterTier as keyof typeof tierValues] || tierValues.AVERAGE;
  const backupValue = tierValues[backupTier as keyof typeof tierValues] || tierValues.BELOW_AVERAGE;

  // Calculate percentage of value retained with backup
  const retentionRate = backupValue / starterValue;

  return 1 - retentionRate; // Returns 0-1, representing loss percentage
}

/**
 * Determines practice status from injury report data
 */
export function determinePracticeStatus(
  practiceParticipation: string,
  gameStatus: string
): keyof typeof PRACTICE_STATUS_MULTIPLIERS {
  if (gameStatus === 'Out') {
    return 'OUT';
  }

  if (gameStatus === 'Doubtful') {
    return 'DOUBTFUL';
  }

  if (gameStatus === 'Questionable') {
    if (practiceParticipation === 'Did Not Participate In Practice') {
      return 'QUESTIONABLE_DNP';
    } else if (practiceParticipation === 'Limited Participation in Practice') {
      return 'QUESTIONABLE_LIMITED';
    } else if (practiceParticipation === 'Full Participation in Practice') {
      return 'QUESTIONABLE_FULL';
    }
  }

  if (practiceParticipation === 'Full Participation in Practice' && !gameStatus) {
    return 'HEALTHY';
  }

  return 'QUESTIONABLE_LIMITED'; // Default conservative estimate
}

/**
 * Core injury impact calculation for a single player
 */
export function calculatePlayerInjuryImpact(player: PlayerInjury): PlayerImpact {
  const {
    name,
    position,
    playerTier,
    backupTier,
    practiceParticipation,
    gameStatus,
    isGreenDotDefender
  } = player;

  // Get base position value
  const positionKey = `${position}_${playerTier}` as keyof typeof POSITION_VALUES;
  let baseValue = POSITION_VALUES[positionKey] || 0.5;

  // Add green dot value if applicable
  if (isGreenDotDefender) {
    baseValue += POSITION_VALUES.GREEN_DOT_DEFENDER;
  }

  // Calculate backup differential
  const backupDiff = calculateBackupDifferential(playerTier, backupTier);

  // Apply backup differential to base value
  const adjustedValue = baseValue * backupDiff;

  // Apply practice status multiplier
  const practiceStatus = determinePracticeStatus(practiceParticipation, gameStatus);
  const statusMultiplier = PRACTICE_STATUS_MULTIPLIERS[practiceStatus];

  const finalImpact = adjustedValue * statusMultiplier;

  return {
    playerName: name,
    position: position,
    baseValue: baseValue,
    backupDifferential: backupDiff,
    practiceStatus: practiceStatus,
    statusMultiplier: statusMultiplier,
    impactPoints: finalImpact
  };
}

/**
 * Calculates cluster injury multiplier
 * When multiple players at the same position group are injured,
 * the impact compounds due to communication and coordination issues
 */
export function calculateClusterInjuryMultiplier(
  injuredPlayers: PlayerInjury[],
  positionGroup: string
): number {
  const groupPositions = POSITION_GROUPS[positionGroup as keyof typeof POSITION_GROUPS] || [];

  // Count injuries in this position group
  const injuriesInGroup = injuredPlayers.filter(player =>
    groupPositions.includes(player.position)
  );

  const injuryCount = injuriesInGroup.length;

  // Cluster multipliers based on research
  if (injuryCount === 0 || injuryCount === 1) {
    return 1.0; // No cluster effect
  } else if (injuryCount === 2) {
    return 1.3; // 30% increase
  } else if (injuryCount === 3) {
    return 1.6; // 60% increase
  } else {
    return 2.0; // 100% increase for 4+ injuries
  }
}

/**
 * Analyzes all injuries for a team and calculates total impact
 */
export function analyzeTeamInjuryImpact(teamInjuries: PlayerInjury[]): TeamInjuryAnalysis {
  const individualImpacts = teamInjuries.map(player =>
    calculatePlayerInjuryImpact(player)
  );

  // Calculate base impact (sum of individual impacts)
  const baseImpact = individualImpacts.reduce(
    (sum, impact) => sum + impact.impactPoints,
    0
  );

  // Analyze cluster injuries
  const clusterMultipliers: Record<string, number> = {};
  for (const groupName in POSITION_GROUPS) {
    const multiplier = calculateClusterInjuryMultiplier(teamInjuries, groupName);
    if (multiplier > 1.0) {
      clusterMultipliers[groupName] = multiplier;
    }
  }

  // Apply cluster multipliers to relevant injuries
  let clusterAdjustment = 0;
  for (const groupName in clusterMultipliers) {
    const groupPositions = POSITION_GROUPS[groupName as keyof typeof POSITION_GROUPS];
    const groupInjuries = individualImpacts.filter(impact =>
      groupPositions.includes(impact.position)
    );

    const groupBaseImpact = groupInjuries.reduce(
      (sum, impact) => sum + impact.impactPoints,
      0
    );

    // Add the additional impact from clustering
    const multiplier = clusterMultipliers[groupName];
    clusterAdjustment += groupBaseImpact * (multiplier - 1.0);
  }

  const totalImpact = baseImpact + clusterAdjustment;

  return {
    individualImpacts: individualImpacts,
    baseImpact: baseImpact,
    clusterMultipliers: clusterMultipliers,
    clusterAdjustment: clusterAdjustment,
    totalImpact: totalImpact
  };
}

/**
 * Calculates the adjusted betting line for a game
 */
export function calculateAdjustedLine(gameData: {
  openingLine: number;
  homeTeam: string;
  awayTeam: string;
  homeInjuries: PlayerInjury[];
  awayInjuries: PlayerInjury[];
}): GameInjuryAnalysis {
  const {
    openingLine,
    homeTeam,
    awayTeam,
    homeInjuries,
    awayInjuries
  } = gameData;

  // Analyze injuries for both teams
  const homeInjuryAnalysis = analyzeTeamInjuryImpact(homeInjuries);
  const awayInjuryAnalysis = analyzeTeamInjuryImpact(awayInjuries);

  // Calculate net injury impact (from home team perspective)
  // Home injuries hurt home team (negative), away injuries help home team (positive)
  const netInjuryImpact = awayInjuryAnalysis.totalImpact - homeInjuryAnalysis.totalImpact;

  // Adjust the line
  // If home team is favorite (negative line), injuries make line less favorable
  // If home team is underdog (positive line), injuries make line more favorable
  const adjustedLine = openingLine - netInjuryImpact;

  return {
    openingLine: openingLine,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeInjuryImpact: homeInjuryAnalysis.totalImpact,
    awayInjuryImpact: awayInjuryAnalysis.totalImpact,
    netInjuryImpact: netInjuryImpact,
    adjustedLine: adjustedLine,
    lineMovement: adjustedLine - openingLine,
    homeAnalysis: homeInjuryAnalysis,
    awayAnalysis: awayInjuryAnalysis
  };
}

/**
 * Helper function to convert injury report CSV data to player objects
 */
export function parseInjuryReportPlayer(
  csvRow: any,
  playerDatabase?: Record<string, any>
): PlayerInjury {
  // csvRow should have: Team, Player, Position, Injuries, Practice_Status, Game_Status

  // Look up player tier from database (would need to be provided)
  const playerInfo = playerDatabase?.[csvRow.Player] || {
    tier: 'AVERAGE' as const,
    backupTier: 'BELOW_AVERAGE' as const,
    isGreenDot: false
  };

  return {
    name: csvRow.Player,
    position: csvRow.Position,
    playerTier: playerInfo.tier,
    backupTier: playerInfo.backupTier,
    practiceParticipation: csvRow.Practice_Status,
    gameStatus: csvRow.Game_Status,
    isGreenDotDefender: playerInfo.isGreenDot,
    injury: csvRow.Injuries
  };
}

/**
 * Example usage function
 */
export function predictGameWithInjuries(
  gameInfo: any,
  injuryReportData: any[],
  playerDatabase?: Record<string, any>
) {
  // Filter injury report for this specific game
  const homeInjuries = injuryReportData
    .filter((row: any) => row.Team === gameInfo.homeTeam)
    .map((row: any) => parseInjuryReportPlayer(row, playerDatabase));

  const awayInjuries = injuryReportData
    .filter((row: any) => row.Team === gameInfo.awayTeam)
    .map((row: any) => parseInjuryReportPlayer(row, playerDatabase));

  const gameData = {
    openingLine: gameInfo.openingLine,
    favoriteTeam: gameInfo.favoriteTeam,
    homeTeam: gameInfo.homeTeam,
    awayTeam: gameInfo.awayTeam,
    homeInjuries: homeInjuries,
    awayInjuries: awayInjuries
  };

  return calculateAdjustedLine(gameData);
}