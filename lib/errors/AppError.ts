/**
 * Custom Application Error Classes
 * Provides typed, HTTP-aware error handling for the application
 * 
 * Usage:
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 * throw new UnauthorizedError('Invalid credentials');
 */

/**
 * Error codes for programmatic error handling
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Base Application Error
 * All custom errors extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    // Maintains proper stack trace for where error was thrown (V8 engines)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }

  /**
   * Convert error to safe client response (no stack traces)
   */
  toClientResponse() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 400 Bad Request - Invalid input
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', context?: Record<string, any>) {
    super(message, 400, ErrorCode.INVALID_INPUT, true, context);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 401, ErrorCode.UNAUTHORIZED, true, context);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, any>) {
    super(message, 403, ErrorCode.FORBIDDEN, true, context);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 404, ErrorCode.NOT_FOUND, true, context);
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', context?: Record<string, any>) {
    super(message, 409, ErrorCode.ALREADY_EXISTS, true, context);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, true, { retryAfter });
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, ErrorCode.INTERNAL_ERROR, true, context);
  }
}

/**
 * 503 Service Unavailable - External service down
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', context?: Record<string, any>) {
    super(message, 503, ErrorCode.SERVICE_UNAVAILABLE, true, context);
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: Record<string, any>) {
    super(message, 500, ErrorCode.DATABASE_ERROR, true, context);
  }
}

/**
 * Network/fetch errors
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, any>) {
    super(message, 0, ErrorCode.NETWORK_ERROR, true, context);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', context?: Record<string, any>) {
    super(message, 408, ErrorCode.TIMEOUT, true, context);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (safe to expose)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
