// nfl-stats-fusion.ts
// Fuses multiple NFL stat tables into a single comprehensive dataset

import * as fs from 'fs';
import * as Papa from 'papaparse';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RawTableRow {
  [key: string]: string | number;
}

interface ParsedTable {
  tableType: string;
  headers: string[];
  rows: RawTableRow[];
}

interface TableDefinition {
  name: string;
  identifierColumns: string[];
  columnPrefix: string;
  priority: number;
}

interface FusedTeamStats {
  [key: string]: string | number | undefined;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FusionReport {
  totalTables: number;
  tablesProcessed: number;
  teamCount: number;
  missingData: { [team: string]: string[] };
  warnings: string[];
}

// ============================================================================
// TEAM NAME MAPPINGS
// ============================================================================

const TEAM_NAME_MAPPINGS: { [key: string]: string } = {
  'arizona cardinals': 'Arizona Cardinals',
  'cardinals': 'Arizona Cardinals',
  'ari': 'Arizona Cardinals',
  
  'atlanta falcons': 'Atlanta Falcons',
  'falcons': 'Atlanta Falcons',
  'atl': 'Atlanta Falcons',
  
  'baltimore ravens': 'Baltimore Ravens',
  'ravens': 'Baltimore Ravens',
  'bal': 'Baltimore Ravens',
  
  'buffalo bills': 'Buffalo Bills',
  'bills': 'Buffalo Bills',
  'buf': 'Buffalo Bills',
  
  'carolina panthers': 'Carolina Panthers',
  'panthers': 'Carolina Panthers',
  'car': 'Carolina Panthers',
  
  'chicago bears': 'Chicago Bears',
  'bears': 'Chicago Bears',
  'chi': 'Chicago Bears',
  
  'cincinnati bengals': 'Cincinnati Bengals',
  'bengals': 'Cincinnati Bengals',
  'cin': 'Cincinnati Bengals',
  
  'cleveland browns': 'Cleveland Browns',
  'browns': 'Cleveland Browns',
  'cle': 'Cleveland Browns',
  
  'dallas cowboys': 'Dallas Cowboys',
  'cowboys': 'Dallas Cowboys',
  'dal': 'Dallas Cowboys',
  
  'denver broncos': 'Denver Broncos',
  'broncos': 'Denver Broncos',
  'den': 'Denver Broncos',
  
  'detroit lions': 'Detroit Lions',
  'lions': 'Detroit Lions',
  'det': 'Detroit Lions',
  
  'green bay packers': 'Green Bay Packers',
  'packers': 'Green Bay Packers',
  'gb': 'Green Bay Packers',
  
  'houston texans': 'Houston Texans',
  'texans': 'Houston Texans',
  'hou': 'Houston Texans',
  
  'indianapolis colts': 'Indianapolis Colts',
  'colts': 'Indianapolis Colts',
  'ind': 'Indianapolis Colts',
  
  'jacksonville jaguars': 'Jacksonville Jaguars',
  'jaguars': 'Jacksonville Jaguars',
  'jax': 'Jacksonville Jaguars',
  
  'kansas city chiefs': 'Kansas City Chiefs',
  'chiefs': 'Kansas City Chiefs',
  'kc': 'Kansas City Chiefs',
  
  'las vegas raiders': 'Las Vegas Raiders',
  'raiders': 'Las Vegas Raiders',
  'lv': 'Las Vegas Raiders',
  
  'los angeles chargers': 'Los Angeles Chargers',
  'la chargers': 'Los Angeles Chargers',
  'chargers': 'Los Angeles Chargers',
  'lac': 'Los Angeles Chargers',
  
  'los angeles rams': 'Los Angeles Rams',
  'la rams': 'Los Angeles Rams',
  'rams': 'Los Angeles Rams',
  'lar': 'Los Angeles Rams',
  
  'miami dolphins': 'Miami Dolphins',
  'dolphins': 'Miami Dolphins',
  'mia': 'Miami Dolphins',
  
  'minnesota vikings': 'Minnesota Vikings',
  'vikings': 'Minnesota Vikings',
  'min': 'Minnesota Vikings',
  
  'new england patriots': 'New England Patriots',
  'patriots': 'New England Patriots',
  'ne': 'New England Patriots',
  
  'new orleans saints': 'New Orleans Saints',
  'saints': 'New Orleans Saints',
  'no': 'New Orleans Saints',
  
  'new york giants': 'New York Giants',
  'giants': 'New York Giants',
  'nyg': 'New York Giants',
  
  'new york jets': 'New York Jets',
  'jets': 'New York Jets',
  'nyj': 'New York Jets',
  
  'philadelphia eagles': 'Philadelphia Eagles',
  'eagles': 'Philadelphia Eagles',
  'phi': 'Philadelphia Eagles',
  
  'pittsburgh steelers': 'Pittsburgh Steelers',
  'steelers': 'Pittsburgh Steelers',
  'pit': 'Pittsburgh Steelers',
  
  'san francisco 49ers': 'San Francisco 49ers',
  '49ers': 'San Francisco 49ers',
  'sf': 'San Francisco 49ers',
  
  'seattle seahawks': 'Seattle Seahawks',
  'seahawks': 'Seattle Seahawks',
  'sea': 'Seattle Seahawks',
  
  'tampa bay buccaneers': 'Tampa Bay Buccaneers',
  'buccaneers': 'Tampa Bay Buccaneers',
  'tb': 'Tampa Bay Buccaneers',
  
  'tennessee titans': 'Tennessee Titans',
  'titans': 'Tennessee Titans',
  'ten': 'Tennessee Titans',
  
  'washington commanders': 'Washington Commanders',
  'commanders': 'Washington Commanders',
  'was': 'Washington Commanders'
};

// ============================================================================
// TABLE DEFINITIONS
// ============================================================================

const OFFENSIVE_TABLE_DEFINITIONS: TableDefinition[] = [
  {
    name: 'team_offense',
    identifierColumns: ['PF', 'Ply', 'Y/P', 'TO', 'FL'],
    columnPrefix: 'offense',
    priority: 1
  },
  {
    name: 'passing_offense',
    identifierColumns: ['Cmp%', 'TD%', 'Int%', 'Rate', 'AY/A'],
    columnPrefix: 'passing',
    priority: 2
  },
  {
    name: 'rushing_offense',
    identifierColumns: ['Att', 'Lng', 'Y/A', 'Y/G', 'Fmb'],
    columnPrefix: 'rushing',
    priority: 3
  },
  {
    name: 'returns',
    identifierColumns: ['Ret', 'Y/R', 'Rt', 'Y/Rt', 'APYd'],
    columnPrefix: 'returns',
    priority: 4
  },
  {
    name: 'kicking',
    identifierColumns: ['FGA', 'FGM', 'FG%', 'XPA', 'XPM', 'KO', 'TB%'],
    columnPrefix: 'kicking',
    priority: 5
  },
  {
    name: 'punting',
    identifierColumns: ['Pnt', 'Y/P', 'Net', 'NY/P', 'In20', 'Blck'],
    columnPrefix: 'punting',
    priority: 6
  },
  {
    name: 'scoring',
    identifierColumns: ['RshTD', 'RecTD', 'AllTD', '2PM', 'PR TD'],
    columnPrefix: 'scoring',
    priority: 7
  },
  {
    name: 'third_down_redzone',
    identifierColumns: ['3DAtt', '3DConv', '3D%', 'RZAtt', 'RZTD'],
    columnPrefix: 'situational',
    priority: 8
  },
  {
    name: 'drive_stats',
    identifierColumns: ['#Dr', 'Sc%', 'TO%', 'Start', 'Time', 'Pts'],
    columnPrefix: 'drive',
    priority: 9
  }
];

const DEFENSIVE_TABLE_DEFINITIONS: TableDefinition[] = [
  {
    name: 'team_defense',
    identifierColumns: ['PA', 'Ply', 'Y/P', 'TO', 'FL'],
    columnPrefix: 'def_overall',
    priority: 1
  },
  {
    name: 'pass_rush',
    identifierColumns: ['DADOT', 'Air', 'YAC', 'Bltz', 'Bltz%', 'Hrry'],
    columnPrefix: 'def_pass_rush',
    priority: 2
  },
  {
    name: 'passing_defense',
    identifierColumns: ['Cmp%', 'TD%', 'Int%', 'PD', 'Rate', 'QBHits'],
    columnPrefix: 'def_passing',
    priority: 3
  },
  {
    name: 'rushing_defense',
    identifierColumns: ['Att', 'Y/A', 'Y/G'],
    columnPrefix: 'def_rushing',
    priority: 4
  },
  {
    name: 'returns_defense',
    identifierColumns: ['Ret', 'Y/R', 'Rt', 'Y/Rt'],
    columnPrefix: 'def_returns',
    priority: 5
  },
  {
    name: 'kicking_defense',
    identifierColumns: ['FGA', 'FGM', 'FG%', 'XPA', 'XPM'],
    columnPrefix: 'def_kicking',
    priority: 6
  },
  {
    name: 'punting_defense',
    identifierColumns: ['Pnt', 'Y/P', 'Blck'],
    columnPrefix: 'def_punting',
    priority: 7
  },
  {
    name: 'scoring_defense',
    identifierColumns: ['RshTD', 'RecTD', 'AllTD', '2PM'],
    columnPrefix: 'def_scoring',
    priority: 8
  },
  {
    name: 'third_down_redzone_defense',
    identifierColumns: ['3DAtt', '3DConv', '3D%', 'RZAtt', 'RZTD'],
    columnPrefix: 'def_situational',
    priority: 9
  },
  {
    name: 'drive_stats_defense',
    identifierColumns: ['#Dr', 'Sc%', 'TO%', 'Start', 'Time', 'Pts'],
    columnPrefix: 'def_drive',
    priority: 10
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeTeamName(teamName: string): string {
  if (!teamName) return '';
  
  const cleaned = teamName.trim().toLowerCase();
  return TEAM_NAME_MAPPINGS[cleaned] || teamName.trim();
}

function detectTableType(
  headers: string[],
  tableDefinitions: TableDefinition[]
): TableDefinition | null {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  for (const tableDef of tableDefinitions) {
    const matchCount = tableDef.identifierColumns.filter(col =>
      headerSet.has(col.toLowerCase())
    ).length;
    
    const matchPercentage = matchCount / tableDef.identifierColumns.length;
    
    if (matchPercentage >= 0.6) {
      return tableDef;
    }
  }
  
  return null;
}

function sanitizeColumnName(columnName: string, prefix: string): string {
  let sanitized = columnName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  if (sanitized === 'rk' || sanitized === 'tm' || sanitized === 'g') {
    return sanitized;
  }
  
  return `${prefix}_${sanitized}`;
}

function parseNumericValue(value: string | number): number | string {
  if (typeof value === 'number') return value;
  if (!value || value === '') return '';
  
  const strValue = String(value).trim();
  
  if (strValue === '') return '';
  
  const cleanedValue = strValue.replace(/[,%]/g, '');
  
  const parsed = parseFloat(cleanedValue);
  
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  return strValue;
}

// ============================================================================
// FILE PARSING
// ============================================================================

function parseMultiTableFile(
  fileContent: string,
  tableDefinitions: TableDefinition[]
): ParsedTable[] {
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const tables: ParsedTable[] = [];
  let currentHeaders: string[] | null = null;
  let currentRows: RawTableRow[] = [];
  let currentTableType: TableDefinition | null = null;
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();
    
    if (!line) continue;
    
    const parsed = Papa.parse(line, { header: false });
    const cells = parsed.data[0] as string[];
    
    if (!cells || cells.length === 0) continue;
    
    const firstCell = String(cells[0]).trim();
    const isHeaderRow = firstCell.toLowerCase() === 'rk' || 
                       firstCell.toLowerCase() === 'tm';
    
    if (isHeaderRow) {
      if (currentHeaders && currentRows.length > 0 && currentTableType) {
        tables.push({
          tableType: currentTableType.name,
          headers: currentHeaders,
          rows: currentRows
        });
      }
      
      currentHeaders = cells;
      currentRows = [];
      currentTableType = detectTableType(cells, tableDefinitions);
      
      if (!currentTableType) {
        console.warn(`Could not detect table type for headers: ${cells.slice(0, 5).join(', ')}...`);
      }
    } else {
      if (currentHeaders && currentTableType) {
        const rowObj: RawTableRow = {};
        
        for (let columnIndex = 0; columnIndex < currentHeaders.length; columnIndex++) {
          const header = currentHeaders[columnIndex];
          const value = cells[columnIndex] || '';
          rowObj[header] = parseNumericValue(value);
        }
        
        currentRows.push(rowObj);
      }
    }
  }
  
  if (currentHeaders && currentRows.length > 0 && currentTableType) {
    tables.push({
      tableType: currentTableType.name,
      headers: currentHeaders,
      rows: currentRows
    });
  }
  
  return tables;
}

// ============================================================================
// TABLE FUSION
// ============================================================================

function fuseTables(
  tables: ParsedTable[],
  tableDefinitions: TableDefinition[]
): { fusedData: FusedTeamStats[]; report: FusionReport } {
  const teamDataMap = new Map<string, FusedTeamStats>();
  const warnings: string[] = [];
  const missingDataByTeam = new Map<string, Set<string>>();
  
  for (const table of tables) {
    const tableDef = tableDefinitions.find(def => def.name === table.tableType);
    if (!tableDef) {
      warnings.push(`No definition found for table type: ${table.tableType}`);
      continue;
    }
    
    console.log(`Processing table: ${table.tableType} (${table.rows.length} teams)`);
    
    for (const row of table.rows) {
      const rawTeamName = String(row['Tm'] || '');
      const teamName = normalizeTeamName(rawTeamName);
      
      if (!teamName) {
        warnings.push(`Invalid team name in ${table.tableType}: "${rawTeamName}"`);
        continue;
      }
      
      if (!teamDataMap.has(teamName)) {
        teamDataMap.set(teamName, {
          team: teamName,
          games: row['G']
        });
      }
      
      const teamData = teamDataMap.get(teamName)!;
      
      for (const [columnName, value] of Object.entries(row)) {
        if (columnName === 'Rk' || columnName === 'Tm') {
          continue;
        }
        
        if (columnName === 'G' && teamData['games']) {
          continue;
        }
        
        const sanitizedColumnName = sanitizeColumnName(columnName, tableDef.columnPrefix);
        
        if (value === '' || value === null || value === undefined) {
          if (!missingDataByTeam.has(teamName)) {
            missingDataByTeam.set(teamName, new Set());
          }
          missingDataByTeam.get(teamName)!.add(sanitizedColumnName);
        }
        
        teamData[sanitizedColumnName] = value;
      }
    }
  }
  
  const fusedData = Array.from(teamDataMap.values());
  
  const missingData: { [team: string]: string[] } = {};
  for (const [team, fields] of missingDataByTeam.entries()) {
    missingData[team] = Array.from(fields);
  }
  
  const report: FusionReport = {
    totalTables: tables.length,
    tablesProcessed: tables.filter(t => 
      tableDefinitions.some(def => def.name === t.tableType)
    ).length,
    teamCount: fusedData.length,
    missingData,
    warnings
  };
  
  return { fusedData, report };
}

// ============================================================================
// CSV EXPORT
// ============================================================================

function exportToCSV(data: FusedTeamStats[], outputPath: string): void {
  const csv = Papa.unparse(data, {
    header: true,
    quotes: false
  });
  
  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`✅ Exported to: ${outputPath}`);
}

// ============================================================================
// MAIN FUSION FUNCTION
// ============================================================================

export function fuseNFLStats(
  inputFilePath: string,
  outputFilePath: string,
  isDefensive: boolean = false
): FusionReport {
  console.log(`\n📊 Starting fusion for: ${inputFilePath}`);
  console.log(`📁 Output will be saved to: ${outputFilePath}`);
  
  const fileContent = fs.readFileSync(inputFilePath, 'utf-8');
  
  const tableDefinitions = isDefensive 
    ? DEFENSIVE_TABLE_DEFINITIONS 
    : OFFENSIVE_TABLE_DEFINITIONS;
  
  console.log(`\n🔍 Parsing ${isDefensive ? 'defensive' : 'offensive'} tables...`);
  const tables = parseMultiTableFile(fileContent, tableDefinitions);
  console.log(`✅ Found ${tables.length} tables`);
  
  console.log(`\n🔗 Fusing tables by team...`);
  const { fusedData, report } = fuseTables(tables, tableDefinitions);
  
  console.log(`\n📈 Fusion Report:`);
  console.log(`   Tables processed: ${report.tablesProcessed}/${report.totalTables}`);
  console.log(`   Teams found: ${report.teamCount}`);
  
  if (report.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    report.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  const teamsWithMissingData = Object.keys(report.missingData).length;
  if (teamsWithMissingData > 0) {
    console.log(`\n⚠️  ${teamsWithMissingData} team(s) have missing data`);
  }
  
  exportToCSV(fusedData, outputFilePath);
  
  return report;
}

/**
 * Fuse both offense and defense stats into a single comprehensive dataset
 */
export function fuseCombinedStats(
  offenseFilePath: string,
  defenseFilePath: string,
  outputFilePath: string
): FusionReport {
  console.log(`\n📊 Starting combined fusion...`);
  console.log(`📁 Offense: ${offenseFilePath}`);
  console.log(`📁 Defense: ${defenseFilePath}`);
  console.log(`📁 Output: ${outputFilePath}`);

  // Fuse offense data
  console.log(`\n🏈 Processing offense stats...`);
  const offenseReport = fuseNFLStats(offenseFilePath, 'temp_offense.csv', false);
  
  // Fuse defense data
  console.log(`\n🛡️  Processing defense stats...`);
  const defenseReport = fuseNFLStats(defenseFilePath, 'temp_defense.csv', true);
  
  // Combine the datasets
  console.log(`\n🔗 Combining offense and defense data...`);
  const combinedData = combineOffenseDefenseData('temp_offense.csv', 'temp_defense.csv');
  
  // Export combined data
  exportToCSV(combinedData, outputFilePath);
  
  // Clean up temp files
  try {
    if (fs.existsSync('temp_offense.csv')) fs.unlinkSync('temp_offense.csv');
    if (fs.existsSync('temp_defense.csv')) fs.unlinkSync('temp_defense.csv');
  } catch (error) {
    console.warn('Failed to clean up temp files:', error);
  }
  
  const combinedReport: FusionReport = {
    totalTables: offenseReport.totalTables + defenseReport.totalTables,
    tablesProcessed: offenseReport.tablesProcessed + defenseReport.tablesProcessed,
    teamCount: combinedData.length,
    missingData: { ...offenseReport.missingData, ...defenseReport.missingData },
    warnings: [...offenseReport.warnings, ...defenseReport.warnings]
  };
  
  console.log(`\n📈 Combined Fusion Report:`);
  console.log(`   Tables processed: ${combinedReport.tablesProcessed}/${combinedReport.totalTables}`);
  console.log(`   Teams found: ${combinedReport.teamCount}`);
  
  return combinedReport;
}

/**
 * Combine offense and defense fused data into single records
 */
function combineOffenseDefenseData(offenseCsvPath: string, defenseCsvPath: string): FusedTeamStats[] {
  const offenseData = Papa.parse(fs.readFileSync(offenseCsvPath, 'utf-8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  }).data as FusedTeamStats[];
  
  const defenseData = Papa.parse(fs.readFileSync(defenseCsvPath, 'utf-8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  }).data as FusedTeamStats[];
  
  const teamMap = new Map<string, FusedTeamStats>();
  
  // Add offense data
  for (const row of offenseData) {
    const team = String(row.team || '').trim();
    if (team) {
      teamMap.set(team, { ...row });
    }
  }
  
  // Merge defense data
  for (const row of defenseData) {
    const team = String(row.team || '').trim();
    if (team && teamMap.has(team)) {
      const existing = teamMap.get(team)!;
      // Merge defense columns (skip team and games which should be the same)
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'team' && key !== 'games') {
          existing[key] = value;
        }
      }
    }
  }
  
  return Array.from(teamMap.values());
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: 
  Single file: npx tsx nfl-stats-fusion.ts <input-file> <output-file> [--defense]
  Combined:    npx tsx nfl-stats-fusion.ts <offense-file> <defense-file> <output-file> --combined

Examples:
  npx tsx nfl-stats-fusion.ts week-7-offense.txt week-7-offense-fused.csv
  npx tsx nfl-stats-fusion.ts week-7-defense.txt week-7-defense-fused.csv --defense
  npx tsx nfl-stats-fusion.ts week-7-offense.txt week-7-defense.txt week-7-combined.csv --combined
    `);
    process.exit(1);
  }
  
  const isCombined = args.includes('--combined');
  
  try {
    if (isCombined) {
      // Combined mode: offense-file, defense-file, output-file
      const filteredArgs = args.filter(arg => arg !== '--combined');
      if (filteredArgs.length !== 3) {
        console.error('Combined mode requires exactly 3 file arguments');
        process.exit(1);
      }
      const [offenseFile, defenseFile, outputFile] = filteredArgs;
      fuseCombinedStats(offenseFile, defenseFile, outputFile);
    } else {
      // Single file mode
      const inputFile = args[0];
      const outputFile = args[1];
      const isDefensive = args.includes('--defense');
      fuseNFLStats(inputFile, outputFile, isDefensive);
    }
    
    console.log(`\n✅ Fusion complete!`);
  } catch (error) {
    console.error(`\n❌ Error during fusion:`, error);
    process.exit(1);
  }
}