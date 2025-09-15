import { supabase } from './supabase';

// Game analysis interface
export interface GameAnalysis {
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  location: string;
  spread: number;
  overUnder: number;
}

// Analysis result interface
export interface AnalysisResult {
  success?: boolean;
  error?: string;
  analysis: string;
  prediction: {
    homeTeam: string;
    awayTeam: string;
    gameDate: string;
    location: string;
    analysis: string;
    confidence: number;
    createdAt: string;
  };
}

// Main analysis function that calls the Supabase Edge Function
export const analyzeGame = async (gameData: GameAnalysis): Promise<AnalysisResult> => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-prediction', {
      body: gameData
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to generate prediction',
        analysis: '',
        prediction: {
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          gameDate: gameData.gameDate,
          location: gameData.location,
          analysis: '',
          confidence: 0,
          createdAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      analysis: data.analysis,
      prediction: data.prediction
    };
  } catch (error) {
    console.error('Error in analyzeGame:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      analysis: '',
      prediction: {
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.awayTeam,
        gameDate: gameData.gameDate,
        location: gameData.location,
        analysis: '',
        confidence: 0,
        createdAt: new Date().toISOString()
      }
    };
  }
};