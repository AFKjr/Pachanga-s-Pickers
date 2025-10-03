import React from 'react';
import RelevanceAIAgentEmbed from '../../components/RelevanceAIAgentEmbed';
import AdminDataEntry from '../../components/AdminDataEntry';

const GeneratePicksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Generate Picks</h1>
        <p className="text-gray-400">Use AI to generate NFL predictions and publish them</p>
      </div>

      <RelevanceAIAgentEmbed />
      <AdminDataEntry />

      <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">Pick Generation Workflow:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Use the AI agent above to generate NFL predictions</li>
          <li>Copy the agent's response and paste it in "Process Agent Output"</li>
          <li>Click "Process & Publish" to add predictions to the database</li>
          <li>Use other pages to manage existing picks or update results</li>
        </ol>
      </div>
    </div>
  );
};

export default GeneratePicksPage;
