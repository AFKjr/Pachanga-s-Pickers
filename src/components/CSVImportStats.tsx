import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseWeeklyTeamStats } from '../utils/csvParser';

// Import the ParsedTeamStats type from csvParser
type ParsedTeamStats = ReturnType<typeof parseWeeklyTeamStats>[0];

const CSVImportStats: React.FC = () => {
  const [offensiveFile, setOffensiveFile] = useState<File | null>(null);
  const [defensiveFile, setDefensiveFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTeamStats[]>([]);
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
      // Parse CSV files using the utility
      const offensiveContent = offensiveFile ? await offensiveFile.text() : '';
      const defensiveContent = defensiveFile ? await defensiveFile.text() : '';

      // Extract week information from filename
      const fileToCheck = offensiveFile || defensiveFile;
      if (fileToCheck) {
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

      // ✅ USE THE PARSER - This is the critical part!
      const parsedStatsArray = parseWeeklyTeamStats(offensiveContent, defensiveContent, weekNumber, seasonYear);

      // ✅ DIRECTLY USE THE PARSED DATA - Don't remap it!
      // The parser already returns everything in the correct format
      setParsedData(parsedStatsArray);
      setParsing(false);

      // Debug log
      const detroitData = parsedStatsArray.find(t => t.team_name === 'Detroit Lions');
      if (detroitData) {
        console.log('✅ PARSED DATA - Detroit Lions:', {
          yards_per_play: detroitData.yards_per_play,
          yards_per_play_allowed: detroitData.yards_per_play_allowed,
          drives_per_game: detroitData.drives_per_game,
          points_per_game: detroitData.points_per_game,
          points_allowed_per_game: detroitData.points_allowed_per_game,
          scoring_percentage: detroitData.scoring_percentage,
          total_plays: detroitData.total_plays
        });
      }

      if (parsedStatsArray.length === 0) {
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

      for (const stats of parsedData) {
        try {
          const canonicalName = (stats as any).team_name;
          if (!canonicalName) {
            console.warn(`⚠️ Skipping unknown team: "${(stats as any).team_name}"`);
            importErrors.push(`Unknown team: "${(stats as any).team_name}"`);
            failed++;
            continue;
          }

          // Debug log for first team
          if ((stats as any).team_name === 'Detroit Lions') {
            console.log('� IMPORTING Detroit Lions:', {
              yards_per_play: (stats as any).yards_per_play,
              yards_per_play_allowed: (stats as any).yards_per_play_allowed,
              drives_per_game: (stats as any).drives_per_game,
              points_allowed_per_game: (stats as any).points_allowed_per_game
            });
          }

          // Import ALL stats needed for simulation
          const { error } = await supabase
            .from('team_stats_cache')
            .upsert({
              team_name: canonicalName,
              week: weekNumber,
              season_year: seasonYear,
              games_played: (stats as any).games_played,
              
              // CRITICAL STATS - These MUST be included
              yards_per_play: (stats as any).yards_per_play,
              yards_per_play_allowed: (stats as any).yards_per_play_allowed,
              points_allowed_per_game: (stats as any).points_allowed_per_game,
              drives_per_game: (stats as any).drives_per_game,
              
              // Core stats
              offensive_yards_per_game: (stats as any).offensive_yards_per_game,
              defensive_yards_allowed: (stats as any).defensive_yards_allowed,
              points_per_game: (stats as any).points_per_game,
              passing_yards: (stats as any).passing_yards,
              rushing_yards: (stats as any).rushing_yards,
              turnovers_lost: (stats as any).turnovers_lost,
              def_interceptions: (stats as any).def_interceptions,
              turnover_differential: (stats as any).turnover_differential,
              
              // Additional useful stats
              passing_yards_per_game: (stats as any).passing_yards_per_game,
              rushing_yards_per_game: (stats as any).rushing_yards_per_game,
              turnovers_per_game: (stats as any).turnovers_per_game,
              total_plays: (stats as any).total_plays,
              plays_per_game: (stats as any).plays_per_game,
              scoring_percentage: (stats as any).scoring_percentage,
              defensive_yards_per_game: (stats as any).defensive_yards_per_game,
              takeaways: (stats as any).takeaways,
              defensive_scoring_pct_allowed: (stats as any).defensive_scoring_pct_allowed,
              
              // Metadata
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
          
          console.log(`✅ Imported/Updated: ${canonicalName} (Week ${weekNumber})`);
          imported++;
        } catch (err) {
          failed++;
          const displayName = (stats as any).team_name;
          importErrors.push(`${displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (imported > 0) {
        const timestamp = new Date().toLocaleTimeString();
        const failureNote = failed > 0 ? ` (${failed} skipped)` : '';
        setSuccess(`✅ Successfully imported ${imported} teams for Week ${weekNumber} at ${timestamp}${failureNote}! Refresh page to see updates.`);
        
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
                    <td className="px-2 py-2">{row.team_name}</td>
                    <td className="px-2 py-2 text-right">{row.games_played}</td>
                    <td className="px-2 py-2 text-right">{row.offensive_yards_per_game.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.defensive_yards_allowed.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.points_per_game.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.points_allowed_per_game.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">{row.drives_per_game?.toFixed(1) || 'N/A'}</td>
                    <td className="px-2 py-2 text-right">{(row.points_per_game / row.drives_per_game)?.toFixed(2) || 'N/A'}</td>
                    <td className="px-2 py-2 text-right">{row.scoring_percentage?.toFixed(1) || 'N/A'}%</td>
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