interface TeamStatsRow {
  Tm?: string;
  Team?: string;
  [key: string]: any;
}

interface ParsedTeamStats {
  [teamName: string]: {
    // Offensive stats
    games_played?: number;
    offensive_yards_per_game?: number;
    points_per_game?: number;
    passing_yards?: number;
    passing_tds?: number;
    rushing_yards?: number;
    rushing_tds?: number;
    yards_per_play?: number;
    third_down_conversion_rate?: number;
    red_zone_efficiency?: number;
    turnovers_lost?: number;

    // NEW: Stats that were missing
    drives_per_game?: number;
    third_down_attempts?: number;
    third_down_conversions?: number;
    fourth_down_attempts?: number;
    fourth_down_conversions?: number;
    red_zone_attempts?: number;
    red_zone_touchdowns?: number;

    // Defensive stats
    defensive_yards_allowed?: number;
    points_allowed_per_game?: number;
    def_passing_yards_allowed?: number;
    def_passing_tds_allowed?: number;
    def_rushing_yards_allowed?: number;
    def_rushing_tds_allowed?: number;
    def_yards_per_play_allowed?: number;
    turnovers_forced?: number;
    def_interceptions?: number;
  };
}

/**
 * Helper: Convert percentage string to number
 * "62.5%" → 62.5
 * "62.5" → 62.5
 * 62.5 → 62.5
 */
function parsePercentage(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // If string, remove % and parse
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Check if a row should be skipped
 */
function isInvalidRow(teamName: string, cells: string[]): boolean {
  // Skip rows with invalid team names
  if (!teamName || teamName === '' || /^\d+$/.test(teamName) || teamName.length <= 2) {
    return true;
  }

  // Skip summary rows
  const lowerTeamName = teamName.toLowerCase();
  if (
    lowerTeamName.includes('avg team') ||
    lowerTeamName.includes('league total') ||
    lowerTeamName.includes('avg tm/g') ||
    lowerTeamName.includes('tot yds') ||
    lowerTeamName.includes('passing') ||
    lowerTeamName.includes('rushing') ||
    teamName.startsWith('---')
  ) {
    return true;
  }

  // For sections with rank column (Rk), skip if first cell is not a valid rank
  // But for sections without rank (like passing section), first cell is team name
  // So we only check rank if the team name doesn't look like a team name
  const firstCell = cells[0]?.trim();
  if (firstCell && isNaN(parseInt(firstCell)) && firstCell !== teamName) {
    // If first cell is not a number and not the team name, it might be invalid
    // But this is too restrictive, so let's skip this check for now
  }

  return false;
}

/**
 * Sports Reference CSVs have multiple stat sections separated by blank lines.
 * Each section has its own header row that we need to identify and skip.
 *
 * Example structure:
 * Section 1: General Offense (Rk, Tm, G, PF, Yds...)
 * <blank line>
 * Section 2: Passing Details (Tm, G, Cmp, Att, Yds...)
 * <blank line>
 * Section 3: Rushing Details (Rk, Tm, G, Att, Yds...)
 * etc.
 */
export function parseMultiSectionCSV(csvContent: string, type: 'offense' | 'defense' = 'offense'): ParsedTeamStats {
  // Split content into lines
  const lines = csvContent.split('\n');

  const teamStats: ParsedTeamStats = {};
  let currentSection: TeamStatsRow[] = [];
  let currentHeaders: string[] = [];
  let isProcessingSection = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();

    // Skip empty lines (section separators)
    if (!line) {
      // If we were processing a section, save it
      if (currentSection.length > 0) {
        mergeSection(teamStats, currentSection, type);
        currentSection = [];
        currentHeaders = [];
      }
      isProcessingSection = false;
      continue;
    }

    // Check if this line is a header row
    const cells = line.split(',');
    const firstCell = cells[0]?.trim();
    const secondCell = cells[1]?.trim();

    // Header indicators: first column is 'Rk' or 'Tm', second is 'Tm' or 'Team' or 'G'
    if (firstCell === 'Rk' || firstCell === 'Tm' || (firstCell === '' && (secondCell === 'Tm' || secondCell === 'Team'))) {
      // This is a header row - start new section
      currentHeaders = cells.map(h => h.trim());
      isProcessingSection = true;
      continue;
    }

    // If we're in a section and this is a data row
    if (isProcessingSection && currentHeaders.length > 0) {
      const rowObj: TeamStatsRow = {};
      
      cells.forEach((cell, cellIndex) => {
        if (cellIndex < currentHeaders.length) {
          const header = currentHeaders[cellIndex];
          let value = cell.trim();
          
          // FIX: Strip % symbol before parsing numbers
          if (value.endsWith('%')) {
            value = value.replace('%', '').trim();
          }
          
          // Convert numeric strings to numbers
          if (value && !isNaN(Number(value))) {
            rowObj[header] = Number(value);
          } else {
            rowObj[header] = value;
          }
        }
      });      // Only add rows that have a valid team name
      const teamName = rowObj.Tm || rowObj.Team;
      if (teamName && teamName !== 'Tm' && teamName !== 'Team' && !isInvalidRow(teamName, cells)) {
        currentSection.push(rowObj);
      }
    }
  }

  // Process last section if exists
  if (currentSection.length > 0) {
    mergeSection(teamStats, currentSection, type);
  }

  return teamStats;
}

