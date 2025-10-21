/**
 * CSV Parser for NFL Sports Reference Data
 * Handles multi-section CSV files with different stat categories
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TeamStats {
  team_name: string;
  
  // CRITICAL stats for simulation (highlighted in UI)
  yards_per_play: number;
  yards_per_play_allowed: number;
  drives_per_game: number;
  points_allowed_per_game: number;
  
  // Supporting stats
  offensive_yards_per_game: number;
  defensive_yards_allowed: number;
  points_per_game: number;
  passing_yards: number;
  passing_yards_per_game: number;
  rushing_yards: number;
  rushing_yards_per_game: number;
  turnovers_lost: number;
  turnovers_per_game: number;
  turnover_differential: number;
  def_interceptions: number;
  takeaways: number;
  total_plays: number;
  plays_per_game: number;
  scoring_percentage: number;
  defensive_yards_per_game: number;
  defensive_scoring_pct_allowed: number;
  
  // NEW: Third down and red zone efficiency
  third_down_conversion_rate: number;
  red_zone_efficiency: number;
  third_down_conversion_rate_allowed: number;
  red_zone_efficiency_allowed: number;
  
  // Metadata
  week: number;
  season_year: number;
  games_played: number;
  source: string;
  last_updated: string;
}

type SectionName = 
  | 'offense_total'
  | 'offense_passing'
  | 'offense_rushing'
  | 'offense_conversions'
  | 'drives'
  | 'defense_total'
  | 'defense_conversions'
  | 'unknown';

/**
 * Detect section type based on column headers
 */
function detectSection(headers: string[]): SectionName {
  const headerStr = headers.join(',').toLowerCase().replace(/\s+/g, '');
  
  // Offense total stats (PF = Points For)
  if (headerStr.includes('rk,tm,g,pf') && headerStr.includes('ply') && headerStr.includes('y/p')) {
    return 'offense_total';
  }
  
  // Offense passing stats
  if (headerStr.includes('cmp,att,cmp%') && headerStr.includes('td,td%,int')) {
    return 'offense_passing';
  }
  
  // Offense rushing stats (has Fmb but not defensive indicators)
  if (headerStr.includes('att,yds,td') && headerStr.includes('y/a,y/g') && headerStr.includes('fmb')) {
    return 'offense_rushing';
  }
  
  // Third down and red zone conversions (offensive/defensive)
  if (headerStr.includes('3datt,3dconv,3d%') && headerStr.includes('rzatt,rztd,rzpct')) {
    return 'offense_conversions';  // Will be determined by context in parseMultiSectionCSV
  }
  
  // Drive stats
  if (headerStr.includes('#dr') && headerStr.includes('sc%,to%')) {
    return 'drives';
  }
  
  // Defense total stats (PA = Points Against)
  if (headerStr.includes('rk,tm,g,pa') && headerStr.includes('ply') && headerStr.includes('y/p')) {
    return 'defense_total';
  }
  
  return 'unknown';
}

/**
 * Parse a percentage string to a decimal number
 */
