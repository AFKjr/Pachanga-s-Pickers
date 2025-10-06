import React from 'react';
import APIPredictionsGenerator from '../../components/APIPredictionsGenerator';

const GeneratePicksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Generate Picks</h1>
        <p className="text-gray-400">
          Generate NFL predictions using Monte Carlo simulations
        </p>
      </div>

      <APIPredictionsGenerator />
    </div>
  );
};

export default GeneratePicksPage;
