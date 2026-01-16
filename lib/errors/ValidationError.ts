/**
 * Validation Error Classes
 * Handles Zod validation errors and provides structured error responses
 */

import { ZodError, ZodIssue } from 'zod';
import { AppError, ErrorCode } from './AppError';

/**
 * Formatted validation error for client consumption
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation Error - 400 Bad Request with field-level errors
 */
export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string = 'Validation failed', errors: ValidationErrorDetail[]) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, { errors });
    this.errors = errors;
  }

  /**
   * Create ValidationError from Zod error
   */
  static fromZod(zodError: ZodError, customMessage?: string): ValidationError {
    const errors = zodError.issues.map((issue: ZodIssue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return new ValidationError(
      customMessage || 'Validation failed',
      errors
    );
  }

  /**
   * Convert to client response with all field errors
   */
  toClientResponse() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      errors: this.errors,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Get first error message (for simple error display)
   */
  getFirstErrorMessage(): string {
    return this.errors[0]?.message || this.message;
  }

  /**
   * Get errors grouped by field
   */
  getErrorsByField(): Record<string, string[]> {
    return this.errors.reduce((acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error.message);
      return acc;
    }, {} as Record<string, string[]>);
  }
}

/**
 * Helper to format Zod error for client response
 */
export function formatZodError(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}
