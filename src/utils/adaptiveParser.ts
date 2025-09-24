/**
 * Adaptive parsing strategies for handling AI agent output variations
 * This module provides multiple parsing approaches and chooses the best one
 */

import type { NFLWeek } from '../types/index';

// Define common patterns that might appear in AI responses
export const PREDICTION_PATTERNS = {
  // Score predictions
  PREDICTED_SCORE: [
    /predicted\s+score[:\s]+([^.]+)/i,
    /final\s+score[:\s]+([^.]+)/i,
    /score\s+prediction[:\s]+([^.]+)/i,
    /expected\s+score[:\s]+([^.]+)/i,
  ],
  
  // Recommendations  
  RECOMMENDATION: [
    /recommended\s+(?:side\/total|play)[:\s]+([^.]+)/i,
    /recommendation[:\s]+([^.]+)/i,
    /pick[:\s]+([^.]+)/i,
    /bet[:\s]+([^.]+)/i,
    /play[:\s]+([^.]+)/i,
  ],
  
  // Confidence levels
  CONFIDENCE: [
    /confidence\s+level[:\s]+(\w+)/i,
    /confidence[:\s]+(\w+)/i,
    /\((\w+)\s+confidence\)/i,
    /\((\w+)\)/i, // Match (High), (Medium), (Low) in context
  ],
  
  // Key factors headers
  KEY_FACTORS: [
    /key\s+factors[:\s]*$/i,
    /factors[:\s]*$/i,
    /analysis[:\s]*$/i,
    /reasoning[:\s]*$/i,
    /notes[:\s]*$/i,
  ],
  
  // Week headers
  WEEK: [
    /week\s+(\d+)/i,
    /wk\s+(\d+)/i,
    /week(\d+)/i,
  ]
};

/**
 * Try multiple patterns to extract content, return best match
 */
export const extractWithPatterns = (line: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

/**
 * Extract win probability and determine predicted winner
 */
export const extractWinProbability = (line: string): { winner: string; probability: number; prediction: string } | null => {
  // Pattern to match: "Win Probability: Team1 XX.X% / Team2 YY.Y%"
  const winProbPatterns = [
    /Win Probability:\s*(.+?)\s+(\d+\.?\d*)%\s*\/\s*(.+?)\s+(\d+\.?\d*)%/i,
    /Win Probability:\s*(.+?)\s*(\d+\.?\d*)%[\/\s]+(.+?)\s*(\d+\.?\d*)%/i,
  ];

  for (const pattern of winProbPatterns) {
    const match = line.match(pattern);
    if (match) {
      const team1 = match[1].trim();
      const prob1 = parseFloat(match[2]);
      const team2 = match[3].trim();
      const prob2 = parseFloat(match[4]);
      
      // Validate probabilities
      if (prob1 >= 0 && prob1 <= 100 && prob2 >= 0 && prob2 <= 100) {
        const winner = prob1 > prob2 ? team1 : team2;
        const winnerProb = Math.max(prob1, prob2);
        
        return {
          winner,
          probability: winnerProb,
          prediction: `${winner} to win (${winnerProb}% win probability)`
        };
      }
    }
  }
  
  return null;
};

/**
 * Adaptive prediction extraction - tries multiple formats, prioritizing win probability
 */
export const adaptiveExtractPrediction = (line: string): string | null => {
  // First, try to extract win probability (most accurate)
  const winProb = extractWinProbability(line);
  if (winProb) return winProb.prediction;
  
  // Try common prediction patterns
  let result = extractWithPatterns(line, PREDICTION_PATTERNS.PREDICTED_SCORE);
  if (result) return result;
  
  result = extractWithPatterns(line, PREDICTION_PATTERNS.RECOMMENDATION);
  if (result) return result;
  
  // Legacy support for existing formats
  if (line.includes('• Model Prediction:')) {
    return line.replace('• Model Prediction:', '').trim();
  }
  
  if (line.includes('• Model:')) {
    const prediction = line.replace('• Model:', '').trim();
    const teamMatch = prediction.match(/^([a-zA-Z\s]+?)\s+\d/);
    if (teamMatch) {
      return `${teamMatch[1].trim()} to win`;
    }
    return prediction;
  }

  if (line.includes('Predicted Score:')) {
    const prediction = line.replace('Predicted Score:', '').trim();
    const scoreMatch = prediction.match(/^([a-zA-Z\s]+?)\s+\d+,\s*([a-zA-Z\s]+?)\s+\d+/);
    if (scoreMatch) {
      const team1 = scoreMatch[1].trim();
      const team2 = scoreMatch[2].trim();
      const score1Match = prediction.match(new RegExp(`${team1.replace(/\s+/g, '\\s+')}\\s+(\\d+)`));
      const score2Match = prediction.match(new RegExp(`${team2.replace(/\s+/g, '\\s+')}\\s+(\\d+)`));
      
      if (score1Match && score2Match) {
        const score1 = parseInt(score1Match[1]);
        const score2 = parseInt(score2Match[1]);
        const winner = score1 > score2 ? team1 : team2;
        return `${winner} to win (${prediction})`;
      }
    }
    return prediction;
  }

  if (line.includes('Recommended Side/Total:')) {
    return line.replace('Recommended Side/Total:', '').trim();
  }
  
  return null;
};

/**
 * Convert win probability to confidence level
 */
export const winProbabilityToConfidence = (probability: number): number => {
  // Convert win probability to confidence score
  // Higher win probability = higher confidence
  if (probability >= 80) return 90;      // Very High confidence
  if (probability >= 70) return 80;      // High confidence  
  if (probability >= 60) return 70;      // Medium-High confidence
  if (probability >= 55) return 60;      // Medium confidence
  if (probability >= 50) return 50;      // Low-Medium confidence
  return 40;                             // Low confidence
};

/**
 * Adaptive confidence extraction - tries multiple formats, prioritizing win probability
 */
export const adaptiveExtractConfidence = (line: string): number | null => {
  // First, try to extract from win probability (most reliable)
  const winProb = extractWinProbability(line);
  if (winProb) {
    return winProbabilityToConfidence(winProb.probability);
  }
  
  // Try pattern-based extraction
  const result = extractWithPatterns(line, PREDICTION_PATTERNS.CONFIDENCE);
  if (result) {
    return parseConfidenceLevel(result);
  }
  
  // Legacy support
  if (line.includes('• Recommended Play:')) {
    const playText = line.replace('• Recommended Play:', '').trim();
    return parseConfidenceLevel(playText);
  }
  
  if (line.includes('• Confidence:')) {
    const confidenceText = line.replace('• Confidence:', '').trim();
    return parseConfidenceLevel(confidenceText);
  }

  if (line.includes('Confidence Level:')) {
    const confidenceText = line.replace('Confidence Level:', '').trim();
    return parseConfidenceLevel(confidenceText);
  }

  // Check for confidence keywords in context
  if (line.includes('High') || line.includes('Medium') || line.includes('Low')) {
    return parseConfidenceLevel(line);
  }
  
  return null;
};

/**
 * Parse confidence level from text
 */
export const parseConfidenceLevel = (text: string): number => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('high') || lowerText.includes('strong')) {
    return 80;
  } else if (lowerText.includes('medium') || lowerText.includes('moderate')) {
    return 60;
  } else if (lowerText.includes('low') || lowerText.includes('weak')) {
    return 40;
  }
  return 70; // default
};

