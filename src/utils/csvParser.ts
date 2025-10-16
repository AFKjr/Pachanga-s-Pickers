// Removed legacy interfaces - now using TeamStats interface with index-based parsing

/**
 * Complete team stats interface for index-based parsing
 * Matches database schema for team_stats_cache table
 */
export interface TeamStats {
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  points_per_game: number;
  offensive_yards_per_game: number;
  defensive_yards_allowed: number;
  points_allowed_per_game: number;
  total_plays: number;
  yards_per_play: number;
  first_downs: number;
  turnovers_lost: number;
  fumbles_lost: number;
  pass_completions: number;
  pass_attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions_thrown: number;
  yards_per_pass_attempt: number;
  rushing_attempts: number;
  rushing_yards: number;
  rushing_tds: number;
  yards_per_rush: number;
  penalties: number;
  penalty_yards: number;
  scoring_percentage: number;
  pass_completion_pct: number;
  turnovers_forced: number;
  fumbles_forced: number;
  def_total_plays: number;
  def_yards_per_play_allowed: number;
  def_first_downs_allowed: number;
  def_pass_completions_allowed: number;
  def_pass_attempts: number;
  def_passing_yards_allowed: number;
  def_passing_tds_allowed: number;
  def_interceptions: number;
  def_rushing_attempts_allowed: number;
  def_rushing_yards_allowed: number;
  def_rushing_tds_allowed: number;
  turnover_differential: number;
  source: string;
  last_updated: string;
}

/**
 * Column indices for offense CSV (0-based)
 * Based on Sports Reference standard format
 */
const OFFENSE_COLUMNS = {
  RANK: 0,
  TEAM: 1,
  GAMES: 2,
  POINTS_FOR: 3,
  TOTAL_YARDS: 4,
  PLAYS: 5,
  YARDS_PER_PLAY: 6,
  TURNOVERS: 7,
  FUMBLES_LOST: 8,
  FIRST_DOWNS: 9,
  PASS_COMPLETIONS: 10,
  PASS_ATTEMPTS: 11,
  PASS_YARDS: 12,
  PASS_TDS: 13,
  INTERCEPTIONS: 14,
  NET_YARDS_PER_PASS: 15,
  PASS_FIRST_DOWNS: 16,
  RUSH_ATTEMPTS: 17,
  RUSH_YARDS: 18,
  RUSH_TDS: 19,
  YARDS_PER_RUSH: 20,
  RUSH_FIRST_DOWNS: 21,
  PENALTIES: 22,
  PENALTY_YARDS: 23,
  PENALTY_FIRST_DOWNS: 24,
  SCORING_PCT: 25,
  TURNOVER_PCT: 26,
  EXP: 27
};

/**
 * Column indices for defense CSV (0-based)
 * Based on Sports Reference standard format
 */
const DEFENSE_COLUMNS = {
  RANK: 0,
  TEAM: 1,
  GAMES: 2,
  POINTS_AGAINST: 3,
  TOTAL_YARDS: 4,
  PLAYS: 5,
  YARDS_PER_PLAY: 6,
  TURNOVERS: 7,
  FUMBLES_FORCED: 8,
  FIRST_DOWNS: 9,
  PASS_COMPLETIONS: 10,
  PASS_ATTEMPTS: 11,
  PASS_YARDS: 12,
  PASS_TDS: 13,
  INTERCEPTIONS: 14,
  NET_YARDS_PER_PASS: 15,
  PASS_FIRST_DOWNS: 16,
  RUSH_ATTEMPTS: 17,
  RUSH_YARDS: 18,
  RUSH_TDS: 19,
  YARDS_PER_RUSH: 20,
  RUSH_FIRST_DOWNS: 21,
  PENALTIES: 22,
  PENALTY_YARDS: 23,
  PENALTY_FIRST_DOWNS: 24,
  SCORING_PCT: 25,
  TURNOVER_PCT: 26,
  EXP: 27
};

// Removed legacy helper functions - functionality moved to parseCSVByIndex

// =============================================================================
// INDEX-BASED PARSING FUNCTIONS (CURRENT - More Reliable)
// =============================================================================
/**
 * Parse weekly team stats using index-based parsing (more reliable)
 * Returns array of TeamStats objects ready for database insertion
 * 
 * @param offenseCSV - Raw offense CSV text
 * @param defenseCSV - Raw defense CSV text  
 * @returns Array of TeamStats objects (not a map)
 */
