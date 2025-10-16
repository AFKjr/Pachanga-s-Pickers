// Removed legacy interfaces - now using TeamStats interface with index-based parsing


export interface TeamStats {
  
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  
  
  points_per_game: number;                    
  offensive_yards_per_game: number;           
  total_plays: number;                        
  yards_per_play: number;                     
  turnovers_lost: number;                     
  fumbles_lost: number;                       
  first_downs: number;                        
  pass_completions: number;                   
  pass_attempts: number;                      
  passing_yards: number;                      
  passing_tds: number;                        
  interceptions_thrown: number;               
  yards_per_pass_attempt: number;             
  pass_first_downs: number;                   
  rushing_attempts: number;                   
  rushing_yards: number;                      
  rushing_tds: number;                        
  yards_per_rush: number;                     
  rush_first_downs: number;                   
  penalties: number;                          
  penalty_yards: number;                      
  penalty_first_downs: number;                
  scoring_percentage: number;                 
  turnover_percentage: number;                
  expected_points_offense: number;            
  
  
  points_allowed_per_game: number;            
  defensive_yards_allowed: number;            
  def_total_plays: number;                    
  def_yards_per_play_allowed: number;         
  turnovers_forced: number;                   
  fumbles_forced: number;                     
  def_first_downs_allowed: number;            
  def_pass_completions_allowed: number;       
  def_pass_attempts: number;                  
  def_passing_yards_allowed: number;          
  def_passing_tds_allowed: number;            
  def_interceptions: number;                  
  def_net_yards_per_pass: number;             
  def_pass_first_downs: number;               
  def_rushing_attempts_allowed: number;       
  def_rushing_yards_allowed: number;          
  def_rushing_tds_allowed: number;            
  def_yards_per_rush_allowed: number;         
  def_rush_first_downs: number;               
  def_scoring_percentage: number;             
  def_turnover_percentage: number;            
  expected_points_defense: number;            
  
  
  turnover_differential: number;              
  pass_completion_pct: number;                
  
  
  source: string;
  last_updated: string;
}


const OFFENSE_COLUMNS = {
  TEAM: 0,                          
  GAMES: 1,                         
  POINTS_FOR: 2,                    
  TOTAL_YARDS: 3,                   
  PLAYS: 4,                         
  YARDS_PER_PLAY: 5,                
  TURNOVERS: 6,                     
  FUMBLES_LOST: 7,                  
  FIRST_DOWNS: 8,                   
  PASS_COMPLETIONS: 9,              
  PASS_ATTEMPTS: 10,                
  PASS_YARDS: 11,                   
  PASS_TDS: 12,                     
  INTERCEPTIONS: 13,                
  NET_YARDS_PER_PASS: 14,           
  PASS_FIRST_DOWNS: 15,             
  RUSH_ATTEMPTS: 16,                
  RUSH_YARDS: 17,                   
  RUSH_TDS: 18,                     
  YARDS_PER_RUSH: 19,               
  RUSH_FIRST_DOWNS: 20,             
  PENALTIES: 21,                    
  PENALTY_YARDS: 22,                
  PENALTY_FIRST_DOWNS: 23,          
  SCORING_PCT: 24,                  
  TURNOVER_PCT: 25,                 
  EXP_POINTS: 26                    
};


const DEFENSE_COLUMNS = {
  TEAM: 0,                          
  GAMES: 1,                         
  POINTS_AGAINST: 2,                
  TOTAL_YARDS: 3,                   
  PLAYS: 4,                         
  YARDS_PER_PLAY: 5,                
  TAKEAWAYS: 6,                     
  FUMBLES_FORCED: 7,                
  FIRST_DOWNS: 8,                   
  PASS_COMPLETIONS: 9,              
  PASS_ATTEMPTS: 10,                
  PASS_YARDS: 11,                   
  PASS_TDS: 12,                     
  INTERCEPTIONS: 13,                
  NET_YARDS_PER_PASS: 14,           
  PASS_FIRST_DOWNS: 15,             
  RUSH_ATTEMPTS: 16,                
  RUSH_YARDS: 17,                   
  RUSH_TDS: 18,                     
  YARDS_PER_RUSH: 19,               
  RUSH_FIRST_DOWNS: 20,             
  SCORING_PCT: 21,                  
  TURNOVER_PCT: 22,                 
  EXP_POINTS: 23                    
};







