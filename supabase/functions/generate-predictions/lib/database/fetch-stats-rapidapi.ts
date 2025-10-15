import type { TeamStats } from '../types.ts';

const NFL_TEAM_ID_MAP: Record<string, string> = {
  'Arizona Cardinals': '22',
  'Atlanta Falcons': '1',
  'Baltimore Ravens': '33',
  'Buffalo Bills': '2',
  'Carolina Panthers': '29',
  'Chicago Bears': '3',
  'Cincinnati Bengals': '4',
  'Cleveland Browns': '5',
  'Dallas Cowboys': '6',
  'Denver Broncos': '7',
  'Detroit Lions': '8',
  'Green Bay Packers': '9',
  'Houston Texans': '34',
  'Indianapolis Colts': '11',
  'Jacksonville Jaguars': '30',
  'Kansas City Chiefs': '12',
  'Las Vegas Raiders': '13',
  'Los Angeles Chargers': '24',
  'Los Angeles Rams': '14',
  'Miami Dolphins': '15',
  'Minnesota Vikings': '16',
  'New England Patriots': '17',
  'New Orleans Saints': '18',
  'New York Giants': '19',
  'New York Jets': '20',
  'Philadelphia Eagles': '21',
  'Pittsburgh Steelers': '23',
  'San Francisco 49ers': '25',
  'Seattle Seahawks': '26',
  'Tampa Bay Buccaneers': '27',
  'Tennessee Titans': '10',
  'Washington Commanders': '28'
};

interface RapidAPITeamStats {
  teamId: number;
  teamName: string;
  teamAbv: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  passingTD: number;
  rushingTD: number;
  passingAttempts: number;
  passingCompletions: number;
  rushingAttempts: number;
  turnovers: number;
  interceptions: number;
  fumblesLost: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  fourthDownConversions: number;
  fourthDownAttempts: number;
  penalties: number;
  penaltyYards: number;
  firstDowns: number;
  totalPlays: number;
  // Defensive stats
  defTotalYards: number;
  defPassingYards: number;
  defRushingYards: number;
  defPassingTD: number;
  defRushingTD: number;
  defInterceptions: number;
  defFumblesRecovered: number;
  sacks: number;
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

    console.log(`Fetching RapidAPI stats for ${teamName} (ID: ${teamId})`);