export function parseWeeklyTeamStats(
  offenseCSV: string,
  defenseCSV: string
): Partial<TeamStats>[] {
  console.log('📊 Parsing offense CSV with index-based parser...');
  const offenseRows = parseCSVByIndex(offenseCSV);
  
  console.log('🛡️ Parsing defense CSV with index-based parser...');
  const defenseRows = parseCSVByIndex(defenseCSV);
  
  // Automatically detect and skip header rows
  let offenseStartRow = 1;
  let defenseStartRow = 1;
  
  // Check if row 1 is a header row (contains 'Rk', 'Tm', etc.)
  if (offenseRows.length > 1 && (offenseRows[1].includes('Rk') || offenseRows[1].includes('Tm'))) {
    offenseStartRow = 2; // Skip both category and column headers
    console.log('� Detected category headers in offense CSV, skipping first 2 rows');
  }
  
  if (defenseRows.length > 1 && (defenseRows[1].includes('Rk') || defenseRows[1].includes('Tm'))) {
    defenseStartRow = 2; // Skip both category and column headers
    console.log('� Detected category headers in defense CSV, skipping first 2 rows');
  }
  
  const offenseDataRows = offenseRows.slice(offenseStartRow);
  const defenseDataRows = defenseRows.slice(defenseStartRow);
  
  console.log(`✅ Offense: ${offenseDataRows.length} data rows, Defense: ${defenseDataRows.length} data rows`);
  
  // Map data by team name
  const teamStatsMap = new Map<string, Partial<TeamStats>>();
  
  // Process offense data
  for (const row of offenseDataRows) {
    const teamName = row[OFFENSE_COLUMNS.TEAM];
    const games = row[OFFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string' || teamName === 'Tm') {
      continue; // Skip invalid rows or additional header rows
    }
    
    const offenseStats = parseOffenseRow(row, games);
    teamStatsMap.set(teamName, offenseStats);
  }
  
  // Process defense data and merge
  for (const row of defenseDataRows) {
    const teamName = row[DEFENSE_COLUMNS.TEAM];
    const games = row[DEFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string' || teamName === 'Tm') {
      continue; // Skip invalid rows or additional header rows
    }
    
    const defenseStats = parseDefenseRow(row, games);
    const existing = teamStatsMap.get(teamName);
    
    if (existing) {
      // Merge defense stats with existing offense stats
      Object.assign(existing, defenseStats);
      
      // Calculate turnover differential
      existing.turnover_differential = (existing.turnovers_forced || 0) - (existing.turnovers_lost || 0);
    } else {
      // Defense-only entry (shouldn't happen, but handle it)
      teamStatsMap.set(teamName, {
        ...defenseStats,
        turnover_differential: (defenseStats.turnovers_forced || 0)
      });
    }
  }
  
  console.log(`✅ Parsed stats for ${teamStatsMap.size} teams`);
  
  // Debug output for sample team
  const sampleTeam = teamStatsMap.get('Detroit Lions');
  if (sampleTeam) {
    console.log('✅ SAMPLE PARSED DATA - Detroit Lions:', {
      offYards: sampleTeam.offensive_yards_per_game,
      defYards: sampleTeam.defensive_yards_allowed,
      ppg: sampleTeam.points_per_game,
      games: sampleTeam.games_played,
      passingYards: sampleTeam.passing_yards,
      rushingYards: sampleTeam.rushing_yards,
      turnovers: sampleTeam.turnovers_lost,
      defInterceptions: sampleTeam.def_interceptions,
      turnoverDiff: sampleTeam.turnover_differential
    });
  }
  
  // Return as array
  return Array.from(teamStatsMap.values());
}

/**
 * Parse a simple CSV with automatic multi-level header detection
 * 
 * FEATURES:
 * - Automatically detects category headers (like Sports Reference format)
 * - Handles percentage symbols and numeric conversions
 * - Skips empty rows
 * - Uses same detection logic as parseStatsSection
 * 
 * @param csvText - Raw CSV text content
 * @returns Array of parsed row objects with column headers as keys
 */
