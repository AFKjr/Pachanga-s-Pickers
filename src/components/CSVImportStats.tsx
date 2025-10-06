import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ExtendedTeamStats {
  team: string;
  gamesPlayed: number;
  
  // Offensive stats
  offensiveYardsPerGame: number;
  pointsPerGame: number;
  totalPlays: number;
  yardsPerPlay: number;
  firstDowns: number;
  
  // Offensive passing
  passCompletions: number;
  passAttempts: number;
  passCompletionPct: number;
  passingYards: number;
  passingTds: number;
  interceptionsThrown: number;
  yardsPerPassAttempt: number;
  
  // Offensive rushing
  rushingAttempts: number;
  rushingYards: number;
  rushingTds: number;
  yardsPerRush: number;
  
  // Penalties
  penalties: number;
  penaltyYards: number;
  
  // Turnovers
  turnoversLost: number;
  fumblesLost: number;
  
  // Defense stats
  defensiveYardsAllowed: number;
  pointsAllowedPerGame: number;
  defTotalPlays: number;
  defYardsPerPlayAllowed: number;
  defFirstDownsAllowed: number;
  
  // Defensive passing
  defPassCompletionsAllowed: number;
  defPassAttempts: number;
  defPassingYardsAllowed: number;
  defPassingTdsAllowed: number;
  defInterceptions: number;
  
  // Defensive rushing
  defRushingAttemptsAllowed: number;
  defRushingYardsAllowed: number;
  defRushingTdsAllowed: number;
  
  // Turnovers forced
  turnoversForced: number;
  fumblesForced: number;
  
  // Calculated
  turnoverDifferential: number;
  
  // Placeholders
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

  const parseOffensiveCSV = async (file: File): Promise<Map<string, any>> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line: string) => line.trim());
    
    // Find the main stats header line (contains "Rk,Tm,G,PF")
    let headerLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('rk,tm') && line.includes(',g,') && line.includes('pf')) {
        headerLineIndex = i;
        break;
      }
    }

    const headerLine = lines[headerLineIndex];
    const headers = headerLine.split(',').map((h: string) => h.replace(/"/g, '').trim());
    
    console.log('Offensive CSV Headers:', headers);
    console.log('Offensive CSV - Last 5 columns:', headers.slice(-5));
    
    const statsMap = new Map<string, any>();
    
    // Also find conversions table (contains "3DAtt,3DConv,3D%")
    let conversionsHeaderIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('3datt') && line.includes('3dconv') && line.includes('3d%')) {
        conversionsHeaderIndex = i;
        console.log('Found conversions table at line:', i);
        break;
      }
    }

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines, dividers, and summary rows
      if (!line || line.startsWith('"---') || 
          line.toLowerCase().includes('avg team') || 
          line.toLowerCase().includes('league total') ||
          line.toLowerCase().includes('avg tm/g')) {
        continue;
      }
      
      // Stop parsing if we hit the conversions table
      if (conversionsHeaderIndex !== -1 && i >= conversionsHeaderIndex) {
        break;
      }

      const values = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
      const teamName = values[1]; // Tm is at index 1
      
      // Skip invalid team names (single letters, numbers, summary labels)
      if (!teamName || teamName === '' || /^\d+$/.test(teamName) || 
          teamName.length <= 2 || // Skip "G", "Tm", etc.
          teamName.toLowerCase() === 'tm' || 
          teamName.toLowerCase() === 'g') {
        continue;
      }

      const games = parseFloat(values[2]) || 1; // G is at index 2
      
      statsMap.set(teamName, {
        team: teamName,
        gamesPlayed: games,
        pointsFor: parseFloat(values[3]) || 0, // PF
        totalYards: parseFloat(values[4]) || 0, // Yds (total)
        totalPlays: parseFloat(values[5]) || 0, // Ply
        yardsPerPlay: parseFloat(values[6]) || 0, // Y/P
        turnoversLost: parseFloat(values[7]) || 0, // TO
        fumblesLost: parseFloat(values[8]) || 0, // FL
        firstDowns: parseFloat(values[9]) || 0, // 1stD
        passCompletions: parseFloat(values[10]) || 0, // Cmp
        passAttempts: parseFloat(values[11]) || 0, // Att (passing)
        passingYards: parseFloat(values[12]) || 0, // Yds (passing)
        passingTds: parseFloat(values[13]) || 0, // TD (passing)
        interceptionsThrown: parseFloat(values[14]) || 0, // Int
        yardsPerPassAttempt: parseFloat(values[15]) || 0, // NY/A
        passingFirstDowns: parseFloat(values[16]) || 0, // 1stD (passing)
        rushingAttempts: parseFloat(values[17]) || 0, // Att (rushing)
        rushingYards: parseFloat(values[18]) || 0, // Yds (rushing)
        rushingTds: parseFloat(values[19]) || 0, // TD (rushing)
        yardsPerRush: parseFloat(values[20]) || 0, // Y/A (rushing)
        rushingFirstDowns: parseFloat(values[21]) || 0, // 1stD (rushing)
        penalties: parseFloat(values[22]) || 0, // Pen
        penaltyYards: parseFloat(values[23]) || 0, // Yds (penalties)
        penaltyFirstDowns: parseFloat(values[24]) || 0, // 1stPy
        redZonePct: parseFloat(values[25]) || 50.0, // Sc%
        turnoverPct: parseFloat(values[26]) || 0, // TO%
        thirdDownPct: 40.0 // Will be filled from conversions table below
      });
    }

    // Parse conversions table if it exists
    if (conversionsHeaderIndex !== -1) {
      console.log('Parsing conversions table...');
      
      for (let i = conversionsHeaderIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('"---') || line.toLowerCase().includes('league total')) {
          continue;
        }

        const values = line.split(',').map((v: string) => v.replace(/"/g, '').replace('%', '').trim());
        const teamName = values[1]; // Tm is at index 1
        
        if (!teamName || teamName === '' || /^\d+$/.test(teamName)) {
          continue;
        }

        // Check if this team already exists in our stats map
        const existingStats = statsMap.get(teamName);
        if (existingStats) {
          // Update with conversions data
          // Conversions CSV format: Rk,Tm,G,3DAtt,3DConv,3D%,4DAtt,4DConv,4D%,RZAtt,RZTD,RZPct
          const thirdDownPct = parseFloat(values[5]) || 40.0; // 3D% at index 5
          const redZonePct = parseFloat(values[11]) || 50.0; // RZPct at index 11
          
          existingStats.thirdDownPct = thirdDownPct;
          existingStats.redZonePct = redZonePct; // Override with more accurate conversions data
          
          console.log(`Updated ${teamName}: 3D%=${thirdDownPct}, RZ%=${redZonePct}`);
        }
      }
    }

    return statsMap;
  };

  const parseDefensiveCSV = async (file: File): Promise<Map<string, any>> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line: string) => line.trim());
    
    // Find the main stats header line (contains "Rk,Tm,G,PA")
    let headerLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('rk,tm') && line.includes(',g,') && line.includes('pa')) {
        headerLineIndex = i;
        break;
      }
    }

    const headerLine = lines[headerLineIndex];
    const headers = headerLine.split(',').map((h: string) => h.replace(/"/g, '').trim());
    
    console.log('Defensive CSV Headers:', headers);
    console.log('Defensive CSV - Last 5 columns:', headers.slice(-5));
    
    const statsMap = new Map<string, any>();

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines, dividers, and summary rows
      if (!line || line.startsWith('"---') || 
          line.toLowerCase().includes('avg team') || 
          line.toLowerCase().includes('league total') ||
          line.toLowerCase().includes('avg tm/g')) {
        continue;
      }

      const values = line.split(',').map((v: string) => v.replace(/"/g, '').trim());
      const teamName = values[1]; // Tm is at index 1
      
      // Skip invalid team names (single letters, numbers, summary labels)
      if (!teamName || teamName === '' || /^\d+$/.test(teamName) || 
          teamName.length <= 2 || // Skip "G", "Tm", etc.
          teamName.toLowerCase() === 'tm' || 
          teamName.toLowerCase() === 'g') {
        continue;
      }

      const games = parseFloat(values[2]) || 1; // G is at index 2
      
      statsMap.set(teamName, {
        team: teamName,
        gamesPlayed: games,
        pointsAgainst: parseFloat(values[3]) || 0, // PA
        totalYardsAllowed: parseFloat(values[4]) || 0, // Yds (total)
        totalPlaysAllowed: parseFloat(values[5]) || 0, // Ply
        yardsPerPlayAllowed: parseFloat(values[6]) || 0, // Y/P
        turnoversForced: parseFloat(values[7]) || 0, // TO (defensive)
        fumblesForced: parseFloat(values[8]) || 0, // FL (forced)
        firstDownsAllowed: parseFloat(values[9]) || 0, // 1stD
        passCompletionsAllowed: parseFloat(values[10]) || 0, // Cmp
        passAttemptsAllowed: parseFloat(values[11]) || 0, // Att (passing)
        passingYardsAllowed: parseFloat(values[12]) || 0, // Yds (passing)
        passingTdsAllowed: parseFloat(values[13]) || 0, // TD (passing)
        interceptions: parseFloat(values[14]) || 0, // Int (defensive)
        // NY/A at 15
        passingFirstDownsAllowed: parseFloat(values[16]) || 0, // 1stD (passing)
        rushingAttemptsAllowed: parseFloat(values[17]) || 0, // Att (rushing)
        rushingYardsAllowed: parseFloat(values[18]) || 0, // Yds (rushing)
        rushingTdsAllowed: parseFloat(values[19]) || 0, // TD (rushing)
        // Y/A (rushing) at 20
        rushingFirstDownsAllowed: parseFloat(values[21]) || 0, // 1stD (rushing)
        penaltiesAgainst: parseFloat(values[22]) || 0, // Pen
        penaltyYardsAgainst: parseFloat(values[23]) || 0 // Yds (penalties)
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

      // League averages for missing data
      const leagueAvgYards = 328.3;
      const leagueAvgPoints = 23.4;

      allTeams.forEach(team => {
        const offense = offensiveStats.get(team);
        const defense = defensiveStats.get(team);

        if (!offense && !defense) return;

        const games = (offense?.gamesPlayed || defense?.gamesPlayed || 1);

        // Calculate per-game stats
        const offYardsPerGame = offense ? offense.totalYards / games : leagueAvgYards;
        const defYardsPerGame = defense ? defense.totalYardsAllowed / games : leagueAvgYards;
        const offPointsPerGame = offense ? offense.pointsFor / games : leagueAvgPoints;
        const defPointsPerGame = defense ? defense.pointsAgainst / games : leagueAvgPoints;

        // Turnover differential
        const turnoversGained = defense ? defense.turnoversForced : 0;
        const turnoversLost = offense ? offense.turnoversLost : 0;
        const turnoverDiff = turnoversGained - turnoversLost;

        merged.push({
          team,
          gamesPlayed: games,
          
          // Offensive totals
          offensiveYardsPerGame: offYardsPerGame,
          pointsPerGame: offPointsPerGame,
          totalPlays: offense ? offense.totalPlays / games : 0,
          yardsPerPlay: offense ? offense.yardsPerPlay : 0,
          firstDowns: offense ? offense.firstDowns / games : 0,
          
          // Offensive passing
          passCompletions: offense ? offense.passCompletions / games : 0,
          passAttempts: offense ? offense.passAttempts / games : 0,
          passCompletionPct: offense && offense.passAttempts > 0 
            ? (offense.passCompletions / offense.passAttempts * 100) 
            : 0,
          passingYards: offense ? offense.passingYards / games : 0,
          passingTds: offense ? offense.passingTds / games : 0,
          interceptionsThrown: offense ? offense.interceptionsThrown / games : 0,
          yardsPerPassAttempt: offense ? offense.yardsPerPassAttempt : 0,
          
          // Offensive rushing
          rushingAttempts: offense ? offense.rushingAttempts / games : 0,
          rushingYards: offense ? offense.rushingYards / games : 0,
          rushingTds: offense ? offense.rushingTds / games : 0,
          yardsPerRush: offense ? offense.yardsPerRush : 0,
          
          // Penalties
          penalties: offense ? offense.penalties / games : 0,
          penaltyYards: offense ? offense.penaltyYards / games : 0,
          
          // Turnovers
          turnoversLost: offense ? offense.turnoversLost / games : 0,
          fumblesLost: offense ? offense.fumblesLost / games : 0,
          
          // Defensive totals
          defensiveYardsAllowed: defYardsPerGame,
          pointsAllowedPerGame: defPointsPerGame,
          defTotalPlays: defense ? defense.totalPlaysAllowed / games : 0,
          defYardsPerPlayAllowed: defense ? defense.yardsPerPlayAllowed : 0,
          defFirstDownsAllowed: defense ? defense.firstDownsAllowed / games : 0,
          
          // Defensive passing
          defPassCompletionsAllowed: defense ? defense.passCompletionsAllowed / games : 0,
          defPassAttempts: defense ? defense.passAttemptsAllowed / games : 0,
          defPassingYardsAllowed: defense ? defense.passingYardsAllowed / games : 0,
          defPassingTdsAllowed: defense ? defense.passingTdsAllowed / games : 0,
          defInterceptions: defense ? defense.interceptions / games : 0,
          
          // Defensive rushing
          defRushingAttemptsAllowed: defense ? defense.rushingAttemptsAllowed / games : 0,
          defRushingYardsAllowed: defense ? defense.rushingYardsAllowed / games : 0,
          defRushingTdsAllowed: defense ? defense.rushingTdsAllowed / games : 0,
          
          // Turnovers forced
          turnoversForced: defense ? defense.turnoversForced / games : 0,
          fumblesForced: defense ? defense.fumblesForced / games : 0,
          
          // Calculated
          turnoverDifferential: turnoverDiff / games,
          
          // Conversions data (from offensive CSV)
          thirdDownPct: offense?.thirdDownPct || 40.0,
          redZonePct: offense?.redZonePct || 50.0
        });
      });

      setParsedData(merged);
      setParsing(false);

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
          const { error } = await supabase
            .from('team_stats_cache')
            .upsert({
              team_name: row.team,
              games_played: row.gamesPlayed,
              
              // Offensive stats
              offensive_yards_per_game: row.offensiveYardsPerGame,
              points_per_game: row.pointsPerGame,
              total_plays: row.totalPlays,
              yards_per_play: row.yardsPerPlay,
              first_downs: row.firstDowns,
              
              // Offensive passing
              pass_completions: row.passCompletions,
              pass_attempts: row.passAttempts,
              pass_completion_pct: row.passCompletionPct,
              passing_yards: row.passingYards,
              passing_tds: row.passingTds,
              interceptions_thrown: row.interceptionsThrown,
              yards_per_pass_attempt: row.yardsPerPassAttempt,
              
              // Offensive rushing
              rushing_attempts: row.rushingAttempts,
              rushing_yards: row.rushingYards,
              rushing_tds: row.rushingTds,
              yards_per_rush: row.yardsPerRush,
              
              // Penalties
              penalties: row.penalties,
              penalty_yards: row.penaltyYards,
              
              // Turnovers
              turnovers_lost: row.turnoversLost,
              fumbles_lost: row.fumblesLost,
              
              // Defensive stats
              defensive_yards_allowed: row.defensiveYardsAllowed,
              points_allowed_per_game: row.pointsAllowedPerGame,
              def_total_plays: row.defTotalPlays,
              def_yards_per_play_allowed: row.defYardsPerPlayAllowed,
              def_first_downs_allowed: row.defFirstDownsAllowed,
              
              // Defensive passing
              def_pass_completions_allowed: row.defPassCompletionsAllowed,
              def_pass_attempts: row.defPassAttempts,
              def_passing_yards_allowed: row.defPassingYardsAllowed,
              def_passing_tds_allowed: row.defPassingTdsAllowed,
              def_interceptions: row.defInterceptions,
              
              // Defensive rushing
              def_rushing_attempts_allowed: row.defRushingAttemptsAllowed,
              def_rushing_yards_allowed: row.defRushingYardsAllowed,
              def_rushing_tds_allowed: row.defRushingTdsAllowed,
              
              // Turnovers forced
              turnovers_forced: row.turnoversForced,
              fumbles_forced: row.fumblesForced,
              
              // Calculated
              turnover_differential: row.turnoverDifferential,
              third_down_conversion_rate: row.thirdDownPct,
              red_zone_efficiency: row.redZonePct,
              
              // Metadata
              source: 'csv',
              last_updated: new Date().toISOString()
            });

          if (error) {
            throw error;
          }
          imported++;
        } catch (err) {
          failed++;
          importErrors.push(`${row.team}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (imported > 0) {
        setSuccess(`Successfully imported ${imported} teams with extended stats (including 3rd down & red zone %)!`);
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
        <h3 className="text-xl font-bold text-white mb-2">Import Extended Team Stats from CSV</h3>
        <p className="text-gray-400 text-sm">
          Upload Sports Reference offensive and defensive CSV files with comprehensive statistics
        </p>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-4">
        <h4 className="font-semibold mb-2">📋 Extended Stats Import:</h4>
        
        <div className="text-sm space-y-2">
          <div>
            <p className="font-semibold mb-1">Step 1: Upload Offensive Stats CSV</p>
            <p className="text-xs">Extracts: Passing (Cmp, Att, Yds, TD, Int), Rushing (Att, Yds, TD), Total Yds, Points, Turnovers, Penalties</p>
            <p className="text-xs text-green-400 mt-1">✨ Also parses conversions table (3rd Down %, Red Zone %) if present in same file</p>
          </div>

          <div>
            <p className="font-semibold mb-1">Step 2: Upload Defensive Stats CSV</p>
            <p className="text-xs">Extracts: Pass Defense, Rush Defense, Yards Allowed, Points Allowed, Turnovers Forced, Fumbles Forced</p>
          </div>

          <div>
            <p className="font-semibold mb-1">Step 3: Click "Parse & Merge Stats"</p>
            <p className="text-xs">Combines both files and calculates per-game averages automatically</p>
          </div>

          <div className="mt-2 p-2 bg-blue-950 rounded text-xs">
            <strong>✅ 40+ stats extracted per team:</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Complete offensive breakdown (passing, rushing, total)</li>
              <li>Complete defensive breakdown (pass defense, rush defense)</li>
              <li>Turnover differential (forced vs lost)</li>
              <li>Efficiency metrics (yards per play, completion %, etc.)</li>
              <li>All stats converted to per-game averages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* File Uploads */}
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
            <p className="text-xs text-green-400 mt-1">
              ✓ {offensiveFile.name}
            </p>
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
            <p className="text-xs text-green-400 mt-1">
              ✓ {defensiveFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Parse Button */}
      <div className="mb-4">
        <button
          onClick={mergeStats}
          disabled={parsing || (!offensiveFile && !defensiveFile)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {parsing ? 'Parsing Extended Stats...' : 'Parse & Merge Stats'}
        </button>
        <span className="ml-3 text-xs text-green-400">
          ✨ Auto-detects and parses conversions table (3rd down & red zone %) from offensive CSV
        </span>
      </div>

      {/* Errors */}
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

      {/* Success */}
      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-white">
              Preview: {parsedData.length} teams ready to import
            </h4>
            <button
              onClick={importToDatabase}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import to Database'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-700 text-gray-300">
                <tr>
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-right">G</th>
                  <th className="px-2 py-2 text-right">Off Yds</th>
                  <th className="px-2 py-2 text-right">Def Yds</th>
                  <th className="px-2 py-2 text-right">PPG</th>
                  <th className="px-2 py-2 text-right">PA/G</th>
                  <th className="px-2 py-2 text-right">Pass Yds</th>
                  <th className="px-2 py-2 text-right">Rush Yds</th>
                  <th className="px-2 py-2 text-right">TO Diff</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 text-gray-300">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="px-2 py-2">{row.team}</td>
                    <td className="px-2 py-2 text-right">{row.gamesPlayed}</td>
                    <td className="px-2 py-2 text-right">{row.offensiveYardsPerGame.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.defensiveYardsAllowed.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.pointsPerGame.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.pointsAllowedPerGame.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.passingYards.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.rushingYards.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.turnoverDifferential.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            <p><strong>Note:</strong> Full preview shows 9 columns. Database stores 40+ fields including completion %, TDs, INTs, sacks, fumbles, and more.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVImportStats;
