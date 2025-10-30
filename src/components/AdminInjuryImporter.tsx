/**
 * CSV Parser for NFL Injury Report Data
 * Handles injury reports with player status, practice participation, and game status
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { analyzeTeamInjuryImpact } from '../utils/injuryImpactSystem';
import { getNFLWeekFromDate } from '../utils/nflWeeks';

interface InjuryReportRow {
  Game_Date: string;
  Game_Time: string;
  Away_Team: string;
  Home_Team: string;
  Team: string;
  Player: string;
  Position: string;
  Injuries?: string;
  Practice_Status: string;
  Game_Status?: string;
}

/**
 * Parse injury report CSV with robust parsing
 */
function parseInjuryReportCSV(csvContent: string): { rows: InjuryReportRow[], gameDate: string } {
  // Split into lines and filter out empty ones
  const lines = csvContent.trim().split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  const requiredHeaders = ['Game_Date', 'Away_Team', 'Home_Team', 'Team', 'Player', 'Position', 'Practice_Status'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const injuries: InjuryReportRow[] = [];
  let gameDate = '';

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);

      // Skip empty lines
      if (values.length === 0 || values.every(v => !v.trim())) {
        continue;
      }

      // If we don't have the expected number of columns, try to pad or truncate
      if (values.length < headers.length) {
        // Pad with empty strings
        while (values.length < headers.length) {
          values.push('');
        }
      } else if (values.length > headers.length) {
        // Truncate extra columns (likely malformed)
        console.warn(`Line ${i + 1}: has ${values.length} columns, expected ${headers.length}. Truncating extra columns.`);
        values.splice(headers.length);
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Extract game date from first valid row
      if (!gameDate && row.Game_Date) {
        gameDate = row.Game_Date;
      }

      // Validate required fields (Game_Status and Injuries are optional)
      if (!row.Game_Date || !row.Away_Team || !row.Home_Team || !row.Team || !row.Player || !row.Position || !row.Practice_Status) {
        console.warn(`Skipping line ${i + 1}: missing required fields - ${JSON.stringify(row)}`);
        continue;
      }

      injuries.push(row as InjuryReportRow);
    } catch (error) {
      console.warn(`Skipping line ${i + 1}: parse error - ${error}`);
      continue;
    }
  }

  if (!gameDate) {
    throw new Error('No valid game date found in CSV');
  }

  return { rows: injuries, gameDate };
}

/**
 * Parse a single CSV line, handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
}

/**
 * Convert injury report to database format
 */
function convertToDatabaseFormat(
  injuryRows: InjuryReportRow[],
  gameDate: string,
  weekNumber: number
): Array<{
  player_name: string;
  team_name: string;
  position: string;
  injury_description: string | null;
  practice_participation: string;
  game_status: string;
  player_tier: string;
  backup_tier: string;
  game_date: string;
  opponent_team: string | null;
  week_number: number;
  source: string;
}> {
  // Group by team to find opponents using the game matchup data
  const teamOpponents: Record<string, string> = {};

  injuryRows.forEach(row => {
    const team = row.Team;
    const awayTeam = row.Away_Team;
    const homeTeam = row.Home_Team;

    if (team === awayTeam) {
      teamOpponents[team] = homeTeam;
    } else if (team === homeTeam) {
      teamOpponents[team] = awayTeam;
    }
  });

  return injuryRows.map(row => ({
    player_name: row.Player,
    team_name: row.Team,
    position: row.Position,
    injury_description: row.Injuries || null,
    practice_participation: row.Practice_Status,
    game_status: row.Game_Status || '', // Default to empty string if not provided
    player_tier: 'AVERAGE', // Default - could be enhanced with player database
    backup_tier: 'BELOW_AVERAGE', // Default - could be enhanced with player database
    game_date: gameDate,
    opponent_team: teamOpponents[row.Team] || null,
    week_number: weekNumber,
    source: 'CSV'
  }));
}

/**
 * Calculate injury impacts for all teams
 */
function calculateInjuryImpacts(
  injuryRows: InjuryReportRow[],
  gameDate: string,
  weekNumber: number
) {
  // Group injuries by team
  const teamInjuries: Record<string, any[]> = {};

  injuryRows.forEach(row => {
    if (!teamInjuries[row.Team]) {
      teamInjuries[row.Team] = [];
    }

    teamInjuries[row.Team].push({
      name: row.Player,
      position: row.Position,
      playerTier: 'AVERAGE' as const, // Default tier
      backupTier: 'BELOW_AVERAGE' as const, // Default backup tier
      practiceParticipation: row.Practice_Status,
      gameStatus: row.Game_Status,
      injury: row.Injuries
    });
  });

  // Calculate impacts for each team
  const teamImpacts = Object.entries(teamInjuries).map(([teamName, injuries]) => {
    const analysis = analyzeTeamInjuryImpact(injuries);

    // Count injury severities
    const outCount = injuries.filter(i => i.gameStatus === 'Out').length;
    const doubtfulCount = injuries.filter(i => i.gameStatus === 'Doubtful').length;
    const questionableCount = injuries.filter(i => i.gameStatus === 'Questionable').length;
    const probableCount = injuries.filter(i => i.practiceParticipation === 'Full Participation in Practice' && !i.gameStatus).length;

    return {
      team_name: teamName,
      game_date: gameDate,
      opponent_team: '', // Would need to be determined
      week_number: weekNumber,
      total_impact_points: analysis.totalImpact,
      base_impact: analysis.baseImpact,
      cluster_adjustment: analysis.clusterAdjustment,
      individual_impacts: analysis.individualImpacts,
      cluster_multipliers: analysis.clusterMultipliers,
      out_count: outCount,
      doubtful_count: doubtfulCount,
      questionable_count: questionableCount,
      probable_count: probableCount,
      data_source: 'CSV',
      calculation_version: '1.0'
    };
  });

  return teamImpacts;
}

