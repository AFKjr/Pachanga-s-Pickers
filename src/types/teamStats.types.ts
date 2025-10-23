/**
 * Team Stats Interface - Matched to YOUR Exact Schema
 *
 * This interface matches your team_stats table exactly.
 * Generated from your actual data structure.
 */

export interface TeamStats {
  // Identifiers
  idx: number;
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  last_updated: string;
  source: string;

  // Basic Offensive Stats
  points_per_game: string; // Note: These are stored as strings in your DB
  offensive_yards_per_game: string;
  passing_yards_per_game: string;
  rushing_yards_per_game: string;
  yards_per_play: string;

  // Passing Offense
  pass_completions: string;
  pass_attempts: string;
  pass_completion_pct: string;
  passing_yards: string;
  passing_tds: string;
  interceptions_thrown: string;
  yards_per_pass_attempt: string;

  // Rushing Offense
  rushing_attempts: string;
  rushing_yards: string;
  rushing_tds: string;
  yards_per_rush: string;

  // Total Offense
  total_plays: string;
  first_downs: string;
  plays_per_game: string;
  drives_per_game: string;

  // Efficiency Metrics
  third_down_attempts: string;
  third_down_conversions: string;
  third_down_conversion_rate: string;
  fourth_down_attempts: string;
  fourth_down_conversions: string;
  red_zone_attempts: string;
  red_zone_touchdowns: string;
  red_zone_efficiency: string;
  scoring_percentage: string;

  // Turnovers
  turnover_differential: string;
  turnovers_lost: string;
  turnovers_per_game: string;
  fumbles_lost: string;
  turnover_percentage: string;

  // Penalties
  penalties: string;
  penalty_yards: string;
  penalty_first_downs: string;

  // Basic Defensive Stats
  points_allowed_per_game: string;
  defensive_yards_allowed: string;
  defensive_yards_per_game: string;
  yards_per_play_allowed: string;

  // Pass Defense
  def_interceptions: string;
  def_passing_yards_allowed: string;
  def_passing_tds_allowed: string;
  def_pass_completions_allowed: string;
  def_pass_attempts: string;

  // Rush Defense
  def_rushing_attempts_allowed: string;
  def_rushing_yards_allowed: string;
  def_rushing_tds_allowed: string;
  def_yards_per_rush_allowed: string;

  // Total Defense
  def_total_plays: string;
  def_first_downs_allowed: string;
  def_yards_per_play_allowed: string;

  // Defensive Efficiency
  third_down_conversion_rate_allowed: string;
  red_zone_efficiency_allowed: string;
  defensive_scoring_pct_allowed: string;

  // Takeaways
  takeaways: number;
  turnovers_forced: string;
  fumbles_forced: string;

  // First Downs Breakdown
  pass_first_downs: string;
  rush_first_downs: string;

  // Nullable fields (not always present)
  expected_points_offense: string | null;
  expected_points_defense: string | null;
  def_pass_first_downs: string | null;
  def_rush_first_downs: string | null;
  def_net_yards_per_pass: string | null;
  red_zone_scoring_pct: string | null;
  field_goal_attempts: string | null;
  field_goals_made: string | null;
  field_goal_pct: string | null;
  extra_point_attempts: string | null;
  extra_points_made: string | null;

  // Special teams (mostly null in your data)
  kickoffs: number | null;
  touchbacks: number | null;
  touchback_pct: number | null;
  punts: number | null;
  punt_yards: number | null;
  punt_net_yards: number | null;
  punt_net_yards_per_punt: number | null;
  punts_inside_20: number | null;
  punts_blocked: number | null;
  kick_returns: number | null;
  kick_return_yards: number | null;
  kick_return_yards_per_return: number | null;
  punt_returns: number | null;
  punt_return_yards: number | null;
  punt_return_yards_per_return: number | null;

  // Additional stats
  all_purpose_yards: number | null;
  receiving_tds: number | null;
  total_tds: number | null;
  two_point_conversions: number | null;
  punt_return_tds: number | null;
  kick_return_tds: number | null;

  // Defensive additional stats
  def_third_down_attempts: number | null;
  def_third_down_conversions: number | null;
  def_fourth_down_attempts: number | null;
  def_fourth_down_conversions: number | null;
  def_red_zone_attempts: number | null;
  def_red_zone_touchdowns: number | null;
  def_red_zone_scoring_pct: number | null;
  qb_hurries: number | null;
  qb_hits: number | null;
  blitzes: number | null;
  blitz_pct: number | null;
  def_field_goal_attempts: number | null;
  def_field_goals_made: number | null;
  def_field_goal_pct: number | null;
  def_extra_point_attempts: number | null;
  def_extra_points_made: number | null;
  def_punts: number | null;
  def_punt_yards: number | null;
  def_punts_blocked: number | null;
  def_kick_returns: number | null;
  def_kick_return_yards: number | null;
  def_punt_returns: number | null;
  def_punt_return_yards: number | null;
  def_rushing_tds: number | null;
  def_receiving_tds: number | null;
  def_total_tds: number | null;
  def_two_point_conversions: number | null;
  def_punt_return_tds: number | null;
  def_kick_return_tds: number | null;