export function parseSimpleCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return [];
  }
  
  // Parse all rows into 2D array
  const rows = lines.map(line => 
    line.split(',').map(cell => cell.trim())
  );
  
  const firstRow = rows[0];
  const secondRow = rows[1];
  
  // Detect if we have a category header row by checking the second row for standard stat column indicators
  const secondRowHasStatColumns = (
    secondRow.some(cell => cell === 'Rk') ||  // Has rank column
    secondRow.some(cell => cell === 'Tm') ||  // Has team column
    secondRow.some(cell => cell === 'G') ||   // Has games column
    secondRow.some(cell => cell === 'PF') ||  // Has points for
    secondRow.some(cell => cell === 'Yds') || // Has yards
    secondRow.some(cell => cell === 'Cmp') || // Has completions
    secondRow.some(cell => cell === 'Att')    // Has attempts
  );
  
  // Additional check: first row should have mostly empty cells or category labels if it's a category header
  const firstRowEmptyCells = firstRow.filter(cell => cell === '').length;
  const firstRowHasCategoryLabels = firstRow.some(cell => 
    cell.includes('Passing') || 
    cell.includes('Rushing') || 
    cell.includes('Tot Yds') ||
    cell.includes('Penalties')
  );
  
  // If second row has stat columns AND first row is mostly empty or has category labels, 
  // then first row is category header and second row is actual headers
  const hasCategoryHeader = secondRowHasStatColumns && 
    (firstRowEmptyCells > firstRow.length / 3 || firstRowHasCategoryLabels);
  
  // Use second row as headers if we detected a category header row
  const headerRowIndex = hasCategoryHeader ? 1 : 0;
  const headers = rows[headerRowIndex];
  const dataStartIndex = headerRowIndex + 1;
  
  console.log(`📋 parseSimpleCSV: Category header = ${hasCategoryHeader}, Using row ${headerRowIndex} as headers`);
  
  const parsedData = [];
  
  for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex++) {
    const values = rows[rowIndex];
    
    // Skip empty rows
    if (!values || values.length === 0 || values.every(cell => cell === '')) {
      continue;
    }
    
    const rowData: any = {};
    
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const header = headers[columnIndex];
      
      // Only process non-empty headers
      if (!header || header === '') {
        continue;
      }
      
      let value = values[columnIndex] || '';
      
      // Strip percentage symbols if present
      if (value.endsWith('%')) {
        value = value.replace('%', '');
      }
      
      // Convert to number if possible
      const numericValue = Number(value);
      rowData[header] = !isNaN(numericValue) && value !== '' ? numericValue : value;
    }
    
    // Only add rows that have some meaningful data
    if (Object.keys(rowData).length > 0) {
      parsedData.push(rowData);
    }
  }
  
  console.log(`✅ parseSimpleCSV: Parsed ${parsedData.length} data rows`);
  
  return parsedData;
}

/**
 * Parse CSV by column index (more reliable than header-based parsing)
 * Handles percentage symbols and numeric conversions
 * 
 * @param csvText - Raw CSV text content
 * @returns 2D array of parsed values
 */
function parseCSVByIndex(csvText: string): any[][] {
  const lines = csvText.trim().split('\n');
  const data: any[][] = [];
  
  for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
    const line = lines[rowIndex].trim();
    if (!line) continue;
    
    const values = line.split(',').map(value => {
      let cleanValue = value.trim();
      
      // Strip percentage symbols
      if (cleanValue.endsWith('%')) {
        cleanValue = cleanValue.replace('%', '');
      }
      
      // Convert to number if possible
      const numericValue = Number(cleanValue);
      return !isNaN(numericValue) && cleanValue !== '' ? numericValue : cleanValue;
    });
    
    data.push(values);
  }
  
  return data;
}

/**
 * Parse an offense row by column index and calculate per-game stats
 * 
 * @param row - Array of values from CSV row
 * @param games - Number of games played (for per-game calculations)
 * @returns Partial TeamStats object with offense data
 */
