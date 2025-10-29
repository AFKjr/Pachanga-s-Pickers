import { useTeamRecord } from '../hooks/useTeamRecords';
import { formatRecord } from '../services/teamRecords';

interface TeamRecordDisplayProps {
  teamName: string;
  compact?: boolean;
}

export function TeamRecordDisplay({ teamName, compact = false }: TeamRecordDisplayProps) {
  const { record, loading, error } = useTeamRecord(teamName);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">Error loading record</div>;
  }

  if (!record || record.totalGames === 0) {
    return <div className="text-gray-500 text-sm">No completed games</div>;
  }

  if (compact) {
    return (
      <div className="text-sm space-y-1">
        <div className="font-semibold text-gray-700 dark:text-gray-300">
          {record.team}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-10">ML:</span>
            <span className="font-medium">
              {formatRecord(
                record.moneyline.wins,
                record.moneyline.losses,
                record.moneyline.pushes
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-10">ATS:</span>
            <span className="font-medium">
              {formatRecord(
                record.ats.wins,
                record.ats.losses,
                record.ats.pushes
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 w-10">O/U:</span>
            <span className="font-medium">
              {record.overUnder.overs}O-{record.overUnder.unders}U
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <h3 className="text-lg font-bold mb-3">{record.team}</h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Straight Up:</span>
          <div className="text-right">
            <div className="font-medium">
              {formatRecord(
                record.moneyline.wins,
                record.moneyline.losses,
                record.moneyline.pushes
              )}
            </div>
            <div className={`text-sm ${
              record.moneyline.winPct >= 60 ? 'text-green-600' :
              record.moneyline.winPct >= 50 ? 'text-blue-600' :
              'text-red-600'
            }`}>
              {record.moneyline.winPct.toFixed(1)}% win rate
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Against Spread:</span>
          <div className="text-right">
            <div className="font-medium">
              {formatRecord(
                record.ats.wins,
                record.ats.losses,
                record.ats.pushes
              )}
            </div>
            <div className={`text-sm ${
              record.ats.coverPct >= 60 ? 'text-green-600' :
              record.ats.coverPct >= 50 ? 'text-blue-600' :
              'text-red-600'
            }`}>
              {record.ats.coverPct.toFixed(1)}% cover rate
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Over/Under:</span>
          <div className="text-right">
            <div className="font-medium">
              {record.overUnder.overs}O-{record.overUnder.unders}U
              {record.overUnder.pushes > 0 && `-${record.overUnder.pushes}P`}
            </div>
            <div className="text-sm text-gray-600">
              {record.overUnder.overPct.toFixed(1)}% over
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Based on {record.totalGames} completed game{record.totalGames !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}