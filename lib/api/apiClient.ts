/**
 * API Client
 * Enhanced fetch wrapper with retry logic, timeout, and error handling
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Network error detection
 * - CSRF token injection
 * - Type-safe responses
 */

import { NetworkError, TimeoutError } from '../errors/AppError';
import { handleClientError } from '../errors/errorHandler';

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * Request options
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  params?: Record<string, string>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseURL: '',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Enhanced fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Sleep utility for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  
  // Check if it's a NetworkError or TimeoutError
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }
  
  return false;
}

/**
 * API Client class
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.config.baseURL || window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.config.timeout,
      retries = this.config.retries,
      params,
      headers = {},
      ...fetchOptions
    } = options;
    
    const url = this.buildUrl(endpoint, params);
    
    // Merge headers with CSRF token for non-GET requests
    const requestHeaders = {
      ...this.config.headers,
      ...headers,
    };
    
    // Add CSRF token for state-changing requests
    if (fetchOptions.method && !['GET', 'HEAD', 'OPTIONS'].includes(fetchOptions.method)) {
      (requestHeaders as Record<string, string>)['X-CSRF-Token'] = 'true'; // Simple token - middleware validates presence
    }
    
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            ...fetchOptions,
            headers: requestHeaders,
          },
          timeout
        );
        
        // Parse response
        const data = await response.json();
        
        // Handle error responses
        if (!response.ok) {
          const error = new Error((data as { error?: string }).error || 'Request failed') as Error & {
            statusCode?: number;
            code?: string;
            response?: unknown;
          };
          error.statusCode = response.status;
          error.code = (data as { code?: string }).code;
          error.response = data;
          throw error;
        }
        
        // Return success data
        if ('data' in data) {
          return data.data as T;
        }
        throw new Error('Invalid response format');
        
      } catch (error: unknown) {
        lastError = error;
        
        // Don't retry if not retryable or last attempt
        if (!isRetryableError(error) || attempt === retries) {
          break;
        }
        
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
    
    // All retries failed
    const error = lastError as Error;
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new NetworkError('Network request failed. Please check your connection.');
    }
    
    throw handleClientError(error);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Create a custom API client with specific configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