/**
 * Merge a parsed section into the team stats object
 */
function mergeSection(
  teamStats: ParsedTeamStats,
  section: TeamStatsRow[],
  type: 'offense' | 'defense' = 'offense'
): void {
  section.forEach(row => {
    const teamName = row.Tm || row.Team;
    if (!teamName) return;

    // Initialize team if not exists
    if (!teamStats[teamName]) {
      teamStats[teamName] = {};
    }

    // Map column names to database column names
    const mappedRow = mapColumnNames(row, type);

    // Merge into team stats
    Object.assign(teamStats[teamName], mappedRow);
  });
}

/**
 * Map Sports Reference column names to your database column names
 */
function mapColumnNames(row: TeamStatsRow, type: 'offense' | 'defense' = 'offense'): Partial<ParsedTeamStats[string]> {
  const mapped: Partial<ParsedTeamStats[string]> = {};

  // Games played
  if (row.G !== undefined) mapped.games_played = row.G;

  // Offensive stats (total yards section - has PF and Yds but no Cmp)
  if (row.PF !== undefined && row.Cmp === undefined) {
    mapped.points_per_game = row.PF;
    mapped.offensive_yards_per_game = row.Yds;
    if (row['Y/P'] !== undefined) mapped.yards_per_play = row['Y/P'];
    if (row.TO !== undefined) mapped.turnovers_lost = row.TO;
  }

  // Passing stats section (has Cmp, Att, and Int)
  if (row.Cmp !== undefined && row.Att !== undefined && row.Int !== undefined) {
    if (type === 'offense') {
      // Offensive passing
      mapped.passing_yards = row.Yds;
      mapped.passing_tds = row.TD;
    } else {
      // Defensive passing
      mapped.def_passing_yards_allowed = row.Yds;
      mapped.def_passing_tds_allowed = row.TD;
      mapped.def_interceptions = row.Int;
    }
  }

  // Rushing stats section (has Att, Yds, TD but no Cmp or Int)
  if (row.Att !== undefined && row.Cmp === undefined && row.Int === undefined && row.PF === undefined && row.PA === undefined) {
    if (type === 'offense') {
      // Offensive rushing
      mapped.rushing_yards = row.Yds;
      mapped.rushing_tds = row.TD;
    } else {
      // Defensive rushing
      mapped.def_rushing_yards_allowed = row.Yds;
      mapped.def_rushing_tds_allowed = row.TD;
    }
  }

  // Defensive rushing (has PA and Att but no Cmp or Int)
  if (row.PA !== undefined && row.Att !== undefined && row.Cmp === undefined && row.Int === undefined) {
    mapped.defensive_yards_allowed = row.Yds;
    mapped.points_allowed_per_game = row.PA;
    mapped.def_rushing_yards_allowed = row.Yds;
    mapped.def_rushing_tds_allowed = row.TD;
    if (row['Y/P'] !== undefined) mapped.def_yards_per_play_allowed = row['Y/P'];
  }

  // Downs section (CRITICAL - fixes 0% issue)
  if (row['3DAtt'] !== undefined) {
    mapped.third_down_attempts = row['3DAtt'];
    mapped.third_down_conversions = row['3DConv'];
    
    // FIX: Strip % symbol from 3D%
    if (row['3D%'] !== undefined) {
      mapped.third_down_conversion_rate = parsePercentage(row['3D%']);
    } else if (row['3DAtt'] > 0) {
      mapped.third_down_conversion_rate = (row['3DConv'] / row['3DAtt']) * 100;
    }
  }

  if (row['4DAtt'] !== undefined) {
    mapped.fourth_down_attempts = row['4DAtt'];
    mapped.fourth_down_conversions = row['4DConv'];
  }

  // Red zone section
  if (row.RZAtt !== undefined) {
    mapped.red_zone_attempts = row.RZAtt;
    mapped.red_zone_touchdowns = row.RZTD;
    
    // FIX: Strip % symbol from RZPct
    if (row['RZPct'] !== undefined) {
      mapped.red_zone_efficiency = parsePercentage(row['RZPct']);
    } else if (row.RZAtt > 0) {
      mapped.red_zone_efficiency = (row.RZTD / row.RZAtt) * 100;
    }
  }

  // Average drive section (has #Dr)
  if (row['#Dr'] !== undefined) {
    mapped.drives_per_game = row['#Dr'];
  }

  // Defensive stats (has PA instead of PF)
  if (row.PA !== undefined && row.Cmp === undefined && row.Att === undefined) {
    mapped.points_allowed_per_game = row.PA;
    mapped.defensive_yards_allowed = row.Yds;
    if (row['Y/P'] !== undefined) mapped.def_yards_per_play_allowed = row['Y/P'];
  }

  return mapped;
}

