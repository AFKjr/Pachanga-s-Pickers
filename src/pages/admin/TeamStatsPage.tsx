import React from 'react';
import AdminTeamStats from '../../components/AdminTeamStats';
import CSVImportStats from '../../components/CSVImportStats';

const TeamStatsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Team <span className="text-lime-400">Stats</span>
        </h1>
        <p className="text-gray-400">Monitor and manage NFL team statistics</p>
      </div>

      {/* CSV Upload Section */}
      <CSVImportStats />

      {/* Info Banner */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <p className="font-semibold">ℹ️ Hybrid Stats System</p>
        <p className="text-sm mt-1">
          Team statistics are fetched from Sports Radar API during prediction generation. 
          You can also manually import CSV files above for additional data or overrides.
        </p>
      </div>

      {/* Full Stats Management Table */}
      <AdminTeamStats />
    </div>
  );
};

export default TeamStatsPage;
