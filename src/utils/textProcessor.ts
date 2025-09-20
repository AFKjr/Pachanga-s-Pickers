/**
 * Utility functions for parsing dates from various formats in agent text
 */

import { NFLWeek } from '../types/index';

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

  // Handle specific dates like "December 15", "12/15", "Dec 15"
  const datePatterns = [
    /(\w+ \d{1,2}),?\s*(\d{4})?/, // "December 15, 2024" or "December 15"
    /(\d{1,2})\/(\d{1,2})\/?(\d{4})?/, // "12/15/2024" or "12/15"
    /(\d{1,2})-(\d{1,2})-?(\d{4})?/, // "12-15-2024" or "12-15"
  ];

  for (const pattern of datePatterns) {
    const match = dateText.match(pattern);
    if (match) {
      try {
        let dateStr = dateText;
        // If no year specified, assume current year
        if (!match[2] && !match[3]) {
          dateStr += `, ${currentYear}`;
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
 */
export const parseWeekFromHeader = (line: string): NFLWeek | null => {
  const weekMatch = line.match(/week\s+(\d+)/i);
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1]);
    // Validate that week is within NFL range (1-18)
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
         /\b\w+ \d{1,2}\b/.test(line) || // "December 15"
         /\b\d{1,2}\/\d{1,2}\b/.test(line) || // "12/15"
         /\b\d{1,2}-\d{1,2}\b/.test(line); // "12-15"
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
 * Updated to handle both old format "• Model Prediction:" and new format "• Model:"
 */
export const extractPrediction = (line: string): string | null => {
  // Handle old format
  if (line.includes('• Model Prediction:')) {
    return line.replace('• Model Prediction:', '').trim();
  }
  
  // Handle new format: "• Model: Ravens 31-24"
  if (line.includes('• Model:')) {
    const prediction = line.replace('• Model:', '').trim();
    // Convert "Ravens 31-24" to "Ravens to win"
    // Extract team name (everything before first number)
    const teamMatch = prediction.match(/^([a-zA-Z\s]+?)\s+\d/);
    if (teamMatch) {
      return `${teamMatch[1].trim()} to win`;
    }
    return prediction; // Return as-is if pattern doesn't match
  }
  
  return null;
};

/**
 * Extract confidence from recommended play line or confidence line
 * Updated to handle both "• Recommended Play:" and "• Confidence:" formats
 */
export const extractConfidence = (line: string): number | null => {
  // Handle old format
  if (line.includes('• Recommended Play:')) {
    const playText = line.replace('• Recommended Play:', '').trim();
    return parseConfidence(playText);
  }
  
  // Handle new format: "• Confidence: High"
  if (line.includes('• Confidence:')) {
    const confidenceText = line.replace('• Confidence:', '').trim();
    return parseConfidence(confidenceText);
  }
  
  return null;
};

/**
 * Check if line starts key factors collection
 * Updated to handle "• Factors:" format as well
 */
export const isKeyFactorsHeader = (line: string): boolean => {
  return line.includes('• Key Factors:') || line.includes('• Factors:');
};

/**
 * Check if line is a factor (starts with bullet or dash)
 */
export const isFactorLine = (line: string): boolean => {
  return line.startsWith('–') || line.startsWith('•');
};

/**
 * Extract factor text from a factor line
 */
export const extractFactorText = (line: string): string => {
  return line.replace(/^[–•]\s*/, '').trim();
};