function parseOffenseRow(row: any[], games: number): Partial<TeamStats> {
  const safeDiv = (value: number, divisor: number) => divisor > 0 ? value / divisor : 0;
  
  return {
    team_name: row[OFFENSE_COLUMNS.TEAM],
    games_played: row[OFFENSE_COLUMNS.GAMES],
    points_per_game: safeDiv(row[OFFENSE_COLUMNS.POINTS_FOR], games),
    offensive_yards_per_game: safeDiv(row[OFFENSE_COLUMNS.TOTAL_YARDS], games),
    total_plays: safeDiv(row[OFFENSE_COLUMNS.PLAYS], games),
    yards_per_play: row[OFFENSE_COLUMNS.YARDS_PER_PLAY],
    first_downs: safeDiv(row[OFFENSE_COLUMNS.FIRST_DOWNS], games),
    turnovers_lost: safeDiv(row[OFFENSE_COLUMNS.TURNOVERS], games),
    fumbles_lost: safeDiv(row[OFFENSE_COLUMNS.FUMBLES_LOST], games),
    pass_completions: safeDiv(row[OFFENSE_COLUMNS.PASS_COMPLETIONS], games),
    pass_attempts: safeDiv(row[OFFENSE_COLUMNS.PASS_ATTEMPTS], games),
    passing_yards: safeDiv(row[OFFENSE_COLUMNS.PASS_YARDS], games),
    passing_tds: safeDiv(row[OFFENSE_COLUMNS.PASS_TDS], games),
    interceptions_thrown: safeDiv(row[OFFENSE_COLUMNS.INTERCEPTIONS], games),
    yards_per_pass_attempt: row[OFFENSE_COLUMNS.NET_YARDS_PER_PASS],
    rushing_attempts: safeDiv(row[OFFENSE_COLUMNS.RUSH_ATTEMPTS], games),
    rushing_yards: safeDiv(row[OFFENSE_COLUMNS.RUSH_YARDS], games),
    rushing_tds: safeDiv(row[OFFENSE_COLUMNS.RUSH_TDS], games),
    yards_per_rush: row[OFFENSE_COLUMNS.YARDS_PER_RUSH],
    penalties: safeDiv(row[OFFENSE_COLUMNS.PENALTIES], games),
    penalty_yards: safeDiv(row[OFFENSE_COLUMNS.PENALTY_YARDS], games),
    scoring_percentage: row[OFFENSE_COLUMNS.SCORING_PCT],
    pass_completion_pct: row[OFFENSE_COLUMNS.PASS_ATTEMPTS] > 0 
      ? (row[OFFENSE_COLUMNS.PASS_COMPLETIONS] / row[OFFENSE_COLUMNS.PASS_ATTEMPTS]) * 100 
      : 0
  };
}

/**
 * Parse a defense row by column index and calculate per-game stats
 * 
 * @param row - Array of values from CSV row
 * @param games - Number of games played (for per-game calculations)
 * @returns Partial TeamStats object with defense data
 */
function parseDefenseRow(row: any[], games: number): Partial<TeamStats> {
  const safeDiv = (value: number, divisor: number) => divisor > 0 ? value / divisor : 0;
  
  return {
    team_name: row[DEFENSE_COLUMNS.TEAM],
    games_played: row[DEFENSE_COLUMNS.GAMES],
    points_allowed_per_game: safeDiv(row[DEFENSE_COLUMNS.POINTS_AGAINST], games),
    defensive_yards_allowed: safeDiv(row[DEFENSE_COLUMNS.TOTAL_YARDS], games),
    def_total_plays: safeDiv(row[DEFENSE_COLUMNS.PLAYS], games),
    def_yards_per_play_allowed: row[DEFENSE_COLUMNS.YARDS_PER_PLAY],
    def_first_downs_allowed: safeDiv(row[DEFENSE_COLUMNS.FIRST_DOWNS], games),
    turnovers_forced: safeDiv(row[DEFENSE_COLUMNS.TURNOVERS], games),
    fumbles_forced: safeDiv(row[DEFENSE_COLUMNS.FUMBLES_FORCED], games),
    def_pass_completions_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_COMPLETIONS], games),
    def_pass_attempts: safeDiv(row[DEFENSE_COLUMNS.PASS_ATTEMPTS], games),
    def_passing_yards_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_YARDS], games),
    def_passing_tds_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_TDS], games),
    def_interceptions: safeDiv(row[DEFENSE_COLUMNS.INTERCEPTIONS], games),
    def_rushing_attempts_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_ATTEMPTS], games),
    def_rushing_yards_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_YARDS], games),
    def_rushing_tds_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_TDS], games)
  };
}

/**
 * Import team stats from offense and defense CSVs to Supabase
 * Uses index-based parsing for reliability with Sports Reference CSV format
 * 
 * @param offenseCSV - Raw offense CSV text
 * @param defenseCSV - Raw defense CSV text
 * @param week - Week number
 * @param season - Season year
 * @param supabase - Supabase client instance
 * @returns Object with success status and teams processed count
 */