    const url = `https://nfl-api-data.p.rapidapi.com/nfl-team-statistics?year=${season}&id=${teamId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey
      }
    });

    if (!response.ok) {
      console.error(`RapidAPI error for ${teamName}: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return null;
    }

    const data: RapidAPITeamStats = await response.json();

    if (!data || !data.teamName) {
      console.error(`No data found for ${teamName} (ID: ${teamId})`);
      return null;
    }

    const gamesPlayed = data.gamesPlayed || 1;

    const thirdDownRate = calculateSafePercentage(
      data.thirdDownConversions,
      data.thirdDownAttempts,
      40.0
    );

    const redZoneAttempts = Math.max(1, Math.round(gamesPlayed * 3));
    const redZoneConversions = Math.round(redZoneAttempts * 0.55);
    const redZoneRate = calculateSafePercentage(redZoneConversions, redZoneAttempts, 55.0);

    const completionPercentage = calculateSafePercentage(
      data.passingCompletions,
      data.passingAttempts,
      65.0
    );

    const yardsPerPassAttempt = data.passingAttempts > 0
      ? data.passingYards / data.passingAttempts
      : 7.0;

    const yardsPerRush = data.rushingAttempts > 0
      ? data.rushingYards / data.rushingAttempts
      : 4.4;

    const yardsPerPlay = data.totalPlays > 0
      ? data.totalYards / data.totalPlays
      : 5.5;

    const turnoverDifferential = calculateSafeAverage(
      (data.defInterceptions + data.defFumblesRecovered) - data.turnovers,
      gamesPlayed,
      0
    );

    const pointsPerGame = calculateSafeAverage(data.pointsFor, gamesPlayed, 20);
    const pointsAllowedPerGame = calculateSafeAverage(data.pointsAgainst, gamesPlayed, 20);
    const offensiveYardsPerGame = calculateSafeAverage(data.totalYards, gamesPlayed, 300);
    const defensiveYardsPerGame = calculateSafeAverage(data.defTotalYards, gamesPlayed, 300);

    const estimatedDrivesPerGame = 12;
    const playsPerDrive = calculateSafeAverage(data.totalPlays, gamesPlayed, 60) / estimatedDrivesPerGame;
    const pointsPerDrive = pointsPerGame / estimatedDrivesPerGame;
    const yardsPerDrive = offensiveYardsPerGame / estimatedDrivesPerGame;

    console.log(`✅ RapidAPI stats loaded for ${teamName}:`);
    console.log(`   Games: ${gamesPlayed}, Record: ${data.wins}-${data.losses}`);
    console.log(`   3D: ${thirdDownRate.toFixed(1)}%, RZ: ${redZoneRate.toFixed(1)}%`);
    console.log(`   PPG: ${pointsPerGame.toFixed(1)}, YPG: ${offensiveYardsPerGame.toFixed(1)}`);

    return {
      team: teamName,
      gamesPlayed: gamesPlayed,
      offensiveYardsPerGame: offensiveYardsPerGame,
      defensiveYardsAllowed: defensiveYardsPerGame,
      pointsPerGame: pointsPerGame,
      pointsAllowedPerGame: pointsAllowedPerGame,
      turnoverDifferential: turnoverDifferential,
      thirdDownConversionRate: thirdDownRate,
      redZoneEfficiency: redZoneRate,
      passCompletions: calculateSafeAverage(data.passingCompletions, gamesPlayed, 20),
      passAttempts: calculateSafeAverage(data.passingAttempts, gamesPlayed, 30),
      passCompletionPct: completionPercentage,
      passingYards: calculateSafeAverage(data.passingYards, gamesPlayed, 200),
      passingTds: calculateSafeAverage(data.passingTD, gamesPlayed, 1.5),
      interceptionsThrown: calculateSafeAverage(data.interceptions, gamesPlayed, 0.5),
      yardsPerPassAttempt: yardsPerPassAttempt,
      rushingAttempts: calculateSafeAverage(data.rushingAttempts, gamesPlayed, 25),
      rushingYards: calculateSafeAverage(data.rushingYards, gamesPlayed, 100),
      rushingTds: calculateSafeAverage(data.rushingTD, gamesPlayed, 0.8),
      yardsPerRush: yardsPerRush,
      totalPlays: calculateSafeAverage(data.totalPlays, gamesPlayed, 60),
      yardsPerPlay: yardsPerPlay,
      firstDowns: calculateSafeAverage(data.firstDowns, gamesPlayed, 20),
      penalties: calculateSafeAverage(data.penalties, gamesPlayed, 6),
      penaltyYards: calculateSafeAverage(data.penaltyYards, gamesPlayed, 50),
      turnoversLost: calculateSafeAverage(data.turnovers, gamesPlayed, 1),
      fumblesLost: calculateSafeAverage(data.fumblesLost, gamesPlayed, 0.5),
      defPassCompletionsAllowed: 0,
      defPassAttempts: 0,
      defPassingYardsAllowed: calculateSafeAverage(data.defPassingYards, gamesPlayed, 200),
      defPassingTdsAllowed: calculateSafeAverage(data.defPassingTD, gamesPlayed, 1.5),
      defInterceptions: calculateSafeAverage(data.defInterceptions, gamesPlayed, 0.5),
      defRushingAttemptsAllowed: 0,
      defRushingYardsAllowed: calculateSafeAverage(data.defRushingYards, gamesPlayed, 100),
      defRushingTdsAllowed: calculateSafeAverage(data.defRushingTD, gamesPlayed, 0.8),
      defTotalPlays: 0,
      defYardsPerPlayAllowed: 0,
      defFirstDownsAllowed: 0,
      turnoversForced: calculateSafeAverage(
        data.defInterceptions + data.defFumblesRecovered,
        gamesPlayed,
        1
      ),
      fumblesForced: calculateSafeAverage(data.defFumblesRecovered, gamesPlayed, 0.5),
      drivesPerGame: estimatedDrivesPerGame,
      playsPerDrive: playsPerDrive,
      pointsPerDrive: pointsPerDrive,
      scoringPercentage: redZoneRate,
      yardsPerDrive: yardsPerDrive,
      timePerDriveSeconds: 162
    };
  } catch (error) {
    console.error(`Error fetching RapidAPI stats for ${teamName}:`, error);
    return null;
  }
}

export async function fetchTeamStatsWithCache(
  teamName: string,
  rapidApiKey: string,
  supabaseUrl: string,
  supabaseKey: string,
  season: number = 2025,
  cacheHours: number = 24
): Promise<TeamStats | null> {
  const cached = await checkCache(teamName, supabaseUrl, supabaseKey, season, cacheHours);
  if (cached) {
    console.log(`Using cached stats for ${teamName}`);
    return cached;
  }

  const freshStats = await fetchTeamStatsFromRapidAPI(teamName, rapidApiKey, season);

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
    const query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(teamName)}&season_year=eq.${season}&source=eq.rapidapi&order=last_updated.desc&limit=1&select=*`;

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
      source: 'rapidapi',
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
    yardsPerDrive: dbStats.yards_per_drive ?? 30,
    timePerDriveSeconds: dbStats.time_per_drive_seconds ?? 162
  };
}