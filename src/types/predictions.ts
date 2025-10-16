// Strict type definitions for NFL predictions
export type ConfidenceLevel = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

export type NFLWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export interface ParsedPrediction {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  confidence: ConfidenceLevel; 
  reasoning: string;
  gameDate: Date; 
  week: NFLWeek; 
}

export interface PredictionSaveResult {
  savedCount: number;
  duplicateCount: number;
}

export interface AgentTextParserResult {
  parseAgentText: (text: string, selectedWeek?: NFLWeek) => ParsedPrediction[];
  processText: (text: string, selectedWeek?: NFLWeek) => Promise<ParsedPrediction[]>;
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