export async function importTeamStats(
  offenseCSV: string,
  defenseCSV: string,
  week: number,
  season: number,
  supabase: any
) {
  console.log(`📊 Processing stats for Week ${week}, Season ${season}`);
  
  // Parse both CSVs by column index
  console.log('📊 Parsing offense CSV...');
  const offenseRows = parseCSVByIndex(offenseCSV);
  
  console.log('🛡️ Parsing defense CSV...');
  const defenseRows = parseCSVByIndex(defenseCSV);
  
  // Skip header row (row 0) - could be category headers or regular headers
  // Also skip row 1 if it looks like a header row (contains 'Rk', 'Tm', etc.)
  let offenseStartRow = 1;
  let defenseStartRow = 1;
  
  if (offenseRows.length > 1 && (offenseRows[1].includes('Rk') || offenseRows[1].includes('Tm'))) {
    offenseStartRow = 2; // Skip both category and column headers
  }
  
  if (defenseRows.length > 1 && (defenseRows[1].includes('Rk') || defenseRows[1].includes('Tm'))) {
    defenseStartRow = 2; // Skip both category and column headers
  }
  
  const offenseDataRows = offenseRows.slice(offenseStartRow);
  const defenseDataRows = defenseRows.slice(defenseStartRow);
  
  console.log(`✅ Parsed ${offenseDataRows.length} offense rows, ${defenseDataRows.length} defense rows`);
  
  // Map data by team
  const teamStatsMap = new Map<string, Partial<TeamStats>>();
  
  // Process offense data
  for (const row of offenseDataRows) {
    const teamName = row[OFFENSE_COLUMNS.TEAM];
    const games = row[OFFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string') continue;
    
    const offenseStats = parseOffenseRow(row, games);
    teamStatsMap.set(teamName, {
      ...offenseStats,
      week,
      season_year: season,
      source: 'csv',
      last_updated: new Date().toISOString()
    });
  }
  
  // Process defense data and merge
  for (const row of defenseDataRows) {
    const teamName = row[DEFENSE_COLUMNS.TEAM];
    const games = row[DEFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string') continue;
    
    const defenseStats = parseDefenseRow(row, games);
    const existing = teamStatsMap.get(teamName);
    
    if (existing) {
      // Merge defense stats with existing offense stats
      Object.assign(existing, defenseStats);
      
      // Calculate turnover differential
      existing.turnover_differential = (existing.turnovers_forced || 0) - (existing.turnovers_lost || 0);
    } else {
      // Defense-only entry (shouldn't happen, but handle it)
      teamStatsMap.set(teamName, {
        ...defenseStats,
        week,
        season_year: season,
        source: 'csv',
        last_updated: new Date().toISOString()
      });
    }
  }
  
  console.log(`✅ Mapped stats for ${teamStatsMap.size} teams`);
  
  // Debug output for sample team
  const sampleTeam = teamStatsMap.get('Detroit Lions');
  if (sampleTeam) {
    console.log('✅ PARSED DATA - Detroit Lions:', {
      offYards: sampleTeam.offensive_yards_per_game,
      defYards: sampleTeam.defensive_yards_allowed,
      ppg: sampleTeam.points_per_game,
      games: sampleTeam.games_played,
      passingYards: sampleTeam.passing_yards,
      rushingYards: sampleTeam.rushing_yards,
      turnovers: sampleTeam.turnovers_lost,
      defInterceptions: sampleTeam.def_interceptions
    });
  }
  
  // Import to Supabase
  const statsArray = Array.from(teamStatsMap.values());
  
  for (const teamStats of statsArray) {
    try {
      const { error } = await supabase
        .from('team_stats_cache')
        .upsert(teamStats, {
          onConflict: 'team_name,week,season_year'
        });
      
      if (error) {
        console.error(`❌ Error importing ${teamStats.team_name}:`, error);
      } else {
        console.log(`✅ Imported/Updated: ${teamStats.team_name}`);
      }
    } catch (err) {
      console.error(`❌ Exception importing ${teamStats.team_name}:`, err);
    }
  }
  
  return {
    success: true,
    teamsProcessed: statsArray.length
  };
}
