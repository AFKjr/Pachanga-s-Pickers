import React, { useState, useRef } from 'react';
import { TeamStatsImporter } from '../services/teamStatsImporter';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
}

const AdminTeamStatsImporter: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [week, setWeek] = useState<number>(1);
  const [season, setSeason] = useState<number>(new Date().getFullYear());

  const offenseFileRef = useRef<HTMLInputElement>(null);
  const defenseFileRef = useRef<HTMLInputElement>(null);

  const [offenseFile, setOffenseFile] = useState<File | null>(null);
  const [defenseFile, setDefenseFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
    setValidationErrors([]);
    setImportResult(null);
  };

  const validateFiles = async (): Promise<boolean> => {
    const errors: string[] = [];

    if (!offenseFile) {
      errors.push('Please select an offense CSV file');
    }
    if (!defenseFile) {
      errors.push('Please select a defense CSV file');
    }

    if (offenseFile) {
      const offenseContent = await offenseFile.text();
      const offenseErrors = TeamStatsImporter.validateCSVContent(offenseContent, 'offense');
      errors.push(...offenseErrors);
    }

    if (defenseFile) {
      const defenseContent = await defenseFile.text();
      const defenseErrors = TeamStatsImporter.validateCSVContent(defenseContent, 'defense');
      errors.push(...defenseErrors);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleImport = async () => {
    if (!offenseFile || !defenseFile) return;

    const isValid = await validateFiles();
    if (!isValid) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const offenseContent = await offenseFile.text();
      const defenseContent = await defenseFile.text();

      const result = await TeamStatsImporter.importWeeklyStats(
        offenseContent,
        defenseContent,
        week,
        season
      );

      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown import error'],
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
    setValidationErrors([]);
    if (offenseFileRef.current) offenseFileRef.current.value = '';
    if (defenseFileRef.current) defenseFileRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Import Team Statistics</h2>

      {/* Week and Season Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Week
          </label>
          <input
            type="number"
            min="1"
            max="18"
            value={week}
            onChange={(e) => setWeek(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Season
          </label>
          <input
            type="number"
            min="2020"
            max="2030"
            value={season}
            onChange={(e) => setSeason(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offense CSV File
          </label>
          <input
            ref={offenseFileRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFileSelect(e, 'offense')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {offenseFile && (
            <p className="mt-1 text-sm text-gray-600">Selected: {offenseFile.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Defense CSV File
          </label>
          <input
            ref={defenseFileRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFileSelect(e, 'defense')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {defenseFile && (
            <p className="mt-1 text-sm text-gray-600">Selected: {defenseFile.name}</p>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h3>
          <ul className="list-disc list-inside text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleImport}
          disabled={isImporting || !offenseFile || !defenseFile}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Importing...' : 'Import Statistics'}
        </button>

        <button
          onClick={resetForm}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className={`p-4 rounded-md ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
            Import {importResult.success ? 'Successful' : 'Failed'}
          </h3>

          <div className="text-sm space-y-1">
            <p className={importResult.success ? 'text-green-700' : 'text-red-700'}>
              Teams imported: {importResult.imported}
            </p>
            {importResult.skipped > 0 && (
              <p className="text-yellow-700">
                Teams skipped: {importResult.skipped}
              </p>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-800 mb-1">Errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 max-h-32 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h3>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
          <li>Download offense and defense CSV files from Pro Football Reference</li>
          <li>Ensure files contain multi-section data (general, passing, rushing, downs, etc.)</li>
          <li>Select the appropriate week and season for the statistics</li>
          <li>Click "Import Statistics" to load the data into the database</li>
          <li>Critical stats like drives_per_game and third_down_attempts will be populated</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminTeamStatsImporter;