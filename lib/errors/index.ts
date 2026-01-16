/**
 * Centralized exports for error handling
 * Makes it easy to import error utilities throughout the app
 */

// Error classes
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  NetworkError,
  TimeoutError,
  ErrorCode,
  isAppError,
  isOperationalError,
} from './AppError';

// Validation errors
export { ValidationError, formatZodError } from './ValidationError';
export type { ValidationErrorDetail } from './ValidationError';

// Error handlers
export {
  parseAppwriteError,
  normalizeError,
  handleApiError,
  handleClientError,
  asyncHandler,
  errorResponse,
  successResponse,
} from './errorHandler';
export type { ErrorResponse } from './errorHandler';

// Type guards
export {
  isAppwriteError,
  isError,
  hasMessage,
  getErrorMessage,
  isNetworkError,
  isRetryableError,
  isAuthError,
  isValidationError,
} from './typeGuards';
