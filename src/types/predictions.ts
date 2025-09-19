export interface ParsedPrediction {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  confidence: number;
  reasoning: string;
  gameDate: string;
  week: number;
}

export interface PredictionSaveResult {
  savedCount: number;
  duplicateCount: number;
}

export interface AgentTextParserResult {
  parseAgentText: (text: string, selectedWeek?: number) => ParsedPrediction[];
  processText: (text: string, selectedWeek?: number) => Promise<ParsedPrediction[]>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export interface PredictionManagerResult {
  savePredictions: (predictions: ParsedPrediction[]) => Promise<PredictionSaveResult>;
  cleanDuplicates: () => Promise<void>;
  isSaving: boolean;
  message: string;
  clearMessage: () => void;
}