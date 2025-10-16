import React from 'react';
import AdminTeamStats from '../../components/AdminTeamStats';
import CSVImportStats from '../../components/CSVImportStats';

const TeamStatsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* CSV Upload Section */}
      <CSVImportStats />

      {/* Full Stats Management Table */}
      <AdminTeamStats />
    </div>
  );
};

export default TeamStatsPage;
