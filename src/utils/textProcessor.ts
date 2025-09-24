/**
 * Utility functions for parsing dates from various formats in agent text
 * Now includes adaptive parsing for handling AI agent output variations
 */

import { NFLWeek } from '../types/index';
import {
  adaptiveExtractPrediction,
  adaptiveExtractConfidence,
  adaptiveIsKeyFactorsHeader,
  adaptiveExtractWeek,
  adaptiveIsFactorLine,
  adaptiveExtractFactorText
} from './adaptiveParser';

/**
 * Parse game date from various text formats
 */
export const parseGameDate = (dateText: string): string => {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Handle "Monday Night Football", "Sunday Night", etc.
  if (dateText.toLowerCase().includes('monday night')) {
    // Find next Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + (1 - today.getDay() + 7) % 7);
    if (monday <= today) monday.setDate(monday.getDate() + 7);
    return monday.toISOString().split('T')[0];
  }

  if (dateText.toLowerCase().includes('sunday night')) {
    // Find next Sunday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
    if (sunday <= today) sunday.setDate(sunday.getDate() + 7);
    return sunday.toISOString().split('T')[0];
  }

  if (dateText.toLowerCase().includes('thursday night')) {
    // Find next Thursday
    const thursday = new Date(today);
    thursday.setDate(today.getDate() + (4 - today.getDay() + 7) % 7);
    if (thursday <= today) thursday.setDate(thursday.getDate() + 7);
    return thursday.toISOString().split('T')[0];
  }

  // Handle specific dates like "December 15", "12/15", "Dec 15", "(Thu 9/25)"
  const datePatterns = [
    /(\w+ \d{1,2}),?\s*(\d{4})?/, // "December 15, 2024" or "December 15"
    /(\d{1,2})\/(\d{1,2})\/?(\d{4})?/, // "12/15/2024" or "12/15"
    /(\d{1,2})-(\d{1,2})-?(\d{4})?/, // "12-15-2024" or "12-15"
    /\(\w{3}\s+(\d{1,2})\/(\d{1,2})\)/, // "(Thu 9/25)" format
  ];

  for (const pattern of datePatterns) {
    const match = dateText.match(pattern);
    if (match) {
      try {
        let dateStr = dateText;
        
        // Handle "(Thu 9/25)" format
        const parenthesesMatch = dateText.match(/\(\w{3}\s+(\d{1,2})\/(\d{1,2})\)/);
        if (parenthesesMatch) {
          const month = parseInt(parenthesesMatch[1]);
          const day = parseInt(parenthesesMatch[2]);
          const year = new Date().getFullYear();
          dateStr = `${month}/${day}/${year}`;
        } else {
          // If no year specified, assume current year
          if (!match[2] && !match[3]) {
            dateStr += `, ${currentYear}`;
          }
        }
        
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // If no date found, return today's date as fallback
  return new Date().toISOString().split('T')[0];
};

/**
 * Parse confidence level from recommended play text
 */
export const parseConfidence = (playText: string): number => {
  const lowerText = playText.toLowerCase();
  if (lowerText.includes('high confidence') || lowerText.includes('high)') || lowerText.includes('high')) {
    return 80;
  } else if (lowerText.includes('medium confidence') || lowerText.includes('medium)') || lowerText.includes('medium')) {
    return 60;
  } else if (lowerText.includes('low confidence') || lowerText.includes('low)') || lowerText.includes('low')) {
    return 40;
  }
  return 70; // default
};

/**
 * Extract week number from header text like "Week 3 Game Predictions"
 * Now uses adaptive parsing for various formats
 */
export const parseWeekFromHeader = (line: string): NFLWeek | null => {
  // Try adaptive parsing first
  const adaptiveResult = adaptiveExtractWeek(line);
  if (adaptiveResult) return adaptiveResult;
  
  // Fallback to original logic
  const weekMatch = line.match(/week\s+(\d+)/i);
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1]);
    if (weekNum >= 1 && weekNum <= 18) {
      return weekNum as NFLWeek;
    }
  }
  return null;
};

/**
 * Check if a line contains date indicators
 */
export const hasDateIndicators = (line: string): boolean => {
  return line.toLowerCase().includes('monday night') ||
         line.toLowerCase().includes('sunday night') ||
         line.toLowerCase().includes('thursday night') ||
         line.toLowerCase().includes('monday') ||
         line.toLowerCase().includes('sunday') ||
         line.toLowerCase().includes('thursday') ||
         /\b\w+ \d{1,2}\b/.test(line) || // "December 15"
         /\b\d{1,2}\/\d{1,2}\b/.test(line) || // "12/15"
         /\b\d{1,2}-\d{1,2}\b/.test(line) || // "12-15"
         /\(\w{3}\s+\d{1,2}\/\d{1,2}\)/.test(line); // "(Thu 9/25)"
};

/**
 * Check if a line is a game line (contains "@" symbol)
 * Updated to handle new format: "Kansas City @ New York Giants (Sun 8:20 PM ET, NBC)"
 */
