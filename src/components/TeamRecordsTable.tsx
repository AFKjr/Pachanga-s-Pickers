import { useAllTeamRecords } from '../hooks/useTeamRecords';
import { formatRecord } from '../services/teamRecords';

export function TeamRecordsTable() {
  const { records, loading, error } = useAllTeamRecords();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading team records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-red-500">Error loading team records: {error}</div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">No team records available</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
          Team Performance Records
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Straight Up
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Win %
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Against Spread
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cover %
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  O/U Record
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Games
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {records.map((record, index) => (
                <tr key={record.team} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {record.team}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white">
                    {formatRecord(
                      record.moneyline.wins,
                      record.moneyline.losses,
                      record.moneyline.pushes
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                    <span className={
                      record.moneyline.winPct >= 60 ? 'text-green-600 font-semibold' :
                      record.moneyline.winPct >= 50 ? 'text-blue-600' :
                      'text-red-600'
                    }>
                      {record.moneyline.winPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white">
                    {formatRecord(
                      record.ats.wins,
                      record.ats.losses,
                      record.ats.pushes
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                    <span className={
                      record.ats.coverPct >= 60 ? 'text-green-600 font-semibold' :
                      record.ats.coverPct >= 50 ? 'text-blue-600' :
                      'text-red-600'
                    }>
                      {record.ats.coverPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white">
                    {record.overUnder.overs}O-{record.overUnder.unders}U
                    {record.overUnder.pushes > 0 && `-${record.overUnder.pushes}P`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {record.totalGames}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Records are calculated from completed games with final scores. Sorted by straight-up win percentage.
        </div>
      </div>
    </div>
  );
}