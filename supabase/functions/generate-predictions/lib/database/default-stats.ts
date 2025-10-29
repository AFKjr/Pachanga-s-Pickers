// supabase/functions/generate-predictions/lib/database/default-stats.ts
import type { TeamStats } from '../types.ts';

/**
 * Returns default NFL league average stats for teams not found in database
 * These are 2024 NFL season averages based on league-wide statistics
 */
export function getDefaultTeamStats(teamName: string): TeamStats {
  console.log(`Using league average stats for ${teamName}`);

  return {
    team: teamName,
    gamesPlayed: 17, // Full season

    // Basic offense/defense
    offensiveYardsPerGame: 345.2,
    defensiveYardsAllowed: 345.2,
    pointsPerGame: 22.8,
    pointsAllowedPerGame: 22.8,
    turnoverDifferential: 0.0,

    // Efficiency rates
    thirdDownConversionRate: 39.5,
    redZoneEfficiency: 55.2,

    // Passing offense
    passCompletions: 21.6,
    passAttempts: 32.7,
    passCompletionPct: 66.1,
    passingYards: 228.4,
    passingTds: 1.6,
    interceptionsThrown: 0.7,
    yardsPerPassAttempt: 7.0,

    // Rushing offense
    rushingAttempts: 26.3,
    rushingYards: 114.5,
    rushingTds: 0.9,
    yardsPerRush: 4.4,

    // Overall offense
    totalPlays: 61.2,
    yardsPerPlay: 5.4,
    firstDowns: 19.6,

    // Discipline
    penalties: 7.3,
    penaltyYards: 58.4,

    // Turnovers
    turnoversLost: 1.2,
    fumblesLost: 0.5,

    // Passing defense
    defPassCompletionsAllowed: 21.6,
    defPassAttempts: 32.7,
    defPassingYardsAllowed: 228.4,
    defPassingTdsAllowed: 1.6,
    defInterceptions: 0.7,

    // Rushing defense
    defRushingAttemptsAllowed: 26.3,
    defRushingYardsAllowed: 114.5,
    defRushingTdsAllowed: 0.9,

    // Overall defense
    defTotalPlays: 61.2,
    defYardsPerPlayAllowed: 5.4,
    defFirstDownsAllowed: 19.6,

    // Turnovers forced
    turnoversForced: 1.2,
    fumblesForced: 0.5,

    // Drive stats
    drivesPerGame: 11.0,
    playsPerDrive: 5.5,
    pointsPerDrive: 2.0,
    scoringPercentage: 40.0,
    turnoverPercentage: 8.0,
    yardsPerDrive: 30.0,
    timePerDriveSeconds: 162,

    // Enhanced situational offense
    thirdDownAttempts: 12.5,
    thirdDownConversions: 5.0,
    fourthDownAttempts: 1.2,
    fourthDownConversions: 0.5,
    redZoneAttempts: 4.2,
    redZoneTouchdowns: 2.3,

    // Advanced passing
    passFirstDowns: 10.2,
    rushFirstDowns: 5.8,
    penaltyFirstDowns: 1.2,
    expectedPointsOffense: 22.8,

    // Special teams offense
    fieldGoalAttempts: 1.8,
    fieldGoalsMade: 1.5,
    fieldGoalPct: 83.3,
    extraPointAttempts: 2.8,
    extraPointsMade: 2.7,
    kickoffs: 4.5,
    touchbacks: 1.2,
    touchbackPct: 26.7,

    // Punting offense
    punts: 4.5,
    puntYards: 202.5,
    puntNetYards: 180.2,
    puntNetYardsPerPunt: 40.0,
    puntsInside20: 1.8,
    puntsBlocked: 0.1,

    // Returns offense
    kickReturns: 2.8,
    kickReturnYards: 65.4,
    kickReturnYardsPerReturn: 23.4,
    puntReturns: 2.2,
    puntReturnYards: 18.6,
    puntReturnYardsPerReturn: 8.5,
    allPurposeYards: 408.0,

    // Scoring offense
    receivingTds: 1.2,
    totalTds: 2.8,
    twoPointConversions: 0.1,
    puntReturnTds: 0.05,
    kickReturnTds: 0.02,

    // Defensive situational
    defThirdDownAttempts: 12.5,
    defThirdDownConversions: 5.0,
    defFourthDownAttempts: 1.2,
    defFourthDownConversions: 0.5,
    defRedZoneAttempts: 4.2,
    defRedZoneTouchdowns: 2.3,

    // Pass rush defense
    qbHurries: 2.1,
    qbHits: 3.2,
    blitzes: 8.5,
    blitzPct: 32.1,

    // Defensive special teams
    defFieldGoalAttempts: 1.8,
    defFieldGoalsMade: 1.5,
    defFieldGoalPct: 83.3,
    defExtraPointAttempts: 2.8,
    defExtraPointsMade: 2.7,

    // Defensive punting
    defPunts: 4.5,
    defPuntYards: 202.5,
    defPuntsBlocked: 0.1,

    // Defensive returns
    defKickReturns: 2.8,
    defKickReturnYards: 65.4,
    defPuntReturns: 2.2,
    defPuntReturnYards: 18.6,

    // Defensive scoring
    defRushingTds: 0.9,
    defReceivingTds: 1.2,
    defTotalTds: 2.8,
    defTwoPointConversions: 0.1,
    defPuntReturnTds: 0.05,
    defKickReturnTds: 0.02,

    // Drive stats
    totalDrives: 11.0,
    driveScoringPct: 40.0,
    driveTurnoverPct: 8.5,
    driveStartAvg: 25.0,
    driveTimeAvg: 162.0,
    drivePointsAvg: 2.0,

    // Defensive drive stats
    defTotalDrives: 11.0,
    defDriveScoringPct: 40.0,
    defDriveTurnoverPct: 8.5,
    defDriveStartAvg: 25.0,
    defDriveTimeAvg: 162.0,
    defDrivePointsAvg: 2.0
  };
}