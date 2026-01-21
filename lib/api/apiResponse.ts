/**
 * API Response Utilities
 * Standardized response wrappers for consistent API responses
 */

import { NextResponse } from 'next/server';
import { ApiSuccessResponse, ApiErrorResponse, PaginatedResponse } from '@/types/appwrite';

/**
 * Create a standardized success response
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param requestId - Optional request ID for tracing
 * @returns NextResponse with standardized success format
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Create a standardized error response
 * 
 * @param error - Error message
 * @param code - Error code for client handling
 * @param status - HTTP status code
 * @param requestId - Optional request ID for tracing
 * @returns NextResponse with standardized error format
 */
export function createErrorResponse(
  error: string,
  code: string,
  status: number = 400,
  requestId?: string,
  errors?: ApiErrorResponse['errors']
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(errors && { errors }),
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Create a paginated response
 * 
 * @param items - Array of items
 * @param total - Total number of items
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param requestId - Optional request ID
 * @returns NextResponse with paginated data
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  requestId?: string
): NextResponse<ApiSuccessResponse<PaginatedResponse<T>>> {
  const hasMore = page * pageSize < total;
  
  const paginatedData: PaginatedResponse<T> = {
    items,
    total,
    page,
    pageSize,
    hasMore,
  };
  
  return createSuccessResponse(paginatedData, 200, requestId);
}

/**
 * Response builder for fluent API
 */
export class ResponseBuilder<T = unknown> {
  private data?: T;
  private error?: string;
  private code?: string;
  private status: number = 200;
  private requestId?: string;
  private validationErrors?: ApiErrorResponse['errors'];

  /**
   * Set success data
   */
  withData(data: T): this {
    this.data = data;
    return this;
  }

  /**
   * Set error details
   */
  withError(error: string, code: string): this {
    this.error = error;
    this.code = code;
    return this;
  }

  /**
   * Set HTTP status code
   */
  withStatus(status: number): this {
    this.status = status;
    return this;
  }

  /**
   * Set request ID
   */
  withRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * Set validation errors
   */
  withValidationErrors(errors: ApiErrorResponse['errors']): this {
    this.validationErrors = errors;
    return this;
  }

  /**
   * Build the response
   */
  build(): NextResponse {
    if (this.error && this.code) {
      return createErrorResponse(
        this.error,
        this.code,
        this.status,
        this.requestId,
        this.validationErrors
      );
    }
    
    return createSuccessResponse(this.data, this.status, this.requestId);
  }
}

/**
 * Create a response builder
 */
export function response<T = unknown>(): ResponseBuilder<T> {
  return new ResponseBuilder<T>();
}
