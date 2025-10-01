/**
 * Input validation and sanitization utilities
 * Protects against XSS, injection attacks, and malicious content
 */
import { safeISOString, validateDate, getCurrentNFLSeasonDate } from './dateValidation';

// Maximum allowed lengths for different input types
const MAX_LENGTHS = {
  AGENT_TEXT: 50000,      // Agent output can be lengthy
  TEAM_NAME: 50,          // NFL team names
  PREDICTION: 500,        // Prediction text
  REASONING: 2000,        // Reasoning text
  GENERAL_TEXT: 1000      // General text fields
};

// Regex patterns for validation
const VALIDATION_PATTERNS = {
  TEAM_NAME: /^[a-zA-Z0-9\s\-'\.&()]+$/,               // Letters, numbers, spaces, hyphens, apostrophes, periods, ampersands, parentheses
  CONFIDENCE: /^(100|[0-9]?[0-9])$/,                  // 0-100 integer
  WEEK: /^(1[0-8]|[1-9])$/,                          // 1-18 integer
  DATE: /^\d{4}-\d{2}-\d{2}$/,                       // YYYY-MM-DD format
  SAFE_TEXT: /^[a-zA-Z0-9\s\-_.,!?()@%$:;"'/\\n\\r]+$/ // Safe characters for text content
};

// Dangerous patterns to detect and remove
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // Script tags
  /javascript:/gi,                                         // JavaScript protocol
  /vbscript:/gi,                                          // VBScript protocol
  /on\w+\s*=/gi,                                          // Event handlers
  /<iframe\b[^>]*>/gi,                                    // Iframe tags
  /<object\b[^>]*>/gi,                                    // Object tags
  /<embed\b[^>]*>/gi,                                     // Embed tags
  /<link\b[^>]*>/gi,                                      // Link tags
  /<meta\b[^>]*>/gi,                                      // Meta tags
  /data:text\/html/gi,                                    // Data URLs
  /eval\s*\(/gi,                                          // Eval function
  /document\./gi,                                         // Document object access
  /window\./gi,                                           // Window object access
];

/**
 * Sanitize text input by removing dangerous content
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode characters that might cause issues
  // Replace smart quotes with regular quotes
  sanitized = sanitized.replace(/[""]/g, '"');
  sanitized = sanitized.replace(/['']/g, "'");
  
  // Replace em-dash and en-dash with regular hyphen
  sanitized = sanitized.replace(/[—–]/g, '-');
  
  // Replace non-breaking spaces with regular spaces
  sanitized = sanitized.replace(/\u00A0/g, ' ');
  
  // Replace other common Unicode spaces with regular spaces
  sanitized = sanitized.replace(/[\u2000-\u200B\u2028\u2029]/g, ' ');

  // Normalize whitespace but preserve newlines
  // Replace multiple spaces/tabs with single space, but keep newlines
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs → single space
  sanitized = sanitized.replace(/[ \t]*\n[ \t]*/g, '\n'); // Clean up around newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Validate text length
 */
export const validateLength = (input: string, maxLength: number): boolean => {
  return input.length <= maxLength;
};

/**
 * Validate text against a pattern
 */
export const validatePattern = (input: string, pattern: RegExp): boolean => {
  return pattern.test(input);
};

/**
 * Comprehensive validation for agent text input
 */
export const validateAgentText = (text: string): { isValid: boolean; error?: string; sanitized: string } => {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Text input is required', sanitized: '' };
  }

  // Check length
  if (!validateLength(text, MAX_LENGTHS.AGENT_TEXT)) {
    return { 
      isValid: false, 
      error: `Text too long. Maximum ${MAX_LENGTHS.AGENT_TEXT} characters allowed.`,
      sanitized: ''
    };
  }

  // Sanitize the input
  const sanitized = sanitizeText(text);

  // Check if sanitization removed too much content (possible attack)
  const originalLength = text.length;
  const sanitizedLength = sanitized.length;
  const removalPercentage = ((originalLength - sanitizedLength) / originalLength) * 100;

  if (removalPercentage > 30) {
    return {
      isValid: false,
      error: 'Input contains suspicious content that was removed. Please check your input.',
      sanitized
    };
  }

  // Check for minimum content after sanitization
  if (sanitized.length < 50) {
    return {
      isValid: false,
      error: 'Input too short after processing. Minimum 50 characters required.',
      sanitized
    };
  }

  return { isValid: true, sanitized };
};