export const isGameLine = (line: string): boolean => {
  // Must contain " @ " 
  if (!line.includes(' @ ')) {
    return false;
  }
  
  // Must NOT start with bullet points or contain other indicators
  if (line.includes('•') || 
      line.includes('Model Prediction') ||
      line.includes('Recommended Play') ||
      line.includes('Key Factors') ||
      line.includes('Odds:') ||
      line.includes('Model:') ||
      line.includes('Play:') ||
      line.includes('Confidence:') ||
      line.includes('Factors:')) {
    return false;
  }
  
  // Check if it follows the pattern: "Team @ Team" or "Team @ Team (extra info)"
  // Should have alphabetic characters before and after "@"
  const atIndex = line.indexOf(' @ ');
  if (atIndex === -1) return false;
  
  const beforeAt = line.substring(0, atIndex).trim();
  const afterAtRaw = line.substring(atIndex + 3).trim();
  
  // Extract team name (everything before any parentheses)
  const afterAt = afterAtRaw.split('(')[0].trim();
  
  // Both parts should contain letters (team names)
  const hasLetters = /[a-zA-Z]/.test(beforeAt) && /[a-zA-Z]/.test(afterAt);
  
  // Both parts should be reasonable length for team names
  const reasonableLength = beforeAt.length >= 2 && afterAt.length >= 2;
  
  return hasLetters && reasonableLength;
};

/**
 * Parse teams from a game line like "Kansas City @ New York Giants (Sun 8:20 PM ET, NBC)"
 * Updated to handle parenthetical information
 */
export const parseTeams = (gameLine: string): { awayTeam: string; homeTeam: string } | null => {
  const atIndex = gameLine.indexOf(' @ ');
  if (atIndex === -1) return null;
  
  const awayTeam = gameLine.substring(0, atIndex).trim();
  const homeTeamRaw = gameLine.substring(atIndex + 3).trim();
  
  // Remove parenthetical information if present
  const homeTeam = homeTeamRaw.split('(')[0].trim();
  
  if (awayTeam && homeTeam) {
    return {
      awayTeam: awayTeam,
      homeTeam: homeTeam
    };
  }
  
  return null;
};

/**
 * Extract prediction from model prediction line
 * Now uses adaptive parsing to handle multiple AI-generated formats
 */
export const extractPrediction = (line: string): string | null => {
  return adaptiveExtractPrediction(line);
};

/**
 * Extract confidence from recommended play line or confidence line
 * Now uses adaptive parsing to handle multiple AI-generated formats
 */
export const extractConfidence = (line: string): number | null => {
  return adaptiveExtractConfidence(line);
};

/**
 * Check if line starts key factors collection
 * Now uses adaptive parsing to handle multiple AI-generated formats
 */
export const isKeyFactorsHeader = (line: string): boolean => {
  return adaptiveIsKeyFactorsHeader(line);
};

/**
 * Check if line is a factor (now adaptive to handle various AI output formats)
 */
export const isFactorLine = (line: string): boolean => {
  // For backward compatibility, this function signature remains the same
  // but we need context to make it truly adaptive
  return line.startsWith('–') || 
         line.startsWith('•') ||
         line.startsWith('    ') || // 4-space indentation
         line.startsWith('\t') ||   // tab indentation
         /^\s{2,}/.test(line);      // 2+ spaces indentation
};

/**
 * Adaptive factor line detection - requires context about whether we're collecting factors
 */
export const isFactorLineAdaptive = (line: string, isCollectingFactors: boolean): boolean => {
  return adaptiveIsFactorLine(line, isCollectingFactors);
};

/**
 * Check if line could be a factor when we're in factor collection mode
 * This is more permissive and includes plain text lines
 */
export const couldBeFactorLine = (line: string): boolean => {
  // Skip empty lines
  if (!line.trim()) return false;
  
  // Skip lines that are clearly not factors
  if (isGameLine(line)) return false;
  if (line.includes('Model Prediction:')) return false;
  if (line.includes('Predicted Score:')) return false;
  if (line.includes('Recommended Side/Total:')) return false;
  if (line.includes('Confidence Level:')) return false;
  if (line.includes('Simulation Results')) return false;
  if (line.includes('Win Probability:')) return false;
  if (line.includes('95% CI')) return false;
  if (line.includes('Mean Predicted Score:')) return false;
  
  // If it's a regular factor line, definitely include it
  if (isFactorLine(line)) return true;
  
  // If we're here, it's probably a plain text factor
  // Check if it looks like a sentence/phrase (has letters and reasonable length)
  return /[a-zA-Z]/.test(line) && line.length > 10 && line.length < 200;
};

/**
 * Extract factor text from a factor line
 * Now uses adaptive parsing to handle various AI output formats  
 */
export const extractFactorText = (line: string): string => {
  return adaptiveExtractFactorText(line);
};