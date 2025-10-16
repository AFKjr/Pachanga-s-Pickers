/**
 * useDuplicateDetection Hook
 * Handles duplicate pick detection and cleanup
 */

import { useMemo, useState, useCallback } from 'react';
import { Pick } from '../types';
import * as duplicateService from '../services/duplicateDetection';
import { AppError } from '../utils/errorHandling';

export interface UseDuplicateDetectionReturn {
  
  duplicateGroups: duplicateService.DuplicateInfo[];
  duplicateCount: number;
  hasDuplicates: boolean;
  
  
  cleaning: boolean;
  error: AppError | null;
  
  
  cleanDuplicates: () => Promise<{
    deletedCount: number;
    failedCount: number;
    success: boolean;
  }>;
  isDuplicate: (pick: Pick) => boolean;
  findOriginal: (pick: Pick) => Pick | null;
  
  
  clearError: () => void;
}

export function useDuplicateDetection(picks: Pick[]): UseDuplicateDetectionReturn {
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  
  const duplicateGroups = useMemo(() => {
    return duplicateService.findDuplicates(picks);
  }, [picks]);

  
  const duplicateCount = useMemo(() => {
    return duplicateService.countDuplicates(picks);
  }, [picks]);

  
  const hasDuplicates = useMemo(() => {
    return duplicateCount > 0;
  }, [duplicateCount]);

  
  const cleanDuplicates = useCallback(async () => {
    setCleaning(true);
    setError(null);

    try {
      const result = await duplicateService.cleanDuplicates(picks);
      
      if (result.errors.length > 0) {
        
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

  
  const isDuplicate = useCallback((pick: Pick): boolean => {
    return duplicateService.isDuplicate(pick, picks);
  }, [picks]);

  
  const findOriginal = useCallback((pick: Pick): Pick | null => {
    return duplicateService.findOriginalPick(pick, picks);
  }, [picks]);

  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    
    duplicateGroups,
    duplicateCount,
    hasDuplicates,
    
    
    cleaning,
    error,
    
    
    cleanDuplicates,
    isDuplicate,
    findOriginal,
    
    
    clearError
  };
}
