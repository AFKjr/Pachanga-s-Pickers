import type { TeamStats } from '../types.ts';

const NFL_TEAM_ID_MAP: Record<string, string> = {
  'Arizona Cardinals': 'de760528-1dc0-416a-a978-b510d20692ff',
  'Atlanta Falcons': 'e6aa13a4-0055-48a9-bc41-be28dc106929',
  'Baltimore Ravens': 'ebd87119-b331-4469-9ea6-d51fe3ce2f1c',
  'Buffalo Bills': '768c92aa-75ff-4a43-bcc0-f2798c2e1724',
  'Carolina Panthers': 'f14bf5cc-9a82-4a38-bc15-d39f75ed5314',
  'Chicago Bears': '7b112545-38e6-483c-a55c-43cab47a0255',
  'Cincinnati Bengals': 'ad4ae08f-d808-42d5-a1e6-e9bc4e34d123',
  'Cleveland Browns': 'd5a2eb42-8065-4174-ab79-0a6fa820e35e',
  'Dallas Cowboys': 'e627eec7-bbae-4fa4-8e73-8e1d6bc5c060',
  'Denver Broncos': 'ce92bd47-93d5-4fe9-ada4-0fc681e6caa0',
  'Detroit Lions': 'c5a59daa-53a7-4de0-851f-fb12be893e6e',
  'Green Bay Packers': 'a20471b4-a8d9-40c7-95ad-90cc30e46932',
  'Houston Texans': '82d2d380-3834-4938-835f-aec541e5ece7',
  'Indianapolis Colts': '82cf9565-6eb9-4f01-bdbd-5aa0d472fcd9',
  'Jacksonville Jaguars': 'f7ddd7fa-0bae-4f90-bc8e-669e4d6cf2de',
  'Kansas City Chiefs': '6680d28d-d4d2-49f6-aace-5292d3ec02c2',
  'Las Vegas Raiders': '1f6dcffb-9823-43cd-9ff4-e7a8466749b5',
  'Los Angeles Chargers': '1c1cec48-6352-4556-b789-35304c1a6ae1',
  'Los Angeles Rams': '2eff2a03-54d4-46ba-890e-2bc3925548f3',
  'Miami Dolphins': '4809ecb0-abd3-451d-9c4a-92a90b83ca06',
  'Minnesota Vikings': '33405046-04ee-4058-a950-d606f8c30852',
  'New England Patriots': '97354895-8c77-4fd4-a860-32e62ea7382a',
  'New Orleans Saints': '0d855753-ea21-4953-89f9-0e20aff9eb73',
  'New York Giants': '04aa1c9d-66da-489d-b16a-1dee3d2eec4d',
  'New York Jets': '5fee86ae-74ab-4bdd-8416-42a9dd9964f3',
  'Philadelphia Eagles': '386bdbf9-9eea-4869-bb9a-274b0bc66e80',
  'Pittsburgh Steelers': 'cb2f9f1f-ac67-424e-9e72-1475cb0ed398',
  'San Francisco 49ers': 'f0e724b0-4cbf-495a-be47-013907608da9',
  'Seattle Seahawks': '3d08af9e-c767-4f88-a7dc-b920c6d2b4a8',
  'Tampa Bay Buccaneers': '4254d319-1bc7-4f81-b4ab-b5e6f3402b69',
  'Tennessee Titans': 'd26a1ca5-722d-4274-8f97-c92e49c96315',
  'Washington Commanders': '22052ff7-c065-42ee-bc8f-c4691c50e624'
};