export function parseWeeklyTeamStats(
  offenseCSV: string,
  defenseCSV: string
): Partial<TeamStats>[] {
  console.log('📊 Parsing offense CSV with index-based parser...');
  const offenseRows = parseCSVByIndex(offenseCSV);
  
  console.log('🛡️ Parsing defense CSV with index-based parser...');
  const defenseRows = parseCSVByIndex(defenseCSV);
  
  
  
  const offenseHasHeader = offenseRows.length > 0 && 
    (offenseRows[0].includes('Team') || offenseRows[0].includes('Games'));
  const defenseHasHeader = defenseRows.length > 0 && 
    (defenseRows[0].includes('Team') || defenseRows[0].includes('Games'));
  
  let offenseStartRow = offenseHasHeader ? 1 : 0;
  let defenseStartRow = defenseHasHeader ? 1 : 0;
  
  console.log(`📋 Offense CSV: Header detected = ${offenseHasHeader}, starting at row ${offenseStartRow}`);
  console.log(`📋 Defense CSV: Header detected = ${defenseHasHeader}, starting at row ${defenseStartRow}`);
  
  const offenseDataRows = offenseRows.slice(offenseStartRow);
  const defenseDataRows = defenseRows.slice(defenseStartRow);
  
  console.log(`✅ Offense: ${offenseDataRows.length} data rows, Defense: ${defenseDataRows.length} data rows`);
  
  
  const teamStatsMap = new Map<string, Partial<TeamStats>>();
  
  
  for (const row of offenseDataRows) {
    const teamName = row[OFFENSE_COLUMNS.TEAM];
    const games = row[OFFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string' || teamName === 'Tm') {
      continue; 
    }
    
    const offenseStats = parseOffenseRow(row, games);
    teamStatsMap.set(teamName, offenseStats);
  }
  
  
  for (const row of defenseDataRows) {
    const teamName = row[DEFENSE_COLUMNS.TEAM];
    const games = row[DEFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string' || teamName === 'Tm') {
      continue; 
    }
    
    const defenseStats = parseDefenseRow(row, games);
    const existing = teamStatsMap.get(teamName);
    
    if (existing) {
      
      Object.assign(existing, defenseStats);
      
      
      existing.turnover_differential = (existing.turnovers_forced || 0) - (existing.turnovers_lost || 0);
    } else {
      
      teamStatsMap.set(teamName, {
        ...defenseStats,
        turnover_differential: (defenseStats.turnovers_forced || 0)
      });
    }
  }
  
  console.log(`✅ Parsed stats for ${teamStatsMap.size} teams`);
  
  
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
  
  
  return Array.from(teamStatsMap.values());
}


