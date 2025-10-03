import React from 'react';
import AdminPickManager from '../../components/AdminPickManager';

const ManagePicksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Manage Picks</h1>
        <p className="text-gray-400">Edit, revise, and organize your published predictions</p>
      </div>

      <AdminPickManager />

      <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">Pick Management Features:</h4>
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
