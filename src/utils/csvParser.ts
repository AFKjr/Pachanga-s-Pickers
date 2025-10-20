// src/utils/csvParser.ts - UPDATED WITH FUSION SUPPORT
import * as Papa from 'papaparse';

const AVERAGE_PLAYS_PER_DRIVE = 5.5;

interface ParsedTeamStats {
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  
  // Core offensive stats
  offensive_yards_per_game: number;
  points_per_game: number;
  yards_per_play: number;
  passing_yards: number;
  passing_yards_per_game: number;
  rushing_yards: number;
  rushing_yards_per_game: number;
  turnovers_lost: number;
  turnovers_per_game: number;
  total_plays: number;
  plays_per_game: number;
  drives_per_game: number;
  
  // Passing stats
  first_downs: number;
  pass_completions: number;
  pass_attempts: number;
  pass_completion_pct: number;
  passing_tds: number;
  interceptions_thrown: number;
  yards_per_pass_attempt: number;
  pass_first_downs: number;
  
  // Rushing stats
  rushing_attempts: number;
  rushing_tds: number;
  yards_per_rush: number;
  rush_first_downs: number;
  
  // Penalties
  penalties: number;
  penalty_yards: number;
  fumbles_lost: number;
  penalty_first_downs: number;
  
  // Situational offense
  third_down_attempts?: number;
  third_down_conversions?: number;
  third_down_conversion_rate?: number;
  fourth_down_attempts?: number;
  fourth_down_conversions?: number;
  red_zone_attempts?: number;
  red_zone_touchdowns?: number;
  red_zone_efficiency?: number;
  red_zone_scoring_pct?: number;
  
  // Drive stats
  total_drives?: number;
  scoring_percentage: number;
  turnover_percentage: number;
  drive_scoring_pct?: number;
  drive_turnover_pct?: number;
  drive_start_avg?: number;
  drive_time_avg?: number;
  drive_points_avg?: number;
  expected_points_offense: number;
  
  // Special teams offense
  field_goal_attempts?: number;
  field_goals_made?: number;
  field_goal_pct?: number;
  extra_point_attempts?: number;
  extra_points_made?: number;
  kickoffs?: number;
  touchbacks?: number;
  touchback_pct?: number;
  punts?: number;
  punt_yards?: number;
  punt_net_yards?: number;
  punt_net_yards_per_punt?: number;
  punts_inside_20?: number;
  punts_blocked?: number;
  kick_returns?: number;
  kick_return_yards?: number;
  kick_return_yards_per_return?: number;
  punt_returns?: number;
  punt_return_yards?: number;
  punt_return_yards_per_return?: number;
  all_purpose_yards?: number;
  receiving_tds?: number;
  total_tds?: number;
  two_point_conversions?: number;
  punt_return_tds?: number;
  kick_return_tds?: number;
  
  // Core defensive stats
  defensive_yards_allowed: number;
  defensive_yards_per_game: number;
  points_allowed_per_game: number;
  yards_per_play_allowed: number;
  def_interceptions: number;
  takeaways: number;
  turnover_differential: number;
  defensive_scoring_pct_allowed: number;
  
  // Defensive passing
  def_total_plays: number;
  def_yards_per_play_allowed: number;
  def_first_downs_allowed: number;
  def_pass_completions_allowed: number;
  def_pass_attempts: number;
  def_passing_yards_allowed: number;
  def_passing_tds_allowed: number;
  def_net_yards_per_pass: number;
  def_pass_first_downs: number;
  
  // Defensive rushing
  def_rushing_attempts_allowed: number;
  def_rushing_yards_allowed: number;
  def_rushing_tds_allowed: number;
  def_yards_per_rush_allowed: number;
  def_rush_first_downs: number;
  
  // Defensive turnovers
  turnovers_forced: number;
  fumbles_forced: number;
  
  // Defensive situational
  def_third_down_attempts?: number;
  def_third_down_conversions?: number;
  def_fourth_down_attempts?: number;
  def_fourth_down_conversions?: number;
  def_red_zone_attempts?: number;
  def_red_zone_touchdowns?: number;
  def_red_zone_scoring_pct?: number;
  
  // Pass rush
  qb_hurries?: number;
  qb_hits?: number;
  blitzes?: number;
  blitz_pct?: number;
  
