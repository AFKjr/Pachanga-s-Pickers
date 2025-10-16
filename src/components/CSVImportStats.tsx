import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseWeeklyTeamStats } from '../utils/csvParser';

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
  
  // NEW DRIVE-LEVEL STATS
  drivesPerGame: number;
  playsPerDrive: number;
  pointsPerDrive: number;
  scoringPercentage: number;
  yardsPerDrive: number;
  timePerDriveSeconds: number;
  thirdDownAttempts?: number;
  thirdDownConversions?: number;
  fourthDownAttempts?: number;
  fourthDownConversions?: number;
  redZoneAttempts?: number;
  redZoneTouchdowns?: number;
}

const CSVImportStats: React.FC = () => {
  const [offensiveFile, setOffensiveFile] = useState<File | null>(null);
  const [defensiveFile, setDefensiveFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ExtendedTeamStats[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [seasonYear, setSeasonYear] = useState<number>(2025);

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

  const mergeStats = async () => {
    if (!offensiveFile && !defensiveFile) {
      setErrors(['Please upload at least one CSV file']);
      return;
    }

    setParsing(true);
    setErrors([]);
    setParsedData([]);

    try {
      // Parse CSV files using the new utility
      const offensiveContent = offensiveFile ? await offensiveFile.text() : '';
      const defensiveContent = defensiveFile ? await defensiveFile.text() : '';

      // Extract week information from filename (simplified approach)
      const fileToCheck = offensiveFile || defensiveFile;
      if (fileToCheck) {
        // Try to extract week from filename, fallback to current values
        const filename = fileToCheck.name.toLowerCase();
        const weekMatch = filename.match(/week[_\s]+(\d+)/i);
        const seasonMatch = filename.match(/(\d{4})/);

        if (weekMatch) {
          setWeekNumber(parseInt(weekMatch[1]));
        }
        if (seasonMatch) {
          setSeasonYear(parseInt(seasonMatch[1]));
        }

        console.log(`📊 Processing stats for Week ${weekNumber}, Season ${seasonYear}`);
      }

      // Parse stats using new utility
      const parsedStats = parseWeeklyTeamStats(offensiveContent, defensiveContent);

      // Convert to array format for the component
      const merged: ExtendedTeamStats[] = [];

      Object.entries(parsedStats).forEach(([teamName, stats]) => {
        merged.push({
          team: teamName,
          gamesPlayed: stats.games_played || 1,
          offensiveYardsPerGame: stats.offensive_yards_per_game || 0,
          pointsPerGame: stats.points_per_game || 0,
          totalPlays: 0, // Not available in new format
          yardsPerPlay: stats.yards_per_play || 0,
          firstDowns: 0, // Not available in new format
          passCompletions: 0, // Not available in new format
          passAttempts: 0, // Not available in new format
          passCompletionPct: 0, // Not available in new format
          passingYards: stats.passing_yards || 0,
          passingTds: stats.passing_tds || 0,
          interceptionsThrown: stats.turnovers_lost || 0, // Approximation
          yardsPerPassAttempt: 0, // Not available in new format
          rushingAttempts: 0, // Not available in new format
          rushingYards: stats.rushing_yards || 0,
          rushingTds: stats.rushing_tds || 0,
          yardsPerRush: 0, // Not available in new format
          penalties: 0, // Not available in new format
          penaltyYards: 0, // Not available in new format
          turnoversLost: stats.turnovers_lost || 0,
          fumblesLost: 0, // Not available in new format
          defensiveYardsAllowed: stats.defensive_yards_allowed || 0,
          pointsAllowedPerGame: stats.points_allowed_per_game || 0,
          defTotalPlays: 0, // Not available in new format
          defYardsPerPlayAllowed: stats.def_yards_per_play_allowed || 0,
          defFirstDownsAllowed: 0, // Not available in new format
          defPassCompletionsAllowed: 0, // Not available in new format
          defPassAttempts: 0, // Not available in new format
          defPassingYardsAllowed: stats.def_passing_yards_allowed || 0,
          defPassingTdsAllowed: stats.def_passing_tds_allowed || 0,
          defInterceptions: stats.def_interceptions || 0,
          defRushingAttemptsAllowed: 0, // Not available in new format
          defRushingYardsAllowed: stats.def_rushing_yards_allowed || 0,
          defRushingTdsAllowed: stats.def_rushing_tds_allowed || 0,
          turnoversForced: stats.turnovers_forced || 0,
          fumblesForced: 0, // Not available in new format
          turnoverDifferential: (stats.turnovers_forced || 0) - (stats.turnovers_lost || 0),
          thirdDownPct: stats.third_down_conversion_rate || 0,
          redZonePct: stats.red_zone_efficiency || 0,

          // NEW DRIVE-LEVEL STATS
          drivesPerGame: stats.drives_per_game || 0,
          playsPerDrive: 0, // Not available in new format
          pointsPerDrive: 0, // Not available in new format
          scoringPercentage: 0, // Not available in new format
          yardsPerDrive: 0, // Not available in new format
          timePerDriveSeconds: 0, // Not available in new format
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
          const canonicalName = row.team;
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
              week: weekNumber,
              season_year: seasonYear,
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
              
              // Optional drive stats
              third_down_attempts: row.thirdDownAttempts,
              third_down_conversions: row.thirdDownConversions,
              fourth_down_attempts: row.fourthDownAttempts,
              fourth_down_conversions: row.fourthDownConversions,
              red_zone_attempts: row.redZoneAttempts,
              red_zone_touchdowns: row.redZoneTouchdowns,
              
              // NEW DRIVE-LEVEL STATS
              drives_per_game: row.drivesPerGame,
              plays_per_drive: row.playsPerDrive,
              points_per_drive: row.pointsPerDrive,
              scoring_percentage: row.scoringPercentage,
              yards_per_drive: row.yardsPerDrive,
              time_per_drive_seconds: row.timePerDriveSeconds,
              
              source: 'csv',
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'team_name,week,season_year',
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
          const displayName = row.team;
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

      {weekNumber > 1 && (
        <div className="mb-4 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-2 rounded">
          <p className="text-sm">
            📅 <strong>Detected:</strong> Week {weekNumber}, Season {seasonYear}
          </p>
        </div>
      )}

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
                  <th className="px-2 py-2 text-right">Drives/G</th>
                  <th className="px-2 py-2 text-right">Pts/Dr</th>
                  <th className="px-2 py-2 text-right">Sc%</th>
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
                    <td className="px-2 py-2 text-right">{row.drivesPerGame?.toFixed(1) || 'N/A'}</td>
                    <td className="px-2 py-2 text-right">{row.pointsPerDrive?.toFixed(2) || 'N/A'}</td>
                    <td className="px-2 py-2 text-right">{row.scoringPercentage?.toFixed(1) || 'N/A'}%</td>
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