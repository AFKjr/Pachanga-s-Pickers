/**
 * Standardized API Response Types
 *
 * Provides consistent response format for all API functions with type guards
 * and utility functions for working with responses.
 */

import type { AppError } from '../utils/errorHandling';
import { createAppError } from '../utils/errorHandling';

/**
 * Standard API response wrapper
 * All API functions return this format
 */
export interface ApiResponse<T> {
  data: T | null;
  error: AppError | null;
}

/**
 * Success response type
 */
export type SuccessResponse<T> = {
  data: T;
  error: null;
};

/**
 * Error response type
 */
export type ErrorResponse = {
  data: null;
  error: AppError;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for success responses
 *
 * @example
 * const response = await api.getPick(id);
 * if (isSuccess(response)) {
 *   // TypeScript knows response.data is not null
 *   console.log(response.data.prediction);
 * }
 */
export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.error === null && response.data !== null;
}

/**
 * Type guard for error responses
 *
 * @example
 * const response = await api.getPick(id);
 * if (isError(response)) {
 *   // TypeScript knows response.error is not null
 *   console.error(response.error.message);
 * }
 */
export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
  return response.error !== null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Unwrap API response (throws on error)
 *
 * Use this when you want to work with data directly and let errors propagate.
 *
 * @throws {AppError} If response contains an error
 *
 * @example
 * try {
 *   const pick = unwrapResponse(await api.getPick(id));
 *   console.log(pick.prediction);
 * } catch (error) {
 *   console.error('Failed to get pick:', error);
 * }
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (isError(response)) {
    throw response.error;
  }
  if (response.data === null) {
    throw new Error('Unexpected null data in successful response');
  }
  return response.data;
}

/**
 * Get data or return default value
 *
 * Use this when you want a fallback value for errors.
 *
 * @example
 * const picks = getDataOrDefault(await api.getPicks(), []);
 * console.log(`Found ${picks.length} picks`);
 */
export function getDataOrDefault<T>(response: ApiResponse<T>, defaultValue: T): T {
  return isSuccess(response) ? response.data : defaultValue;
}

/**
 * Get data or return null
 *
 * Simple helper for the common case of defaulting to null.
 *
 * @example
 * const pick = getDataOrNull(await api.getPick(id));
 * if (pick) {
 *   console.log(pick.prediction);
 * }
 */
export function getDataOrNull<T>(response: ApiResponse<T>): T | null {
  return isSuccess(response) ? response.data : null;
}

/**
 * Map over response data
 *
 * Transform the data in a response while preserving the response structure.
 *
 * @example
 * const pickResponse = await api.getPick(id);
 * const predictionResponse = mapResponse(pickResponse, pick => pick.prediction);
 * // predictionResponse is ApiResponse<string>
 */
export function mapResponse<T, U>(
  response: ApiResponse<T>,
  fn: (data: T) => U
): ApiResponse<U> {
  if (isSuccess(response)) {
    return { data: fn(response.data), error: null };
  }
  return { data: null, error: response.error };
}

/**
 * Chain API responses (flatMap)
 *
 * Useful for composing API calls where one depends on another.
 *
 * @example
 * const userPicksResponse = await chainResponse(
 *   await api.getUser(userId),
 *   user => api.getPicksByUser(user.id)
 * );
 */
export async function chainResponse<T, U>(
  response: ApiResponse<T>,
  fn: (data: T) => Promise<ApiResponse<U>>
): Promise<ApiResponse<U>> {
  if (isError(response)) {
    return { data: null, error: response.error };
  }
  if (response.data === null) {
    return { data: null, error: createAppError(new Error('Unexpected null data in successful response'), { operation: 'chainResponse', component: 'api.chain' }) };
  }
  return await fn(response.data);
}

/**
 * Combine multiple responses
 *
 * Returns success only if ALL responses are successful.
 *
 * @example
 * const combined = combineResponses([
 *   await api.getPick(id1),
 *   await api.getPick(id2),
 *   await api.getPick(id3)
 * ]);
 *
 * if (isSuccess(combined)) {
 *   const [pick1, pick2, pick3] = combined.data;
 * }
 */
export function combineResponses<T extends any[]>(
  responses: { [K in keyof T]: ApiResponse<T[K]> }
): ApiResponse<T> {
  const errors = responses.filter(isError);

  if (errors.length > 0) {
    // Return first error
    return { data: null, error: errors[0].error };
  }

  const data = responses.map(r => r.data) as T;
  return { data, error: null };
}

/**
 * Run multiple API calls and collect results
 *
 * Unlike combineResponses, this continues even if some fail,
 * returning both successes and errors.
 *
 * @example
 * const results = await collectResponses([
 *   api.getPick(id1),
 *   api.getPick(id2),
 *   api.getPick(id3)
 * ]);
 *
 * console.log(`Successful: ${results.successful.length}`);
 * console.log(`Failed: ${results.failed.length}`);
 */
export async function collectResponses<T>(
  promises: Promise<ApiResponse<T>>[]
): Promise<{
  successful: T[];
  failed: AppError[];
}> {
  const responses = await Promise.all(promises);

  return {
    successful: responses.filter(isSuccess).map(r => r.data),
    failed: responses.filter(isError).map(r => r.error)
  };
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

/**
 * Retry an API call with exponential backoff
 *
 * @example
 * const response = await retryApiCall(
 *   () => api.getPick(id),
 *   { maxRetries: 3, delayMs: 1000 }
 * );
 */
export async function retryApiCall<T>(
  fn: () => Promise<ApiResponse<T>>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<ApiResponse<T>> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2
  } = options;

  let lastResponse: ApiResponse<T> | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResponse = await fn();

    if (isSuccess(lastResponse)) {
      return lastResponse;
    }

    // Don't retry on validation or auth errors
    if (lastResponse.error && (lastResponse.error.code === 'VALIDATION_FAILED' ||
        lastResponse.error.code === 'AUTH_REQUIRED')) {
      return lastResponse;
    }

    // Wait before retrying (except on last attempt)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  return lastResponse!;
}

export async function withTimeout<T>(
  promise: Promise<ApiResponse<T>>,
  timeoutMs: number
): Promise<ApiResponse<T>> {
  const timeoutPromise = new Promise<ErrorResponse>((_, reject) => {
    setTimeout(() => {
      reject({
        data: null,
        error: createAppError(new Error(`Request timed out after ${timeoutMs}ms`), { operation: 'withTimeout', component: 'api.timeout' })
      });
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}