/**
 * React component for Injury Report Import functionality
 */
const AdminInjuryImporter: React.FC = () => {
  const [injuryFile, setInjuryFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const [previewData, setPreviewData] = useState<InjuryReportRow[]>([]);

  // Helper function to detect NFL week from game date
  const detectWeekFromDate = (date: string): number => {
    const week = getNFLWeekFromDate(date);
    if (week === null) {
      throw new Error(`Unable to determine NFL week for date: ${date}. Please ensure the date falls within the 2025 NFL season.`);
    }
    return week;
  };

  // Helper function to parse CSV game date format (e.g., "Thursday October 30" -> "2025-10-30")
  const parseCSVGameDate = (csvDate: string): string => {
    // Extract month and day from format like "Thursday October 30"
    const parts = csvDate.split(' ');
    if (parts.length < 3) {
      throw new Error(`Invalid CSV date format: ${csvDate}. Expected format: "Day Month DD"`);
    }

    const monthName = parts[1];
    const day = parts[2];

    // Convert month name to number
    const monthNames = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const month = monthNames[monthName as keyof typeof monthNames];
    if (!month) {
      throw new Error(`Invalid month name: ${monthName}`);
    }

    // Assume current year (2025) for NFL season
    return `2025-${month}-${day.padStart(2, '0')}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setInjuryFile(file || null);
    setPreviewData([]);
    setImportResult('');
  };

  const handlePreview = async () => {
    if (!injuryFile) {
      setImportResult('Please select an injury report CSV file.');
      return;
    }

    try {
      const content = await injuryFile.text();
      const { rows: parsedData, gameDate: csvGameDate } = parseInjuryReportCSV(content);
      setPreviewData(parsedData.slice(0, 10)); // Show first 10 rows
      setImportResult(`Preview: Found ${parsedData.length} injury records for ${csvGameDate}`);
    } catch (error) {
      setImportResult(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImport = async () => {
    if (!injuryFile) {
      setImportResult('Please select an injury report CSV file.');
      return;
    }

    setIsImporting(true);
    setImportResult('');

    try {
      const content = await injuryFile.text();
      const { rows: injuryRows, gameDate: csvGameDate } = parseInjuryReportCSV(content);

      // Parse the CSV game date format (e.g., "Thursday October 30" -> "2025-10-30")
      const parsedGameDate = parseCSVGameDate(csvGameDate);

      // Detect week from game date
      const detectedWeek = detectWeekFromDate(parsedGameDate);

      // Convert to database format
      const playerInjuries = convertToDatabaseFormat(injuryRows, parsedGameDate, detectedWeek);

      // Calculate team injury impacts
      const teamImpacts = calculateInjuryImpacts(injuryRows, parsedGameDate, detectedWeek);

      // Save player injuries
      const { error: playerError } = await supabase
        .from('player_injuries')
        .upsert(playerInjuries, { onConflict: 'player_name,team_name,game_date' });

      if (playerError) {
        throw new Error(`Player injuries import failed: ${playerError.message}`);
      }

      // Save team injury impacts
      const { error: impactError } = await supabase
        .from('team_injury_impact')
        .upsert(teamImpacts, { onConflict: 'team_name,game_date' });

      if (impactError) {
        throw new Error(`Team injury impact import failed: ${impactError.message}`);
      }

      setImportResult(`Successfully imported ${playerInjuries.length} player injuries and ${teamImpacts.length} team impact calculations.`);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Import Injury Reports from CSV</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Injury Report CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          <p className="text-xs text-gray-400 mt-1">
            Expected columns: Game_Date, Away_Team, Home_Team, Team, Player, Position, Injuries (optional), Practice_Status, Game_Status (optional)
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handlePreview}
            disabled={!injuryFile}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Preview Data
          </button>

          <button
            onClick={handleImport}
            disabled={isImporting || !injuryFile}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {isImporting ? 'Importing...' : 'Import Injuries'}
          </button>
        </div>

        {importResult && (
          <div className={`p-3 rounded-md ${importResult.includes('failed') || importResult.includes('error') ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-green-900/50 text-green-300 border border-green-800'}`}>
            {importResult}
          </div>
        )}

        {previewData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-100 mb-3">Data Preview (First 10 Rows)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-700 rounded-md">
                <thead>
                  <tr className="bg-gray-600">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Position</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Practice</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Game Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {previewData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-650">
                      <td className="px-4 py-2 text-sm text-gray-300">{row.Team}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{row.Player}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{row.Position}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{row.Practice_Status}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{row.Game_Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInjuryImporter;