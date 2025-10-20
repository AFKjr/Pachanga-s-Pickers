// src/services/nflStatsFusion.ts
// Browser-compatible NFL stats fusion service

import * as Papa from 'papaparse';

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

// ============================================================================
// TEAM NAME MAPPINGS
// ============================================================================

const TEAM_NAME_MAPPINGS: { [key: string]: string } = {
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

// ============================================================================
// TABLE DEFINITIONS
// ============================================================================

const TABLE_DEFINITIONS: TableDefinition[] = [
  // Core offense tables
  { name: 'offense', identifierColumns: ['team'], columnPrefix: 'offense_', priority: 1 },
  { name: 'passing', identifierColumns: ['team'], columnPrefix: 'passing_', priority: 2 },
  { name: 'rushing', identifierColumns: ['team'], columnPrefix: 'rushing_', priority: 2 },
  { name: 'scoring', identifierColumns: ['team'], columnPrefix: 'scoring_', priority: 2 },
  { name: 'downs', identifierColumns: ['team'], columnPrefix: 'downs_', priority: 2 },
  { name: 'returns', identifierColumns: ['team'], columnPrefix: 'returns_', priority: 2 },
  { name: 'kicking', identifierColumns: ['team'], columnPrefix: 'kicking_', priority: 2 },
  { name: 'punting', identifierColumns: ['team'], columnPrefix: 'punting_', priority: 2 },

  // Situational offense
  { name: 'situational', identifierColumns: ['team'], columnPrefix: 'situational_', priority: 3 },
  { name: 'drive', identifierColumns: ['team'], columnPrefix: 'drive_', priority: 3 },

  // Core defense tables
  { name: 'def_overall', identifierColumns: ['team'], columnPrefix: 'def_overall_', priority: 1 },
  { name: 'def_passing', identifierColumns: ['team'], columnPrefix: 'def_passing_', priority: 2 },
  { name: 'def_rushing', identifierColumns: ['team'], columnPrefix: 'def_rushing_', priority: 2 },
  { name: 'def_scoring', identifierColumns: ['team'], columnPrefix: 'def_scoring_', priority: 2 },
  { name: 'def_downs', identifierColumns: ['team'], columnPrefix: 'def_downs_', priority: 2 },
  { name: 'def_returns', identifierColumns: ['team'], columnPrefix: 'def_returns_', priority: 2 },
  { name: 'def_kicking', identifierColumns: ['team'], columnPrefix: 'def_kicking_', priority: 2 },
  { name: 'def_punting', identifierColumns: ['team'], columnPrefix: 'def_punting_', priority: 2 },

  // Situational defense
  { name: 'def_situational', identifierColumns: ['team'], columnPrefix: 'def_situational_', priority: 3 },
  { name: 'def_drive', identifierColumns: ['team'], columnPrefix: 'def_drive_', priority: 3 },

  // Pass rush
  { name: 'def_pass_rush', identifierColumns: ['team'], columnPrefix: 'def_pass_rush_', priority: 3 }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize team names using the mapping
 */
function normalizeTeamName(teamName: string): string {
  const trimmed = teamName.trim();
  return TEAM_NAME_MAPPINGS[trimmed] || trimmed;
}

/**
 * Parse a single table from CSV content
 */
function parseTable(csvContent: string, tableType: string): ParsedTable {
  const parsed = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  return {
    tableType,
    headers: parsed.meta.fields || [],
    rows: parsed.data as RawTableRow[]
  };
}

/**
 * Detect table type from headers
 */
function detectTableType(headers: string[]): string {
  const headerStr = headers.join(' ').toLowerCase();

  // Check for specific table identifiers
  if (headerStr.includes('passing yards') && headerStr.includes('completions')) {
    return 'passing';
  }
  if (headerStr.includes('rushing yards') && headerStr.includes('attempts')) {
    return 'rushing';
  }
  if (headerStr.includes('points for') && headerStr.includes('yards')) {
    return 'offense';
  }
  if (headerStr.includes('points allowed') && headerStr.includes('yards allowed')) {
    return 'def_overall';
  }
  if (headerStr.includes('defensive passing') || (headerStr.includes('passing') && headerStr.includes('allowed'))) {
    return 'def_passing';
  }
  if (headerStr.includes('defensive rushing') || (headerStr.includes('rushing') && headerStr.includes('allowed'))) {
    return 'def_rushing';
  }
  if (headerStr.includes('third down') && headerStr.includes('fourth down')) {
    return 'situational';
  }
  if (headerStr.includes('defensive third down') || (headerStr.includes('third down') && headerStr.includes('allowed'))) {
    return 'def_situational';
  }
  if (headerStr.includes('field goals') && headerStr.includes('extra points')) {
    return 'kicking';
  }
  if (headerStr.includes('defensive field goals') || (headerStr.includes('field goals') && headerStr.includes('allowed'))) {
    return 'def_kicking';
  }
  if (headerStr.includes('punts') && headerStr.includes('punt yards')) {
    return 'punting';
  }
  if (headerStr.includes('defensive punts') || (headerStr.includes('punts') && headerStr.includes('allowed'))) {
    return 'def_punting';
  }
  if (headerStr.includes('kick returns') || headerStr.includes('punt returns')) {
    return 'returns';
  }
  if (headerStr.includes('defensive returns') || (headerStr.includes('returns') && headerStr.includes('allowed'))) {
    return 'def_returns';
  }
  if (headerStr.includes('scoring') && headerStr.includes('touchdowns')) {
    return 'scoring';
  }
  if (headerStr.includes('defensive scoring') || (headerStr.includes('scoring') && headerStr.includes('allowed'))) {
    return 'def_scoring';
  }
  if (headerStr.includes('downs') && !headerStr.includes('third') && !headerStr.includes('fourth')) {
    return 'downs';
  }
  if (headerStr.includes('defensive downs') || (headerStr.includes('downs') && headerStr.includes('allowed'))) {
    return 'def_downs';
  }
  if (headerStr.includes('drives') && headerStr.includes('scoring percentage')) {
    return 'drive';
  }
  if (headerStr.includes('defensive drives') || (headerStr.includes('drives') && headerStr.includes('allowed'))) {
    return 'def_drive';
  }
  if (headerStr.includes('hurries') || headerStr.includes('hits') || headerStr.includes('blitz')) {
    return 'def_pass_rush';
  }

  return 'unknown';
}

/**
 * Split multi-table CSV content into individual tables
 */
function splitMultiTableCSV(csvContent: string): string[] {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const tables: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;

  for (const line of lines) {
    // Check if this is a table header (contains team column or looks like a header)
    if (line.toLowerCase().includes('team') && line.split(',').length > 3) {
      // Save previous table if it exists
      if (currentTable.length > 0) {
        tables.push(currentTable.join('\n'));
        currentTable = [];
      }
      inTable = true;
      currentTable.push(line);
    } else if (inTable && line.split(',').length > 1) {
      // Continue adding rows to current table
      currentTable.push(line);
    } else if (inTable && line.split(',').length <= 1 && currentTable.length > 1) {
      // End of table (blank line or short line)
      tables.push(currentTable.join('\n'));
      currentTable = [];
      inTable = false;
    }
  }

  // Add the last table if it exists
  if (currentTable.length > 0) {
    tables.push(currentTable.join('\n'));
  }

  return tables;
}

/**
 * Fuse multiple tables into a single dataset
 */
function fuseTables(tables: ParsedTable[]): FusedTeamStats[] {
  const teamMap = new Map<string, FusedTeamStats>();

  // Sort tables by priority (higher priority tables override lower ones)
  const sortedTables = tables.sort((a, b) => {
    const defA = TABLE_DEFINITIONS.find(d => d.name === a.tableType);
    const defB = TABLE_DEFINITIONS.find(d => d.name === b.tableType);
    return (defB?.priority || 0) - (defA?.priority || 0);
  });

  for (const table of sortedTables) {
    const tableDef = TABLE_DEFINITIONS.find(d => d.name === table.tableType);
    if (!tableDef) continue;

    for (const row of table.rows) {
      const teamName = normalizeTeamName(String(row.team || ''));
      if (!teamName) continue;

      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, { team: teamName });
      }

      const teamData = teamMap.get(teamName)!;

      // Add all columns with table prefix
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'team') {
          const columnName = `${tableDef.columnPrefix}${key}`;
          teamData[columnName] = value;
        }
      }
    }
  }

  return Array.from(teamMap.values());
}

