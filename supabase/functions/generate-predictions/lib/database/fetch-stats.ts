// supabase/functions/generate-predictions/lib/database/fetch-stats.ts
import type { TeamStats } from '../types.ts';
import { TEAM_NAME_MAPPINGS } from '../team-mappings.ts';
import { getDefaultTeamStats } from './default-stats.ts';

function resolveTeamName(teamName: string): string | null {
  if (!teamName) return null;
  const cleaned = teamName.trim().toLowerCase();
  return TEAM_NAME_MAPPINGS[cleaned] || null;
}

/**
 * Calculates drives per game with proper null/undefined handling
 * FIX FOR BUG #4: Prevents NaN values by validating all inputs before calculation
 */
function calculateDrivesPerGame(
  drivesPerGameFromDb: number | null | undefined,
  totalPlays: number | null | undefined,
  gamesPlayed: number | null | undefined
): number {
  const NFL_AVERAGE_DRIVES_PER_GAME = 11.0;
  const AVERAGE_PLAYS_PER_DRIVE = 5.5;
  
  // If database has drives per game, use it directly
  if (drivesPerGameFromDb !== null && drivesPerGameFromDb !== undefined) {
    return drivesPerGameFromDb;
  }
  
  // Try to calculate from total plays and games played
  if (
    totalPlays !== null && 
    totalPlays !== undefined && 
    gamesPlayed !== null && 
    gamesPlayed !== undefined &&
    gamesPlayed > 0  // Prevent division by zero
  ) {
    const calculatedDrives = totalPlays / gamesPlayed / AVERAGE_PLAYS_PER_DRIVE;
    
    // Sanity check: drives per game should be reasonable (6-15 range)
    if (calculatedDrives >= 6 && calculatedDrives <= 15) {
      return calculatedDrives;
    }
    
    console.warn(
      `Calculated drives per game (${calculatedDrives.toFixed(2)}) is outside ` +
      `reasonable range. Using NFL average.`
    );
  }
  
  // Fallback to NFL average if calculation isn't possible
  return NFL_AVERAGE_DRIVES_PER_GAME;
}

/**
 * Safely calculates a rate statistic with null handling
 * Prevents NaN by validating numerator and denominator
 */
function calculateRate(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  defaultValue: number
): number {
  if (
    numerator !== null && 
    numerator !== undefined && 
    denominator !== null && 
    denominator !== undefined &&
    denominator > 0
  ) {
    const rate = numerator / denominator;
    
    // Return only if the result is a valid number
    if (!isNaN(rate) && isFinite(rate)) {
      return rate;
    }
  }
  
  return defaultValue;
}

