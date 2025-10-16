/**
 * Robust Date Validation and Handling Utility
 * 
 * Provides safe date parsing, validation, and formatting with proper error handling.
 * Prevents crashes from invalid dates and provides consistent fallback behavior.
 */

export interface DateValidationResult {
  isValid: boolean;
  date?: Date;
  error?: string;
  originalInput: unknown;
}

export interface SafeDateOptions {
  fallbackDate?: Date;
  throwOnInvalid?: boolean;
  timezone?: string;
}

/**
 * Common date formats that the application should handle
 */
export const SUPPORTED_DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY-MM-DDTHH:mm:ss.sssZ', // ISO string
  'YYYY-MM-DD HH:mm:ss',
  'MM/DD/YYYY',
  'MM-DD-YYYY'
] as const;

/**
 * Validates and safely parses a date input
 */
export function validateDate(input: unknown): DateValidationResult {
  const result: DateValidationResult = {
    isValid: false,
    originalInput: input
  };

  // Handle null/undefined
  if (input == null) {
    result.error = 'Date input is null or undefined';
    return result;
  }

  // Handle empty strings
  if (typeof input === 'string' && input.trim() === '') {
    result.error = 'Date input is empty string';
    return result;
  }

  let dateObj: Date;

  try {
    // Handle different input types
    if (input instanceof Date) {
      dateObj = input;
    } else if (typeof input === 'string') {
      // Handle ISO date strings (YYYY-MM-DD) to avoid timezone issues
      const isoDateMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const year = parseInt(isoDateMatch[1]);
        const month = parseInt(isoDateMatch[2]) - 1; // Month is 0-indexed
        const day = parseInt(isoDateMatch[3]);
        dateObj = new Date(year, month, day); // Creates local timezone date
      } else {
        dateObj = new Date(input);
      }
    } else if (typeof input === 'number') {
      dateObj = new Date(input);
    } else {
      result.error = `Unsupported date input type: ${typeof input}`;
      return result;
    }

    // Check if the Date object is valid
    if (isNaN(dateObj.getTime())) {
      result.error = `Invalid date created from input: ${input}`;
      return result;
    }

    // Additional sanity checks
    const year = dateObj.getFullYear();
    if (year < 1900 || year > 2100) {
      result.error = `Date year ${year} is outside reasonable range (1900-2100)`;
      return result;
    }

    result.isValid = true;
    result.date = dateObj;
    return result;

  } catch (error) {
    result.error = `Error parsing date: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }
}

/**
 * Safely creates a Date object with fallback handling
 */
export function safeDate(input: unknown, options: SafeDateOptions = {}): Date {
  const validation = validateDate(input);
  
  if (validation.isValid && validation.date) {
    return validation.date;
  }

  // Handle fallback behavior
  if (options.fallbackDate) {
    console.warn(`Invalid date input "${input}", using fallback:`, options.fallbackDate);
    return options.fallbackDate;
  }

  if (options.throwOnInvalid) {
    throw new Error(`Invalid date input: ${validation.error}`);
  }

  // Default fallback to current date
  const fallback = new Date();
  console.warn(`Invalid date input "${input}", falling back to current date:`, fallback);
  return fallback;
}

/**
 * Safely formats a date for display with error handling
 */
export function safeDateFormat(
  input: unknown, 
  options: Intl.DateTimeFormatOptions = {},
  locale: string = 'en-US'
): string {
  const validation = validateDate(input);
  
  if (!validation.isValid) {
    console.warn('Cannot format invalid date:', validation.error);
    return 'Invalid Date';
  }

  try {
    return validation.date!.toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Format Error';
  }
}

/**
 * Safely formats a date to ISO string with error handling
 */
export function safeISOString(input: unknown): string | null {
  const validation = validateDate(input);
  
  if (!validation.isValid) {
    console.warn('Cannot convert invalid date to ISO string:', validation.error);
    return null;
  }

  try {
    return validation.date!.toISOString();
  } catch (error) {
    console.error('Error converting date to ISO string:', error);
    return null;
  }
}

/**
 * Validates and parses game_info.game_date specifically
 * Provides game-specific validation and fallbacks
 */
export function validateGameDate(gameDate: unknown, gameInfo?: { away_team?: string; home_team?: string }): DateValidationResult {
  const validation = validateDate(gameDate);
  
  if (!validation.isValid) {
    const gameIdentifier = gameInfo 
      ? `${gameInfo.away_team} @ ${gameInfo.home_team}` 
      : 'Unknown Game';
    
    console.error(`Invalid game date for ${gameIdentifier}:`, validation.error);
    
    // Add game-specific context to error
    validation.error = `Game date validation failed for ${gameIdentifier}: ${validation.error}`;
  }

  return validation;
}

/**
 * Safe date comparison utilities
 */
export const DateComparison = {
  /**
   * Safely checks if date1 is before date2
   */
  isBefore(date1: unknown, date2: unknown): boolean {
    const val1 = validateDate(date1);
    const val2 = validateDate(date2);
    
    if (!val1.isValid || !val2.isValid) {
      console.warn('Cannot compare invalid dates');
      return false;
    }
    
    return val1.date!.getTime() < val2.date!.getTime();
  },

  /**
   * Safely checks if date1 is after date2
   */
  isAfter(date1: unknown, date2: unknown): boolean {
    const val1 = validateDate(date1);
    const val2 = validateDate(date2);
    
    if (!val1.isValid || !val2.isValid) {
      console.warn('Cannot compare invalid dates');
      return false;
    }
    
    return val1.date!.getTime() > val2.date!.getTime();
  },

  /**
   * Safely checks if two dates are on the same day
   */
  isSameDay(date1: unknown, date2: unknown): boolean {
    const val1 = validateDate(date1);
    const val2 = validateDate(date2);
    
    if (!val1.isValid || !val2.isValid) {
      console.warn('Cannot compare invalid dates');
      return false;
    }
    
    const d1 = val1.date!;
    const d2 = val2.date!;
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
};

/**
 * Creates a safe Date object for current NFL season context
 */
export function getCurrentNFLSeasonDate(): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // NFL season runs September to February of following year
  // If we're in Jan-July, use previous year's season
  const nflYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
  
  return new Date(nflYear, 8, 1); // September 1st of NFL season year
}

/**
 * Validates a date is within reasonable NFL game date range
 */
export function isValidNFLGameDate(input: unknown): boolean {
  const validation = validateDate(input);
  
  if (!validation.isValid) {
    return false;
  }
  
  const date = validation.date!;
  const currentSeason = getCurrentNFLSeasonDate();
  const seasonStart = new Date(currentSeason.getFullYear(), 7, 1); // August 1st
  const seasonEnd = new Date(currentSeason.getFullYear() + 1, 2, 31); // March 31st of following year
  
  return date >= seasonStart && date <= seasonEnd;
}

/**
 * Default date formatting options for the application
 */
export const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
};

export const COMPACT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'numeric',
  day: 'numeric'
};

/**
 * Game-specific date formatting
 */
export function formatGameDate(input: unknown, compact: boolean = false): string {
  const options = compact ? COMPACT_DATE_FORMAT_OPTIONS : DEFAULT_DATE_FORMAT_OPTIONS;
  return safeDateFormat(input, options);
}