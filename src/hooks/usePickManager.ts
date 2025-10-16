/**
 * usePickManager Hook
 * Handles all pick CRUD operations with state management
 */

import { useState, useCallback, useEffect } from 'react';
import { Pick, NFLWeek } from '../types';
import { AppError } from '../utils/errorHandling';
import { globalEvents } from '../lib/events';
import * as pickService from '../services/pickManagement';

export interface UsePickManagerReturn {
  
  picks: Pick[];
  loading: boolean;
  error: AppError | null;
  
  
  loadPicks: () => Promise<void>;
  updateResult: (pickId: string, result: 'win' | 'loss' | 'push') => Promise<boolean>;
  updateScores: (pickId: string, awayScore: number | null, homeScore: number | null) => { success: boolean; pick: Pick | null };
  deletePick: (pickId: string) => Promise<boolean>;
  deleteAllPicks: () => Promise<{ success: boolean; deletedCount: number }>;
  createPick: (pickData: Omit<Pick, 'id' | 'created_at' | 'updated_at'>) => Promise<Pick | null>;
  refreshPicks: () => Promise<void>;
  
  
  getAvailableWeeks: () => NFLWeek[];
  getPicksByWeek: (week: NFLWeek) => Pick[];
  filterPicks: (options: { week?: NFLWeek | null; searchTerm?: string }) => Pick[];
  
  
  clearError: () => void;
}

export function usePickManager(): UsePickManagerReturn {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  
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
    
    
    setPicks(prev => prev.map(p => p.id === pickId ? updatedPick : p));
    
    return { success: true, pick: updatedPick };
  }, [picks]);

  
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

  
  const refreshPicks = useCallback(async () => {
    await loadPicks();
  }, [loadPicks]);

  
  const getAvailableWeeks = useCallback((): NFLWeek[] => {
    return pickService.getAvailableWeeks(picks);
  }, [picks]);

  
  const getPicksByWeek = useCallback((week: NFLWeek): Pick[] => {
    const weekGroups = pickService.groupPicksByWeek(picks);
    return weekGroups[week] || [];
  }, [picks]);

  
  const filterPicks = useCallback((options: { week?: NFLWeek | null; searchTerm?: string }): Pick[] => {
    return pickService.filterPicks(picks, options);
  }, [picks]);

  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  
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
    
    picks,
    loading,
    error,
    
    
    loadPicks,
    updateResult,
    updateScores,
    deletePick,
    deleteAllPicks,
    createPick,
    refreshPicks,
    
    
    getAvailableWeeks,
    getPicksByWeek,
    filterPicks,
    
    
    clearError
  };
}
