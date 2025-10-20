// src/components/AdminTeamStatsImporter.tsx - UPDATED WITH FUSION
import React, { useState, useRef } from 'react';
import { NFLStatsFusion } from '../services/nflStatsFusion';
import { parseFusedTeamStats } from '../utils/csvParser';
import { supabase } from '../lib/supabase';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}

interface FusionProgress {
  stage: 'idle' | 'fusing' | 'parsing' | 'inserting' | 'complete' | 'error';
  message: string;
}

const AdminTeamStatsImporter: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fusionProgress, setFusionProgress] = useState<FusionProgress>({
    stage: 'idle',
    message: ''
  });
  const [week, setWeek] = useState<number>(1);
  const [season, setSeason] = useState<number>(2025);

  const offenseFileRef = useRef<HTMLInputElement>(null);
  const defenseFileRef = useRef<HTMLInputElement>(null);

  const [offenseFile, setOffenseFile] = useState<File | null>(null);
  const [defenseFile, setDefenseFile] = useState<File | null>(null);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'offense' | 'defense'
  ) => {
    const file = event.target.files?.[0];
    if (type === 'offense') {
      setOffenseFile(file || null);
    } else {
      setDefenseFile(file || null);
    }
    setImportResult(null);
    setFusionProgress({ stage: 'idle', message: '' });
  };

  const handleImport = async () => {
    if (!offenseFile || !defenseFile) {
      setImportResult({
        success: false,
        imported: 0,
        errors: ['Please select both offense and defense files'],
        skipped: 0
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // STEP 1: Read file contents
      setFusionProgress({
        stage: 'fusing',
        message: 'Reading files and starting fusion...'
      });

      const offenseContent = await offenseFile.text();
      const defenseContent = await defenseFile.text();

      // STEP 2: Fuse the data using browser-based fusion
      setFusionProgress({
        stage: 'fusing',
        message: 'Fusing offensive and defensive stats...'
      });

      const fusedCSV = NFLStatsFusion.fuseCombinedStats(
        offenseContent,
        defenseContent
      );

      console.log('Fused CSV preview:', fusedCSV.substring(0, 500));

      // STEP 3: Parse the fused CSV
      setFusionProgress({
        stage: 'parsing',
        message: 'Parsing fused data and calculating stats...'
      });

      const teamStats = parseFusedTeamStats(fusedCSV, week, season);

      console.log(`Parsed ${teamStats.length} teams:`, teamStats.map(t => t.team_name));

      // STEP 4: Insert into database
      setFusionProgress({
        stage: 'inserting',
        message: `Inserting ${teamStats.length} teams into database...`
      });

      const errors: string[] = [];
      let imported = 0;
      let skipped = 0;

      for (const stats of teamStats) {
        try {
          // Validate critical fields - only check required fields
          if (isNaN(stats.points_per_game)) {
            errors.push(`${stats.team_name}: Invalid points per game value`);
            skipped++;
            continue;
          }

          // Optional fields: only validate if they exist
          if (stats.third_down_conversion_rate !== undefined && isNaN(stats.third_down_conversion_rate)) {
            errors.push(`${stats.team_name}: Invalid third down conversion rate`);
            skipped++;
            continue;
          }

          if (stats.red_zone_efficiency !== undefined && isNaN(stats.red_zone_efficiency)) {
            errors.push(`${stats.team_name}: Invalid red zone efficiency`);
            skipped++;
            continue;
          }

          const { error } = await supabase
            .from('team_stats_cache')
            .upsert({
              ...stats,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'team_name,week,season_year'
            });

          if (error) {
            console.error(`Error inserting ${stats.team_name}:`, error);
            errors.push(`${stats.team_name}: ${error.message}`);
            skipped++;
          } else {
            imported++;
            console.log(`✅ Inserted ${stats.team_name}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${stats.team_name}: ${errorMsg}`);
          skipped++;
        }
      }

      setFusionProgress({
        stage: 'complete',
        message: `Import complete! ${imported} teams imported successfully.`
      });

      setImportResult({
        success: imported > 0,
        imported,
        errors,
        skipped
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Import error:', error);
      
      setFusionProgress({
        stage: 'error',
        message: 'Import failed'
      });

      setImportResult({
        success: false,
        imported: 0,
        errors: [errorMsg],
        skipped: 0
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setOffenseFile(null);
    setDefenseFile(null);
    setImportResult(null);
    setFusionProgress({ stage: 'idle', message: '' });
    if (offenseFileRef.current) offenseFileRef.current.value = '';
    if (defenseFileRef.current) defenseFileRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Import Team Statistics (Fusion Mode)
      </h2>

      {/* Week and Season Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Week
          </label>
          <input
            type="number"
            min="1"
            max="18"
            value={week}
            onChange={(e) => setWeek(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Season
          </label>
          <input
            type="number"
            min="2020"
            max="2030"
            value={season}
            onChange={(e) => setSeason(parseInt(e.target.value) || 2025)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Offense File (.txt or .csv)
          </label>
          <input
            ref={offenseFileRef}
            type="file"
            accept=".txt,.csv"
            onChange={(e) => handleFileSelect(e, 'offense')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {offenseFile && (
            <p className="mt-1 text-sm text-gray-400">
              ✓ Selected: {offenseFile.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Defense File (.txt or .csv)
          </label>
          <input
            ref={defenseFileRef}
            type="file"
            accept=".txt,.csv"
            onChange={(e) => handleFileSelect(e, 'defense')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {defenseFile && (
            <p className="mt-1 text-sm text-gray-400">
              ✓ Selected: {defenseFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Fusion Progress */}
      {fusionProgress.stage !== 'idle' && (
        <div className={`mb-6 p-4 rounded-md border ${
          fusionProgress.stage === 'error'
            ? 'bg-red-900 border-red-700'
            : fusionProgress.stage === 'complete'
            ? 'bg-green-900 border-green-700'
            : 'bg-blue-900 border-blue-700'
        }`}>
          <div className="flex items-center space-x-3">
            {isImporting && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            )}
            <div>
              <h3 className="text-sm font-medium text-white">
                {fusionProgress.stage === 'fusing' && '🔗 Fusing Data'}
                {fusionProgress.stage === 'parsing' && '📊 Parsing Stats'}
                {fusionProgress.stage === 'inserting' && '💾 Inserting to Database'}
                {fusionProgress.stage === 'complete' && '✅ Complete'}
                {fusionProgress.stage === 'error' && '❌ Error'}
              </h3>
              <p className="text-sm text-gray-300 mt-1">
                {fusionProgress.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleImport}
          disabled={isImporting || !offenseFile || !defenseFile}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isImporting ? 'Importing...' : '🚀 Import & Fuse Statistics'}
        </button>

        <button
          onClick={resetForm}
          disabled={isImporting}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className={`p-4 rounded-md border ${
          importResult.success
            ? 'bg-green-900 border-green-700'
            : 'bg-red-900 border-red-700'
        }`}>
          <h3 className="text-sm font-medium mb-2 text-white">
            Import {importResult.success ? '✅ Successful' : '❌ Failed'}
          </h3>

          <div className="text-sm space-y-1 text-gray-200">
            <p>
              Teams imported: <span className="font-bold">{importResult.imported}</span>
            </p>
            {importResult.skipped > 0 && (
              <p className="text-yellow-300">
                Teams skipped: {importResult.skipped}
              </p>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-white mb-1">Errors:</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 max-h-32 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-900 border border-blue-700 rounded-md">
        <h3 className="text-sm font-medium text-blue-200 mb-2">📖 Instructions:</h3>
        <ul className="list-disc list-inside text-sm text-blue-100 space-y-1">
          <li>Select your <strong>Week X Offensive.txt</strong> file from Pro Football Reference</li>
          <li>Select your <strong>Week X Defensive.txt</strong> file from Pro Football Reference</li>
          <li>The system will automatically <strong>fuse</strong> the multi-table data in your browser</li>
          <li>All stats are <strong>calculated</strong> (per-game averages, percentages, etc.)</li>
          <li>Field names are <strong>transformed</strong> to match your database schema</li>
          <li>Data is <strong>validated</strong> before insertion to catch errors</li>
          <li>Click "Import & Fuse Statistics" to process everything automatically</li>
        </ul>
      </div>

      {/* Technical Details */}
      <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-md">
        <h3 className="text-sm font-medium text-gray-300 mb-2">🔧 What Happens:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
          <li>Files are read and parsed in your browser (no upload needed)</li>
          <li>Multiple stat tables are detected and fused by team name</li>
          <li>Column names are transformed (e.g., <code className="text-lime-400">offense_pf</code> → <code className="text-lime-400">points_per_game</code>)</li>
          <li>Per-game averages are calculated (totals ÷ games played)</li>
          <li>Percentages are computed (e.g., third down %, red zone %)</li>
          <li>All 100+ database fields are populated correctly</li>
          <li>Data is upserted to Supabase (updates existing or creates new)</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminTeamStatsImporter;