/**
 * Enhanced API Error Handler for Production
 * Handles common production issues with fetch requests
 */

import { logger } from '@/lib/logger/logger';

export interface FetchErrorInfo {
  url: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
}

/**
 * Enhanced fetch wrapper with production error handling
 */
export async function safeFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Ensure credentials are included for auth endpoints
    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add CSRF token for non-GET requests
    if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'X-CSRF-Token': 'true',
      };
    }

    logger.debug({ 
      msg: 'Making API request', 
      url, 
      method: options.method || 'GET',
      hasBody: !!options.body 
    });

    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;

    // Log response details in production for debugging
    if (process.env.NODE_ENV === 'production') {
      logger.debug({
        msg: 'API Response',
        url,
        status: response.status,
        statusText: response.statusText,
        duration,
        ok: response.ok,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    const errorInfo: FetchErrorInfo = {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    logger.error({ ...errorInfo, error: error instanceof Error ? error.message : String(error) }, 'Fetch failed');

    // Log detailed error in production
    if (process.env.NODE_ENV === 'production') {
      logger.error({
        msg: 'API Error',
        ...errorInfo,
        duration,
        userAgent: navigator?.userAgent,
        connection: (navigator as typeof navigator & { connection?: { effectiveType?: string } })?.connection?.effectiveType,
      });
    }

    throw error;
  }
}

/**
 * Handle common API response patterns
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    
    // Try to parse as JSON first
    let errorData: unknown;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || `HTTP ${response.status}` };
    }

    // Log production errors
    if (process.env.NODE_ENV === 'production') {
      logger.error({
        msg: 'API Error Response',
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorData,
      });
    }

    throw new Error((errorData as { error?: string }).error || `Request failed with status ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    throw new Error('Empty response from server');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}

/**
 * Check if the error is network-related (common in mobile/production)
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('timeout') ||
         message.includes('connection') ||
         message.includes('cors');
}

/**
 * Check if the error is auth-related
 */
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return message.includes('401') || 
         message.includes('unauthorized') || 
         message.includes('session') ||
         message.includes('auth');
}