function parsePercentage(value: string): number {
  if (!value || value === '') return 0;
  const cleaned = value.replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a numeric value, handling empty strings
 */
function parseNumeric(value: string): number {
  if (!value || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse multi-section CSV file
 */
function parseMultiSectionCSV(csvContent: string, isDefensive: boolean = false): Record<string, Record<string, any>> {
  const lines = csvContent.trim().split('\n');
  const allTeamData: Record<string, Record<string, any>> = {};
  
  let currentSection: string[] = [];
  let currentHeaders: string[] = [];
  let currentSectionName: SectionName = 'unknown';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check if this is a header row
    const isHeaderRow = trimmedLine.startsWith('Rk,Tm') || trimmedLine.startsWith('Tm,G');
    
    if (isHeaderRow) {
      // Process previous section if it exists
      if (currentSection.length > 0 && currentSectionName !== 'unknown') {
        processSectionData(currentSectionName, currentHeaders, currentSection, allTeamData);
      }
      
      // Start new section
      currentHeaders = trimmedLine.split(',');
      currentSectionName = detectSection(currentHeaders);
      
      // Override conversions section based on CSV type
      if (currentSectionName === 'offense_conversions' && isDefensive) {
        currentSectionName = 'defense_conversions';
      }
      
      currentSection = [];
      
      console.log(`📊 Found section: ${currentSectionName}`);
    } else {
      // Add data row to current section
      currentSection.push(trimmedLine);
    }
  }
  
  // Process final section
  if (currentSection.length > 0 && currentSectionName !== 'unknown') {
    processSectionData(currentSectionName, currentHeaders, currentSection, allTeamData);
  }
  
  return allTeamData;
}

/**
 * Process data from a specific section and merge into team data
 */
function processSectionData(
  sectionName: SectionName,
  headers: string[],
  rows: string[],
  allTeamData: Record<string, Record<string, any>>
): void {
  // Find team name column index
  const teamColumnIndex = headers.findIndex(h => h.toLowerCase() === 'tm');
  const gamesColumnIndex = headers.findIndex(h => h.toLowerCase() === 'g');
  
  if (teamColumnIndex === -1) {
    console.warn(`No team column found in ${sectionName}`);
    return;
  }
  
  for (const row of rows) {
    const values = row.split(',');
    const teamName = values[teamColumnIndex];
    const gamesPlayed = gamesColumnIndex !== -1 ? parseNumeric(values[gamesColumnIndex]) : 0;
    
    // Skip if no team name
    if (!teamName || teamName.trim() === '') continue;
    
    // Initialize team data if not exists
    if (!allTeamData[teamName]) {
      allTeamData[teamName] = {
        team_name: teamName,
        games_played: gamesPlayed
      };
    }
    
    // Extract stats based on section type
    extractStatsForSection(sectionName, headers, values, allTeamData[teamName]);
  }
}

/**
 * Extract stats from a row based on section type
 */
function extractStatsForSection(
  sectionName: SectionName,
  headers: string[],
  values: string[],
  teamData: Record<string, any>
): void {
  const getColumnValue = (columnName: string): string => {
    const index = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
    return index !== -1 ? values[index] : '';
  };
  
  switch (sectionName) {
    case 'offense_total':
      teamData.yards_per_play = parseNumeric(getColumnValue('Y/P'));
      teamData.points_per_game = parseNumeric(getColumnValue('PF')) / teamData.games_played;
      teamData.offensive_yards_per_game = parseNumeric(getColumnValue('Yds')) / teamData.games_played;
      teamData.total_plays = parseNumeric(getColumnValue('Ply'));
      teamData.turnovers_lost = parseNumeric(getColumnValue('TO'));
      break;
      
    case 'offense_passing':
      teamData.passing_yards = parseNumeric(getColumnValue('Yds'));
      break;
      
    case 'offense_rushing':
      teamData.rushing_yards = parseNumeric(getColumnValue('Yds'));
      break;
      
    case 'offense_conversions':
      // Third down and red zone efficiency (offensive)
      teamData.third_down_conversion_rate = parsePercentage(getColumnValue('3D%'));
      teamData.red_zone_efficiency = parsePercentage(getColumnValue('RZPct'));
      break;
      
    case 'drives':
      teamData.drives_per_game = parseNumeric(getColumnValue('#Dr')) / teamData.games_played;
      teamData.scoring_percentage = parsePercentage(getColumnValue('SC%'));
      break;
      
    case 'defense_total':
      teamData.yards_per_play_allowed = parseNumeric(getColumnValue('Y/P'));
      teamData.points_allowed_per_game = parseNumeric(getColumnValue('PA')) / teamData.games_played;
      teamData.defensive_yards_allowed = parseNumeric(getColumnValue('Yds'));
      teamData.def_interceptions = parseNumeric(getColumnValue('Int'));
      teamData.turnovers_forced = parseNumeric(getColumnValue('TO'));
      teamData.takeaways = teamData.turnovers_forced;
      break;
      
    case 'defense_conversions':
      // Third down and red zone efficiency (defensive)
      teamData.third_down_conversion_rate_allowed = parsePercentage(getColumnValue('3D%'));
      teamData.red_zone_efficiency_allowed = parsePercentage(getColumnValue('RZPct'));
      break;
  }
}

/**
 * Main parsing function for weekly team stats
 */
export function parseWeeklyTeamStats(
  offensiveCSV: string,
  defensiveCSV: string
): TeamStats[] {
  console.log('🔄 Parsing offensive CSV...');
  const offensiveData = parseMultiSectionCSV(offensiveCSV, false);
  
  console.log('🔄 Parsing defensive CSV...');
  const defensiveData = parseMultiSectionCSV(defensiveCSV, true);
  
  // Merge data for each team
  const allTeams = new Set([
    ...Object.keys(offensiveData),
    ...Object.keys(defensiveData)
  ]);
  
  const mergedStats: TeamStats[] = [];
  
  for (const teamName of allTeams) {
    const offStats = offensiveData[teamName] || {};
    const defStats = defensiveData[teamName] || {};
    
    const gamesPlayed = offStats.games_played || defStats.games_played || 0;
    
    const teamStats: TeamStats = {
      team_name: teamName,
      week: 7, // Current week based on CSV files
      season_year: 2025, // Current season
      games_played: gamesPlayed,
      
      // CRITICAL stats
      yards_per_play: offStats.yards_per_play || 0,
      yards_per_play_allowed: defStats.yards_per_play_allowed || 0,
      drives_per_game: offStats.drives_per_game || 0,
      points_allowed_per_game: defStats.points_allowed_per_game || 0,
      
      // Supporting stats
      offensive_yards_per_game: offStats.offensive_yards_per_game || 0,
      defensive_yards_allowed: defStats.defensive_yards_allowed || 0,
      points_per_game: offStats.points_per_game || 0,
      passing_yards: offStats.passing_yards || 0,
      passing_yards_per_game: (offStats.passing_yards || 0) / gamesPlayed || 0,
      rushing_yards: offStats.rushing_yards || 0,
      rushing_yards_per_game: (offStats.rushing_yards || 0) / gamesPlayed || 0,
      turnovers_lost: offStats.turnovers_lost || 0,
      turnovers_per_game: (offStats.turnovers_lost || 0) / gamesPlayed || 0,
      turnover_differential: (defStats.turnovers_forced || 0) - (offStats.turnovers_lost || 0),
      def_interceptions: defStats.def_interceptions || 0,
      takeaways: defStats.takeaways || 0,
      total_plays: offStats.total_plays || 0,
      plays_per_game: (offStats.total_plays || 0) / gamesPlayed || 0,
      scoring_percentage: offStats.scoring_percentage || 0,
      defensive_yards_per_game: (defStats.defensive_yards_allowed || 0) / gamesPlayed || 0,
      defensive_scoring_pct_allowed: 0, // Not available in CSV
      
      // Third down and red zone efficiency
      third_down_conversion_rate: offStats.third_down_conversion_rate || 0,
      red_zone_efficiency: offStats.red_zone_efficiency || 0,
      third_down_conversion_rate_allowed: defStats.third_down_conversion_rate_allowed || 0,
      red_zone_efficiency_allowed: defStats.red_zone_efficiency_allowed || 0,
      
      // Metadata
      source: 'csv',
      last_updated: new Date().toISOString()
    };
    
    mergedStats.push(teamStats);
  }
  
  console.log(`✅ Successfully parsed ${mergedStats.length} teams`);
  return mergedStats;
}

/**
 * React component for CSV Import functionality
 */
const CSVImportStats: React.FC = () => {
  const [offenseFile, setOffenseFile] = useState<File | null>(null);
  const [defenseFile, setDefenseFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');

  const handleOffenseFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setOffenseFile(file || null);
  };

  const handleDefenseFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setDefenseFile(file || null);
  };

  const handleImport = async () => {
    if (!offenseFile || !defenseFile) {
      setImportResult('Please select both offense and defense CSV files.');
      return;
    }

    setIsImporting(true);
    setImportResult('');

    try {
      const offenseContent = await offenseFile.text();
      const defenseContent = await defenseFile.text();

      const parsedStats = parseWeeklyTeamStats(offenseContent, defenseContent);

      // Save to database
      const { error } = await supabase
        .from('team_stats_cache')
        .upsert(parsedStats, { onConflict: 'team_name,week,season_year' });

      if (error) {
        throw error;
      }

      setImportResult(`Successfully imported ${parsedStats.length} teams' stats.`);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Import Team Stats from CSV</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Offensive Stats CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleOffenseFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Defensive Stats CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleDefenseFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={isImporting || !offenseFile || !defenseFile}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {isImporting ? 'Importing...' : 'Import Stats'}
        </button>

        {importResult && (
          <div className={`p-3 rounded-md ${importResult.includes('failed') ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-green-900/50 text-green-300 border border-green-800'}`}>
            {importResult}
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVImportStats;