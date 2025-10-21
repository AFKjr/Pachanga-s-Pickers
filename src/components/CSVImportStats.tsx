/**
 * CSV Parser for NFL Sports Reference Data
 * Handles multi-section CSV files with different stat categories
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TeamStats {
  team_name: string;
  week: number;
  season_year: number;
  games_played: number;
  
  // Offensive stats
  points_per_game: number;
  offensive_yards_per_game: number;
  total_plays: number;
  yards_per_play: number;
  turnovers_lost: number;
  fumbles_lost: number;
  first_downs: number;
  turnover_differential: number;
  
  // Passing stats
  pass_completions: number;
  pass_attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions_thrown: number;
  yards_per_pass_attempt: number;
  pass_completion_pct: number;
  
  // Rushing stats
  rushing_attempts: number;
  rushing_yards: number;
  rushing_tds: number;
  yards_per_rush: number;
  
  // First downs breakdown
  pass_first_downs: number;
  rush_first_downs: number;
  penalty_first_downs: number;
  penalties: number;
  penalty_yards: number;
  
  // Conversion stats
  third_down_attempts: number;
  third_down_conversions: number;
  fourth_down_attempts: number;
  fourth_down_conversions: number;
  red_zone_attempts: number;
  red_zone_touchdowns: number;
  
  // Drive stats
  scoring_percentage: number;
  turnover_percentage: number;
  
  // Special teams
  field_goal_attempts: number;
  field_goals_made: number;
  extra_point_attempts: number;
  extra_points_made: number;
  
  // Defensive stats
  points_allowed_per_game: number;
  defensive_yards_allowed: number;
  def_total_plays: number;
  def_yards_per_play_allowed: number;
  turnovers_forced: number;
  fumbles_forced: number;
  def_first_downs_allowed: number;
  
  // Defensive passing
  def_pass_completions_allowed: number;
  def_pass_attempts: number;
  def_passing_yards_allowed: number;
  def_passing_tds_allowed: number;
  def_interceptions: number;
  
  // Defensive rushing
  def_rushing_attempts_allowed: number;
  def_rushing_yards_allowed: number;
  def_rushing_tds_allowed: number;
  def_yards_per_rush_allowed: number;
  
  // Defensive efficiency
  def_scoring_percentage: number;
  def_turnover_percentage: number;
  
  // Metadata
  source: string;
  last_updated: string;
}

type SectionName = 
  | 'offense_total'
  | 'offense_passing'
  | 'offense_rushing'
  | 'conversions'
  | 'drives'
  | 'defense_total'
  | 'defense_passing'
  | 'defense_rushing'
  | 'kicking'
  | 'scoring'
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
  
  // Conversions (3rd down, 4th down, red zone)
  if (headerStr.includes('3datt,3dconv,3d%') && headerStr.includes('rzatt')) {
    return 'conversions';
  }
  
  // Drive stats
  if (headerStr.includes('#dr') && headerStr.includes('sc%,to%')) {
    return 'drives';
  }
  
  // Defense total stats (PA = Points Against)
  if (headerStr.includes('rk,tm,g,pa') && headerStr.includes('ply') && headerStr.includes('y/p')) {
    return 'defense_total';
  }
  
  // Defense passing stats (has Sk for sacks)
  if (headerStr.includes('cmp,att') && headerStr.includes('sk,yds') && headerStr.includes('int')) {
    return 'defense_passing';
  }
  
  // Defense rushing stats (no Fmb column, defensive context)
  if (headerStr.includes('att,yds,td') && headerStr.includes('y/a,y/g') && !headerStr.includes('fmb')) {
    return 'defense_rushing';
  }
  
  // Kicking stats
  if (headerStr.includes('fga,fgm,fg%') && headerStr.includes('xpa,xpm')) {
    return 'kicking';
  }
  
  // Scoring detail
  if (headerStr.includes('rshtd,rectd') || (headerStr.includes('fga') && headerStr.includes('safety'))) {
    return 'scoring';
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
function parseMultiSectionCSV(csvContent: string): Record<string, Record<string, any>> {
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
      teamData.points_per_game = parseNumeric(getColumnValue('PF')) / teamData.games_played;
      teamData.offensive_yards_per_game = parseNumeric(getColumnValue('Yds')) / teamData.games_played;
      teamData.total_plays = parseNumeric(getColumnValue('Ply'));
      teamData.yards_per_play = parseNumeric(getColumnValue('Y/P'));
      teamData.turnovers_lost = parseNumeric(getColumnValue('TO'));
      teamData.fumbles_lost = parseNumeric(getColumnValue('FL'));
      teamData.first_downs = parseNumeric(getColumnValue('1stD'));
      
      // Extract first down breakdowns (multiple 1stD columns)
      const firstDIndices = headers.map((h, i) => h.toLowerCase() === '1std' ? i : -1).filter(i => i !== -1);
      if (firstDIndices.length >= 3) {
        teamData.pass_first_downs = parseNumeric(values[firstDIndices[1]]); // passing 1stD
        teamData.rush_first_downs = parseNumeric(values[firstDIndices[2]]); // rushing 1stD
      }
      
      // Extract penalty stats
      const penIndex = headers.findIndex(h => h.toLowerCase() === 'pen');
      if (penIndex !== -1 && penIndex + 2 < values.length) {
        teamData.penalties = parseNumeric(values[penIndex]);
        teamData.penalty_yards = parseNumeric(values[penIndex + 1]);
        teamData.penalty_first_downs = parseNumeric(values[penIndex + 2]);
      }
      break;
      
    case 'offense_passing':
      teamData.pass_completions = parseNumeric(getColumnValue('Cmp'));
      teamData.pass_attempts = parseNumeric(getColumnValue('Att'));
      teamData.pass_completion_pct = parsePercentage(getColumnValue('Cmp%'));
      teamData.passing_yards = parseNumeric(getColumnValue('Yds'));
      teamData.passing_tds = parseNumeric(getColumnValue('TD'));
      teamData.interceptions_thrown = parseNumeric(getColumnValue('Int'));
      teamData.yards_per_pass_attempt = parseNumeric(getColumnValue('Y/A'));
      break;
      
    case 'offense_rushing':
      teamData.rushing_attempts = parseNumeric(getColumnValue('Att'));
      teamData.rushing_yards = parseNumeric(getColumnValue('Yds'));
      teamData.rushing_tds = parseNumeric(getColumnValue('TD'));
      teamData.yards_per_rush = parseNumeric(getColumnValue('Y/A'));
      teamData.rush_first_downs = parseNumeric(getColumnValue('1stD'));
      break;
      
    case 'conversions':
      teamData.third_down_attempts = parseNumeric(getColumnValue('3DAtt'));
      teamData.third_down_conversions = parseNumeric(getColumnValue('3DConv'));
      teamData.fourth_down_attempts = parseNumeric(getColumnValue('4DAtt'));
      teamData.fourth_down_conversions = parseNumeric(getColumnValue('4DConv'));
      teamData.red_zone_attempts = parseNumeric(getColumnValue('RZAtt'));
      teamData.red_zone_touchdowns = parseNumeric(getColumnValue('RZTD'));
      break;
      
    case 'drives':
      teamData.scoring_percentage = parsePercentage(getColumnValue('SC%'));
      teamData.turnover_percentage = parsePercentage(getColumnValue('TO%'));
      break;
      
    case 'defense_total':
      teamData.points_allowed_per_game = parseNumeric(getColumnValue('PA')) / teamData.games_played;
      teamData.defensive_yards_allowed = parseNumeric(getColumnValue('Yds'));
      teamData.def_total_plays = parseNumeric(getColumnValue('Ply'));
      teamData.def_yards_per_play_allowed = parseNumeric(getColumnValue('Y/P'));
      teamData.turnovers_forced = parseNumeric(getColumnValue('TO'));
      teamData.fumbles_forced = parseNumeric(getColumnValue('FL'));
      teamData.def_first_downs_allowed = parseNumeric(getColumnValue('1stD'));
      break;
      
    case 'defense_passing':
      teamData.def_pass_completions_allowed = parseNumeric(getColumnValue('Cmp'));
      teamData.def_pass_attempts = parseNumeric(getColumnValue('Att'));
      teamData.def_passing_yards_allowed = parseNumeric(getColumnValue('Yds'));
      teamData.def_passing_tds_allowed = parseNumeric(getColumnValue('TD'));
      teamData.def_interceptions = parseNumeric(getColumnValue('Int'));
      break;
      
    case 'defense_rushing':
      teamData.def_rushing_attempts_allowed = parseNumeric(getColumnValue('Att'));
      teamData.def_rushing_yards_allowed = parseNumeric(getColumnValue('Yds'));
      teamData.def_rushing_tds_allowed = parseNumeric(getColumnValue('TD'));
      teamData.def_yards_per_rush_allowed = parseNumeric(getColumnValue('Y/A'));
      break;
      
    case 'kicking':
      teamData.field_goal_attempts = parseNumeric(getColumnValue('FGA'));
      teamData.field_goals_made = parseNumeric(getColumnValue('FGM'));
      teamData.extra_point_attempts = parseNumeric(getColumnValue('XPA'));
      teamData.extra_points_made = parseNumeric(getColumnValue('XPM'));
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
  const offensiveData = parseMultiSectionCSV(offensiveCSV);
  
  console.log('🔄 Parsing defensive CSV...');
  const defensiveData = parseMultiSectionCSV(defensiveCSV);
  
  // Merge data for each team
  const allTeams = new Set([
    ...Object.keys(offensiveData),
    ...Object.keys(defensiveData)
  ]);
  
  const mergedStats: TeamStats[] = [];
  
  for (const teamName of allTeams) {
    const offStats = offensiveData[teamName] || {};
    const defStats = defensiveData[teamName] || {};
    
    const teamStats: TeamStats = {
      team_name: teamName,
      week: 7, // Current week based on CSV files
      season_year: 2025, // Current season
      games_played: offStats.games_played || defStats.games_played || 0,
      
      // Offensive stats
      points_per_game: offStats.points_per_game || 0,
      offensive_yards_per_game: offStats.offensive_yards_per_game || 0,
      total_plays: offStats.total_plays || 0,
      yards_per_play: offStats.yards_per_play || 0,
      turnovers_lost: offStats.turnovers_lost || 0,
      fumbles_lost: offStats.fumbles_lost || 0,
      first_downs: offStats.first_downs || 0,
      turnover_differential: (defStats.turnovers_forced || 0) - (offStats.turnovers_lost || 0),
      
      // Passing stats
      pass_completions: offStats.pass_completions || 0,
      pass_attempts: offStats.pass_attempts || 0,
      passing_yards: offStats.passing_yards || 0,
      passing_tds: offStats.passing_tds || 0,
      interceptions_thrown: offStats.interceptions_thrown || 0,
      yards_per_pass_attempt: offStats.yards_per_pass_attempt || 0,
      pass_completion_pct: offStats.pass_completion_pct || 0,
      
      // Rushing stats
      rushing_attempts: offStats.rushing_attempts || 0,
      rushing_yards: offStats.rushing_yards || 0,
      rushing_tds: offStats.rushing_tds || 0,
      yards_per_rush: offStats.yards_per_rush || 0,
      
      // First downs breakdown
      pass_first_downs: offStats.pass_first_downs || 0,
      rush_first_downs: offStats.rush_first_downs || 0,
      penalty_first_downs: offStats.penalty_first_downs || 0,
      penalties: offStats.penalties || 0,
      penalty_yards: offStats.penalty_yards || 0,
      
      // Conversion stats
      third_down_attempts: offStats.third_down_attempts || 0,
      third_down_conversions: offStats.third_down_conversions || 0,
      fourth_down_attempts: offStats.fourth_down_attempts || 0,
      fourth_down_conversions: offStats.fourth_down_conversions || 0,
      red_zone_attempts: offStats.red_zone_attempts || 0,
      red_zone_touchdowns: offStats.red_zone_touchdowns || 0,
      
      // Drive stats
      scoring_percentage: offStats.scoring_percentage || 0,
      turnover_percentage: offStats.turnover_percentage || 0,
      
      // Special teams
      field_goal_attempts: offStats.field_goal_attempts || 0,
      field_goals_made: offStats.field_goals_made || 0,
      extra_point_attempts: offStats.extra_point_attempts || 0,
      extra_points_made: offStats.extra_points_made || 0,
      
      // Defensive stats
      points_allowed_per_game: defStats.points_allowed_per_game || 0,
      defensive_yards_allowed: defStats.defensive_yards_allowed || 0,
      def_total_plays: defStats.def_total_plays || 0,
      def_yards_per_play_allowed: defStats.def_yards_per_play_allowed || 0,
      turnovers_forced: defStats.turnovers_forced || 0,
      fumbles_forced: defStats.fumbles_forced || 0,
      def_first_downs_allowed: defStats.def_first_downs_allowed || 0,
      
      // Defensive passing
      def_pass_completions_allowed: defStats.def_pass_completions_allowed || 0,
      def_pass_attempts: defStats.def_pass_attempts || 0,
      def_passing_yards_allowed: defStats.def_passing_yards_allowed || 0,
      def_passing_tds_allowed: defStats.def_passing_tds_allowed || 0,
      def_interceptions: defStats.def_interceptions || 0,
      
      // Defensive rushing
      def_rushing_attempts_allowed: defStats.def_rushing_attempts_allowed || 0,
      def_rushing_yards_allowed: defStats.def_rushing_yards_allowed || 0,
      def_rushing_tds_allowed: defStats.def_rushing_tds_allowed || 0,
      def_yards_per_rush_allowed: defStats.def_yards_per_rush_allowed || 0,
      
      // Defensive efficiency
      def_scoring_percentage: defStats.def_scoring_percentage || 0,
      def_turnover_percentage: defStats.def_turnover_percentage || 0,
      
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