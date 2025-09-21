// src/hooks/useErrorHandler.ts

import { useState, useCallback } from 'react';
import { AppError, createAppError, logError, ErrorContext } from '../utils/errorHandling';

interface UseErrorHandlerReturn {
  error: AppError | null;
  showError: (error: unknown, context: ErrorContext, errorCode?: string) => void;
  clearError: () => void;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    errorCode?: string
  ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<AppError | null>(null);

  const showError = useCallback((
    error: unknown, 
    context: ErrorContext, 
    errorCode?: string
  ) => {
    const appError = createAppError(error, context, errorCode as any);
    logError(appError);
    setError(appError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    errorCode?: string
  ): Promise<T | null> => {
    try {
      clearError();
      return await operation();
    } catch (err) {
      showError(err, context, errorCode);
      return null;
    }
  }, [showError, clearError]);

  return {
    error,
    showError,
    clearError,
    executeWithErrorHandling
  };
};