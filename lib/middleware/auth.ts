/**
 * Authentication Middleware
 * Validates user authentication for protected routes
 */

import { NextRequest } from 'next/server';
import { UnauthorizedError } from '../errors/AppError';
import { AuthService } from '../services/authService';
import { Models } from 'appwrite';

/**
 * Check if user is authenticated
 * Throws UnauthorizedError if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<Models.User<Models.Preferences>> {
  const user = await AuthService.getCurrentUser();
  
  if (!user) {
    throw new UnauthorizedError('Authentication required. Please log in.');
  }
  
  return user;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Does not throw error
 */
export async function optionalAuth(request: NextRequest): Promise<Models.User<Models.Preferences> | null> {
  return await AuthService.getCurrentUser();
}

/**
 * Check if authenticated user owns the resource
 * Throws ForbiddenError if user doesn't own the resource
 */
export async function requireResourceOwnership(
  request: NextRequest,
  resourceUserId: string
): Promise<Models.User<Models.Preferences>> {
  const user = await requireAuth(request);
  
  if (user.$id !== resourceUserId) {
    const { ForbiddenError } = await import('../errors/AppError');
    throw new ForbiddenError('You do not have permission to access this resource.');
  }
  
  return user;
}
