import React, { useState } from 'react';
import { automaticResultsUpdater } from '../lib/automaticResultsUpdater';
import { globalEvents } from '../lib/events';

interface AutoUpdateResultsProps {
  onResultsUpdated?: () => void;
}

const AutoUpdateResults: React.FC<AutoUpdateResultsProps> = ({ onResultsUpdated }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<{ updated: number; errors: string[]; timestamp: Date } | null>(null);

  const handleAutoUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await automaticResultsUpdater.updateAllPendingResults();

      setLastUpdate({
        updated: result.updated,
        errors: result.errors,
        timestamp: new Date()
      });

      // Notify other components to refresh stats
      if (result.updated > 0) {
        globalEvents.emit('refreshStats');
      }

      if (onResultsUpdated) {
        onResultsUpdated();
      }
    } catch (error: any) {
      setLastUpdate({
        updated: 0,
        errors: [`Update failed: ${error.message}`],
        timestamp: new Date()
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleUpdate = async () => {
    setIsUpdating(true);
    try {
      await automaticResultsUpdater.scheduleAutomaticUpdates();

      setLastUpdate({
        updated: 0,
        errors: ['Scheduled update completed - check console for details'],
        timestamp: new Date()
      });

      // Notify other components to refresh stats
      globalEvents.emit('refreshStats');

      if (onResultsUpdated) {
        onResultsUpdated();
      }
    } catch (error: any) {
      setLastUpdate({
        updated: 0,
        errors: [`Scheduled update failed: ${error.message}`],
        timestamp: new Date()
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Automatic Results Update</h3>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleAutoUpdate}
            disabled={isUpdating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isUpdating ? 'Updating...' : 'Update All Pending Results'}
          </button>

          <button
            onClick={handleScheduleUpdate}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isUpdating ? 'Scheduling...' : 'Schedule Automatic Update'}
          </button>
        </div>

        {lastUpdate && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">
              Last Update: {lastUpdate.timestamp.toLocaleString()}
            </h4>

            <div className="space-y-2">
              <p className="text-green-600 font-medium">
                ✅ Updated {lastUpdate.updated} picks
              </p>

              {lastUpdate.errors.length > 0 && (
                <div className="text-red-600">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {lastUpdate.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Fetches results from SportsData.io API</li>
            <li>• Updates all pending picks automatically</li>
            <li>• Determines win/loss/push based on game scores</li>
            <li>• Updates statistics immediately</li>
          </ul>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Setup Required</h4>
          <p className="text-sm text-yellow-700">
            Add <code className="bg-yellow-100 px-1 rounded">VITE_SPORTS_DATA_API_KEY</code> to your environment variables
            to enable automatic updates. Get a free API key from{' '}
            <a
              href="https://sportsdata.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              SportsData.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdateResults;