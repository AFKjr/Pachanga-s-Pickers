import { useState, useCallback } from 'react';
import type { ParsedPrediction, AgentTextParserResult, ConfidenceLevel, NFLWeek } from '../types/predictions';
import { validateAgentText } from '../utils/inputValidation';
import { extractPredictionsFromJson, convertJsonToLegacyFormat } from '../utils/jsonParser';
// Legacy imports - keep for fallback
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
  isFactorLineAdaptive,
  extractFactorText
} from '../utils/textProcessor';
import { shouldStopFactorCollection, extractWinProbability } from '../utils/adaptiveParser';

// Legacy text parsing function
const parseLegacyText = (sanitizedText: string, selectedWeek?: NFLWeek): ParsedPrediction[] => {
  const predictions: ParsedPrediction[] = [];
  const lines = sanitizedText.split('\n').map(line => line.trim()).filter(line => line);

  let currentGame = '';
  let currentPrediction = '';
  let currentConfidence: ConfidenceLevel = 50; // Default to 50%
  let currentReasoning = '';
  let homeTeam = '';
  let awayTeam = '';
  let currentGameDate = new Date(); // Default to current date
  let currentWeek: NFLWeek = selectedWeek || 1; // Use selected week or default to 1
  let isCollectingFactors = false;
  let hasWinProbability = false; // Track if we found win probability (most reliable)

  console.log('Starting legacy text parsing with', lines.length, 'lines');
  
  // Add tracking for duplicates
  const savedGames: string[] = [];

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
        const gameId = `${awayTeam} @ ${homeTeam}`;
        
        console.log('SAVE ATTEMPT #1 (next game found):', gameId);
        console.log('Already saved games:', savedGames);
        
        if (savedGames.includes(gameId)) {
          console.log('DUPLICATE SAVE DETECTED! Skipping:', gameId);
        } else {
          console.log('Saving new game:', gameId);
          savedGames.push(gameId);
          
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
      hasWinProbability = false; // Reset win probability flag
    }

    // First, check for win probability (most reliable)
    const winProb = extractWinProbability(line);
    if (winProb) {
      currentPrediction = winProb.prediction;
      hasWinProbability = true;
      console.log('Found WIN PROBABILITY (most reliable):', winProb.prediction);
      console.log('Winner:', winProb.winner, 'Probability:', winProb.probability + '%');
    }
    
    // Look for other predictions only if we don't have win probability yet
    if (!hasWinProbability) {
      const prediction = extractPrediction(line);
      if (prediction) {
        currentPrediction = prediction;
        console.log('Found prediction:', prediction);
      }
    }

    // Look for recommended play (contains confidence) - check multiple patterns
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
    }

    // Stop collecting factors if we hit another game or prediction section
    if (isCollectingFactors && (isGameLine(line) || shouldStopFactorCollection(line))) {
      isCollectingFactors = false;
      console.log('Stopped collecting factors');
    }

    // Collect factor lines
    if (isCollectingFactors && (isFactorLine(line) || isFactorLineAdaptive(line, isCollectingFactors))) {
      const factorText = extractFactorText(line);
      if (factorText) {
        if (currentReasoning) {
          currentReasoning += '; ' + factorText;
        } else {
          currentReasoning = factorText;
        }
        console.log('Added factor:', factorText);
      }
    }
  }

  // Save last game if we have one
  if (currentGame && currentPrediction && homeTeam && awayTeam) {
    const gameId = `${awayTeam} @ ${homeTeam}`;
    
    console.log('SAVE ATTEMPT #2 (end of text):', gameId);
    console.log('Already saved games:', savedGames);
    
    if (savedGames.includes(gameId)) {
      console.log('DUPLICATE SAVE DETECTED! Skipping:', gameId);
    } else {
      console.log('Saving last game:', gameId);
      savedGames.push(gameId);
      
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
  }

  console.log('Legacy parsing completed:', predictions.length, 'predictions');
  return predictions;
};

export const useAgentTextParser = (): AgentTextParserResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseAgentText = useCallback((text: string, selectedWeek?: NFLWeek): ParsedPrediction[] => {
    // Validate and sanitize input text
    const validation = validateAgentText(text);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid input text');
    }

    // Use sanitized text for processing
    const sanitizedText = validation.sanitized;

    // Try JSON parsing first
    console.log('Attempting JSON parsing...');
    const jsonResult = extractPredictionsFromJson(sanitizedText);
    
    if (jsonResult.isValid && jsonResult.data) {
      console.log('Successfully parsed JSON data:', jsonResult.data);
      const predictions = convertJsonToLegacyFormat(jsonResult.data, selectedWeek);
      console.log('Converted to legacy format:', predictions);
      return predictions;
    } else {
      console.log('JSON parsing failed, falling back to legacy parser:', jsonResult.error);
      // Fall back to legacy text parsing
      return parseLegacyText(sanitizedText, selectedWeek);
    }
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