export function parseSimpleCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return [];
  }
  
  
  const rows = lines.map(line => 
    line.split(',').map(cell => cell.trim())
  );
  
  const firstRow = rows[0];
  const secondRow = rows[1];
  
  
  const secondRowHasStatColumns = (
    secondRow.some(cell => cell === 'Rk') ||  
    secondRow.some(cell => cell === 'Tm') ||  
    secondRow.some(cell => cell === 'G') ||   
    secondRow.some(cell => cell === 'PF') ||  
    secondRow.some(cell => cell === 'Yds') || 
    secondRow.some(cell => cell === 'Cmp') || 
    secondRow.some(cell => cell === 'Att')    
  );
  
  
  const firstRowEmptyCells = firstRow.filter(cell => cell === '').length;
  const firstRowHasCategoryLabels = firstRow.some(cell => 
    cell.includes('Passing') || 
    cell.includes('Rushing') || 
    cell.includes('Tot Yds') ||
    cell.includes('Penalties')
  );
  
  
  
  const hasCategoryHeader = secondRowHasStatColumns && 
    (firstRowEmptyCells > firstRow.length / 3 || firstRowHasCategoryLabels);
  
  
  const headerRowIndex = hasCategoryHeader ? 1 : 0;
  const headers = rows[headerRowIndex];
  const dataStartIndex = headerRowIndex + 1;
  
  console.log(`📋 parseSimpleCSV: Category header = ${hasCategoryHeader}, Using row ${headerRowIndex} as headers`);
  
  const parsedData = [];
  
  for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex++) {
    const values = rows[rowIndex];
    
    
    if (!values || values.length === 0 || values.every(cell => cell === '')) {
      continue;
    }
    
    const rowData: any = {};
    
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const header = headers[columnIndex];
      
      if (!header || header === '') {
        continue;
      }
      
      let value = values[columnIndex] || '';
      
      if (value.endsWith('%')) {
        value = value.replace('%', '');
      }
      
      const numericValue = Number(value);
      rowData[header] = !isNaN(numericValue) && value !== '' ? numericValue : value;
    }
    
    if (Object.keys(rowData).length > 0) {
      parsedData.push(rowData);
    }
  }
  
  console.log(`✅ parseSimpleCSV: Parsed ${parsedData.length} data rows`);
  
  return parsedData;
}

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
      
      
      if (cleanValue.endsWith('%')) {
        cleanValue = cleanValue.replace('%', '');
      }
      
      const numericValue = Number(cleanValue);
      return !isNaN(numericValue) && cleanValue !== '' ? numericValue : cleanValue;
    });
    
    data.push(values);
  }
  
  return data;
}

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
    turnovers_lost: safeDiv(row[OFFENSE_COLUMNS.TURNOVERS], games),
    fumbles_lost: safeDiv(row[OFFENSE_COLUMNS.FUMBLES_LOST], games),
    first_downs: safeDiv(row[OFFENSE_COLUMNS.FIRST_DOWNS], games),
    pass_completions: safeDiv(row[OFFENSE_COLUMNS.PASS_COMPLETIONS], games),
    pass_attempts: safeDiv(row[OFFENSE_COLUMNS.PASS_ATTEMPTS], games),
    passing_yards: safeDiv(row[OFFENSE_COLUMNS.PASS_YARDS], games),
    passing_tds: safeDiv(row[OFFENSE_COLUMNS.PASS_TDS], games),
    interceptions_thrown: safeDiv(row[OFFENSE_COLUMNS.INTERCEPTIONS], games),
    yards_per_pass_attempt: row[OFFENSE_COLUMNS.NET_YARDS_PER_PASS],
    pass_first_downs: safeDiv(row[OFFENSE_COLUMNS.PASS_FIRST_DOWNS], games),
    rushing_attempts: safeDiv(row[OFFENSE_COLUMNS.RUSH_ATTEMPTS], games),
    rushing_yards: safeDiv(row[OFFENSE_COLUMNS.RUSH_YARDS], games),
    rushing_tds: safeDiv(row[OFFENSE_COLUMNS.RUSH_TDS], games),
    yards_per_rush: row[OFFENSE_COLUMNS.YARDS_PER_RUSH],
    rush_first_downs: safeDiv(row[OFFENSE_COLUMNS.RUSH_FIRST_DOWNS], games),
    penalties: safeDiv(row[OFFENSE_COLUMNS.PENALTIES], games),
    penalty_yards: safeDiv(row[OFFENSE_COLUMNS.PENALTY_YARDS], games),
    penalty_first_downs: safeDiv(row[OFFENSE_COLUMNS.PENALTY_FIRST_DOWNS], games),
    scoring_percentage: row[OFFENSE_COLUMNS.SCORING_PCT],
    turnover_percentage: row[OFFENSE_COLUMNS.TURNOVER_PCT],
    expected_points_offense: row[OFFENSE_COLUMNS.EXP_POINTS],
    pass_completion_pct: row[OFFENSE_COLUMNS.PASS_ATTEMPTS] > 0 
      ? (row[OFFENSE_COLUMNS.PASS_COMPLETIONS] / row[OFFENSE_COLUMNS.PASS_ATTEMPTS]) * 100 
      : 0
  };
}

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
    turnovers_forced: safeDiv(row[DEFENSE_COLUMNS.TAKEAWAYS], games),
    fumbles_forced: safeDiv(row[DEFENSE_COLUMNS.FUMBLES_FORCED], games),
    def_first_downs_allowed: safeDiv(row[DEFENSE_COLUMNS.FIRST_DOWNS], games),
    def_pass_completions_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_COMPLETIONS], games),
    def_pass_attempts: safeDiv(row[DEFENSE_COLUMNS.PASS_ATTEMPTS], games),
    def_passing_yards_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_YARDS], games),
    def_passing_tds_allowed: safeDiv(row[DEFENSE_COLUMNS.PASS_TDS], games),
    def_interceptions: safeDiv(row[DEFENSE_COLUMNS.INTERCEPTIONS], games),
    def_net_yards_per_pass: row[DEFENSE_COLUMNS.NET_YARDS_PER_PASS],
    def_pass_first_downs: safeDiv(row[DEFENSE_COLUMNS.PASS_FIRST_DOWNS], games),
    def_rushing_attempts_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_ATTEMPTS], games),
    def_rushing_yards_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_YARDS], games),
    def_rushing_tds_allowed: safeDiv(row[DEFENSE_COLUMNS.RUSH_TDS], games),
    def_yards_per_rush_allowed: row[DEFENSE_COLUMNS.YARDS_PER_RUSH],
    def_rush_first_downs: safeDiv(row[DEFENSE_COLUMNS.RUSH_FIRST_DOWNS], games),
    def_scoring_percentage: row[DEFENSE_COLUMNS.SCORING_PCT],
    def_turnover_percentage: row[DEFENSE_COLUMNS.TURNOVER_PCT],
    expected_points_defense: row[DEFENSE_COLUMNS.EXP_POINTS]
  };
}

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
  
  console.log('📊 Parsing offense CSV...');
  const offenseRows = parseCSVByIndex(offenseCSV);
  
  console.log('🛡️ Parsing defense CSV...');
  const defenseRows = parseCSVByIndex(defenseCSV);
  
  let offenseStartRow = 1;
  let defenseStartRow = 1;
  
  if (offenseRows.length > 1 && (offenseRows[1].includes('Rk') || offenseRows[1].includes('Tm'))) {
    offenseStartRow = 2; 
  }
  
  if (defenseRows.length > 1 && (defenseRows[1].includes('Rk') || defenseRows[1].includes('Tm'))) {
    defenseStartRow = 2; 
  }
  
  const offenseDataRows = offenseRows.slice(offenseStartRow);
  const defenseDataRows = defenseRows.slice(defenseStartRow);
  
  console.log(`✅ Parsed ${offenseDataRows.length} offense rows, ${defenseDataRows.length} defense rows`);
  
  
  const teamStatsMap = new Map<string, Partial<TeamStats>>();
  
  
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
  
  
  for (const row of defenseDataRows) {
    const teamName = row[DEFENSE_COLUMNS.TEAM];
    const games = row[DEFENSE_COLUMNS.GAMES] || 1;
    
    if (!teamName || typeof teamName !== 'string') continue;
    
    const defenseStats = parseDefenseRow(row, games);
    const existing = teamStatsMap.get(teamName);
    
    if (existing) {
      
      Object.assign(existing, defenseStats);
      
      
      existing.turnover_differential = (existing.turnovers_forced || 0) - (existing.turnovers_lost || 0);
    } else {
      
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