  // Defensive special teams
  def_field_goal_attempts?: number;
  def_field_goals_made?: number;
  def_field_goal_pct?: number;
  def_extra_point_attempts?: number;
  def_extra_points_made?: number;
  def_punts?: number;
  def_punt_yards?: number;
  def_punts_blocked?: number;
  def_kick_returns?: number;
  def_kick_return_yards?: number;
  def_punt_returns?: number;
  def_punt_return_yards?: number;
  
  // Defensive scoring
  def_rushing_tds?: number;
  def_receiving_tds?: number;
  def_total_tds?: number;
  def_two_point_conversions?: number;
  def_punt_return_tds?: number;
  def_kick_return_tds?: number;
  
  // Defensive drive stats
  def_total_drives?: number;
  def_drive_scoring_pct?: number;
  def_drive_turnover_pct?: number;
  def_drive_start_avg?: number;
  def_drive_time_avg?: number;
  def_drive_points_avg?: number;
  def_scoring_percentage: number;
  def_turnover_percentage: number;
  expected_points_defense: number;
  
  // Metadata
  source: string;
  last_updated: string;
}

/**
 * Parse fused team stats from your fusion script output
 * This handles the .txt files that are CSV formatted with multiple tables
 */
export function parseFusedTeamStats(
  fusedCSV: string,
  week: number = 1,
  seasonYear: number = 2025
): ParsedTeamStats[] {
  const parsed = Papa.parse(fusedCSV, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  const results: ParsedTeamStats[] = [];

  for (const row of parsed.data as any[]) {
    if (!row.team || !row.games) continue;

    const teamName = normalizeTeamName(row.team);
    const gamesPlayed = row.games || 1; // Prevent division by zero

    // Helper function to safely divide by games
    const perGame = (value: any): number => {
      const num = Number(value) || 0;
      return num / gamesPlayed;
    };

    // Helper function to calculate percentage
    const calcPct = (numerator: any, denominator: any): number => {
      const num = Number(numerator) || 0;
      const den = Number(denominator) || 0;
      return den > 0 ? (num / den) * 100 : 0;
    };

    // Helper to get value or default
    const val = (value: any, defaultValue: number = 0): number => {
      return Number(value) || defaultValue;
    };

    // Calculate third down conversion rate
    const thirdDownConversions = val(row.situational_3dconv);
    const thirdDownAttempts = val(row.situational_3datt);
    const thirdDownRate = calcPct(thirdDownConversions, thirdDownAttempts);

    // Calculate red zone efficiency
    const redZoneTouchdowns = val(row.situational_rztd);
    const redZoneAttempts = val(row.situational_rzatt);
    const redZoneEfficiency = calcPct(redZoneTouchdowns, redZoneAttempts);

    // Calculate pass completion percentage
    const passCompletions = val(row.passing_cmp);
    const passAttempts = val(row.passing_att);
    const passCompletionPct = calcPct(passCompletions, passAttempts);

    // Calculate field goal percentage
    const fieldGoalsMade = val(row.kicking_fgm);
    const fieldGoalAttempts = val(row.kicking_fga);
    const fieldGoalPct = calcPct(fieldGoalsMade, fieldGoalAttempts);

    // Calculate defensive red zone stats
    const defRedZoneTouchdowns = val(row.def_situational_rztd);
    const defRedZoneAttempts = val(row.def_situational_rzatt);
    const defRedZoneScoringPct = calcPct(defRedZoneTouchdowns, defRedZoneAttempts);

    // Calculate drives per game
    const totalPlays = val(row.offense_ply);
    const drivesPerGame = (totalPlays / gamesPlayed) / AVERAGE_PLAYS_PER_DRIVE;

    const stats: ParsedTeamStats = {
      team_name: teamName,
      week: week,
      season_year: seasonYear,
      games_played: gamesPlayed,

      // Core offensive stats
      offensive_yards_per_game: perGame(row.offense_yds),
      points_per_game: perGame(row.offense_pf),
      yards_per_play: val(row.offense_y_p),
      passing_yards: val(row.passing_yds),
      passing_yards_per_game: perGame(row.passing_yds),
      rushing_yards: val(row.rushing_yds),
      rushing_yards_per_game: perGame(row.rushing_yds),
      turnovers_lost: perGame(row.offense_to),
      turnovers_per_game: perGame(row.offense_to),
      total_plays: val(row.offense_ply),
      plays_per_game: perGame(row.offense_ply),
      drives_per_game: drivesPerGame,

      // Passing stats
      first_downs: perGame(row.offense_1std),
      pass_completions: perGame(row.passing_cmp),
      pass_attempts: perGame(row.passing_att),
      pass_completion_pct: passCompletionPct,
      passing_tds: perGame(row.passing_td),
      interceptions_thrown: perGame(row.passing_int),
      yards_per_pass_attempt: val(row.passing_ny_a),
      pass_first_downs: perGame(row.passing_1std),

      // Rushing stats
      rushing_attempts: perGame(row.rushing_att),
      rushing_tds: perGame(row.rushing_td),
      yards_per_rush: val(row.rushing_y_a),
      rush_first_downs: perGame(row.rushing_1std),

      // Penalties
      penalties: perGame(row.offense_pen),
      penalty_yards: perGame(row.offense_yds_1),
      fumbles_lost: perGame(row.offense_fl),
      penalty_first_downs: perGame(row.offense_1stpy),

      // Situational offense
      third_down_attempts: perGame(row.situational_3datt),
      third_down_conversions: perGame(row.situational_3dconv),
      third_down_conversion_rate: thirdDownRate,
      fourth_down_attempts: perGame(row.situational_4datt),
      fourth_down_conversions: perGame(row.situational_4dconv),
      red_zone_attempts: perGame(row.situational_rzatt),
      red_zone_touchdowns: perGame(row.situational_rztd),
      red_zone_efficiency: redZoneEfficiency,
      red_zone_scoring_pct: redZoneEfficiency,

      // Drive stats
      total_drives: perGame(row.drive__dr),
      scoring_percentage: val(row.drive_sc),
      turnover_percentage: val(row.drive_to),
      drive_scoring_pct: val(row.drive_sc),
      drive_turnover_pct: val(row.drive_to),
      drive_start_avg: val(row.drive_start, 25.0),
      drive_time_avg: val(row.drive_time, 162.0),
      drive_points_avg: val(row.drive_pts, 2.0),
      expected_points_offense: val(row.offense_exp),

      // Special teams offense
      field_goal_attempts: perGame(row.kicking_fga),
      field_goals_made: perGame(row.kicking_fgm),
      field_goal_pct: fieldGoalPct,
      extra_point_attempts: perGame(row.kicking_xpa),
      extra_points_made: perGame(row.kicking_xpm),
      kickoffs: perGame(row.kicking_ko),
      touchbacks: perGame(row.kicking_tb),
      touchback_pct: val(row.kicking_tb_pct),
      punts: perGame(row.punting_pnt),
      punt_yards: perGame(row.punting_yds),
      punt_net_yards: perGame(row.punting_net),
      punt_net_yards_per_punt: val(row.punting_ny_p, 40.0),
      punts_inside_20: perGame(row.punting_in20),
      punts_blocked: perGame(row.punting_blck),
      kick_returns: perGame(row.returns_ret),
      kick_return_yards: perGame(row.returns_yds),
      kick_return_yards_per_return: val(row.returns_y_r, 23.4),
      punt_returns: perGame(row.returns_rt),
      punt_return_yards: perGame(row.returns_yds_1),
      punt_return_yards_per_return: val(row.returns_y_rt, 8.5),
      all_purpose_yards: perGame(row.returns_apyd),
      receiving_tds: perGame(row.scoring_rectd),
      total_tds: perGame(row.scoring_alltd),
      two_point_conversions: perGame(row.scoring_2pm),
      punt_return_tds: perGame(row.scoring_pr_td),
      kick_return_tds: perGame(row.scoring_kr_td),

      // Core defensive stats
      defensive_yards_allowed: val(row.def_overall_yds),
      defensive_yards_per_game: perGame(row.def_overall_yds),
      points_allowed_per_game: perGame(row.def_overall_pa),
      yards_per_play_allowed: val(row.def_overall_y_p),
      def_interceptions: perGame(row.def_passing_int),
      takeaways: perGame(row.def_overall_to),
      turnover_differential: perGame(row.def_overall_to) - perGame(row.offense_to),
      defensive_scoring_pct_allowed: val(row.def_drive_sc),

      // Defensive passing
      def_total_plays: perGame(row.def_overall_ply),
      def_yards_per_play_allowed: val(row.def_overall_y_p),
      def_first_downs_allowed: perGame(row.def_overall_1std),
      def_pass_completions_allowed: perGame(row.def_passing_cmp),
      def_pass_attempts: perGame(row.def_passing_att),
      def_passing_yards_allowed: perGame(row.def_passing_yds),
      def_passing_tds_allowed: perGame(row.def_passing_td),
      def_net_yards_per_pass: val(row.def_passing_ny_a),
      def_pass_first_downs: perGame(row.def_passing_1std),

      // Defensive rushing
      def_rushing_attempts_allowed: perGame(row.def_rushing_att),
      def_rushing_yards_allowed: perGame(row.def_rushing_yds),
      def_rushing_tds_allowed: perGame(row.def_rushing_td),
      def_yards_per_rush_allowed: val(row.def_rushing_y_a),
      def_rush_first_downs: perGame(row.def_rushing_1std),

      // Defensive turnovers
      turnovers_forced: perGame(row.def_overall_to),
      fumbles_forced: perGame(row.def_overall_fl),

      // Defensive situational
      def_third_down_attempts: perGame(row.def_situational_3datt),
      def_third_down_conversions: perGame(row.def_situational_3dconv),
      def_fourth_down_attempts: perGame(row.def_situational_4datt),
      def_fourth_down_conversions: perGame(row.def_situational_4dconv),
      def_red_zone_attempts: perGame(row.def_situational_rzatt),
      def_red_zone_touchdowns: perGame(row.def_situational_rztd),
      def_red_zone_scoring_pct: defRedZoneScoringPct,

      // Pass rush
      qb_hurries: perGame(row.def_pass_rush_hrry),
      qb_hits: perGame(row.def_passing_qbhits),
      blitzes: perGame(row.def_pass_rush_bltz),
      blitz_pct: val(row.def_pass_rush_bltz_pct),

      // Defensive special teams
      def_field_goal_attempts: perGame(row.def_kicking_fga),
      def_field_goals_made: perGame(row.def_kicking_fgm),
      def_field_goal_pct: calcPct(row.def_kicking_fgm, row.def_kicking_fga),
      def_extra_point_attempts: perGame(row.def_kicking_xpa),
      def_extra_points_made: perGame(row.def_kicking_xpm),
      def_punts: perGame(row.def_punting_pnt),
      def_punt_yards: perGame(row.def_punting_yds),
      def_punts_blocked: perGame(row.def_punting_blck),
      def_kick_returns: perGame(row.def_returns_ret),
      def_kick_return_yards: perGame(row.def_returns_yds),
      def_punt_returns: perGame(row.def_returns_rt),
      def_punt_return_yards: perGame(row.def_returns_yds_1),

      // Defensive scoring
      def_rushing_tds: perGame(row.def_scoring_rshtd),
      def_receiving_tds: perGame(row.def_scoring_rectd),
      def_total_tds: perGame(row.def_scoring_alltd),
      def_two_point_conversions: perGame(row.def_scoring_2pm),
      def_punt_return_tds: perGame(row.def_scoring_pr_td),
      def_kick_return_tds: perGame(row.def_scoring_kr_td),

      // Defensive drive stats
      def_total_drives: perGame(row.def_drive__dr),
      def_drive_scoring_pct: val(row.def_drive_sc),
      def_drive_turnover_pct: val(row.def_drive_to),
      def_drive_start_avg: val(row.def_drive_start, 25.0),
      def_drive_time_avg: val(row.def_drive_time, 162.0),
      def_drive_points_avg: val(row.def_drive_pts, 2.0),
      def_scoring_percentage: val(row.def_drive_sc),
      def_turnover_percentage: val(row.def_drive_to),
      expected_points_defense: val(row.def_overall_exp),

      // Metadata
      source: 'fusion',
      last_updated: new Date().toISOString()
    };

    results.push(stats);
  }

  return results;
}

/**
 * Normalize team names to match database format
 */
function normalizeTeamName(rawName: string): string {
  const cleaned = rawName.trim();
  
  const teamMap: Record<string, string> = {
    'Arizona Cardinals': 'Arizona Cardinals',
    'Atlanta Falcons': 'Atlanta Falcons',
    'Baltimore Ravens': 'Baltimore Ravens',
    'Buffalo Bills': 'Buffalo Bills',
    'Carolina Panthers': 'Carolina Panthers',
    'Chicago Bears': 'Chicago Bears',
    'Cincinnati Bengals': 'Cincinnati Bengals',
    'Cleveland Browns': 'Cleveland Browns',
    'Dallas Cowboys': 'Dallas Cowboys',
    'Denver Broncos': 'Denver Broncos',
    'Detroit Lions': 'Detroit Lions',
    'Green Bay Packers': 'Green Bay Packers',
    'Houston Texans': 'Houston Texans',
    'Indianapolis Colts': 'Indianapolis Colts',
    'Jacksonville Jaguars': 'Jacksonville Jaguars',
    'Kansas City Chiefs': 'Kansas City Chiefs',
    'Las Vegas Raiders': 'Las Vegas Raiders',
    'Los Angeles Chargers': 'Los Angeles Chargers',
    'Los Angeles Rams': 'Los Angeles Rams',
    'Miami Dolphins': 'Miami Dolphins',
    'Minnesota Vikings': 'Minnesota Vikings',
    'New England Patriots': 'New England Patriots',
    'New Orleans Saints': 'New Orleans Saints',
    'New York Giants': 'New York Giants',
    'New York Jets': 'New York Jets',
    'Philadelphia Eagles': 'Philadelphia Eagles',
    'Pittsburgh Steelers': 'Pittsburgh Steelers',
    'San Francisco 49ers': 'San Francisco 49ers',
    'Seattle Seahawks': 'Seattle Seahawks',
    'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
    'Tennessee Titans': 'Tennessee Titans',
    'Washington Commanders': 'Washington Commanders'
  };
  
  return teamMap[cleaned] || cleaned;
}

export type { ParsedTeamStats };

/**
 * Parse weekly team stats from Sports Reference CSV format
 * Extracts all stats needed for Monte Carlo simulation
 */
export function parseWeeklyTeamStats(
  offensiveCSV: string,
  defensiveCSV: string,
  week: number = 1,
  seasonYear: number = 2025
): ParsedTeamStats[] {
  
  // Parse CSVs
  const offensiveParsed = Papa.parse(offensiveCSV, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  const defensiveParsed = Papa.parse(defensiveCSV, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  const results: ParsedTeamStats[] = [];
  
  // Process each offensive row
  for (const offRow of offensiveParsed.data as any[]) {
    if (!offRow.Team || !offRow.Games) continue;
    
    const teamName = normalizeTeamName(offRow.Team);
    const games = offRow.Games;
    
    // Find matching defensive row
    const defRow = (defensiveParsed.data as any[]).find(d => 
      normalizeTeamName(d.Team) === teamName
    );
    
    if (!defRow) {
      console.warn(`No defensive data found for ${teamName}`);
      continue;
    }
    
    // Calculate drives per game (critical for simulation)
    const totalPlays = offRow.Plays || 0;
    const playsPerGame = totalPlays / games;
    const drivesPerGame = playsPerGame / AVERAGE_PLAYS_PER_DRIVE;
    
    // Calculate pass completion percentage
    const passAttempts = offRow['Passes attempted'] || 0;
    const passCompletions = offRow['Passes completed'] || 0;
    const passCompletionPct = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;
    
    // Extract all stats
    const stats: ParsedTeamStats = {
      team_name: teamName,
      week: week,
      season_year: seasonYear,
      games_played: games,
      
      // Offensive
      offensive_yards_per_game: (offRow.Yards || 0) / games,
      points_per_game: (offRow['Points for'] || 0) / games,
      yards_per_play: offRow['Yards per play'] || 0,
      passing_yards: offRow['Passing yards'] || 0,
      passing_yards_per_game: (offRow['Passing yards'] || 0) / games,
      rushing_yards: offRow['Rushing yards'] || 0,
      rushing_yards_per_game: (offRow['Rushing yards'] || 0) / games,
      turnovers_lost: offRow.Turnovers || 0,
      turnovers_per_game: (offRow.Turnovers || 0) / games,
      total_plays: totalPlays,
      plays_per_game: playsPerGame,
      drives_per_game: drivesPerGame,
      scoring_percentage: offRow['Percentage of drives ending in a score'] || 0,
      
      // Additional offensive stats (CORRECTED COLUMN NAMES)
      first_downs: offRow['1st downs'] || 0,
      pass_completions: passCompletions,
      pass_attempts: passAttempts,
      pass_completion_pct: passCompletionPct,
      passing_tds: offRow['Passing touchdowns'] || 0,
      interceptions_thrown: offRow['Interceptions thrown'] || 0,
      yards_per_pass_attempt: offRow['Net yards gain per pass attempt'] || 0,
      rushing_attempts: offRow['Rushing Attempts'] || 0,
      rushing_tds: offRow['Rushinig touchdowns'] || 0, // Note: CSV has typo "Rushinig"
      yards_per_rush: offRow['Rushing yards per attempt'] || 0,
      penalties: offRow['Penalites commited by team and accepted'] || 0, // Note: CSV has typo "Penalites"
      penalty_yards: offRow['Penalties in yards commited by team'] || 0,
      fumbles_lost: offRow['Fumbles lost by player or team'] || 0,
      pass_first_downs: offRow['1st downs by passing'] || 0,
      rush_first_downs: offRow['1st downs by rushing'] || 0,
      penalty_first_downs: offRow['1st down by penalty'] || 0,
      turnover_percentage: offRow['Percentage of drives ending in a turnover'] || 0,
      expected_points_offense: offRow['Expected points contributed by all offense'] || 0,
      
      // Defensive (CORRECTED COLUMN NAMES)
      defensive_yards_allowed: defRow['Yards allowed'] || 0,
      defensive_yards_per_game: (defRow['Yards allowed'] || 0) / games,
      points_allowed_per_game: (defRow['Points allowed by team'] || 0) / games,
      yards_per_play_allowed: defRow['Yards per offensive play'] || 0,
      def_interceptions: defRow.Interceptions || 0,
      takeaways: defRow.Takeaways || 0,
      turnover_differential: (defRow.Takeaways || 0) - (offRow.Turnovers || 0),
      defensive_scoring_pct_allowed: defRow['Percentage of drives ending in a offensive score'] || 0,
      
      // Additional defensive stats (CORRECTED COLUMN NAMES)
      def_total_plays: defRow['Offensive plays allowed'] || 0,
      def_yards_per_play_allowed: defRow['Yards per offensive play'] || 0,
      def_first_downs_allowed: defRow['1st downs allowed'] || 0,
      def_pass_completions_allowed: defRow['Passes completed'] || 0,
      def_pass_attempts: defRow['Passing attempts'] || 0,
      def_passing_yards_allowed: defRow['Yards gained by passing'] || 0,
      def_passing_tds_allowed: defRow['Passing touchdowns allowed'] || 0,
      def_rushing_attempts_allowed: defRow['Rushing attempts allowed'] || 0,
      def_rushing_yards_allowed: defRow['Rushing yards allowed'] || 0,
      def_rushing_tds_allowed: defRow['Rushing Touchdowns'] || 0,
      turnovers_forced: defRow.Takeaways || 0,
      fumbles_forced: defRow['Fumbles caused by defense'] || 0,
      def_pass_first_downs: defRow['1st downs by passing'] || 0,
      def_rush_first_downs: defRow['1st downs by rushing allowed'] || 0,
      def_net_yards_per_pass: defRow['Net yards gained per pass attempt'] || 0,
      def_yards_per_rush_allowed: defRow['Rushing yards per attempt allowed'] || 0,
      def_scoring_percentage: defRow['Percentage of drives ending in a offensive score'] || 0,
      def_turnover_percentage: defRow['Percentages of drives ending in a offensive turnover'] || 0,
      expected_points_defense: defRow['Expected points contributed by all defense'] || 0,
      
      // Metadata
      source: 'csv',
      last_updated: new Date().toISOString()
    };
    
    results.push(stats);
  }
  
  return results;
}
