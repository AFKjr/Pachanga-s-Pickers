import React from 'react';
import { TeamRecordsTable } from '../components/TeamRecordsTable';

const TeamRecordsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Custom Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Records</h1>
          <p className="text-xl text-gray-400 mb-2">Real performance vs. Vegas odds</p>
          <p className="text-gray-500">
            Track how teams actually perform against the betting lines. This data is calculated from completed games with final scores.
          </p>
        </div>

        <div className="mt-8">
          <TeamRecordsTable />
        </div>
      </div>
    </div>
  );
};

export default TeamRecordsPage;