/**
 * Validate team name
 */
export const validateTeamName = (teamName: string): { isValid: boolean; error?: string; sanitized: string } => {
  if (!teamName || typeof teamName !== 'string') {
    return { isValid: false, error: 'Team name is required', sanitized: '' };
  }

  const sanitized = sanitizeText(teamName);

  // Additional check: if the string contains prediction indicators, it's not a team name
  if (sanitized.includes('Recommended') || 
      sanitized.includes('Model Prediction') || 
      sanitized.includes('Simulation Results') ||
      sanitized.includes('Key factors') ||
      sanitized.includes(':')) {
    return {
      isValid: false,
      error: `This appears to be prediction text, not a team name: "${sanitized}"`,
      sanitized
    };
  }

  if (!validateLength(sanitized, MAX_LENGTHS.TEAM_NAME)) {
    return { 
      isValid: false, 
      error: `Team name too long. Maximum ${MAX_LENGTHS.TEAM_NAME} characters allowed.`,
      sanitized 
    };
  }

  if (!validatePattern(sanitized, VALIDATION_PATTERNS.TEAM_NAME)) {
    // Add debugging information
    const invalidChars = sanitized.split('').filter(char => 
      !/[a-zA-Z0-9\s\-'\.&()]/.test(char)
    ).map(char => `'${char}' (${char.charCodeAt(0)})`);
    
    return { 
      isValid: false, 
      error: `Team name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, periods, ampersands, and parentheses allowed. Invalid characters found: ${invalidChars.length > 0 ? invalidChars.join(', ') : 'none detected'}. Full string: "${sanitized}"`,
      sanitized 
    };
  }

  return { isValid: true, sanitized };
};

/**
 * Validate prediction text
 */
export const validatePrediction = (prediction: string): { isValid: boolean; error?: string; sanitized: string } => {
  if (!prediction || typeof prediction !== 'string') {
    return { isValid: false, error: 'Prediction is required', sanitized: '' };
  }

  const sanitized = sanitizeText(prediction);

  if (!validateLength(sanitized, MAX_LENGTHS.PREDICTION)) {
    return { 
      isValid: false, 
      error: `Prediction too long. Maximum ${MAX_LENGTHS.PREDICTION} characters allowed.`,
      sanitized 
    };
  }

  if (sanitized.length < 5) {
    return {
      isValid: false,
      error: 'Prediction too short. Minimum 5 characters required.',
      sanitized
    };
  }

  return { isValid: true, sanitized };
};

/**
 * Validate reasoning text
 */
export const validateReasoning = (reasoning: string): { isValid: boolean; error?: string; sanitized: string } => {
  if (!reasoning || typeof reasoning !== 'string') {
    return { isValid: false, error: 'Reasoning is required', sanitized: '' };
  }

  const sanitized = sanitizeText(reasoning);

  if (!validateLength(sanitized, MAX_LENGTHS.REASONING)) {
    return { 
      isValid: false, 
      error: `Reasoning too long. Maximum ${MAX_LENGTHS.REASONING} characters allowed.`,
      sanitized 
    };
  }

  if (sanitized.length < 10) {
    return {
      isValid: false,
      error: 'Reasoning too short. Minimum 10 characters required.',
      sanitized
    };
  }

  return { isValid: true, sanitized };
};

/**
 * Validate confidence level
 */
export const validateConfidence = (confidence: number): { isValid: boolean; error?: string; sanitized: number } => {
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    return { isValid: false, error: 'Confidence must be a number', sanitized: 50 };
  }

  if (confidence < 0 || confidence > 100) {
    return { isValid: false, error: 'Confidence must be between 0 and 100', sanitized: 50 };
  }

  // Round to nearest valid confidence level (0, 10, 20, ..., 100)
  const sanitized = Math.round(confidence / 10) * 10;

  return { isValid: true, sanitized };
};

/**
 * Validate NFL week
 */
