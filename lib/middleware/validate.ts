/**
 * Request Validation Middleware
 * Validates request body against Zod schemas
 */

import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/ValidationError';

/**
 * Validate request body with Zod schema
 * Throws ValidationError if validation fails
 * 
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed data
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      throw ValidationError.fromZod(result.error);
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // JSON parsing error
    throw new ValidationError('Invalid JSON in request body', [
      { field: 'body', message: 'Request body must be valid JSON', code: 'invalid_json' }
    ]);
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const searchParams = request.nextUrl.searchParams;
  const query = Object.fromEntries(searchParams.entries());
  
  const result = schema.safeParse(query);
  
  if (!result.success) {
    throw ValidationError.fromZod(result.error);
  }
  
  return result.data;
}