/**
 * Adaptive key factors header detection
 */
export const adaptiveIsKeyFactorsHeader = (line: string): boolean => {
  return PREDICTION_PATTERNS.KEY_FACTORS.some(pattern => pattern.test(line));
};

/**
 * Adaptive week extraction
 */
export const adaptiveExtractWeek = (line: string): NFLWeek | null => {
  const result = extractWithPatterns(line, PREDICTION_PATTERNS.WEEK);
  if (result) {
    const weekNum = parseInt(result);
    if (weekNum >= 1 && weekNum <= 18) {
      return weekNum as NFLWeek;
    }
  }
  return null;
};

/**
 * Flexible factor line detection - adapts to various formats
 */
export const adaptiveIsFactorLine = (line: string, isCollectingFactors: boolean): boolean => {
  // Skip empty lines
  if (!line.trim()) return false;
  
  // If we're not collecting factors, this can't be a factor line
  if (!isCollectingFactors) return false;
  
  // Skip lines that are clearly section headers or other content
  const skipPatterns = [
    /simulation\s+results/i,
    /model\s+prediction/i,
    /predicted\s+score/i,
    /recommended\s+(?:side|play)/i,
    /confidence\s+level/i,
    /win\s+probability/i,
    /95%\s+ci/i,
    /mean\s+predicted/i,
    /@/,  // Game lines
    /^\s*$/, // Empty lines
  ];
  
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }
  
  // Traditional factor indicators
  if (line.startsWith('–') || line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
    return true;
  }
  
  // Indented lines
  if (/^\s{2,}/.test(line)) {
    return true;
  }
  
  // If we're collecting factors and it looks like a sentence/phrase
  if (isCollectingFactors && /[a-zA-Z]/.test(line) && line.length > 10 && line.length < 300) {
    // Additional checks to avoid false positives
    const hasVerb = /\b(is|are|has|have|will|can|shows?|indicates?|suggests?|advantage|edge|favors?)\b/i.test(line);
    const looksLikeFactor = hasVerb || line.includes('.') || line.includes(',');
    return looksLikeFactor;
  }
  
  return false;
};

/**
 * Smart factor text extraction - handles various formats
 */
export const adaptiveExtractFactorText = (line: string): string => {
  let cleaned = line
    .replace(/^[–•*-]\s*/, '') // Remove bullet points
    .replace(/^\s+/, '')       // Remove leading whitespace
    .trim();
  
  // Remove trailing period to avoid double periods
  cleaned = cleaned.replace(/\.$/, '');
  
  return cleaned;
};

/**
 * Detect if a line is likely to end factor collection
 */
export const shouldStopFactorCollection = (line: string): boolean => {
  // Next game
  if (line.includes(' @ ')) return true;
  
  // New section headers
  const sectionHeaders = [
    /simulation\s+results/i,
    /model\s+prediction/i,
    /win\s+probability/i,
    /\d+%\s+ci/i,
  ];
  
  return sectionHeaders.some(pattern => pattern.test(line));
};

export default {
  adaptiveExtractPrediction,
  adaptiveExtractConfidence,
  adaptiveIsKeyFactorsHeader,
  adaptiveExtractWeek,
  adaptiveIsFactorLine,
  adaptiveExtractFactorText,
  shouldStopFactorCollection,
  parseConfidenceLevel,
  extractWinProbability,
  winProbabilityToConfidence
};