export const validateNFLWeek = (week: number): { isValid: boolean; error?: string; sanitized: number } => {
  if (typeof week !== 'number' || isNaN(week)) {
    return { isValid: false, error: 'Week must be a number', sanitized: 1 };
  }

  if (week < 1 || week > 18) {
    return { isValid: false, error: 'Week must be between 1 and 18', sanitized: 1 };
  }

  const sanitized = Math.round(week);
  return { isValid: true, sanitized };
};

/**
 * Validate game date with robust error handling
 */
export const validateGameDate = (dateStr: string): { isValid: boolean; error?: string; sanitized: string } => {
  if (!dateStr || typeof dateStr !== 'string') {
    const fallback = safeISOString(getCurrentNFLSeasonDate()) || new Date().toISOString().split('T')[0];
    return { isValid: false, error: 'Date is required', sanitized: fallback };
  }

  if (!validatePattern(dateStr, VALIDATION_PATTERNS.DATE)) {
    const fallback = safeISOString(getCurrentNFLSeasonDate()) || new Date().toISOString().split('T')[0];
    return { 
      isValid: false, 
      error: 'Date must be in YYYY-MM-DD format',
      sanitized: fallback
    };
  }

  const validation = validateDate(dateStr);
  if (!validation.isValid) {
    const fallback = safeISOString(getCurrentNFLSeasonDate()) || new Date().toISOString().split('T')[0];
    return { 
      isValid: false, 
      error: validation.error || 'Invalid date',
      sanitized: fallback
    };
  }

  // Check if date is within reasonable bounds for NFL games
  const date = validation.date!;
  const currentSeason = getCurrentNFLSeasonDate();
  const seasonStart = new Date(currentSeason.getFullYear(), 7, 1); // August 1st
  const seasonEnd = new Date(currentSeason.getFullYear() + 1, 2, 31); // March 31st of following year

  if (date < seasonStart || date > seasonEnd) {
    const fallback = safeISOString(currentSeason) || new Date().toISOString().split('T')[0];
    return {
      isValid: false,
      error: 'Date must be within current NFL season',
      sanitized: fallback
    };
  }

  return { isValid: true, sanitized: dateStr };
};

/**
 * Validate complete pick data
 */
export interface PickValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: {
    homeTeam: string;
    awayTeam: string;
    prediction: string;
    reasoning: string;
    confidence: number;
    week: number;
    gameDate: string;
  };
}

export const validatePickData = (data: {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  reasoning: string;
  confidence: number;
  week: number;
  gameDate: string;
}): PickValidationResult => {
  const errors: string[] = [];
  const sanitizedData = { ...data };

  // Validate each field
  const homeTeamResult = validateTeamName(data.homeTeam);
  if (!homeTeamResult.isValid) {
    errors.push(`Home team: ${homeTeamResult.error}`);
  } else {
    sanitizedData.homeTeam = homeTeamResult.sanitized;
  }

  const awayTeamResult = validateTeamName(data.awayTeam);
  if (!awayTeamResult.isValid) {
    errors.push(`Away team: ${awayTeamResult.error}`);
  } else {
    sanitizedData.awayTeam = awayTeamResult.sanitized;
  }

  const predictionResult = validatePrediction(data.prediction);
  if (!predictionResult.isValid) {
    errors.push(`Prediction: ${predictionResult.error}`);
  } else {
    sanitizedData.prediction = predictionResult.sanitized;
  }

  const reasoningResult = validateReasoning(data.reasoning);
  if (!reasoningResult.isValid) {
    errors.push(`Reasoning: ${reasoningResult.error}`);
  } else {
    sanitizedData.reasoning = reasoningResult.sanitized;
  }

  const confidenceResult = validateConfidence(data.confidence);
  if (!confidenceResult.isValid) {
    errors.push(`Confidence: ${confidenceResult.error}`);
  } else {
    sanitizedData.confidence = confidenceResult.sanitized;
  }

  const weekResult = validateNFLWeek(data.week);
  if (!weekResult.isValid) {
    errors.push(`Week: ${weekResult.error}`);
  } else {
    sanitizedData.week = weekResult.sanitized;
  }

  const dateResult = validateGameDate(data.gameDate);
  if (!dateResult.isValid) {
    errors.push(`Game date: ${dateResult.error}`);
  } else {
    sanitizedData.gameDate = dateResult.sanitized;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};