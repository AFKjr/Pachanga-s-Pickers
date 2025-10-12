import React from 'react';

const PageHeader: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold text-white mb-2">Pachanga's Picks</h2>
      <p className="text-gray-400">
        Weekly NFL predictions with comprehensive moneyline, spread, and over/under analytics
      </p>
    </div>
  );
};

export default PageHeader;