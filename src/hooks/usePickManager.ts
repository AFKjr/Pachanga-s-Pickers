/**
 * usePickManager Hook
 * Handles all pick CRUD operations with state management
 */

import { useState, useCallback, useEffect } from 'react';
import { Pick, NFLWeek } from '../types';
import { AppError } from '../utils/errorHandling';
import { globalEvents } from '../lib/events';
import * as pickService from '../services/pickManagement';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UsePickManagerReturn {
  // State
  picks: Pick[];
  loading: boolean;
  error: AppError | PostgrestError | null;
  
  // Actions
  loadPicks: () => Promise<void>;
  updateResult: (pickId: string, result: 'win' | 'loss' | 'push') => Promise<boolean>;
  updateScores: (pickId: string, awayScore: number | null, homeScore: number | null) => { success: boolean; pick: Pick | null };
  deletePick: (pickId: string) => Promise<boolean>;
  deleteAllPicks: () => Promise<{ success: boolean; deletedCount: number }>;
  createPick: (pickData: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => Promise<Pick | null>;
  refreshPicks: () => Promise<void>;
  
  // Utilities
  getAvailableWeeks: () => NFLWeek[];
  getPicksByWeek: (week: NFLWeek) => Pick[];
  filterPicks: (options: { week?: NFLWeek | null; searchTerm?: string }) => Pick[];
  
  // Error handling
  clearError: () => void;
}

export function usePickManager(): UsePickManagerReturn {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | PostgrestError | null>(null);

  /**
   * Load all picks from database
   */
  const loadPicks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: loadError } = await pickService.loadAllPicks();
    
    if (loadError) {
      setError(loadError);
      setPicks([]);
    } else {
      setPicks(data || []);
    }
    
    setLoading(false);
  }, []);

  /**
   * Update a pick's result
   */
  const updateResult = useCallback(async (
    pickId: string,
    result: 'win' | 'loss' | 'push'
  ): Promise<boolean> => {
    const { data, error: updateError } = await pickService.updatePickResult(pickId, result);
    
    if (updateError) {
      setError(updateError);
      return false;
    }
    
    if (data) {
      setPicks(prev => prev.map(p => p.id === pickId ? data : p));
    }
    
    return true;
  }, []);

  /**
   * Update pick with scores (auto-calculates results)
   */
  const updateScores = useCallback((
    pickId: string,
    awayScore: number | null,
    homeScore: number | null
  ): { success: boolean; pick: Pick | null } => {
    const pick = picks.find(p => p.id === pickId);
    if (!pick) {
      return { success: false, pick: null };
    }

    const { updatedPick } = pickService.updatePickWithScores(pick, awayScore, homeScore);
    
    // Update local state immediately (optimistic update)
    setPicks(prev => prev.map(p => p.id === pickId ? updatedPick : p));
    
    return { success: true, pick: updatedPick };
  }, [picks]);

  /**
   * Delete a pick
   */
  const deletePick = useCallback(async (pickId: string): Promise<boolean> => {
    const { success, error: deleteError } = await pickService.deletePick(pickId);
    
    if (deleteError) {
      setError(deleteError);
      return false;
    }
    
    if (success) {
      setPicks(prev => prev.filter(p => p.id !== pickId));
      globalEvents.emit('refreshStats');
    }
    
    return success;
  }, []);

  /**
   * Delete all picks (admin only)
   */
  const deleteAllPicks = useCallback(async (): Promise<{ success: boolean; deletedCount: number }> => {
    const result = await pickService.deleteAllPicks();
    
    if (result.error) {
      setError(result.error);
    }
    
    if (result.success) {
      setPicks([]);
      globalEvents.emit('refreshStats');
    }
    
    return { success: result.success, deletedCount: result.deletedCount };
  }, []);

  /**
   * Create a new pick
   */
  const createPick = useCallback(async (
    pickData: Omit<Pick, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Pick | null> => {
    const { data, error: createError } = await pickService.createPick(pickData);
    
    if (createError) {
      setError(createError);
      return null;
    }
    
    if (data) {
      setPicks(prev => [data, ...prev]);
      globalEvents.emit('refreshStats');
    }
    
    return data;
  }, []);

  /**
   * Refresh picks (alias for loadPicks)
   */
  const refreshPicks = useCallback(async () => {
    await loadPicks();
  }, [loadPicks]);

  /**
   * Get available weeks from current picks
   */
  const getAvailableWeeks = useCallback((): NFLWeek[] => {
    return pickService.getAvailableWeeks(picks);
  }, [picks]);

  /**
   * Get picks for a specific week
   */
  const getPicksByWeek = useCallback((week: NFLWeek): Pick[] => {
    const weekGroups = pickService.groupPicksByWeek(picks);
    return weekGroups[week] || [];
  }, [picks]);

  /**
   * Filter picks by week and search term
   */
  const filterPicks = useCallback((options: { week?: NFLWeek | null; searchTerm?: string }): Pick[] => {
    return pickService.filterPicks(picks, options);
  }, [picks]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen for global refresh events
  useEffect(() => {
    const handleRefresh = () => {
      loadPicks();
    };

    globalEvents.on('refreshPicks', handleRefresh);

    return () => {
      globalEvents.off('refreshPicks', handleRefresh);
    };
  }, [loadPicks]);

  return {
    // State
    picks,
    loading,
    error,
    
    // Actions
    loadPicks,
    updateResult,
    updateScores,
    deletePick,
    deleteAllPicks,
    createPick,
    refreshPicks,
    
    // Utilities
    getAvailableWeeks,
    getPicksByWeek,
    filterPicks,
    
    // Error handling
    clearError
  };
}
