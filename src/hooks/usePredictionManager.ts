import { useState } from 'react';
import { picksApi } from '../lib/api';
import { validatePickData } from '../utils/inputValidation';
import type { ParsedPrediction, PredictionManagerResult, PredictionSaveResult } from '../types/predictions';

export const usePredictionManager = (): PredictionManagerResult => {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const savePredictions = async (predictions: ParsedPrediction[]): Promise<PredictionSaveResult> => {
    setIsSaving(true);
    try {
      // Check for existing picks to avoid duplicates
      const { data: existingPicks } = await picksApi.getAll();

      let savedCount = 0;
      let duplicateCount = 0;

      for (const pred of predictions) {
        // Check if a pick already exists for this matchup in the same week
        const duplicateExists = existingPicks?.some(pick => {
          const gameInfo = pick.game_info as any;
          return gameInfo?.home_team === pred.homeTeam &&
                 gameInfo?.away_team === pred.awayTeam &&
                 pick.week === pred.week;
        });

        if (duplicateExists) {
          console.log(`Skipping duplicate prediction for ${pred.awayTeam} vs ${pred.homeTeam} (Week ${pred.week})`);
          duplicateCount++;
          continue;
        }

        // Determine which team is predicted to win based on the prediction text
        let winner = '';
        const predictionLower = pred.prediction.toLowerCase();

        // Check if prediction mentions home team winning
        if (predictionLower.includes(pred.homeTeam.toLowerCase().split(' ')[0]) ||
            predictionLower.includes(pred.homeTeam.toLowerCase()) ||
            predictionLower.includes('home') ||
            predictionLower.includes(pred.homeTeam.split(' ')[0].toLowerCase())) {
          winner = pred.homeTeam;
        }
        // Check if prediction mentions away team winning
        else if (predictionLower.includes(pred.awayTeam.toLowerCase().split(' ')[0]) ||
                 predictionLower.includes(pred.awayTeam.toLowerCase()) ||
                 predictionLower.includes('away') ||
                 predictionLower.includes(pred.awayTeam.split(' ')[0].toLowerCase())) {
          winner = pred.awayTeam;
        }
        // Default to home team if unclear
        else {
          winner = pred.homeTeam;
        }

        console.log(`Saving prediction: ${pred.awayTeam} vs ${pred.homeTeam} - ${winner} to win (Week ${pred.week})`);

        const pickData = {
          game_info: {
            home_team: pred.homeTeam,
            away_team: pred.awayTeam,
            league: 'NFL' as const,
            game_date: pred.gameDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
            spread: 0, // Default values
            over_under: 40
          },
          prediction: `${winner} to win`,
          confidence: pred.confidence,
          reasoning: pred.reasoning || 'AI-generated prediction',
          result: 'pending' as const,
          week: pred.week
        };

        // Validate pick data before saving
        const validation = validatePickData({
          homeTeam: pickData.game_info.home_team,
          awayTeam: pickData.game_info.away_team,
          prediction: pickData.prediction,
          reasoning: pickData.reasoning,
          confidence: pickData.confidence,
          week: pickData.week,
          gameDate: pickData.game_info.game_date
        });

        if (!validation.isValid) {
          console.error(`Validation failed for ${pred.homeTeam}:`, validation.errors);
          throw new Error(`Invalid data for ${pred.homeTeam}: ${validation.errors.join(', ')}`);
        }

        // Use sanitized data
        const sanitizedPickData = {
          game_info: {
            home_team: validation.sanitizedData.homeTeam,
            away_team: validation.sanitizedData.awayTeam,
            league: 'NFL' as const,
            game_date: validation.sanitizedData.gameDate,
            spread: 0,
            over_under: 40
          },
          prediction: validation.sanitizedData.prediction,
          confidence: validation.sanitizedData.confidence as any, // Type assertion for ConfidenceLevel
          reasoning: validation.sanitizedData.reasoning,
          result: 'pending' as const,
          week: validation.sanitizedData.week as any // Type assertion for NFLWeek
        };

        const { error } = await picksApi.create(sanitizedPickData);
        if (error) {
          console.error(`Failed to save prediction for ${pred.homeTeam}:`, error);
          // error is now an AppError with proper structure
          throw new Error(`Failed to save prediction for ${pred.homeTeam}: ${error.userMessage || 'Unknown error'}`);
        } else {
          savedCount++;
        }
      }

      console.log(`Saved ${savedCount} predictions, skipped ${duplicateCount} duplicates`);

      const result: PredictionSaveResult = { savedCount, duplicateCount };

      if (result.savedCount > 0) {
        setMessage(`Successfully saved ${result.savedCount} predictions!`);
        window.dispatchEvent(new CustomEvent('predictionsUpdated'));
      }

      return result;
    } catch (error: any) {
      setMessage('Error: ' + error.message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const cleanDuplicates = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const { data: allPicks } = await picksApi.getAll();
      if (!allPicks) return;

      const seen = new Set<string>();
      const duplicates: string[] = [];

      // Find duplicates based on team matchup and date
      for (const pick of allPicks) {
        const gameInfo = pick.game_info as any;
        const key = `${gameInfo?.home_team}-${gameInfo?.away_team}-${pick.created_at?.split('T')[0]}`;

        if (seen.has(key)) {
          duplicates.push(pick.id);
        } else {
          seen.add(key);
        }
      }

      // Delete duplicates (keeping the first occurrence)
      for (const duplicateId of duplicates) {
        await picksApi.delete(duplicateId);
      }

      setMessage(`Removed ${duplicates.length} duplicate predictions!`);
    } catch (error: any) {
      setMessage('Error cleaning duplicates: ' + error.message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    savePredictions,
    cleanDuplicates,
    isSaving,
    message,
    clearMessage: () => setMessage('')
  };
};