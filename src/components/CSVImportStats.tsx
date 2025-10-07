import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { resolveTeamName } from '../utils/teamNameResolver';

interface ExtendedTeamStats {
  team: string;
  gamesPlayed: number;
  offensiveYardsPerGame: number;
  pointsPerGame: number;
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  passCompletions: number;
  passAttempts: number;
  passCompletionPct: number;
  passingYards: number;
  passingTds: number;
  interceptionsThrown: number;
  yardsPerPassAttempt: number;
  rushingAttempts: number;
  rushingYards: number;
  rushingTds: number;
  yardsPerRush: number;
  penalties: number;
  penaltyYards: number;
  turnoversLost: number;
  fumblesLost: number;
  defensiveYardsAllowed: number;
  pointsAllowedPerGame: number;
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  turnoversForced: number;
  fumblesForced: number;
  turnoverDifferential: number;
  thirdDownPct: number;
  redZonePct: number;
}

const CSVImportStats: React.FC = () => {
  const [offensiveFile, setOffensiveFile] = useState<File | null>(null);
  const [defensiveFile, setDefensiveFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ExtendedTeamStats[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');

  const handleOffensiveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isCSV = selectedFile.name.toLowerCase().endsWith('.csv');
      if (isCSV) {
        setOffensiveFile(selectedFile);
        setErrors([]);
        setSuccess('');
        setParsedData([]);
      } else {
        setErrors(['Please select a valid CSV file (must end in .csv)']);
      }
    }
  };

  const handleDefensiveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isCSV = selectedFile.name.toLowerCase().endsWith('.csv');
      if (isCSV) {
        setDefensiveFile(selectedFile);
        setErrors([]);
        setSuccess('');
        setParsedData([]);
      } else {
        setErrors(['Please select a valid CSV file (must end in .csv)']);
      }
    }
  };

  const findHeaderLine = (lines: string[]): number => {
    // Look for the line that contains the actual column headers (Rk, Tm, G, and either PF or PA)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lineLower = lines[i].toLowerCase();
      // Check if this line has Rk, Tm, G and looks like actual headers (not category labels)
      if (lineLower.includes('rk,tm') && lineLower.includes(',g,') && 
          (lineLower.includes(',pf,') || lineLower.includes(',pa,'))) {
        console.log(`Found header line at index ${i}:`, lines[i]);
        return i;
      }
    }
    return 0; // Default to first line if not found
  };

  const cleanCSVLine = (line: string): string => {
    // Remove surrounding quotes from entire line if present
    let cleaned = line.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  };

  const parseOffensiveCSV = async (file: File): Promise<Map<string, any>> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line: string) => line.trim());
    
    const headerLineIndex = findHeaderLine(lines);
    const headerLine = cleanCSVLine(lines[headerLineIndex]);
    const headers = headerLine.split(',').map((h: string) => h.replace(/"/g, '').trim());
    
    console.log('Offensive CSV Headers:', headers);
    console.log('Header line index:', headerLineIndex);
    
    const statsMap = new Map<string, any>();

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines, dividers, category headers, and summary rows
      if (!line || 
          line.startsWith('"---') || 
          line.toLowerCase().includes('avg team') || 
          line.toLowerCase().includes('league total') ||
          line.toLowerCase().includes('avg tm/g') ||
          line.toLowerCase().includes('tot yds') ||
          line.toLowerCase().includes('passing') ||
          line.toLowerCase().includes('rushing')) {
        continue;
      }

      line = cleanCSVLine(line);
      const values = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
      
      const rankValue = values[0];
      const teamName = values[1];
      
      // Skip if rank is not a number (indicates header or category row)
      if (!rankValue || isNaN(parseInt(rankValue))) {
        continue;
      }
      
      // Skip invalid team names
      if (!teamName || teamName === '' || /^\d+$/.test(teamName) || 
          teamName.length <= 2 || teamName.toLowerCase() === 'tm') {
        continue;
      }

      const games = parseFloat(values[2]) || 1;
      
      if (teamName === 'Detroit Lions') {
        console.log('🔍 DEBUG - Detroit Lions offensive parsing:');
        console.log('  Raw values:', values);
        console.log('  Games:', games);
      }
      
      statsMap.set(teamName, {
        team: teamName,
        gamesPlayed: games,
        pointsFor: parseFloat(values[3]) || 0,
        totalYards: parseFloat(values[4]) || 0,
        totalPlays: parseFloat(values[5]) || 0,
        yardsPerPlay: parseFloat(values[6]) || 0,
        turnoversLost: parseFloat(values[7]) || 0,
        fumblesLost: parseFloat(values[8]) || 0,
        firstDowns: parseFloat(values[9]) || 0,
        passCompletions: parseFloat(values[10]) || 0,
        passAttempts: parseFloat(values[11]) || 0,
        passingYards: parseFloat(values[12]) || 0,
        passingTds: parseFloat(values[13]) || 0,
        interceptionsThrown: parseFloat(values[14]) || 0,
        yardsPerPassAttempt: parseFloat(values[15]) || 0,
        passingFirstDowns: parseFloat(values[16]) || 0,
        rushingAttempts: parseFloat(values[17]) || 0,
        rushingYards: parseFloat(values[18]) || 0,
        rushingTds: parseFloat(values[19]) || 0,
        yardsPerRush: parseFloat(values[20]) || 0,
        rushingFirstDowns: parseFloat(values[21]) || 0,
        penalties: parseFloat(values[22]) || 0,
        penaltyYards: parseFloat(values[23]) || 0,
        penaltyFirstDowns: parseFloat(values[24]) || 0,
        redZonePct: parseFloat(values[25]) || 50.0,
        turnoverPct: parseFloat(values[26]) || 0,
        thirdDownPct: 40.0
      });
    }

    return statsMap;
  };

  const parseDefensiveCSV = async (file: File): Promise<Map<string, any>> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line: string) => line.trim());
    
    const headerLineIndex = findHeaderLine(lines);
    const headerLine = cleanCSVLine(lines[headerLineIndex]);
    const headers = headerLine.split(',').map((h: string) => h.replace(/"/g, '').trim());
    
    console.log('Defensive CSV Headers:', headers);
    console.log('Header line index:', headerLineIndex);
    
    const statsMap = new Map<string, any>();

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines, dividers, category headers, and summary rows
      if (!line || 
          line.startsWith('"---') || 
          line.toLowerCase().includes('avg team') || 
          line.toLowerCase().includes('league total') ||
          line.toLowerCase().includes('avg tm/g') ||
          line.toLowerCase().includes('tot yds') ||
          line.toLowerCase().includes('passing') ||
          line.toLowerCase().includes('rushing')) {
        continue;
      }

      line = cleanCSVLine(line);
      const values = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
      
      const rankValue = values[0];
      const teamName = values[1];
      
      // Skip if rank is not a number
      if (!rankValue || isNaN(parseInt(rankValue))) {
        continue;
      }
      
      // Skip invalid team names
      if (!teamName || teamName === '' || /^\d+$/.test(teamName) || 
          teamName.length <= 2 || teamName.toLowerCase() === 'tm') {
        continue;
      }

      const games = parseFloat(values[2]) || 1;
      
      statsMap.set(teamName, {
        team: teamName,
        gamesPlayed: games,
        pointsAgainst: parseFloat(values[3]) || 0,
        totalYardsAllowed: parseFloat(values[4]) || 0,
        totalPlaysAllowed: parseFloat(values[5]) || 0,
        yardsPerPlayAllowed: parseFloat(values[6]) || 0,
        turnoversForced: parseFloat(values[7]) || 0,
        fumblesForced: parseFloat(values[8]) || 0,
        firstDownsAllowed: parseFloat(values[9]) || 0,
        passCompletionsAllowed: parseFloat(values[10]) || 0,
        passAttemptsAllowed: parseFloat(values[11]) || 0,
        passingYardsAllowed: parseFloat(values[12]) || 0,
        passingTdsAllowed: parseFloat(values[13]) || 0,
        interceptions: parseFloat(values[14]) || 0,
        passingFirstDownsAllowed: parseFloat(values[16]) || 0,
        rushingAttemptsAllowed: parseFloat(values[17]) || 0,
        rushingYardsAllowed: parseFloat(values[18]) || 0,
        rushingTdsAllowed: parseFloat(values[19]) || 0,
        rushingFirstDownsAllowed: parseFloat(values[21]) || 0,
        penaltiesAgainst: parseFloat(values[22]) || 0,
        penaltyYardsAgainst: parseFloat(values[23]) || 0
      });
    }

    return statsMap;
  };

  const mergeStats = async () => {
    if (!offensiveFile && !defensiveFile) {
      setErrors(['Please upload at least one CSV file']);
      return;
    }

    setParsing(true);
    setErrors([]);
    setParsedData([]);

    try {
      const offensiveStats = offensiveFile ? await parseOffensiveCSV(offensiveFile) : new Map();
      const defensiveStats = defensiveFile ? await parseDefensiveCSV(defensiveFile) : new Map();
      
      const merged: ExtendedTeamStats[] = [];
      const allTeams = new Set([...offensiveStats.keys(), ...defensiveStats.keys()]);

      const leagueAvgYards = 328.3;
      const leagueAvgPoints = 23.4;

      allTeams.forEach(team => {
        const offense = offensiveStats.get(team);
        const defense = defensiveStats.get(team);

        if (!offense && !defense) return;

        const games = (offense?.gamesPlayed || defense?.gamesPlayed || 1);
        const offYardsPerGame = offense ? offense.totalYards / games : leagueAvgYards;
        const defYardsPerGame = defense ? defense.totalYardsAllowed / games : leagueAvgYards;
        const offPointsPerGame = offense ? offense.pointsFor / games : leagueAvgPoints;
        const defPointsPerGame = defense ? defense.pointsAgainst / games : leagueAvgPoints;

        const turnoversGained = defense ? defense.turnoversForced : 0;
        const turnoversLost = offense ? offense.turnoversLost : 0;
        const turnoverDiff = turnoversGained - turnoversLost;

        merged.push({
          team,
          gamesPlayed: games,
          offensiveYardsPerGame: offYardsPerGame,
          pointsPerGame: offPointsPerGame,
          totalPlays: offense ? offense.totalPlays / games : 0,
          yardsPerPlay: offense ? offense.yardsPerPlay : 0,
          firstDowns: offense ? offense.firstDowns / games : 0,
          passCompletions: offense ? offense.passCompletions / games : 0,
          passAttempts: offense ? offense.passAttempts / games : 0,
          passCompletionPct: offense && offense.passAttempts > 0 
            ? (offense.passCompletions / offense.passAttempts * 100) 
            : 0,
          passingYards: offense ? offense.passingYards / games : 0,
          passingTds: offense ? offense.passingTds / games : 0,
          interceptionsThrown: offense ? offense.interceptionsThrown / games : 0,
          yardsPerPassAttempt: offense ? offense.yardsPerPassAttempt : 0,
          rushingAttempts: offense ? offense.rushingAttempts / games : 0,
          rushingYards: offense ? offense.rushingYards / games : 0,
          rushingTds: offense ? offense.rushingTds / games : 0,
          yardsPerRush: offense ? offense.yardsPerRush : 0,
          penalties: offense ? offense.penalties / games : 0,
          penaltyYards: offense ? offense.penaltyYards / games : 0,
          turnoversLost: offense ? offense.turnoversLost / games : 0,
          fumblesLost: offense ? offense.fumblesLost / games : 0,
          defensiveYardsAllowed: defYardsPerGame,
          pointsAllowedPerGame: defPointsPerGame,
          defTotalPlays: defense ? defense.totalPlaysAllowed / games : 0,
          defYardsPerPlayAllowed: defense ? defense.yardsPerPlayAllowed : 0,
          defFirstDownsAllowed: defense ? defense.firstDownsAllowed / games : 0,
          defPassCompletionsAllowed: defense ? defense.passCompletionsAllowed / games : 0,
          defPassAttempts: defense ? defense.passAttemptsAllowed / games : 0,
          defPassingYardsAllowed: defense ? defense.passingYardsAllowed / games : 0,
          defPassingTdsAllowed: defense ? defense.passingTdsAllowed / games : 0,
          defInterceptions: defense ? defense.interceptions / games : 0,
          defRushingAttemptsAllowed: defense ? defense.rushingAttemptsAllowed / games : 0,
          defRushingYardsAllowed: defense ? defense.rushingYardsAllowed / games : 0,
          defRushingTdsAllowed: defense ? defense.rushingTdsAllowed / games : 0,
          turnoversForced: defense ? defense.turnoversForced / games : 0,
          fumblesForced: defense ? defense.fumblesForced / games : 0,
          turnoverDifferential: turnoverDiff / games,
          thirdDownPct: offense?.thirdDownPct || 40.0,
          redZonePct: offense?.redZonePct || 50.0
        });
      });

      setParsedData(merged);
      setParsing(false);

      const detroitData = merged.find(t => t.team === 'Detroit Lions');
      if (detroitData) {
        console.log('✅ PARSED DATA - Detroit Lions:', {
          offYards: detroitData.offensiveYardsPerGame,
          defYards: detroitData.defensiveYardsAllowed,
          ppg: detroitData.pointsPerGame,
          games: detroitData.gamesPlayed
        });
      }

      if (merged.length === 0) {
        setErrors(['No valid team data found in CSV files']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to parse CSV files']);
      setParsing(false);
    }
  };

  const importToDatabase = async () => {
    if (parsedData.length === 0) {
      setErrors(['No data to import. Please parse CSV files first.']);
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      let imported = 0;
      let failed = 0;
      const importErrors: string[] = [];

      for (const row of parsedData) {
        try {
          const canonicalName = resolveTeamName(row.team);
          if (!canonicalName) {
            console.warn(`⚠️ Skipping unknown team: "${row.team}"`);
            importErrors.push(`Unknown team: "${row.team}" - not in NFL team list`);
            failed++;
            continue;
          }

          if (canonicalName !== row.team) {
            console.log(`📝 Normalized: "${row.team}" → "${canonicalName}"`);
          }

          const { error } = await supabase
            .from('team_stats_cache')
            .upsert({
              team_name: canonicalName,
              games_played: row.gamesPlayed,
              offensive_yards_per_game: row.offensiveYardsPerGame,
              points_per_game: row.pointsPerGame,
              total_plays: row.totalPlays,
              yards_per_play: row.yardsPerPlay,
              first_downs: row.firstDowns,
              pass_completions: row.passCompletions,
              pass_attempts: row.passAttempts,
              pass_completion_pct: row.passCompletionPct,
              passing_yards: row.passingYards,
              passing_tds: row.passingTds,
              interceptions_thrown: row.interceptionsThrown,
              yards_per_pass_attempt: row.yardsPerPassAttempt,
              rushing_attempts: row.rushingAttempts,
              rushing_yards: row.rushingYards,
              rushing_tds: row.rushingTds,
              yards_per_rush: row.yardsPerRush,
              penalties: row.penalties,
              penalty_yards: row.penaltyYards,
              turnovers_lost: row.turnoversLost,
              fumbles_lost: row.fumblesLost,
              defensive_yards_allowed: row.defensiveYardsAllowed,
              points_allowed_per_game: row.pointsAllowedPerGame,
              def_total_plays: row.defTotalPlays,
              def_yards_per_play_allowed: row.defYardsPerPlayAllowed,
              def_first_downs_allowed: row.defFirstDownsAllowed,
              def_pass_completions_allowed: row.defPassCompletionsAllowed,
              def_pass_attempts: row.defPassAttempts,
              def_passing_yards_allowed: row.defPassingYardsAllowed,
              def_passing_tds_allowed: row.defPassingTdsAllowed,
              def_interceptions: row.defInterceptions,
              def_rushing_attempts_allowed: row.defRushingAttemptsAllowed,
              def_rushing_yards_allowed: row.defRushingYardsAllowed,
              def_rushing_tds_allowed: row.defRushingTdsAllowed,
              turnovers_forced: row.turnoversForced,
              fumbles_forced: row.fumblesForced,
              turnover_differential: row.turnoverDifferential,
              third_down_conversion_rate: row.thirdDownPct,
              red_zone_efficiency: row.redZonePct,
              source: 'csv',
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'team_name',
              ignoreDuplicates: false
            });

          if (error) {
            console.error(`Error importing ${canonicalName}:`, error);
            throw error;
          }
          
          console.log(`✅ Imported/Updated: ${canonicalName}`);
          imported++;
        } catch (err) {
          failed++;
          const displayName = resolveTeamName(row.team) || row.team;
          importErrors.push(`${displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (imported > 0) {
        const timestamp = new Date().toLocaleTimeString();
        const failureNote = failed > 0 ? ` (${failed} skipped)` : '';
        setSuccess(`✅ Successfully imported ${imported} teams at ${timestamp}${failureNote}! Refresh page (Ctrl+F5) to see updates.`);
        
        setParsedData([]);
        setOffensiveFile(null);
        setDefensiveFile(null);
      }

      if (importErrors.length > 0) {
        setErrors(importErrors);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to import data']);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Import Team Stats from CSV</h3>
        <p className="text-gray-400 text-sm">
          Upload Sports Reference offensive and defensive CSV files
        </p>
      </div>

      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-4">
        <h4 className="font-semibold mb-2">📋 CSV Import Guide:</h4>
        <div className="text-sm space-y-2">
          <p>✅ Handles Sports Reference CSV format with category headers</p>
          <p>✅ Auto-detects actual data rows (skips metadata rows)</p>
          <p>✅ Extracts 40+ stats per team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Offensive Stats CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleOffensiveFileChange}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              cursor-pointer"
          />
          {offensiveFile && (
            <p className="text-xs text-green-400 mt-1">✓ {offensiveFile.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Defensive Stats CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleDefensiveFileChange}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              cursor-pointer"
          />
          {defensiveFile && (
            <p className="text-xs text-green-400 mt-1">✓ {defensiveFile.name}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={mergeStats}
          disabled={parsing || (!offensiveFile && !defensiveFile)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {parsing ? 'Parsing...' : 'Parse & Merge Stats'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          <h4 className="font-semibold mb-2">Errors:</h4>
          <ul className="list-disc list-inside text-sm">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {parsedData.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-white">
              Preview: {parsedData.length} teams ready
            </h4>
            <button
              onClick={importToDatabase}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
            >
              {importing ? 'Importing...' : 'Import to Database'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-right">G</th>
                  <th className="px-2 py-2 text-right">Off Yds</th>
                  <th className="px-2 py-2 text-right">Def Yds</th>
                  <th className="px-2 py-2 text-right">PPG</th>
                  <th className="px-2 py-2 text-right">PA/G</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="px-2 py-2">{row.team}</td>
                    <td className="px-2 py-2 text-right">{row.gamesPlayed}</td>
                    <td className="px-2 py-2 text-right">{row.offensiveYardsPerGame.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.defensiveYardsAllowed.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.pointsPerGame.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.pointsAllowedPerGame.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVImportStats;