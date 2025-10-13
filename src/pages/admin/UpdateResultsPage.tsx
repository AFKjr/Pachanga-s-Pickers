import React from 'react';
import AdminPickResults from '../../components/AdminPickResults';

const UpdateResultsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Update <span className="text-lime-400">Results</span>
        </h1>
        <p className="text-gray-400">Enter game scores and mark picks as won, lost, or pushed</p>
      </div>

      <AdminPickResults />

      <div className="bg-lime-500/10 border border-lime-500/30 text-lime-300 px-4 py-3 rounded-lg">
        <h4 className="font-semibold mb-2 text-lime-400">Results Management:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Update Results:</strong> Mark picks as Win, Loss, or Push</li>
          <li><strong>Batch Operations:</strong> Update multiple picks at once</li>
          <li><strong>Statistics Tracking:</strong> Performance metrics are automatically calculated</li>
          <li><strong>Real-time Updates:</strong> Changes immediately update statistics and displays</li>
        </ul>
      </div>
    </div>
  );
};

export default UpdateResultsPage;
