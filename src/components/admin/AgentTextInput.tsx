import React from 'react';

interface AgentTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const AgentTextInput: React.FC<AgentTextInputProps> = ({
  value,
  onChange,
  disabled,
  placeholder = "Paste agent output here..."
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Agent Output
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white font-mono text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby="agent-text-help"
      />
      <p id="agent-text-help" className="text-xs text-gray-500 mt-1">
        Paste the raw output from your AI agent here for processing.
      </p>
    </div>
  );
};