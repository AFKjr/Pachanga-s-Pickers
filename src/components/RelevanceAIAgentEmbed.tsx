import React from 'react';

const RelevanceAIAgentEmbed: React.FC = () => {

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Agent Chat Interface */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">💬 Agent Chat Interface</h2>
        <div className="bg-white rounded-lg overflow-hidden p-2">
          <iframe
            src="https://app.relevanceai.com/agents/bcbe5a/34240c168039-4c82-b541-9e1fea2f5e3a/d5baa11d-ce8c-4d74-8afb-547928072b58/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%23685FFF&bubble_icon=pd%2Fchat&input_placeholder_text=Type+your+message...&hide_logo=false&hide_description=false&font_family=Inter"
            width="100%"
            height="596"
            frameBorder="0"
            allow="microphone"
            className="w-full rounded"
            title="Relevance AI Agent"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded">
        <h4 className="font-semibold mb-2">📋 How to Use:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Use the chat interface above to ask the agent for NFL data</li>
          <li>The agent can fetch schedules, analyze games, research teams, etc.</li>
          <li>Data will be automatically saved to the database for user display</li>
          <li>The main page will show the agent-generated content to users</li>
        </ol>
      </div>
    </div>
  );
};

export default RelevanceAIAgentEmbed;