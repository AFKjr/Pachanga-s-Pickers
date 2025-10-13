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
        <p className="text-gray-400">Import and manage NFL team statistics</p>
      </div>

      {/* CSV Import - First for easy weekly updates */}
      <CSVImportStats />
      
      {/* Full Stats Management Table */}
      <AdminTeamStats />
    </div>
  );
};

export default TeamStatsPage;
