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
    </div>
  );
};

export default ManagePicksPage;