  // Drive stats (mostly null)
  total_drives: number | null;
  drive_scoring_pct: number | null;
  drive_turnover_pct: number | null;
  drive_start_avg: number | null;
  drive_time_avg: number | null;
  drive_points_avg: number | null;
  def_total_drives: number | null;
  def_drive_scoring_pct: number | null;
  def_drive_turnover_pct: number | null;
  def_drive_start_avg: number | null;
  def_drive_time_avg: number | null;
  def_drive_points_avg: number | null;
}/**
 * Helper functions to safely parse string values to numbers
 */
export function parseStatNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get key offensive stats with proper type conversion
 */
export function getOffensiveStats(stats: TeamStats) {
  return {
    ppg: parseStatNumber(stats.points_per_game),
    ypg: parseStatNumber(stats.offensive_yards_per_game),
    passingYpg: parseStatNumber(stats.passing_yards_per_game),
    rushingYpg: parseStatNumber(stats.rushing_yards_per_game),
    yardsPerPlay: parseStatNumber(stats.yards_per_play),
    thirdDownPct: parseStatNumber(stats.third_down_conversion_rate),
    redZonePct: parseStatNumber(stats.red_zone_efficiency),
    turnoverDiff: parseStatNumber(stats.turnover_differential)
  };
}

/**
 * Get key defensive stats with proper type conversion
 */
export function getDefensiveStats(stats: TeamStats) {
  return {
    papg: parseStatNumber(stats.points_allowed_per_game),
    yapg: parseStatNumber(stats.defensive_yards_per_game),
    yardsPerPlayAllowed: parseStatNumber(stats.yards_per_play_allowed),
    rushYardsPerPlayAllowed: parseStatNumber(stats.def_yards_per_rush_allowed),
    thirdDownPctAllowed: parseStatNumber(stats.third_down_conversion_rate_allowed),
    redZonePctAllowed: parseStatNumber(stats.red_zone_efficiency_allowed),
    takeaways: stats.takeaways
  };
}

/**
 * Check if team has strong offense (top tier thresholds)
 */
export function hasStrongOffense(stats: TeamStats): boolean {
  const ppg = parseStatNumber(stats.points_per_game);
  const ypg = parseStatNumber(stats.offensive_yards_per_game);

  return (ppg !== null && ppg >= 27) || (ypg !== null && ypg >= 370);
}

/**
 * Check if team has strong defense (top tier thresholds)
 */
export function hasStrongDefense(stats: TeamStats): boolean {
  const papg = parseStatNumber(stats.points_allowed_per_game);
  const yapg = parseStatNumber(stats.defensive_yards_per_game);

  return (papg !== null && papg <= 19) || (yapg !== null && yapg <= 300);
}

/**
 * Get offensive ranking tier (estimate based on PPG)
 */
export function getOffensiveRankTier(stats: TeamStats): 'elite' | 'good' | 'average' | 'poor' {
  const ppg = parseStatNumber(stats.points_per_game);

  if (ppg === null) return 'average';

  if (ppg >= 27) return 'elite';      // Top ~8 teams
  if (ppg >= 23) return 'good';       // Top ~16 teams
  if (ppg >= 20) return 'average';    // Middle tier
  return 'poor';                       // Bottom tier
}

/**
 * Get defensive ranking tier (estimate based on PAPG)
 */
export function getDefensiveRankTier(stats: TeamStats): 'elite' | 'good' | 'average' | 'poor' {
  const papg = parseStatNumber(stats.points_allowed_per_game);

  if (papg === null) return 'average';

  if (papg <= 18) return 'elite';      // Top ~8 teams
  if (papg <= 21) return 'good';       // Top ~16 teams
  if (papg <= 24) return 'average';    // Middle tier
  return 'poor';                        // Bottom tier
}

/**
 * Team name normalization mapping
 */
export function normalizeTeamName(name: string): string {
  const mapping: Record<string, string> = {
    'KC': 'Kansas City Chiefs',
    'LA': 'Los Angeles Rams',
    'TB': 'Tampa Bay Buccaneers',
    'NO': 'New Orleans Saints',
    'GB': 'Green Bay Packers',
    'SF': 'San Francisco 49ers',
    'NE': 'New England Patriots',
    'BUF': 'Buffalo Bills',
    'MIA': 'Miami Dolphins',
    'NYJ': 'New York Jets',
    'BAL': 'Baltimore Ravens',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'PIT': 'Pittsburgh Steelers',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'HOU': 'Houston Texans',
    'TEN': 'Tennessee Titans',
    'WAS': 'Washington Commanders',
    'DAL': 'Dallas Cowboys',
    'PHI': 'Philadelphia Eagles',
    'NYG': 'New York Giants',
    'CHI': 'Chicago Bears',
    'DET': 'Detroit Lions',
    'MIN': 'Minnesota Vikings',
    'ATL': 'Atlanta Falcons',
    'CAR': 'Carolina Panthers',
    'ARI': 'Arizona Cardinals',
    'SEA': 'Seattle Seahawks'
  };

  return mapping[name] || name;
}

/**
 * Example usage:
 *
 * const stats = await fetchTeamStats('Kansas City Chiefs');
 * const offense = getOffensiveStats(stats);
 * console.log(`PPG: ${offense.ppg}`); // 28.5
 *
 * const hasStrongO = hasStrongOffense(stats);
 * console.log(hasStrongO); // true
 */