/**
 * Convert fused data to CSV format
 */
function convertToCSV(fusedData: FusedTeamStats[]): string {
  if (fusedData.length === 0) return '';

  // Get all unique column names
  const allColumns = new Set<string>();
  for (const row of fusedData) {
    for (const key of Object.keys(row)) {
      allColumns.add(key);
    }
  }

  const columns = Array.from(allColumns).sort();

  // Create CSV content
  const csvRows = [columns.join(',')];

  for (const row of fusedData) {
    const csvRow = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (strValue.includes(',') || strValue.includes('"')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    });
    csvRows.push(csvRow.join(','));
  }

  return csvRows.join('\n');
}

// ============================================================================
// MAIN FUSION SERVICE
// ============================================================================

export class NFLStatsFusion {
  /**
   * Fuse offense and defense CSV content into a single comprehensive dataset
   */
  static fuseCombinedStats(offenseContent: string, defenseContent: string): string {
    try {
      console.log('🔗 Starting NFL stats fusion...');

      // Split multi-table content
      const offenseTables = splitMultiTableCSV(offenseContent);
      const defenseTables = splitMultiTableCSV(defenseContent);

      console.log(`📊 Found ${offenseTables.length} offense tables and ${defenseTables.length} defense tables`);

      // Parse all tables
      const parsedTables: ParsedTable[] = [];

      // Parse offense tables
      for (const tableContent of offenseTables) {
        try {
          const tableType = detectTableType(tableContent.split('\n')[0].split(','));
          const parsedTable = parseTable(tableContent, tableType);
          if (parsedTable.rows.length > 0) {
            parsedTables.push(parsedTable);
            console.log(`✅ Parsed offense table: ${tableType} (${parsedTable.rows.length} teams)`);
          }
        } catch (error) {
          console.warn('Failed to parse offense table:', error);
        }
      }

      // Parse defense tables
      for (const tableContent of defenseTables) {
        try {
          const tableType = detectTableType(tableContent.split('\n')[0].split(','));
          const parsedTable = parseTable(tableContent, tableType);
          if (parsedTable.rows.length > 0) {
            parsedTables.push(parsedTable);
            console.log(`✅ Parsed defense table: ${tableType} (${parsedTable.rows.length} teams)`);
          }
        } catch (error) {
          console.warn('Failed to parse defense table:', error);
        }
      }

      console.log(`📋 Total parsed tables: ${parsedTables.length}`);

      // Fuse all tables
      const fusedData = fuseTables(parsedTables);
      console.log(`🔗 Fused data for ${fusedData.length} teams`);

      // Convert to CSV
      const csvOutput = convertToCSV(fusedData);
      console.log(`📄 Generated CSV with ${csvOutput.split('\n').length - 1} rows`);

      return csvOutput;

    } catch (error) {
      console.error('❌ Fusion failed:', error);
      throw new Error(`Fusion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that the fused CSV contains expected data
   */
  static validateFusion(csvContent: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      const rows = parsed.data as FusedTeamStats[];
      if (rows.length === 0) {
        errors.push('No data rows found in fused CSV');
        return { isValid: false, errors, warnings };
      }

      // Check for required columns
      const requiredColumns = ['team', 'offense_pf', 'def_overall_pa'];
      const headers = parsed.meta.fields || [];

      for (const required of requiredColumns) {
        if (!headers.includes(required)) {
          errors.push(`Missing required column: ${required}`);
        }
      }

      // Check for reasonable team count (should be 32 NFL teams)
      if (rows.length < 30) {
        warnings.push(`Low team count: ${rows.length} (expected ~32 NFL teams)`);
      }

      // Check for critical stats
      const sampleRow = rows[0];
      const criticalStats = ['offense_pf', 'offense_yds', 'passing_cmp', 'rushing_yds'];

      for (const stat of criticalStats) {
        if (!sampleRow[stat] && sampleRow[stat] !== 0) {
          warnings.push(`Missing critical stat: ${stat}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }
}