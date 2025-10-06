/**
 * Atomic Operations Utility
 * 
 * Provides transaction-like behavior for batch database operations.
 * Ensures either all operations succeed or all are rolled back.
 */
import { picksApi } from './api';
import { Pick } from '../types/index';
import { PendingOperation } from '../hooks/useOptimisticUpdates';
import { AppError, createAppError } from '../utils/errorHandling';

export interface AtomicOperationResult {
  success: boolean;
  successfulOperations: PendingOperation<Pick>[];
  failedOperations: PendingOperation<Pick>[];
  error?: AppError;
}

export interface AtomicOperationOptions {
  continueOnError?: boolean;
  validateBeforeCommit?: boolean;
}

/**
 * Executes a batch of operations atomically.
 * If any operation fails and continueOnError is false, attempts to rollback successful operations.
 */
export async function executeAtomicOperations(
  operations: PendingOperation<Pick>[],
  options: AtomicOperationOptions = {}
): Promise<AtomicOperationResult> {
  const {
    continueOnError = false,
    validateBeforeCommit = true
  } = options;

  const successfulOperations: PendingOperation<Pick>[] = [];
  const failedOperations: PendingOperation<Pick>[] = [];
  let rollbackRequired = false;

  try {
    // Validation phase (optional)
    if (validateBeforeCommit) {
      for (const operation of operations) {
        if (!isValidOperation(operation)) {
          throw createAppError(
            new Error(`Invalid operation for pick ${operation.id}`),
            { 
              operation: 'validation', 
              component: 'atomicOperations',
              metadata: { operationId: operation.id, operationType: operation.type }
            },
            'VALIDATION_FAILED'
          );
        }
      }
    }

    // Execution phase
    
    for (const operation of operations) {
      try {
        
        if (operation.type === 'update') {
          const { error } = await picksApi.update(operation.id, operation.payload!);
          if (error) {
            throw error;
          }
        } else if (operation.type === 'delete') {
          const { error } = await picksApi.delete(operation.id);
          if (error) {
            throw error;
          }
        }

        successfulOperations.push(operation);
        
      } catch (error) {
        console.error(`Failed to execute ${operation.type} for pick ${operation.id}:`, error);
        failedOperations.push(operation);
        
        if (!continueOnError) {
          rollbackRequired = true;
          break;
        }
      }
    }

    // Rollback phase (if needed and not continuing on error)
    if (rollbackRequired && successfulOperations.length > 0) {
      console.warn('Rolling back successful operations due to failure...');
      await rollbackOperations(successfulOperations);
      
      return {
        success: false,
        successfulOperations: [],
        failedOperations: operations,
        error: createAppError(
          new Error('Atomic operation failed and was rolled back'),
          {
            operation: 'atomicCommit',
            component: 'atomicOperations',
            metadata: { 
              originalSuccessCount: successfulOperations.length,
              totalOperations: operations.length 
            }
          },
          'SERVER_ERROR'
        )
      };
    }

    // Determine overall success
    const success = failedOperations.length === 0;
    
    if (success) {
      console.log(`Successfully completed all ${operations.length} operations`);
    } else {
      console.warn(`Completed with ${successfulOperations.length}/${operations.length} successful operations`);
    }

    return {
      success,
      successfulOperations,
      failedOperations,
      error: !success ? createAppError(
        new Error(`${failedOperations.length} of ${operations.length} operations failed`),
        {
          operation: 'partialCommit',
          component: 'atomicOperations',
          metadata: { 
            successCount: successfulOperations.length,
            failureCount: failedOperations.length
          }
        },
        'SERVER_ERROR'
      ) : undefined
    };

  } catch (error) {
    console.error('Atomic operations failed during execution:', error);
    
    if (successfulOperations.length > 0) {
      try {
        await rollbackOperations(successfulOperations);
      } catch (rollbackError) {
        console.error('Failed to rollback operations after critical error:', rollbackError);
      }
    }

    return {
      success: false,
      successfulOperations: [],
      failedOperations: operations,
      error: error instanceof AppError ? error : createAppError(
        new Error('Critical failure during atomic operations'),
        {
          operation: 'criticalFailure',
          component: 'atomicOperations',
          metadata: { error: error instanceof Error ? error.message : String(error) }
        },
        'SERVER_ERROR'
      )
    };
  }
}

/**
 * Attempts to rollback a list of successful operations.
 */
async function rollbackOperations(operations: PendingOperation<Pick>[]): Promise<void> {
  console.log(`Attempting to rollback ${operations.length} operations...`);
  
  const rollbackPromises = operations.reverse().map(async (operation) => {
    try {
      if (operation.type === 'update') {
        const originalPick = operation.originalData;
        const { error } = await picksApi.update(operation.id, {
          result: originalPick.result
        });
        if (error) {
          throw error;
        }
        
      } else if (operation.type === 'delete') {
        console.warn(`Cannot rollback delete operation for pick ${operation.id} - refresh required`);
      }
    } catch (error) {
      console.error(`Failed to rollback ${operation.type} for pick ${operation.id}:`, error);
    }
  });

  await Promise.allSettled(rollbackPromises);
}

/**
 * Validates that an operation is properly formed and safe to execute.
 */
function isValidOperation(operation: PendingOperation<Pick>): boolean {
  if (!operation.id || !operation.type || !operation.originalData) {
    return false;
  }

  if (operation.type === 'update') {
    if (!operation.payload) {
      return false;
    }
    
    // FIXED: Added ats_result and ou_result to allowed fields
    const allowedUpdateFields = [
      'result', 
      'ats_result',     // ← ADDED
      'ou_result',      // ← ADDED
      'game_info', 
      'prediction', 
      'spread_prediction', 
      'ou_prediction', 
      'confidence', 
      'reasoning', 
      'week', 
      'is_pinned', 
      'schedule_id'
    ];
    
    const payloadKeys = Object.keys(operation.payload);
    if (!payloadKeys.every(key => allowedUpdateFields.includes(key))) {
      console.warn('Invalid update field detected:', payloadKeys.filter(key => !allowedUpdateFields.includes(key)));
      return false;
    }
    
    // Validate result values
    if (operation.payload.result) {
      const validResults = ['win', 'loss', 'push', 'pending'];
      if (!validResults.includes(operation.payload.result)) {
        return false;
      }
    }

    // Validate ats_result values
    if (operation.payload.ats_result) {
      const validResults = ['win', 'loss', 'push', 'pending'];
      if (!validResults.includes(operation.payload.ats_result)) {
        return false;
      }
    }

    // Validate ou_result values
    if (operation.payload.ou_result) {
      const validResults = ['win', 'loss', 'push', 'pending'];
      if (!validResults.includes(operation.payload.ou_result)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Creates a summary of operation results for user display.
 */
export function createOperationSummary(result: AtomicOperationResult): string {
  const { success, successfulOperations, failedOperations } = result;
  
  if (success) {
    return `Successfully completed all ${successfulOperations.length} operations`;
  }
  
  if (successfulOperations.length === 0) {
    return `All ${failedOperations.length} operations failed`;
  }
  
  return `Completed ${successfulOperations.length} of ${successfulOperations.length + failedOperations.length} operations (${failedOperations.length} failed)`;
}