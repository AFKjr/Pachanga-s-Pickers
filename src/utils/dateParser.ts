/**
 * Utility functions for date parsing and manipulation
 */

import { NFLWeek } from '../types/index';

/**
 * Parse game date from various text formats
 * This is a re-export from textProcessor for convenience
 */
export { parseGameDate } from './textProcessor';

/**
 * Get the current date in YYYY-MM-DD format
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Format a date for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Get the week number for a given date
 */
export const getWeekNumber = (date: Date): NFLWeek => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  // Clamp to valid NFL week range (1-18)
  return Math.max(1, Math.min(18, weekNum)) as NFLWeek;
};