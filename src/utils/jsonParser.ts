/**
 * JSON-based AI prediction parser
 * Extracts structured prediction data from AI responses
 */

import type { PredictionData, JsonParserResult } from '../types/jsonPredictions';
import type { ParsedPrediction, ConfidenceLevel, NFLWeek } from '../types/predictions';

/**
 * Extract predictions from AI response containing JSON data after separator
 */
export function extractPredictionsFromJson(response: string): JsonParserResult {
  try {
    // Split on the separator
    const parts = response.split('---PARSEABLE_DATA---');
    
    if (parts.length < 2) {
      return {
        isValid: false,
        error: "No parseable data found in response. Expected '---PARSEABLE_DATA---' separator."
      };
    }
    
    // Get everything after the separator and clean it
    let jsonText = parts[1].trim();
    
    // Remove any markdown formatting if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON
    const data: PredictionData = JSON.parse(jsonText);
    
    // Basic validation
    if (!data.games || !Array.isArray(data.games)) {
      return {
        isValid: false,
        error: "Invalid JSON structure: missing 'games' array"
      };
    }
    
    return {
      isValid: true,
      data
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert confidence string to numeric value
 */
function mapConfidenceToNumber(confidence: "High" | "Medium" | "Low"): ConfidenceLevel {
  switch (confidence) {
    case "High": return 80;
    case "Medium": return 60;
    case "Low": return 40;
    default: return 50;
  }
}

/**
 * Convert JSON prediction data to legacy ParsedPrediction format
 */
export function convertJsonToLegacyFormat(
  jsonData: PredictionData, 
  selectedWeek?: NFLWeek
): ParsedPrediction[] {
  const predictions: ParsedPrediction[] = [];
  
  jsonData.games.forEach((game) => {
    // Determine the primary prediction based on highest confidence
    const moneylineConf = mapConfidenceToNumber(game.predictions.moneyline.confidence);
    const spreadConf = mapConfidenceToNumber(game.predictions.spread.confidence);
    const totalConf = mapConfidenceToNumber(game.predictions.total.confidence);
    
    let primaryPrediction = '';
    let primaryConfidence = moneylineConf;
    
    // Choose the prediction with highest confidence
    if (spreadConf >= moneylineConf && spreadConf >= totalConf) {
      primaryPrediction = `${game.predictions.spread.pick} ${game.predictions.spread.line > 0 ? '+' : ''}${game.predictions.spread.line}`;
      primaryConfidence = spreadConf;
    } else if (totalConf >= moneylineConf && totalConf >= spreadConf) {
      primaryPrediction = `${game.predictions.total.pick} ${game.predictions.total.line}`;
      primaryConfidence = totalConf;
    } else {
      primaryPrediction = `${game.predictions.moneyline.pick} (moneyline)`;
      primaryConfidence = moneylineConf;
    }
    
    // Build reasoning from key factors
    const reasoning = game.key_factors.join('; ');
    
    // Parse game date from timestamp or default to current date
    let gameDate = new Date();
    try {
      if (jsonData.prediction_timestamp) {
        // Handle timestamps like "2025-10-01 10:44:03 Eastern"
        // Remove timezone name and parse the datetime portion
        const cleanedTimestamp = jsonData.prediction_timestamp
          .replace(/\s+(Eastern|EST|EDT|Pacific|PST|PDT|Central|CST|CDT|Mountain|MST|MDT)$/i, '')
          .trim();
        gameDate = new Date(cleanedTimestamp);
        
        // Validate the parsed date
        if (isNaN(gameDate.getTime())) {
          console.warn('Invalid timestamp format, using current date');
          gameDate = new Date();
        }
      }
    } catch (e) {
      console.warn('Could not parse timestamp, using current date');
      gameDate = new Date();
    }
    
    // Determine week (use provided or estimate from date)
    const week: NFLWeek = selectedWeek || estimateNflWeek(gameDate);
    
    const prediction: ParsedPrediction = {
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      prediction: primaryPrediction,
      confidence: primaryConfidence as ConfidenceLevel,
      reasoning: reasoning,
      gameDate: gameDate,
      week: week
    };
    
    predictions.push(prediction);
  });
  
  return predictions;
}

/**
 * Estimate NFL week from date (rough approximation)
 */
function estimateNflWeek(date: Date): NFLWeek {
  const currentYear = date.getFullYear();
  const september1 = new Date(currentYear, 8, 1); // September 1st
  const diffTime = date.getTime() - september1.getTime();
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  // Clamp to valid NFL weeks (1-18)
  const week = Math.max(1, Math.min(18, diffWeeks));
  return week as NFLWeek;
}

/**
 * Extract detailed betting information from JSON data
 */
export function extractBettingDetails(jsonData: PredictionData) {
  return jsonData.games.map(game => ({
    teams: `${game.away_team} @ ${game.home_team}`,
    spread: {
      line: game.predictions.spread.line,
      pick: game.predictions.spread.pick,
      confidence: game.predictions.spread.confidence
    },
    total: {
      line: game.predictions.total.line,
      pick: game.predictions.total.pick,
      predicted: game.predictions.total.predicted_total,
      confidence: game.predictions.total.confidence
    },
    moneyline: {
      pick: game.predictions.moneyline.pick,
      odds: game.predictions.moneyline.vegas_odds,
      confidence: game.predictions.moneyline.confidence
    },
    monteCarlo: {
      homeWinProb: game.monte_carlo_results.home_win_probability,
      awayWinProb: game.monte_carlo_results.away_win_probability,
      predictedScore: `${game.monte_carlo_results.predicted_home_score} - ${game.monte_carlo_results.predicted_away_score}`,
      moneylineProb: game.monte_carlo_results.moneyline_probability,
      spreadProb: game.monte_carlo_results.spread_probability,
      totalProb: game.monte_carlo_results.total_probability
    },
    keyFactors: game.key_factors
  }));
}