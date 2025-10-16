/**
 * Optimistic Updates Hook with Rollback Capability
 * 
 * Provides safe optimistic updates that can be rolled back if operations fail.
 * Ensures UI state always matches database state after operations complete.
 */
import { useState, useCallback, useRef } from 'react';

export interface PendingOperation<T = any> {
  id: string;
  type: 'update' | 'delete';
  payload?: Partial<T>;
  originalData: T;
  timestamp: number;
}

export interface OptimisticState<T> {
  data: T[];
  pendingOperations: PendingOperation<T>[];
  isOperationPending: boolean;
}

export interface UseOptimisticUpdatesReturn<T> {
  state: OptimisticState<T>;
  
  // Optimistic operations
  optimisticUpdate: (id: string, updates: Partial<T>, original: T) => void;
  optimisticDelete: (id: string, original: T) => void;
  
  // Commit operations
  commitOperations: <R>(
    executor: (operations: PendingOperation<T>[]) => Promise<R>
  ) => Promise<{ success: boolean; result?: R; failedOperations: PendingOperation<T>[] }>;
  
  // State management
  rollbackOperation: (operationId: string) => void;
  rollbackAllOperations: () => void;
  clearPendingOperations: () => void;
  setData: (data: T[]) => void;
  
  // Utilities
  hasPendingChanges: () => boolean;
  getPendingOperation: (id: string) => PendingOperation<T> | undefined;
}

export function useOptimisticUpdates<T extends { id: string }>(
  initialData: T[] = []
): UseOptimisticUpdatesReturn<T> {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pendingOperations: [],
    isOperationPending: false
  });
  
  // Track original data for rollback purposes
  const originalDataRef = useRef<Map<string, T>>(new Map());

  const optimisticUpdate = useCallback((id: string, updates: Partial<T>, original: T) => {
    // Store original data for potential rollback
    if (!originalDataRef.current.has(id)) {
      originalDataRef.current.set(id, original);
    }

    setState(prev => {
      const existingOpIndex = prev.pendingOperations.findIndex(op => op.id === id);
      const newOperation: PendingOperation<T> = {
        id,
        type: 'update',
        payload: updates,
        originalData: original,
        timestamp: Date.now()
      };

      const updatedOperations = [...prev.pendingOperations];
      if (existingOpIndex >= 0) {
        // Replace existing operation
        updatedOperations[existingOpIndex] = newOperation;
      } else {
        // Add new operation
        updatedOperations.push(newOperation);
      }

      // Apply optimistic update to data
      const updatedData = prev.data.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );

      return {
        ...prev,
        data: updatedData,
        pendingOperations: updatedOperations
      };
    });
  }, []);

  const optimisticDelete = useCallback((id: string, original: T) => {
    // Store original data for potential rollback
    if (!originalDataRef.current.has(id)) {
      originalDataRef.current.set(id, original);
    }

    setState(prev => {
      const existingOpIndex = prev.pendingOperations.findIndex(op => op.id === id);
      const newOperation: PendingOperation<T> = {
        id,
        type: 'delete',
        originalData: original,
        timestamp: Date.now()
      };

      const updatedOperations = [...prev.pendingOperations];
      if (existingOpIndex >= 0) {
        // Replace existing operation
        updatedOperations[existingOpIndex] = newOperation;
      } else {
        // Add new operation
        updatedOperations.push(newOperation);
      }

      // Apply optimistic delete to data
      const updatedData = prev.data.filter(item => item.id !== id);

      return {
        ...prev,
        data: updatedData,
        pendingOperations: updatedOperations
      };
    });
  }, []);

  const rollbackOperation = useCallback((operationId: string) => {
    setState(prev => {
      const operation = prev.pendingOperations.find(op => op.id === operationId);
      if (!operation) return prev;

      const originalData = originalDataRef.current.get(operationId);
      if (!originalData) return prev;

      // Remove operation from pending list
      const updatedOperations = prev.pendingOperations.filter(op => op.id !== operationId);

      // Restore original data
      let updatedData = [...prev.data];
      if (operation.type === 'delete') {
        // Restore deleted item
        updatedData.push(originalData);
      } else if (operation.type === 'update') {
        // Restore original values
        updatedData = updatedData.map(item =>
          item.id === operationId ? originalData : item
        );
      }

      // Clean up original data reference
      originalDataRef.current.delete(operationId);

      return {
        ...prev,
        data: updatedData,
        pendingOperations: updatedOperations
      };
    });
  }, []);

  const rollbackAllOperations = useCallback(() => {
    setState(prev => {
      // Restore all original data
      let restoredData = [...prev.data];

      // Process operations in reverse chronological order for proper restoration
      const sortedOperations = [...prev.pendingOperations].sort((a, b) => b.timestamp - a.timestamp);

      sortedOperations.forEach(operation => {
        const originalData = originalDataRef.current.get(operation.id);
        if (originalData) {
          if (operation.type === 'delete') {
            // Restore deleted item if not already present
            if (!restoredData.find(item => item.id === operation.id)) {
              restoredData.push(originalData);
            }
          } else if (operation.type === 'update') {
            // Restore original values
            restoredData = restoredData.map(item =>
              item.id === operation.id ? originalData : item
            );
          }
        }
      });

      // Clear all original data references
      originalDataRef.current.clear();

      return {
        ...prev,
        data: restoredData,
        pendingOperations: []
      };
    });
  }, []);

  const commitOperations = useCallback(async <R>(
    executor: (operations: PendingOperation<T>[]) => Promise<R>
  ): Promise<{ success: boolean; result?: R; failedOperations: PendingOperation<T>[] }> => {
    if (state.pendingOperations.length === 0) {
      return { success: true, failedOperations: [] };
    }

    setState(prev => ({ ...prev, isOperationPending: true }));

    try {
      const result = await executor(state.pendingOperations);
      
      // Success - clear all pending operations and original data
      setState(prev => ({ ...prev, pendingOperations: [], isOperationPending: false }));
      originalDataRef.current.clear();
      
      return { success: true, result, failedOperations: [] };
    } catch (error) {
      console.error('Commit operations failed:', error);
      
      // On failure, rollback all operations to ensure UI matches database
      setState(prev => ({ ...prev, isOperationPending: false }));
      rollbackAllOperations();
      
      return { 
        success: false, 
        failedOperations: [...state.pendingOperations]
      };
    }
  }, [state.pendingOperations, rollbackAllOperations]);

  const clearPendingOperations = useCallback(() => {
    setState(prev => ({ ...prev, pendingOperations: [] }));
    originalDataRef.current.clear();
  }, []);

  const setData = useCallback((data: T[]) => {
    setState(prev => ({ ...prev, data }));
    // Clear any stale original data references
    originalDataRef.current.clear();
  }, []);

  const hasPendingChanges = useCallback(() => {
    return state.pendingOperations.length > 0;
  }, [state.pendingOperations.length]);

  const getPendingOperation = useCallback((id: string) => {
    return state.pendingOperations.find(op => op.id === id);
  }, [state.pendingOperations]);

  return {
    state,
    optimisticUpdate,
    optimisticDelete,
    commitOperations,
    rollbackOperation,
    rollbackAllOperations,
    clearPendingOperations,
    setData,
    hasPendingChanges,
    getPendingOperation
  };
}