interface SportRadarTeamStats {
  id: string;
  name: string;
  market: string;
  alias: string;
  season: {
    id: string;
    year: number;
    type: string;
    name: string;
  };
  record: {
    games_played: number;
    wins: number;
    losses: number;
    ties: number;
    win_pct: number;
    points_for: number;
    points_against: number;
    points_rank: number;
    touchdowns: {
      pass: number;
      rush: number;
      total_return: number;
      total: number;
      fumble_return: number;
      int_return: number;
      kick_return: number;
      punt_return: number;
      other: number;
    };
    extra_points: {
      kicks: {
        attempts: number;
        blocked: number;
        made: number;
        pct: number;
      };
      conversions: {
        pass_attempts: number;
        pass_successes: number;
        rush_attempts: number;
        rush_successes: number;
        defense_attempts: number;
        defense_successes: number;
      };
    };
    field_goals: {
      attempts: number;
      made: number;
      blocked: number;
      yards: number;
      avg_yards: number;
      longest: number;
    };
    first_downs: {
      pass: number;
      penalty: number;
      rush: number;
      total: number;
    };
    penalties: {
      penalties: number;
      yards: number;
    };
    rushing: {
      attempts: number;
      yards: number;
      avg_yards: number;
      touchdowns: number;
      longest: number;
      longest_touchdown: number;
      redzone_attempts: number;
      tlost: number;
      tlost_yards: number;
      first_downs: number;
    };
    passing: {
      attempts: number;
      completions: number;
      cmp_pct: number;
      yards: number;
      avg_yards: number;
      touchdowns: number;
      interceptions: number;
      sacks: number;
      sack_yards: number;
      longest: number;
      longest_touchdown: number;
      air_yards: number;
      redzone_attempts: number;
      net_yards: number;
      first_downs: number;
      int_touchdowns: number;
      gross_yards: number;
    };
    defense: {
      tackles: number;
      assists: number;
      combined: number;
      sacks: number;
      sack_yards: number;
      interceptions: number;
      passes_defended: number;
      forced_fumbles: number;
      fumble_recoveries: number;
      qb_hits: number;
      tloss: number;
      tloss_yards: number;
      safeties: number;
      sp_tackles: number;
      sp_assists: number;
      sp_forced_fumbles: number;
      sp_fumble_recoveries: number;
      sp_blocks: number;
      misc_tackles: number;
      misc_assists: number;
      misc_forced_fumbles: number;
      misc_fumble_recoveries: number;
      sp_teams_tackles: number;
      sp_teams_assists: number;
      sp_teams_forced_fumbles: number;
      sp_teams_fumble_recoveries: number;
    };
    efficiency: {
      goaltogo: {
        attempts: number;
        successes: number;
        pct: number;
      };
      redzone: {
        attempts: number;
        scores: number;
        points: number;
        pct: number;
      };
      thirddown: {
        attempts: number;
        successes: number;
        pct: number;
      };
      fourthdown: {
        attempts: number;
        successes: number;
        pct: number;
      };
    };
  };
  opponents: any;
  players: any[];
}

function calculateSafePercentage(numerator: number, denominator: number, fallback: number): number {
  if (!denominator || denominator === 0) return fallback;
  return (numerator / denominator) * 100;
}

function calculateSafeAverage(total: number, games: number, fallback: number): number {
  if (!games || games === 0) return fallback;
  return total / games;
}

