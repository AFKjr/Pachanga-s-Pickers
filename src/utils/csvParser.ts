// src/utils/csvParser.ts - UPDATED VERSION
import Papa from 'papaparse';

const AVERAGE_PLAYS_PER_DRIVE = 5.5; // NFL average

interface ParsedTeamStats {
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  
  // Offensive stats
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
  scoring_percentage: number; // Used as proxy for red zone
  
  // Additional offensive stats
  first_downs: number;
  pass_completions: number;
  pass_attempts: number;
  pass_completion_pct: number;
  passing_tds: number;
  interceptions_thrown: number;
  yards_per_pass_attempt: number;
  rushing_attempts: number;
  rushing_tds: number;
  yards_per_rush: number;
  penalties: number;
  penalty_yards: number;
  fumbles_lost: number;
  pass_first_downs: number;
  rush_first_downs: number;
  penalty_first_downs: number;
  turnover_percentage: number;
  expected_points_offense: number;
  
  // Defensive stats
  defensive_yards_allowed: number;
  defensive_yards_per_game: number;
  points_allowed_per_game: number;
  yards_per_play_allowed: number;
  def_interceptions: number;
  takeaways: number;
  turnover_differential: number;
  defensive_scoring_pct_allowed: number;
  
  // Additional defensive stats
  def_total_plays: number;
  def_yards_per_play_allowed: number;
  def_first_downs_allowed: number;
  def_pass_completions_allowed: number;
  def_pass_attempts: number;
  def_passing_yards_allowed: number;
  def_passing_tds_allowed: number;
  def_rushing_attempts_allowed: number;
  def_rushing_yards_allowed: number;
  def_rushing_tds_allowed: number;
  turnovers_forced: number;
  fumbles_forced: number;
  def_pass_first_downs: number;
  def_rush_first_downs: number;
  def_net_yards_per_pass: number;
  def_yards_per_rush_allowed: number;
  def_scoring_percentage: number;
  def_turnover_percentage: number;
  expected_points_defense: number;
  
  // Metadata
  source: string;
  last_updated: string;
}

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

/**
 * Normalize team names to match database format
 */
function normalizeTeamName(rawName: string): string {
  // Remove extra spaces and standardize
  const cleaned = rawName.trim();
  
  // Map common variations to canonical names
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
