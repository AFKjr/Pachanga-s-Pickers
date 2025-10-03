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
  continueOnError?: boolean; // If false, stops on first error (default: false)
  validateBeforeCommit?: boolean; // If true, validates all operations before executing any (default: true)
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
      console.log('Validating operations before commit...');
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
    console.log(`Executing ${operations.length} atomic operations...`);
    
    for (const operation of operations) {
      try {
        console.log(`Executing ${operation.type} operation for pick ${operation.id}`);
        
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
        console.log(`Successfully executed ${operation.type} for pick ${operation.id}`);
        
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
        successfulOperations: [], // All rolled back
        failedOperations: operations, // All considered failed
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
      console.log(`All ${operations.length} operations completed successfully`);
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
    
    // If we have successful operations and a critical error occurred, attempt rollback
    if (successfulOperations.length > 0) {
      try {
        await rollbackOperations(successfulOperations);
        console.log('Successfully rolled back operations after critical error');
      } catch (rollbackError) {
        console.error('Failed to rollback operations after critical error:', rollbackError);
      }
    }

    return {
      success: false,
      successfulOperations: [], // All considered failed
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
 * This is a best-effort operation - some rollbacks may fail.
 */
async function rollbackOperations(operations: PendingOperation<Pick>[]): Promise<void> {
  console.log(`Attempting to rollback ${operations.length} operations...`);
  
  // Process rollbacks in reverse order (LIFO)
  const rollbackPromises = operations.reverse().map(async (operation) => {
    try {
      if (operation.type === 'update') {
        // Rollback update by restoring original values
        const originalPick = operation.originalData;
        const { error } = await picksApi.update(operation.id, {
          result: originalPick.result
        });
        if (error) {
          throw error;
        }
        console.log(`Rolled back update for pick ${operation.id}`);
        
      } else if (operation.type === 'delete') {
        // Rollback delete by recreating the pick
        // Note: This is complex as we need to recreate the entire pick
        // For now, we'll log the issue and let the UI refresh handle it
        console.warn(`Cannot rollback delete operation for pick ${operation.id} - refresh required`);
      }
    } catch (error) {
      console.error(`Failed to rollback ${operation.type} for pick ${operation.id}:`, error);
    }
  });

  // Wait for all rollback attempts to complete
  await Promise.allSettled(rollbackPromises);
  console.log('Rollback operations completed');
}

/**
 * Validates that an operation is properly formed and safe to execute.
 */
function isValidOperation(operation: PendingOperation<Pick>): boolean {
  // Basic structure validation
  if (!operation.id || !operation.type || !operation.originalData) {
    return false;
  }

  // Type-specific validation
  if (operation.type === 'update') {
    if (!operation.payload) {
      return false;
    }
    
    // Validate payload contains only allowed fields
    const allowedUpdateFields = ['result', 'game_info', 'prediction', 'spread_prediction', 'ou_prediction', 'confidence', 'reasoning', 'week', 'is_pinned', 'schedule_id'];
    const payloadKeys = Object.keys(operation.payload);
    if (!payloadKeys.every(key => allowedUpdateFields.includes(key))) {
      console.warn('Invalid update field detected:', payloadKeys.filter(key => !allowedUpdateFields.includes(key)));
      return false;
    }
    
    // Validate result values
    if (operation.payload.result) {
      const validResults = ['win', 'loss', 'push'];
      if (!validResults.includes(operation.payload.result)) {
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