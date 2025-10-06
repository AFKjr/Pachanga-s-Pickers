import React from 'react';
import AdminTeamStats from '../../components/AdminTeamStats';

const TeamStatsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <AdminTeamStats />

      <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">How Team Stats Impact Predictions:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Monte Carlo Simulation:</strong> Uses these stats to simulate 10,000 games</li>
          <li><strong>Offensive Strength:</strong> Higher yards/points = better scoring probability</li>
          <li><strong>Defensive Strength:</strong> Lower yards/points allowed = harder to score against</li>
          <li><strong>Turnover Differential:</strong> Major factor in possession outcomes</li>
          <li><strong>3rd Down %:</strong> Drives ability to sustain scoring drives</li>
          <li><strong>Red Zone %:</strong> Determines TD vs FG when in scoring position</li>
        </ul>
      </div>

      <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">⚠️ Warning:</h4>
        <p className="text-sm">
          Teams using <strong>Default</strong> (league average) stats will produce generic, 
          unreliable predictions. Always aim for ESPN, Manual, or Historical data sources.
        </p>
      </div>
    </div>
  );
};

export default TeamStatsPage;