export async function fetchTeamStatsFromRapidAPI(
  teamName: string,
  rapidApiKey: string,
  season: number = 2025
): Promise<TeamStats | null> {
  try {
    const teamId = NFL_TEAM_ID_MAP[teamName];
    if (!teamId) {
      console.error(`No team ID found for: ${teamName}`);
      return null;
    }

    console.log(`Fetching Sports Radar stats for ${teamName} (ID: ${teamId})`);

    const url = `https://api.sportradar.com/nfl/official/trial/v7/en/seasons/${season}/REG/teams/${teamId}/statistics.json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': rapidApiKey
      }
    });

    if (!response.ok) {
      console.error(`Sports Radar error for ${teamName}: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return null;
    }

    const data: SportRadarTeamStats = await response.json();

    if (!data || !data.record) {
      console.error(`No stats data found for ${teamName} (ID: ${teamId})`);
      return null;
    }

    const record = data.record;
    const gamesPlayed = record.games_played || 1;

    // Calculate derived stats
    const thirdDownRate = record.efficiency?.thirddown?.pct || 40.0;
    const redZoneRate = record.efficiency?.redzone?.pct || 55.0;

    const completionPercentage = record.passing?.cmp_pct || 65.0;
    const yardsPerPassAttempt = record.passing?.avg_yards || 7.0;
    const yardsPerRush = record.rushing?.avg_yards || 4.4;
    const yardsPerPlay = record.passing?.yards && record.rushing?.yards && record.passing?.sacks
      ? (record.passing.yards + record.rushing.yards) / (record.passing.attempts + record.rushing.attempts + record.passing.sacks)
      : 5.5;

    // Calculate turnover differential
    const turnoversLost = (record.passing?.interceptions || 0) + (record.passing?.sacks || 0); // Simplified
    const turnoversForced = (record.defense?.interceptions || 0) + (record.defense?.fumble_recoveries || 0);
    const turnoverDifferential = calculateSafeAverage(turnoversForced - turnoversLost, gamesPlayed, 0);

    const pointsPerGame = calculateSafeAverage(record.points_for, gamesPlayed, 20);
    const pointsAllowedPerGame = calculateSafeAverage(record.points_against, gamesPlayed, 20);
    const offensiveYardsPerGame = record.passing?.yards && record.rushing?.yards
      ? calculateSafeAverage(record.passing.yards + record.rushing.yards, gamesPlayed, 300)
      : 300;
    const defensiveYardsAllowed = 300; // Sports Radar doesn't provide defensive yards allowed directly

    // Drive stats estimation
    const estimatedDrivesPerGame = 12;
    const playsPerDrive = record.passing?.attempts && record.rushing?.attempts
      ? calculateSafeAverage(record.passing.attempts + record.rushing.attempts, gamesPlayed, 60) / estimatedDrivesPerGame
      : 5.5;
    const pointsPerDrive = pointsPerGame / estimatedDrivesPerGame;
    const yardsPerDrive = offensiveYardsPerGame / estimatedDrivesPerGame;

    console.log(`✅ Sports Radar stats loaded for ${teamName}:`);
    console.log(`   Games: ${gamesPlayed}, Record: ${record.wins}-${record.losses}`);
    console.log(`   3D: ${thirdDownRate.toFixed(1)}%, RZ: ${redZoneRate.toFixed(1)}%`);
    console.log(`   PPG: ${pointsPerGame.toFixed(1)}, YPG: ${offensiveYardsPerGame.toFixed(1)}`);

    return {
      team: teamName,
      gamesPlayed: gamesPlayed,
      offensiveYardsPerGame: offensiveYardsPerGame,
      defensiveYardsAllowed: defensiveYardsAllowed,
      pointsPerGame: pointsPerGame,
      pointsAllowedPerGame: pointsAllowedPerGame,
      turnoverDifferential: turnoverDifferential,
      thirdDownConversionRate: thirdDownRate,
      redZoneEfficiency: redZoneRate,
      passCompletions: calculateSafeAverage(record.passing?.completions || 0, gamesPlayed, 20),
      passAttempts: calculateSafeAverage(record.passing?.attempts || 0, gamesPlayed, 30),
      passCompletionPct: completionPercentage,
      passingYards: calculateSafeAverage(record.passing?.yards || 0, gamesPlayed, 200),
      passingTds: calculateSafeAverage(record.passing?.touchdowns || 0, gamesPlayed, 1.5),
      interceptionsThrown: calculateSafeAverage(record.passing?.interceptions || 0, gamesPlayed, 0.5),
      yardsPerPassAttempt: yardsPerPassAttempt,
      rushingAttempts: calculateSafeAverage(record.rushing?.attempts || 0, gamesPlayed, 25),
      rushingYards: calculateSafeAverage(record.rushing?.yards || 0, gamesPlayed, 100),
      rushingTds: calculateSafeAverage(record.rushing?.touchdowns || 0, gamesPlayed, 0.8),
      yardsPerRush: yardsPerRush,
      totalPlays: calculateSafeAverage((record.passing?.attempts || 0) + (record.rushing?.attempts || 0), gamesPlayed, 60),
      yardsPerPlay: yardsPerPlay,
      firstDowns: calculateSafeAverage(record.first_downs?.total || 0, gamesPlayed, 20),
      penalties: calculateSafeAverage(record.penalties?.penalties || 0, gamesPlayed, 6),
      penaltyYards: calculateSafeAverage(record.penalties?.yards || 0, gamesPlayed, 50),
      turnoversLost: calculateSafeAverage(turnoversLost, gamesPlayed, 1),
      fumblesLost: calculateSafeAverage(record.passing?.sacks || 0, gamesPlayed, 0.5), // Simplified
      defPassCompletionsAllowed: 0, // Not directly available
      defPassAttempts: 0,
      defPassingYardsAllowed: 200, // Estimated
      defPassingTdsAllowed: calculateSafeAverage(record.passing?.touchdowns || 0, gamesPlayed, 1.5), // Simplified
      defInterceptions: calculateSafeAverage(record.defense?.interceptions || 0, gamesPlayed, 0.5),
      defRushingAttemptsAllowed: 0,
      defRushingYardsAllowed: 100, // Estimated
      defRushingTdsAllowed: calculateSafeAverage(record.rushing?.touchdowns || 0, gamesPlayed, 0.8), // Simplified
      defTotalPlays: 0,
      defYardsPerPlayAllowed: 0,
      defFirstDownsAllowed: 0,
      turnoversForced: calculateSafeAverage(turnoversForced, gamesPlayed, 1),
      fumblesForced: calculateSafeAverage(record.defense?.forced_fumbles || 0, gamesPlayed, 0.5),
      drivesPerGame: estimatedDrivesPerGame,
      playsPerDrive: playsPerDrive,
      pointsPerDrive: pointsPerDrive,
      scoringPercentage: redZoneRate,
      yardsPerDrive: yardsPerDrive,
      timePerDriveSeconds: 162
    };
  } catch (error) {
    console.error(`Error fetching Sports Radar stats for ${teamName}:`, error);
    return null;
  }
}export async function fetchTeamStatsWithCache(
  teamName: string,
  sportsRadarApiKey: string,
  supabaseUrl: string,
  supabaseKey: string,
  season: number = 2024,
  cacheHours: number = 24
): Promise<TeamStats | null> {
  const cached = await checkCache(teamName, supabaseUrl, supabaseKey, season, cacheHours);
  if (cached) {
    console.log(`Using cached stats for ${teamName}`);
    return cached;
  }

  const freshStats = await fetchTeamStatsFromRapidAPI(teamName, sportsRadarApiKey, season);

  if (freshStats) {
    await saveToCache(freshStats, supabaseUrl, supabaseKey, season);
    return freshStats;
  }

  return null;
}

