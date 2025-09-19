import React, { useState } from 'react';
import { AgentTextInput } from './admin/AgentTextInput';
import { WeekSelector } from './admin/WeekSelector';
import { ProcessingActions } from './admin/ProcessingActions';
import { StatusMessage } from './admin/StatusMessage';
import { useAgentTextParser } from '../hooks/useAgentTextParser';
import { usePredictionManager } from '../hooks/usePredictionManager';
import { NFLWeek } from '../types/index';

const AdminDataEntry: React.FC = () => {
  const [agentText, setAgentText] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<NFLWeek | null>(null);

  const {
    processText,
    isProcessing: isParsingText,
    error: parseError,
    clearError
  } = useAgentTextParser();

  const {
    savePredictions,
    cleanDuplicates,
    isSaving,
    message,
    clearMessage
  } = usePredictionManager();

  const isProcessing = isParsingText || isSaving;
  const canProcess = agentText.trim().length > 0 && !isProcessing;

  const handleProcess = async () => {
    try {
      clearError();
      clearMessage();

      const predictions = await processText(agentText, selectedWeek || undefined);
      await savePredictions(predictions);

      // Clear form on success
      setAgentText('');
    } catch (error) {
      // Errors are handled by the hooks
      console.error('Processing failed:', error);
    }
  };

  const handleCleanDuplicates = async () => {
    try {
      clearMessage();
      await cleanDuplicates();
    } catch (error) {
      console.error('Clean duplicates failed:', error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">📝 Process Agent Output</h2>

      <AgentTextInput
        value={agentText}
        onChange={setAgentText}
        disabled={isProcessing}
      />

      <WeekSelector
        selectedWeek={selectedWeek}
        onChange={setSelectedWeek}
        disabled={isProcessing}
      />

      <ProcessingActions
        onProcess={handleProcess}
        onCleanDuplicates={handleCleanDuplicates}
        canProcess={canProcess}
        isProcessing={isProcessing}
      />

      <StatusMessage
        message={parseError || message}
        onClear={parseError ? clearError : clearMessage}
      />
    </div>
  );
};

export default AdminDataEntry;