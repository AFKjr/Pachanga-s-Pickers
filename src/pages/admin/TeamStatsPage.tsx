import React from 'react';
import AdminTeamStats from '../../components/AdminTeamStats';

const TeamStatsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Team <span className="text-lime-400">Stats</span>
        </h1>
        <p className="text-gray-400">Monitor NFL team statistics (fetched automatically from Sports Radar API)</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <p className="font-semibold">ℹ️ API-Only Stats System</p>
        <p className="text-sm mt-1">
          Team statistics are now fetched automatically from Sports Radar API during prediction generation.
          Manual CSV imports are no longer needed.
        </p>
      </div>

      {/* Full Stats Management Table */}
      <AdminTeamStats />
    </div>
  );
};

export default TeamStatsPage;
