/**
 * useDuplicateDetection Hook
 * Handles duplicate pick detection and cleanup
 */

import { useMemo, useState, useCallback } from 'react';
import { Pick } from '../types';
import * as duplicateService from '../services/duplicateDetection';
import { AppError } from '../utils/errorHandling';

export interface UseDuplicateDetectionReturn {
  // Detection results
  duplicateGroups: duplicateService.DuplicateInfo[];
  duplicateCount: number;
  hasDuplicates: boolean;
  
  // State
  cleaning: boolean;
  error: AppError | null;
  
  // Actions
  cleanDuplicates: () => Promise<{
    deletedCount: number;
    failedCount: number;
    success: boolean;
  }>;
  isDuplicate: (pick: Pick) => boolean;
  findOriginal: (pick: Pick) => Pick | null;
  
  // Utilities
  clearError: () => void;
}

export function useDuplicateDetection(picks: Pick[]): UseDuplicateDetectionReturn {
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  // Find all duplicate groups
  const duplicateGroups = useMemo(() => {
    return duplicateService.findDuplicates(picks);
  }, [picks]);

  // Count total duplicates
  const duplicateCount = useMemo(() => {
    return duplicateService.countDuplicates(picks);
  }, [picks]);

  // Check if there are any duplicates
  const hasDuplicates = useMemo(() => {
    return duplicateCount > 0;
  }, [duplicateCount]);

  /**
   * Clean all duplicates (delete duplicates, keep oldest)
   */
  const cleanDuplicates = useCallback(async () => {
    setCleaning(true);
    setError(null);

    try {
      const result = await duplicateService.cleanDuplicates(picks);
      
      if (result.errors.length > 0) {
        // Set the first error (or create a combined error message)
        setError(result.errors[0].error);
      }

      setCleaning(false);
      
      return {
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
        success: result.failedCount === 0
      };
    } catch (err) {
      const appError: AppError = {
        message: err instanceof Error ? err.message : 'Unknown error cleaning duplicates',
        code: 'UNKNOWN_ERROR',
        userMessage: 'Failed to clean duplicate picks',
        severity: 'medium',
        action: 'Please try again',
        retryable: true,
        name: 'DuplicateCleanupError'
      };
      
      setError(appError);
      setCleaning(false);
      
      return {
        deletedCount: 0,
        failedCount: 0,
        success: false
      };
    }
  }, [picks]);

  /**
   * Check if a specific pick is a duplicate
   */
  const isDuplicate = useCallback((pick: Pick): boolean => {
    return duplicateService.isDuplicate(pick, picks);
  }, [picks]);

  /**
   * Find the original (oldest) pick for a given pick
   */
  const findOriginal = useCallback((pick: Pick): Pick | null => {
    return duplicateService.findOriginalPick(pick, picks);
  }, [picks]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Detection results
    duplicateGroups,
    duplicateCount,
    hasDuplicates,
    
    // State
    cleaning,
    error,
    
    // Actions
    cleanDuplicates,
    isDuplicate,
    findOriginal,
    
    // Utilities
    clearError
  };
}