async function checkCache(
  teamName: string,
  supabaseUrl: string,
  supabaseKey: string,
  season: number,
  cacheHours: number
): Promise<TeamStats | null> {
  try {
    const query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(teamName)}&season_year=eq.${season}&source=eq.sportsradar&order=last_updated.desc&limit=1&select=*`;

    const response = await fetch(query, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length === 0) return null;

    const cached = data[0];
    const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
    const maxCacheAge = cacheHours * 3600000;

    if (cacheAge < maxCacheAge) {
      return convertDbStatsToTeamStats(cached, teamName);
    }

    return null;
  } catch (error) {
    console.error(`Cache check error for ${teamName}:`, error);
    return null;
  }
}

async function saveToCache(
  stats: TeamStats,
  supabaseUrl: string,
  supabaseKey: string,
  season: number
): Promise<void> {
  try {
    const payload = {
      team_name: stats.team,
      season_year: season,
      week: 1,
      games_played: stats.gamesPlayed,
      offensive_yards_per_game: stats.offensiveYardsPerGame,
      defensive_yards_allowed: stats.defensiveYardsAllowed,
      points_per_game: stats.pointsPerGame,
      points_allowed_per_game: stats.pointsAllowedPerGame,
      turnover_differential: stats.turnoverDifferential,
      third_down_conversion_rate: stats.thirdDownConversionRate,
      red_zone_efficiency: stats.redZoneEfficiency,
      pass_completions: stats.passCompletions,
      pass_attempts: stats.passAttempts,
      pass_completion_pct: stats.passCompletionPct,
      passing_yards: stats.passingYards,
      passing_tds: stats.passingTds,
      interceptions_thrown: stats.interceptionsThrown,
      yards_per_pass_attempt: stats.yardsPerPassAttempt,
      rushing_attempts: stats.rushingAttempts,
      rushing_yards: stats.rushingYards,
      rushing_tds: stats.rushingTds,
      yards_per_rush: stats.yardsPerRush,
      total_plays: stats.totalPlays,
      yards_per_play: stats.yardsPerPlay,
      first_downs: stats.firstDowns,
      penalties: stats.penalties,
      penalty_yards: stats.penaltyYards,
      turnovers_lost: stats.turnoversLost,
      fumbles_lost: stats.fumblesLost,
      def_passing_yards_allowed: stats.defPassingYardsAllowed,
      def_passing_tds_allowed: stats.defPassingTdsAllowed,
      def_interceptions: stats.defInterceptions,
      def_rushing_yards_allowed: stats.defRushingYardsAllowed,
      def_rushing_tds_allowed: stats.defRushingTdsAllowed,
      turnovers_forced: stats.turnoversForced,
      fumbles_forced: stats.fumblesForced,
      drives_per_game: stats.drivesPerGame,
      plays_per_drive: stats.playsPerDrive,
      points_per_drive: stats.pointsPerDrive,
      scoring_percentage: stats.scoringPercentage,
      yards_per_drive: stats.yardsPerDrive,
      time_per_drive_seconds: stats.timePerDriveSeconds,
      source: 'sportsradar',
      last_updated: new Date().toISOString()
    };

    await fetch(`${supabaseUrl}/rest/v1/team_stats_cache`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    console.log(`✅ Cached RapidAPI stats for ${stats.team}`);
  } catch (error) {
    console.error(`Error caching stats for ${stats.team}:`, error);
  }
}

function convertDbStatsToTeamStats(dbStats: any, teamName: string): TeamStats {
  return {
    team: teamName,
    gamesPlayed: dbStats.games_played ?? 1,
    offensiveYardsPerGame: dbStats.offensive_yards_per_game ?? 300,
    defensiveYardsAllowed: dbStats.defensive_yards_allowed ?? 300,
    pointsPerGame: dbStats.points_per_game ?? 20,
    pointsAllowedPerGame: dbStats.points_allowed_per_game ?? 20,
    turnoverDifferential: dbStats.turnover_differential ?? 0,
    thirdDownConversionRate: dbStats.third_down_conversion_rate ?? 40.0,
    redZoneEfficiency: dbStats.red_zone_efficiency ?? 50.0,
    passCompletions: dbStats.pass_completions ?? 20,
    passAttempts: dbStats.pass_attempts ?? 30,
    passCompletionPct: dbStats.pass_completion_pct ?? 66,
    passingYards: dbStats.passing_yards ?? 200,
    passingTds: dbStats.passing_tds ?? 1.5,
    interceptionsThrown: dbStats.interceptions_thrown ?? 0.5,
    yardsPerPassAttempt: dbStats.yards_per_pass_attempt ?? 7,
    rushingAttempts: dbStats.rushing_attempts ?? 25,
    rushingYards: dbStats.rushing_yards ?? 100,
    rushingTds: dbStats.rushing_tds ?? 0.8,
    yardsPerRush: dbStats.yards_per_rush ?? 4,
    totalPlays: dbStats.total_plays ?? 60,
    yardsPerPlay: dbStats.yards_per_play ?? 5.5,
    firstDowns: dbStats.first_downs ?? 20,
    penalties: dbStats.penalties ?? 6,
    penaltyYards: dbStats.penalty_yards ?? 50,
    turnoversLost: dbStats.turnovers_lost ?? 1,
    fumblesLost: dbStats.fumbles_lost ?? 0.5,
    defPassCompletionsAllowed: dbStats.def_pass_completions_allowed ?? 20,
    defPassAttempts: dbStats.def_pass_attempts ?? 30,
    defPassingYardsAllowed: dbStats.def_passing_yards_allowed ?? 200,
    defPassingTdsAllowed: dbStats.def_passing_tds_allowed ?? 1.5,
    defInterceptions: dbStats.def_interceptions ?? 0.5,
    defRushingAttemptsAllowed: dbStats.def_rushing_attempts_allowed ?? 25,
    defRushingYardsAllowed: dbStats.def_rushing_yards_allowed ?? 100,
    defRushingTdsAllowed: dbStats.def_rushing_tds_allowed ?? 0.8,
    defTotalPlays: dbStats.def_total_plays ?? 60,
    defYardsPerPlayAllowed: dbStats.def_yards_per_play_allowed ?? 5.5,
    defFirstDownsAllowed: dbStats.def_first_downs_allowed ?? 20,
    turnoversForced: dbStats.turnovers_forced ?? 1,
    fumblesForced: dbStats.fumbles_forced ?? 0.5,
    drivesPerGame: dbStats.drives_per_game ?? 12,
    playsPerDrive: dbStats.plays_per_drive ?? 5.5,
    pointsPerDrive: dbStats.points_per_drive ?? 2,
    scoringPercentage: dbStats.scoring_percentage ?? 40,
    turnoverPercentage: dbStats.turnover_percentage ?? 8,
    yardsPerDrive: dbStats.yards_per_drive ?? 30,
    timePerDriveSeconds: dbStats.time_per_drive_seconds ?? 162
  };
}