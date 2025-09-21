// src/utils/errorHandling.ts

export interface ErrorDetail {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  retryable?: boolean;
}

export interface ErrorContext {
  operation: string;
  component: string;
  metadata?: Record<string, any>;
}

// Specific error codes with user-friendly messages
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'User not authenticated',
    userMessage: 'Please sign in to continue',
    severity: 'medium' as const,
    action: 'Sign in to your account',
    retryable: false
  },
  AUTH_INSUFFICIENT: {
    code: 'AUTH_INSUFFICIENT', 
    message: 'Insufficient permissions',
    userMessage: 'You don\'t have permission to perform this action',
    severity: 'medium' as const,
    action: 'Contact an administrator for access',
    retryable: false
  },
  ADMIN_REQUIRED: {
    code: 'ADMIN_REQUIRED',
    message: 'Admin privileges required',
    userMessage: 'This action requires administrator privileges',
    severity: 'high' as const,
    action: 'Contact an administrator',
    retryable: false
  },

  // Network & API Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    userMessage: 'Unable to connect to the server',
    severity: 'high' as const,
    action: 'Check your internet connection and try again',
    retryable: true
  },
  API_TIMEOUT: {
    code: 'API_TIMEOUT',
    message: 'Request timeout',
    userMessage: 'The request took too long to complete',
    severity: 'medium' as const,
    action: 'Try again in a moment',
    retryable: true
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end',
    severity: 'high' as const,
    action: 'Please try again or contact support if the problem persists',
    retryable: true
  },

  // Data Validation Errors
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: 'Data validation failed',
    userMessage: 'The information provided is invalid',
    severity: 'medium' as const,
    action: 'Please check your input and try again',
    retryable: false
  },
  DUPLICATE_DATA: {
    code: 'DUPLICATE_DATA',
    message: 'Duplicate data detected',
    userMessage: 'This information already exists',
    severity: 'low' as const,
    action: 'Please use different information',
    retryable: false
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Invalid data format',
    userMessage: 'The data format is incorrect',
    severity: 'medium' as const,
    action: 'Please check the format and try again',
    retryable: false
  },

  // Database Errors
  DB_CONNECTION_FAILED: {
    code: 'DB_CONNECTION_FAILED',
    message: 'Database connection failed',
    userMessage: 'Unable to access the database',
    severity: 'critical' as const,
    action: 'Please try again later',
    retryable: true
  },
  DB_CONSTRAINT_VIOLATION: {
    code: 'DB_CONSTRAINT_VIOLATION',
    message: 'Database constraint violation',
    userMessage: 'This action would violate data integrity rules',
    severity: 'medium' as const,
    action: 'Please check your data and try again',
    retryable: false
  },
  RECORD_NOT_FOUND: {
    code: 'RECORD_NOT_FOUND',
    message: 'Record not found',
    userMessage: 'The requested item could not be found',
    severity: 'medium' as const,
    action: 'Please refresh the page and try again',
    retryable: true
  },

  // Pick-specific Errors
  PICK_SAVE_FAILED: {
    code: 'PICK_SAVE_FAILED',
    message: 'Failed to save pick',
    userMessage: 'Unable to save your prediction',
    severity: 'high' as const,
    action: 'Please try saving again',
    retryable: true
  },
  PICK_DELETE_FAILED: {
    code: 'PICK_DELETE_FAILED',
    message: 'Failed to delete pick',
    userMessage: 'Unable to delete the prediction',
    severity: 'medium' as const,
    action: 'Please try again',
    retryable: true
  },
  PICK_UPDATE_FAILED: {
    code: 'PICK_UPDATE_FAILED',
    message: 'Failed to update pick',
    userMessage: 'Unable to update the prediction',
    severity: 'medium' as const,
    action: 'Please try again',
    retryable: true
  },
  PICK_LOAD_FAILED: {
    code: 'PICK_LOAD_FAILED',
    message: 'Failed to load picks',
    userMessage: 'Unable to load predictions',
    severity: 'high' as const,
    action: 'Please refresh the page',
    retryable: true
  },

  // AI/LLM Errors
  AI_GENERATION_FAILED: {
    code: 'AI_GENERATION_FAILED',
    message: 'AI prediction generation failed',
    userMessage: 'Unable to generate AI predictions',
    severity: 'medium' as const,
    action: 'Please try again or use manual entry',
    retryable: true
  },
  AI_PARSING_FAILED: {
    code: 'AI_PARSING_FAILED',
    message: 'Failed to parse AI response',
    userMessage: 'The AI response could not be processed',
    severity: 'medium' as const,
    action: 'Please try generating predictions again',
    retryable: true
  },

  // Generic fallback
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'Unknown error occurred',
    userMessage: 'Something unexpected happened',
    severity: 'medium' as const,
    action: 'Please try again or contact support',
    retryable: true
  }
} as const;

