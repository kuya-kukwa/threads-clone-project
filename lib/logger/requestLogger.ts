/**
 * HTTP Request Logger Middleware
 * Logs all incoming requests and outgoing responses with timing information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger, LogContext } from './logger';
import { generateRequestId } from '../utils';

/**
 * Log HTTP request and response
 * Use this in middleware or API routes
 */
export function logHttpRequest(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  context?: LogContext
) {
  const duration = Date.now() - startTime;
  const requestId = context?.requestId || generateRequestId();
  
  const logger = createLogger({
    requestId,
    ...context,
  });

  logger.logResponse(
    request.method,
    request.nextUrl.pathname,
    response.status,
    duration,
    {
      query: Object.fromEntries(request.nextUrl.searchParams),
      userAgent: request.headers.get('user-agent'),
    }
  );
}

/**
 * Wrapper for API routes to automatically log requests
 */
export function withRequestLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const request = args[0] as NextRequest;
    const requestId = generateRequestId();
    
    const logger = createLogger({ requestId });
    
    // Log incoming request
    logger.logRequest(request.method, request.nextUrl.pathname, {
      query: Object.fromEntries(request.nextUrl.searchParams),
    });

    try {
      const response = await handler(...args);
      
      // Log successful response
      logHttpRequest(request, response, startTime, { requestId });
      
      return response;
    } catch (error) {
      // Log error response
      logger.error('Request failed', error, {
        method: request.method,
        url: request.nextUrl.pathname,
        duration: Date.now() - startTime,
      });
      
      throw error;
    }
  };
}

/**
 * Create a request-scoped logger with automatic request ID
 */
export function createRequestLogger(request: NextRequest): ReturnType<typeof createLogger> {
  const requestId = generateRequestId();
  
  return createLogger({
    requestId,
    method: request.method,
    url: request.nextUrl.pathname,
  });
}