export async function fetchTeamStats(
  teamName: string, 
  supabaseUrl: string, 
  supabaseKey: string, 
  week?: number
): Promise<TeamStats | null> {
  try {
    const canonicalName = resolveTeamName(teamName);
    const queryName = canonicalName || teamName;
    
    console.log(`Fetching stats for: "${teamName}" → "${queryName}" (week: ${week || 'latest'})`);
    
    let query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(queryName)}&season_year=eq.2025`;
    if (week) {
      query += `&week=eq.${week}`;
    }
    query += '&order=week.desc&limit=1&select=*';
    
    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch stats for ${queryName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn(`No stats found for "${teamName}" (tried "${queryName}")`);
      return null;
    }

    const dbStats = data[0];
    console.log(`✅ Loaded stats for ${queryName} - Week ${dbStats.week}`);
    
    // FIX FOR BUG #10: Put debug logging behind DEBUG flag
    if (Deno.env.get('DEBUG') === 'true') {
      console.log(`Raw DB values for ${teamName}:`, {
        thirdDownConversionRate: dbStats.third_down_conversion_rate,
        redZoneEfficiency: dbStats.red_zone_efficiency,
        defThirdDownConversionRate: dbStats.def_third_down_conversion_rate,
        defRedZoneEfficiency: dbStats.def_red_zone_efficiency,
        defPassCompletionsAllowed: dbStats.def_pass_completions_allowed,
        defPassingYardsAllowed: dbStats.def_passing_yards_allowed,
        defRushingYardsAllowed: dbStats.def_rushing_yards_allowed
      });
    }
    
    return {
      team: teamName,
      gamesPlayed: dbStats.games_played ?? 5,
      offensiveYardsPerGame: dbStats.offensive_yards_per_game ?? 328.3,
      defensiveYardsAllowed: dbStats.defensive_yards_allowed ?? 328.3,
      pointsPerGame: dbStats.points_per_game ?? 23.4,
      pointsAllowedPerGame: dbStats.points_allowed_per_game ?? 23.4,
      turnoverDifferential: dbStats.turnover_differential ?? 0,
      thirdDownConversionRate: dbStats.third_down_conversion_rate ?? 40.0,
      redZoneEfficiency: dbStats.red_zone_efficiency ?? 55.0,
      passCompletions: dbStats.pass_completions ?? 21.6,
      passAttempts: dbStats.pass_attempts ?? 32.7,
      passCompletionPct: dbStats.pass_completion_pct ?? 65.9,
      passingYards: dbStats.passing_yards ?? 213.8,
      passingTds: dbStats.passing_tds ?? 1.6,
      interceptionsThrown: dbStats.interceptions_thrown ?? 0.7,
      yardsPerPassAttempt: dbStats.yards_per_pass_attempt ?? 7.0,
      rushingAttempts: dbStats.rushing_attempts ?? 26.3,
      rushingYards: dbStats.rushing_yards ?? 114.5,
      rushingTds: dbStats.rushing_tds ?? 0.9,
      yardsPerRush: dbStats.yards_per_rush ?? 4.4,
      totalPlays: dbStats.total_plays ?? 61.2,
      yardsPerPlay: dbStats.yards_per_play ?? 5.4,
      firstDowns: dbStats.first_downs ?? 19.6,
      penalties: dbStats.penalties ?? 7.3,
      penaltyYards: dbStats.penalty_yards ?? 58.4,
      turnoversLost: dbStats.turnovers_lost ?? 1.2,
      fumblesLost: dbStats.fumbles_lost ?? 0.5,
      defPassCompletionsAllowed: dbStats.def_pass_completions_allowed ?? 21.6,
      defPassAttempts: dbStats.def_pass_attempts ?? 32.7,
      defPassingYardsAllowed: dbStats.def_passing_yards_allowed ?? 213.8,
      defPassingTdsAllowed: dbStats.def_passing_tds_allowed ?? 1.6,
      defInterceptions: dbStats.def_interceptions ?? 0.7,
      defRushingAttemptsAllowed: dbStats.def_rushing_attempts_allowed ?? 26.3,
      defRushingYardsAllowed: dbStats.def_rushing_yards_allowed ?? 114.5,
      defRushingTdsAllowed: dbStats.def_rushing_tds_allowed ?? 0.9,
      defTotalPlays: dbStats.def_total_plays ?? 61.2,
      defYardsPerPlayAllowed: dbStats.def_yards_per_play_allowed ?? 5.4,
      defFirstDownsAllowed: dbStats.def_first_downs_allowed ?? 19.6,
      turnoversForced: dbStats.turnovers_forced ?? 1.2,
      fumblesForced: dbStats.fumbles_forced ?? 0.5,
      // Use safe calculation to prevent NaN (FIX FOR BUG #4)
      drivesPerGame: calculateDrivesPerGame(
        dbStats.drives_per_game,
        dbStats.total_plays,
        dbStats.games_played
      ),
      playsPerDrive: dbStats.plays_per_drive ?? 5.5,
      pointsPerDrive: dbStats.points_per_drive ?? 2.0,
      scoringPercentage: dbStats.scoring_percentage ?? 40.0,
      yardsPerDrive: dbStats.yards_per_drive ?? 30.0,
      timePerDriveSeconds: dbStats.time_per_drive_seconds ?? 162,

      // NEW: Enhanced stats from fusion script
      // Situational offense
      thirdDownAttempts: dbStats.third_down_attempts ?? 12.5,
      thirdDownConversions: dbStats.third_down_conversions ?? 5.0,
      fourthDownAttempts: dbStats.fourth_down_attempts ?? 1.2,
      fourthDownConversions: dbStats.fourth_down_conversions ?? 0.5,
      redZoneAttempts: dbStats.red_zone_attempts ?? 4.2,
      redZoneTouchdowns: dbStats.red_zone_touchdowns ?? 2.3,
      redZoneScoringPct: calculateRate(dbStats.red_zone_touchdowns, dbStats.red_zone_attempts, 55.0) * 100,

      // Advanced passing
      passFirstDowns: dbStats.pass_first_downs ?? 10.2,
      rushFirstDowns: dbStats.rush_first_downs ?? 6.8,
      penaltyFirstDowns: dbStats.penalty_first_downs ?? 2.6,
      expectedPointsOffense: dbStats.expected_points_offense ?? 15.0,

      // Special teams
      fieldGoalAttempts: dbStats.field_goal_attempts ?? 1.8,
      fieldGoalsMade: dbStats.field_goals_made ?? 1.5,
      fieldGoalPct: dbStats.field_goal_pct ?? 83.3,
      extraPointAttempts: dbStats.extra_point_attempts ?? 2.8,
      extraPointsMade: dbStats.extra_points_made ?? 2.7,
      kickoffs: dbStats.kickoffs ?? 4.2,
      touchbacks: dbStats.touchbacks ?? 1.2,
      touchbackPct: dbStats.touchback_pct ?? 28.6,

      // Punting
      punts: dbStats.punts ?? 4.5,
      puntYards: dbStats.punt_yards ?? 202.5,
      puntNetYards: dbStats.punt_net_yards ?? 180.0,
      puntNetYardsPerPunt: dbStats.punt_net_yards_per_punt ?? 40.0,
      puntsInside20: dbStats.punts_inside_20 ?? 1.8,
      puntsBlocked: dbStats.punts_blocked ?? 0.1,

      // Returns
      kickReturns: dbStats.kick_returns ?? 2.8,
      kickReturnYards: dbStats.kick_return_yards ?? 65.4,
      kickReturnYardsPerReturn: dbStats.kick_return_yards_per_return ?? 23.4,
      puntReturns: dbStats.punt_returns ?? 2.2,
      puntReturnYards: dbStats.punt_return_yards ?? 18.6,
      puntReturnYardsPerReturn: dbStats.punt_return_yards_per_return ?? 8.5,
      allPurposeYards: dbStats.all_purpose_yards ?? 45.2,

      // Scoring
      rushingTds: dbStats.rushing_tds ?? 0.9, // Already mapped above
      receivingTds: dbStats.receiving_tds ?? 1.2,
      totalTds: dbStats.total_tds ?? 2.8,
      twoPointConversions: dbStats.two_point_conversions ?? 0.1,
      puntReturnTds: dbStats.punt_return_tds ?? 0.05,
      kickReturnTds: dbStats.kick_return_tds ?? 0.02,

      // Defensive situational
      defThirdDownAttempts: dbStats.def_third_down_attempts ?? 12.5,
      defThirdDownConversions: dbStats.def_third_down_conversions ?? 5.0,
      defFourthDownAttempts: dbStats.def_fourth_down_attempts ?? 1.2,
      defFourthDownConversions: dbStats.def_fourth_down_conversions ?? 0.5,
      defRedZoneAttempts: dbStats.def_red_zone_attempts ?? 4.2,
      defRedZoneTouchdowns: dbStats.def_red_zone_touchdowns ?? 2.3,
      defRedZoneScoringPct: calculateRate(dbStats.def_red_zone_touchdowns, dbStats.def_red_zone_attempts, 55.0) * 100,

      // Pass rush
      qbHurries: dbStats.qb_hurries ?? 2.1,
      qbHits: dbStats.qb_hits ?? 3.2,
      blitzes: dbStats.blitzes ?? 8.5,
      blitzPct: dbStats.blitz_pct ?? 32.1,

      // Defensive special teams
      defFieldGoalAttempts: dbStats.def_field_goal_attempts ?? 1.8,
      defFieldGoalsMade: dbStats.def_field_goals_made ?? 1.5,
      defFieldGoalPct: dbStats.def_field_goal_pct ?? 83.3,
      defExtraPointAttempts: dbStats.def_extra_point_attempts ?? 2.8,
      defExtraPointsMade: dbStats.def_extra_points_made ?? 2.7,

      // Defensive punting
      defPunts: dbStats.def_punts ?? 4.5,
      defPuntYards: dbStats.def_punt_yards ?? 202.5,
      defPuntsBlocked: dbStats.def_punts_blocked ?? 0.1,

      // Defensive returns
      defKickReturns: dbStats.def_kick_returns ?? 2.8,
      defKickReturnYards: dbStats.def_kick_return_yards ?? 65.4,
      defPuntReturns: dbStats.def_punt_returns ?? 2.2,
      defPuntReturnYards: dbStats.def_punt_return_yards ?? 18.6,

      // Defensive scoring
      defRushingTds: dbStats.def_rushing_tds ?? 0.9,
      defReceivingTds: dbStats.def_receiving_tds ?? 1.2,
      defTotalTds: dbStats.def_total_tds ?? 2.8,
      defTwoPointConversions: dbStats.def_two_point_conversions ?? 0.1,
      defPuntReturnTds: dbStats.def_punt_return_tds ?? 0.05,
      defKickReturnTds: dbStats.def_kick_return_tds ?? 0.02,

      // Drive stats
      totalDrives: dbStats.total_drives ?? 11.0,
      driveScoringPct: dbStats.drive_scoring_pct ?? 40.0,
      driveTurnoverPct: dbStats.drive_turnover_pct ?? 8.5,
      driveStartAvg: dbStats.drive_start_avg ?? 25.0,
      driveTimeAvg: dbStats.drive_time_avg ?? 162.0,
      drivePointsAvg: dbStats.drive_points_avg ?? 2.0,

      // Defensive drive stats
      defTotalDrives: dbStats.def_total_drives ?? 11.0,
      defDriveScoringPct: dbStats.def_drive_scoring_pct ?? 40.0,
      defDriveTurnoverPct: dbStats.def_drive_turnover_pct ?? 8.5,
      defDriveStartAvg: dbStats.def_drive_start_avg ?? 25.0,
      defDriveTimeAvg: dbStats.def_drive_time_avg ?? 162.0,
      defDrivePointsAvg: dbStats.def_drive_points_avg ?? 2.0
    };
  } catch (error) {
    console.error(`Error fetching stats for ${teamName}:`, error);
    return null;
  }
}

// Sports Radar API functionality DISABLED - using database-only approach
// import { fetchTeamStatsWithCache } from './fetch-stats-rapidapi.ts';

export async function fetchTeamStatsWithFallback(
  teamName: string,
  supabaseUrl: string,
  supabaseKey: string,
  rapidApiKey?: string,
  week?: number
): Promise<TeamStats> {
  console.log(`📊 Fetching stats for ${teamName} from database (Sports Radar API disabled)...`);
  
  // Try to fetch from database first
  const dbStats = await fetchTeamStats(teamName, supabaseUrl, supabaseKey, week);
  
  if (dbStats) {
    console.log(`✅ Using database stats for ${teamName}`);
    return dbStats;
  }

  // Fallback to default stats if not found in database
  console.warn(`⚠️ No stats found for ${teamName}, using defaults`);
  const defaultStats = getDefaultTeamStats(teamName);
  return defaultStats;
}

// ============================================================================
// BUG FIX #7: Enhanced Stats Validation with Quality Metadata
// ============================================================================

import type { StatsQuality, TeamStatsMetadata, TeamStatsWithMetadata } from '../types.ts';

/**
 * Validates team stats and provides quality metadata
 * Critical fields are checked to determine data quality
 */
function validateStatsQuality(
  teamName: string,
  dbStats: any | null
): TeamStatsMetadata {
  const warnings: string[] = [];
  const missingFields: string[] = [];
  
  // No database stats found
  if (!dbStats) {
    return {
      quality: StatsQuality.DEFAULT_DATA,
      source: 'league_averages',
      warnings: [`No stats found for ${teamName} in database`]
    };
  }
  
  // Check for stale data (older than 7 days)
  const STALE_DATA_THRESHOLD_DAYS = 7;
  if (dbStats.updated_at || dbStats.last_updated) {
    const lastUpdate = new Date(dbStats.updated_at || dbStats.last_updated);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > STALE_DATA_THRESHOLD_DAYS) {
      warnings.push(
        `Stats for ${teamName} are ${Math.round(daysSinceUpdate)} days old`
      );
    }
  }
  
  // Check which critical fields are missing or null
  const criticalFields = [
    'points_per_game',
    'total_plays',
    'third_down_conversion_rate',
    'red_zone_efficiency',
    'games_played'
  ];
  
  for (const field of criticalFields) {
    if (dbStats[field] === null || dbStats[field] === undefined) {
      missingFields.push(field);
    }
  }
  
  // Determine quality based on missing fields
  let quality: StatsQuality;
  let source: string;
  
  if (missingFields.length === 0) {
    quality = StatsQuality.REAL_DATA;
    source = 'database';
  } else if (missingFields.length < criticalFields.length / 2) {
    quality = StatsQuality.PARTIAL_DATA;
    source = 'database_with_defaults';
    warnings.push(
      `${missingFields.length} critical field(s) missing for ${teamName}: ${missingFields.join(', ')}`
    );
  } else {
    quality = StatsQuality.DEFAULT_DATA;
    source = 'mostly_defaults';
    warnings.push(
      `Most critical fields missing for ${teamName}. Using primarily default values.`
    );
  }
  
  return {
    quality,
    source,
    lastUpdated: (dbStats.updated_at || dbStats.last_updated) ? 
      new Date(dbStats.updated_at || dbStats.last_updated) : undefined,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Enhanced version of fetchTeamStatsWithFallback that includes quality metadata
 * Use this when you need to track data quality for prediction confidence
 */
export async function fetchTeamStatsWithQuality(
  teamName: string,
  supabaseUrl: string,
  supabaseKey: string,
  rapidApiKey?: string,
  week?: number
): Promise<TeamStatsWithMetadata> {
  console.log(`📊 Fetching stats with quality check for ${teamName}...`);
  
  try {
    // Fetch raw data from database
    const canonicalName = resolveTeamName(teamName);
    const queryName = canonicalName || teamName;
    
    let query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(queryName)}&season_year=eq.2025`;
    if (week) {
      query += `&week=eq.${week}`;
    }
    query += '&order=week.desc&limit=1&select=*';
    
    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.ok ? await response.json() : null;
    const dbStats = (data && data.length > 0) ? data[0] : null;
    
    // Validate quality
    const metadata = validateStatsQuality(teamName, dbStats);
    
    // Log warnings
    if (metadata.warnings && metadata.warnings.length > 0) {
      metadata.warnings.forEach(warning => {
        console.warn(`⚠️ ${warning}`);
      });
    }
    
    // Get stats (either from DB or defaults)
    const stats = dbStats 
      ? await fetchTeamStats(teamName, supabaseUrl, supabaseKey, week) 
      : getDefaultTeamStats(teamName);
    
    // Log quality
    console.log(`📊 Stats quality for ${teamName}: ${metadata.quality} (${metadata.source})`);
    
    return {
      stats: stats!,
      metadata
    };
    
  } catch (error) {
    console.error(`Error fetching stats with quality for ${teamName}:`, error);
    
    // Return defaults with error metadata
    return {
      stats: getDefaultTeamStats(teamName),
      metadata: {
        quality: StatsQuality.DEFAULT_DATA,
        source: 'error_fallback',
        warnings: [`Failed to fetch stats: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    };
  }
}

/**
 * Gets a confidence score (0-100) based on stats quality
 */
export function getStatsConfidenceScore(quality: StatsQuality): number {
  switch (quality) {
    case StatsQuality.REAL_DATA:
      return 100;
    case StatsQuality.PARTIAL_DATA:
      return 75;
    case StatsQuality.STALE_DATA:
      return 50;
    case StatsQuality.DEFAULT_DATA:
      return 25;
    default:
      return 0;
  }
}

/**
 * Determines if stats quality is acceptable for making predictions
 */
export function isStatsQualityAcceptable(quality: StatsQuality): boolean {
  return quality === StatsQuality.REAL_DATA || quality === StatsQuality.PARTIAL_DATA;
}