/**
 * Enhanced error class with user-friendly messaging
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly action?: string;
  public readonly retryable: boolean;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    errorDetail: ErrorDetail,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(errorDetail.message);
    this.name = 'AppError';
    this.code = errorDetail.code;
    this.userMessage = errorDetail.userMessage;
    this.severity = errorDetail.severity;
    this.action = errorDetail.action;
    this.retryable = errorDetail.retryable || false;
    this.context = context;
    this.originalError = originalError;
  }
}

/**
 * Create an AppError from a generic error
 */
export function createAppError(
  error: unknown,
  context: ErrorContext,
  errorCode?: keyof typeof ERROR_CODES
): AppError {
  // If it's already an AppError, just add context
  if (error instanceof AppError) {
    return new AppError(
      ERROR_CODES[error.code as keyof typeof ERROR_CODES] || ERROR_CODES.UNKNOWN_ERROR,
      context,
      error.originalError
    );
  }

  const originalError = error instanceof Error ? error : new Error(String(error));

  // Try to determine error type from message/type
  let detectedErrorCode = errorCode;

  if (!detectedErrorCode) {
    const errorMessage = originalError.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      detectedErrorCode = 'NETWORK_ERROR';
    } else if (errorMessage.includes('timeout')) {
      detectedErrorCode = 'API_TIMEOUT';
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      detectedErrorCode = 'AUTH_REQUIRED';
    } else if (errorMessage.includes('permission') || errorMessage.includes('admin')) {
      detectedErrorCode = 'ADMIN_REQUIRED';
    } else if (errorMessage.includes('validation')) {
      detectedErrorCode = 'VALIDATION_FAILED';
    } else if (errorMessage.includes('duplicate')) {
      detectedErrorCode = 'DUPLICATE_DATA';
    } else if (errorMessage.includes('not found')) {
      detectedErrorCode = 'RECORD_NOT_FOUND';
    } else {
      detectedErrorCode = 'UNKNOWN_ERROR';
    }
  }

  return new AppError(
    ERROR_CODES[detectedErrorCode],
    context,
    originalError
  );
}

/**
 * Handle Supabase-specific errors
 */
export function handleSupabaseError(
  error: any,
  context: ErrorContext
): AppError {
  if (!error) {
    return createAppError(new Error('Unknown Supabase error'), context);
  }

  // Map Supabase error codes to our error types
  if (error.code === 'PGRST116') {
    return createAppError(error, context, 'RECORD_NOT_FOUND');
  }
  
  if (error.code === '23505') {
    return createAppError(error, context, 'DUPLICATE_DATA');
  }

  if (error.message?.includes('JWT')) {
    return createAppError(error, context, 'AUTH_REQUIRED');
  }

  if (error.message?.includes('RLS')) {
    return createAppError(error, context, 'AUTH_INSUFFICIENT');
  }

  return createAppError(error, context, 'SERVER_ERROR');
}

/**
 * Format error for display to users
 */
export function formatErrorForUser(error: AppError): {
  title: string;
  message: string;
  action?: string;
  severity: string;
  retryable: boolean;
} {
  const severityLabels = {
    low: 'Info',
    medium: 'Warning', 
    high: 'Error',
    critical: 'Critical Error'
  };

  return {
    title: severityLabels[error.severity],
    message: error.userMessage,
    action: error.action,
    severity: error.severity,
    retryable: error.retryable
  };
}

/**
 * Log error with context for debugging
 */
export function logError(error: AppError): void {
  const logLevel = error.severity === 'critical' || error.severity === 'high' ? 'error' : 'warn';
  
  console[logLevel](`[${error.code}] ${error.message}`, {
    userMessage: error.userMessage,
    context: error.context,
    originalError: error.originalError,
    stack: error.stack
  });
}

/**
 * Retry wrapper for operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: AppError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = createAppError(error, {
        ...context,
        metadata: { ...context.metadata, attempt }
      });

      logError(lastError);

      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
}