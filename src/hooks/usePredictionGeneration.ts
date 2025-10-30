/**
 * usePredictionGeneration Hook
 *
 * Extracts all business logic from APIPredictionsGenerator component.
 * Handles API communication, state management, and prediction saving.
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePickManager } from './usePickManager';
import type { NFLWeek } from '../types';

interface PredictionGenerationState {
  loading: boolean;
  error: string;
  success: string;
  predictions: any[];
}

interface PredictionGenerationResult extends PredictionGenerationState {
  targetWeek: NFLWeek | null;
  setTargetWeek: (week: NFLWeek | null) => void;
  generatePredictions: () => Promise<void>;
  clearMessages: () => void;
}

/**
 * Hook for managing prediction generation workflow
 *
 * Handles:
 * - API communication with Edge Function
 * - Loading and error states
 * - Prediction data storage
 * - Success/failure tracking
 */
export function usePredictionGeneration(): PredictionGenerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [targetWeek, setTargetWeek] = useState<NFLWeek | null>(null);

  const { createPick } = usePickManager();

  /**
   * Clear all status messages
   */
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  /**
   * Get current auth session
   *
   * @throws Error if user is not authenticated
   * @returns Supabase session object
   */
  const getAuthSession = async () => {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!session) {
      throw new Error('Not authenticated');
    }

    return session;
  };

  /**
   * Build Edge Function URL
   *
   * @returns Full URL to generate-predictions Edge Function
   */
  const buildFunctionUrl = (): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable not set');
    }

    return `${supabaseUrl}/functions/v1/generate-predictions`;
  };

  /**
   * Call Edge Function to generate predictions
   *
   * @param accessToken - Supabase access token for authorization
   * @returns Array of generated predictions
   */
  const callPredictionApi = async (accessToken: string): Promise<any[]> => {
    const functionUrl = buildFunctionUrl();

    console.log('Calling /api/generate-predictions...');

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetWeek: targetWeek
      })
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      await handleApiError(response);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid API response format');
    }

    const data = await response.json();

    if (!data.predictions || !Array.isArray(data.predictions)) {
      throw new Error('Invalid response format - missing predictions array');
    }

    return data.predictions;
  };

  /**
   * Handle API error responses
   *
   * @param response - Failed fetch response
   * @throws Error with appropriate message
   */
  const handleApiError = async (response: Response): Promise<never> => {
    const contentType = response.headers.get('content-type');
    console.error('API Error - Content-Type:', contentType);

    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      console.error('API Error Data:', errorData);
      const message = errorData.error || errorData.details || errorData.hint || 'API error';
      throw new Error(message);
    }

    const textError = await response.text();
    console.error('API Error Text:', textError);
    const message = textError || `HTTP ${response.status}: Failed to generate predictions`;
    throw new Error(message);
  };

  /**
   * Save predictions to database
   *
   * @param predictions - Array of predictions from API
   * @param userId - User ID to associate with picks
   * @returns Object containing save statistics
   */
  const savePredictions = async (
    predictions: any[],
    userId: string
  ): Promise<{ savedCount: number; failedGames: string[]; createdCount: number; updatedCount: number }> => {
    let savedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const failedGames: string[] = [];

    for (const prediction of predictions) {
      const pickData = {
        ...prediction,
        is_pinned: true,
        user_id: userId
      };

      const saved = await createPick(pickData);

      if (saved) {
        savedCount++;
        // For now, we'll assume all are created. In the future, we could modify createPick to return whether it was created or updated
        createdCount++;
      } else {
        const gameName = `${prediction.game_info.away_team} @ ${prediction.game_info.home_team}`;
        failedGames.push(gameName);
      }
    }

    return { savedCount, failedGames, createdCount, updatedCount };
  };

  /**
   * Build success message based on save results
   *
   * @param savedCount - Number of successfully saved predictions
   * @param totalCount - Total number of predictions
   * @param failedGames - Array of game names that failed to save
   * @returns Formatted success message
   */
  const buildSuccessMessage = (
    savedCount: number,
    totalCount: number,
    failedGames: string[]
  ): string => {
    if (failedGames.length > 0) {
      return `Saved/Updated ${savedCount}/${totalCount} predictions. Failed: ${failedGames.join(', ')}`;
    }

    return `Successfully saved/updated ${savedCount} predictions for upcoming games!`;
  };

  /**
   * Main function to generate and save predictions
   *
   * Orchestrates the entire workflow:
   * 1. Clear previous state
   * 2. Authenticate user
   * 3. Call prediction API
   * 4. Save predictions to database
   * 5. Update UI state
   */
  const generatePredictions = async (): Promise<void> => {
    setLoading(true);
    setError('');
    setSuccess('');
    setPredictions([]);

    try {
      // Get authenticated session
      const session = await getAuthSession();

      // Call API to generate predictions
      const generatedPredictions = await callPredictionApi(session.access_token);

      // Update state with predictions
      setPredictions(generatedPredictions);

      // Save predictions to database
      const { savedCount, failedGames } = await savePredictions(
        generatedPredictions,
        session.user.id
      );

      // Set success message
      const message = buildSuccessMessage(
        savedCount,
        generatedPredictions.length,
        failedGames
      );
      setSuccess(message);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Prediction generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    predictions,
    targetWeek,
    setTargetWeek,
    generatePredictions,
    clearMessages
  };
}