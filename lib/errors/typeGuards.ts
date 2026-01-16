/**
 * Type Guards for Error Handling
 * Provides type-safe error handling utilities
 */

import { AppwriteException } from 'appwrite';

/**
 * Check if error is an Appwrite exception
 */
export function isAppwriteError(error: unknown): error is AppwriteException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Check if error is a standard Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Check if error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (hasMessage(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!isError(error)) return false;
  
  return (
    error.name === 'NetworkError' ||
    error.message.includes('network') ||
    error.message.includes('fetch') ||
    error.message.includes('ECONNREFUSED')
  );
}

/**
 * Check if error is retryable (network issues, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (isAppwriteError(error)) {
    // Retry on server errors and rate limits
    return error.code >= 500 || error.code === 429;
  }
  
  return isNetworkError(error);
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (isAppwriteError(error)) {
    return error.code === 401 || error.type === 'user_unauthorized';
  }
  
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (isAppwriteError(error)) {
    return error.code === 400 || error.type === 'general_argument_invalid';
  }
  
  return false;
}
