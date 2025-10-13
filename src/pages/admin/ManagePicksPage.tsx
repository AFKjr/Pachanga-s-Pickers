import React from 'react';
import AdminPickManager from '../../components/AdminPickManager';

const ManagePicksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Manage <span className="text-lime-400">Picks</span>
        </h1>
        <p className="text-gray-400">Edit, revise, and organize your published predictions</p>
      </div>

      <AdminPickManager />

      <div className="bg-lime-500/10 border border-lime-500/30 text-lime-300 px-4 py-3 rounded-lg">
        <h4 className="font-semibold mb-2 text-lime-400">Pick Management Features:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Revise Picks:</strong> Edit predictions, reasoning, and game details</li>
          <li><strong>Search & Filter:</strong> Find picks by team, week, or prediction text</li>
          <li><strong>Export Data:</strong> Copy pick information for external analysis</li>
          <li><strong>Pin Important Picks:</strong> Highlight key predictions for users</li>
        </ul>
      </div>
    </div>
  );
};

export default ManagePicksPage;