/**
 * Calculate missing drive stats from available data
 */
export function enrichWithCalculatedStats(
  stats: Partial<ParsedTeamStats[string]>
): Partial<ParsedTeamStats[string]> {
  const enriched = { ...stats };

  // Calculate drives_per_game if missing
  if (!enriched.drives_per_game || enriched.drives_per_game === 0) {
    // NFL average is about 12 possessions per game
    enriched.drives_per_game = 12;
    console.warn(`Missing drives_per_game, using NFL average: 12`);
  }

  // Calculate third down stats if missing but we have rate
  if ((!enriched.third_down_attempts || enriched.third_down_attempts === 0) && enriched.third_down_conversion_rate) {
    // NFL average: about 13 third down attempts per game
    enriched.third_down_attempts = 13;
    enriched.third_down_conversions = (enriched.third_down_attempts * enriched.third_down_conversion_rate) / 100;
    console.warn(`Calculating third down attempts from conversion rate`);
  }

  // Calculate red zone stats if missing but we have efficiency
  if ((!enriched.red_zone_attempts || enriched.red_zone_attempts === 0) && enriched.red_zone_efficiency) {
    // Estimate: about 35% of drives reach red zone
    enriched.red_zone_attempts = (enriched.drives_per_game || 12) * 0.35;
    enriched.red_zone_touchdowns = (enriched.red_zone_attempts * enriched.red_zone_efficiency) / 100;
    console.warn(`Calculating red zone attempts from efficiency rate`);
  }

  return enriched;
}

/**
 * Main function to parse both offense and defense CSVs and merge them
 */
export function parseWeeklyTeamStats(
  offenseCSV: string,
  defenseCSV: string
): ParsedTeamStats {
  console.log('📊 Parsing offense CSV...');
  const offenseStats = parseMultiSectionCSV(offenseCSV, 'offense');

  console.log('🛡️ Parsing defense CSV...');
  const defenseStats = parseMultiSectionCSV(defenseCSV, 'defense');

  // Merge offense and defense stats
  const mergedStats: ParsedTeamStats = {};

  // Get all unique team names
  const allTeams = new Set([
    ...Object.keys(offenseStats),
    ...Object.keys(defenseStats)
  ]);

  allTeams.forEach(team => {
    mergedStats[team] = {
      ...(offenseStats[team] || {}),
      ...(defenseStats[team] || {})
    };

    // Enrich with calculated stats
    mergedStats[team] = enrichWithCalculatedStats(mergedStats[team]);
  });

  console.log(`✅ Parsed stats for ${allTeams.size} teams`);

  return mergedStats;
}
