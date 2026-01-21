/**
 * Centralized Error Handler
 * Converts errors to appropriate responses and logs them
 */

import { NextResponse, NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  AppError,
  isAppError,
  isOperationalError,
  ErrorCode,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from './AppError';
import { ValidationError } from './ValidationError';

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  errors?: Array<{ field: string; message: string; code: string }>;
  requestId?: string;
}

/**
 * Parse Appwrite SDK errors to typed errors
 */
export function parseAppwriteError(error: unknown): AppError {
  const code = (error as { code?: number }).code;
  const message = (error as { message?: string }).message || 'Operation failed';

  switch (code) {
    case 401:
      return new UnauthorizedError(message);
    case 409:
      return new ConflictError(message);
    case 400:
      return new BadRequestError(message);
    default:
      return new AppError(message, code || 500, ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Convert any error to AppError
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return ValidationError.fromZod(error);
  }

  // Appwrite SDK error
  if (error && typeof error === 'object' && 'code' in error) {
    return parseAppwriteError(error);
  }

  // Generic Error object
  if (error instanceof Error) {
    return new AppError(
      error.message || 'An unexpected error occurred',
      500,
      ErrorCode.INTERNAL_ERROR,
      false // Unknown errors are not operational
    );
  }

  // Unknown error type
  return new AppError(
    'An unexpected error occurred',
    500,
    ErrorCode.INTERNAL_ERROR,
    false
  );
}

/**
 * Handle errors in API routes
 * Returns NextResponse with appropriate status code and error details
 */
export function handleApiError(
  error: unknown,
  requestId?: string
): NextResponse<ErrorResponse> {
  const appError = normalizeError(error);

  // Log the error (in production, this would go to a logging service)
  if (process.env.NODE_ENV === 'production') {
    // Only log message in production (no stack traces)
    console.error('[API Error]', {
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
      timestamp: appError.timestamp,
      requestId,
    });
  } else {
    // Full error details in development
    console.error('[API Error]', {
      ...appError.toJSON(),
      requestId,
    });
  }

  // Don't expose internal errors to clients
  const isOperational = isOperationalError(appError);
  const clientMessage = isOperational
    ? appError.message
    : 'An unexpected error occurred';

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: clientMessage,
    code: appError.code,
    timestamp: appError.timestamp.toISOString(),
    ...(requestId && { requestId }),
  };

  // Include validation errors if present
  if (appError instanceof ValidationError) {
    errorResponse.errors = appError.errors;
  }

  return NextResponse.json(errorResponse, {
    status: appError.statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handle errors in client-side code
 * Returns a user-friendly error message
 */
export function handleClientError(error: unknown): {
  success: false;
  error: string;
  code?: string;
} {
  const appError = normalizeError(error);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Client Error]', appError.toJSON());
  }

  return {
    success: false,
    error: isOperationalError(appError)
      ? appError.message
      : 'An unexpected error occurred',
    code: appError.code,
  };
}

/**
 * Async error handler wrapper for API routes
 * Automatically catches and handles errors
 */
export function asyncHandler(
  handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Error response helper for consistent API responses
 */
export function errorResponse(
  message: string,
  statusCode: number = 400,
  code?: ErrorCode
): NextResponse<ErrorResponse> {
  const error = new AppError(message, statusCode, code);
  return handleApiError(error);
}

/**
 * Success response helper for consistent API responses
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<{ success: true; data: T }> {
  return NextResponse.json(
    { success: true, data },
    { status: statusCode }
  );
}
