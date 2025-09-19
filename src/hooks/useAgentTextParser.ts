import { useState, useCallback } from 'react';
import type { ParsedPrediction, AgentTextParserResult, ConfidenceLevel, NFLWeek } from '../types/predictions';
import {
  parseGameDate,
  parseWeekFromHeader,
  hasDateIndicators,
  isGameLine,
  parseTeams,
  extractPrediction,
  extractConfidence,
  isKeyFactorsHeader,
  isFactorLine,
  extractFactorText
} from '../utils/textProcessor';

export const useAgentTextParser = (): AgentTextParserResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseAgentText = useCallback((text: string, selectedWeek?: NFLWeek): ParsedPrediction[] => {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input');
    }

    const predictions: ParsedPrediction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let currentGame = '';
    let currentPrediction = '';
    let currentConfidence: ConfidenceLevel = 50; // Default to 50%
    let currentReasoning = '';
    let homeTeam = '';
    let awayTeam = '';
    let currentGameDate = new Date(); // Default to current date
    let currentWeek: NFLWeek = selectedWeek || 1; // Use selected week or default to 1
    let isCollectingFactors = false;

    console.log('Starting to parse agent text with', lines.length, 'lines');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse week from header like "Week 3 Game Predictions"
      const parsedWeek = parseWeekFromHeader(line);
      if (parsedWeek && parsedWeek >= 1 && parsedWeek <= 18) {
        currentWeek = parsedWeek as NFLWeek;
        console.log('Parsed week from AI output:', currentWeek);
      }

      // Look for date indicators (should be processed before game lines)
      if (hasDateIndicators(line)) {
        const parsedDateStr = parseGameDate(line);
        if (parsedDateStr) {
          // Convert string to Date object
          const parsedDate = new Date(parsedDateStr);
          if (!isNaN(parsedDate.getTime())) {
            currentGameDate = parsedDate;
            console.log('Parsed date from line:', line, '->', currentGameDate.toISOString().split('T')[0]);
          }
        }
      }

      // Look for game lines that contain "@" (like "Miami Dolphins @ Buffalo Bills")
      if (isGameLine(line)) {
        console.log('Found game line:', line);

        // Save previous game if we have one
        if (currentGame && currentPrediction) {
          console.log('Saving previous game:', currentGame, 'with prediction:', currentPrediction);
          predictions.push({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            prediction: currentPrediction,
            confidence: currentConfidence as ConfidenceLevel,
            reasoning: currentReasoning.trim(),
            gameDate: currentGameDate,
            week: currentWeek as NFLWeek
          });
        }

        // Parse new game
        currentGame = line;
        const teams = parseTeams(line);
        if (teams) {
          awayTeam = teams.awayTeam;
          homeTeam = teams.homeTeam;
          console.log('Parsed teams - Away:', awayTeam, 'Home:', homeTeam);
        }
        currentPrediction = '';
        currentConfidence = 50; // Reset to default 50%
        currentReasoning = '';
        isCollectingFactors = false;
      }

      // Look for model prediction
      const prediction = extractPrediction(line);
      if (prediction) {
        currentPrediction = prediction;
        console.log('Found prediction:', prediction);
      }

      // Look for recommended play (contains confidence)
      const confidence = extractConfidence(line);
      if (confidence !== null) {
        // Ensure confidence is a valid ConfidenceLevel (round to nearest 10)
        const validConfidence = Math.round(confidence / 10) * 10;
        currentConfidence = Math.max(0, Math.min(100, validConfidence)) as ConfidenceLevel;
        console.log('Found confidence:', currentConfidence, 'from:', line);
      }

      // Look for key factors header
      if (isKeyFactorsHeader(line)) {
        isCollectingFactors = true;
        currentReasoning = '';
        console.log('Starting to collect key factors');
        continue;
      }

      // Collect key factors (lines that start with – or •)
      if (isCollectingFactors && isFactorLine(line)) {
        const factorText = extractFactorText(line);
        if (factorText.length > 0) {
          currentReasoning += factorText + '. ';
        }
      }

      // Stop collecting factors when we hit the next game or empty line
      if (isCollectingFactors && (isGameLine(line) || line === '')) {
        isCollectingFactors = false;
        console.log('Finished collecting factors for game');
      }
    }

    // Save the last game
    if (currentGame && currentPrediction) {
      console.log('Saving last game:', currentGame, 'with prediction:', currentPrediction);
      predictions.push({
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        prediction: currentPrediction,
        confidence: currentConfidence as ConfidenceLevel,
        reasoning: currentReasoning.trim(),
        gameDate: currentGameDate,
        week: currentWeek as NFLWeek
      });
    }

    console.log('Parsed', predictions.length, 'predictions total');
    return predictions;
  }, []);

  const processText = useCallback(async (text: string, selectedWeek?: NFLWeek) => {
    try {
      setIsProcessing(true);
      setError(null);

      const predictions = parseAgentText(text, selectedWeek);

      if (predictions.length === 0) {
        throw new Error('No predictions found in the agent output');
      }

      return predictions;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [parseAgentText]);

  return {
    parseAgentText,
    processText,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};