// api/lib/database/fetch-stats.ts
import type { TeamStats } from '../types';
import { TEAM_NAME_MAPPINGS } from '../team-mappings';
import { getDefaultTeamStats } from './default-stats';

function resolveTeamName(teamName: string): string | null {
  if (!teamName) return null;
  const cleaned = teamName.trim().toLowerCase();
  return TEAM_NAME_MAPPINGS[cleaned] || null;
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
    
    return {
      team: teamName,
      gamesPlayed: dbStats.games_played || 5,
      offensiveYardsPerGame: dbStats.offensive_yards_per_game || 328.3,
      defensiveYardsAllowed: dbStats.defensive_yards_allowed || 328.3,
      pointsPerGame: dbStats.points_per_game || 23.4,
      pointsAllowedPerGame: dbStats.points_allowed_per_game || 23.4,
      turnoverDifferential: dbStats.turnover_differential || 0,
      thirdDownConversionRate: dbStats.third_down_conversion_rate || 40.0,
      redZoneEfficiency: dbStats.red_zone_efficiency || 55.0,
      passCompletions: dbStats.pass_completions || 21.6,
      passAttempts: dbStats.pass_attempts || 32.7,
      passCompletionPct: dbStats.pass_completion_pct || 65.9,
      passingYards: dbStats.passing_yards || 213.8,
      passingTds: dbStats.passing_tds || 1.6,
      interceptionsThrown: dbStats.interceptions_thrown || 0.7,
      yardsPerPassAttempt: dbStats.yards_per_pass_attempt || 7.0,
      rushingAttempts: dbStats.rushing_attempts || 26.3,
      rushingYards: dbStats.rushing_yards || 114.5,
      rushingTds: dbStats.rushing_tds || 0.9,
      yardsPerRush: dbStats.yards_per_rush || 4.4,
      totalPlays: dbStats.total_plays || 61.2,
      yardsPerPlay: dbStats.yards_per_play || 5.4,
      firstDowns: dbStats.first_downs || 19.6,
      penalties: dbStats.penalties || 7.3,
      penaltyYards: dbStats.penalty_yards || 58.4,
      turnoversLost: dbStats.turnovers_lost || 1.2,
      fumblesLost: dbStats.fumbles_lost || 0.5,
      defPassCompletionsAllowed: dbStats.def_pass_completions_allowed || 21.6,
      defPassAttempts: dbStats.def_pass_attempts || 32.7,
      defPassingYardsAllowed: dbStats.def_passing_yards_allowed || 213.8,
      defPassingTdsAllowed: dbStats.def_passing_tds_allowed || 1.6,
      defInterceptions: dbStats.def_interceptions || 0.7,
      defRushingAttemptsAllowed: dbStats.def_rushing_attempts_allowed || 26.3,
      defRushingYardsAllowed: dbStats.def_rushing_yards_allowed || 114.5,
      defRushingTdsAllowed: dbStats.def_rushing_tds_allowed || 0.9,
      defTotalPlays: dbStats.def_total_plays || 61.2,
      defYardsPerPlayAllowed: dbStats.def_yards_per_play_allowed || 5.4,
      defFirstDownsAllowed: dbStats.def_first_downs_allowed || 19.6,
      turnoversForced: dbStats.turnovers_forced || 1.2,
      fumblesForced: dbStats.fumbles_forced || 0.5,
      drivesPerGame: dbStats.drives_per_game || (dbStats.total_plays / dbStats.games_played / 5.5),
      playsPerDrive: dbStats.plays_per_drive || 5.5,
      pointsPerDrive: dbStats.points_per_drive || 2.0,
      scoringPercentage: dbStats.scoring_percentage || 40.0,
      yardsPerDrive: dbStats.yards_per_drive || 30.0,
      timePerDriveSeconds: dbStats.time_per_drive_seconds || 162
    };
  } catch (error) {
    console.error(`Error fetching stats for ${teamName}:`, error);
    return null;
  }
}

export async function fetchTeamStatsWithFallback(
  teamName: string,
  supabaseUrl: string,
  supabaseKey: string,
  week?: number
): Promise<TeamStats> {
  const stats = await fetchTeamStats(teamName, supabaseUrl, supabaseKey, week);
  return stats || getDefaultTeamStats(teamName);
}
