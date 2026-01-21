/**
 * Registration API Route
 * Handles user registration from client components
 */

import { NextRequest } from 'next/server';
import { ID } from 'node-appwrite';
import { serverDatabases, serverUsers } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { registerSchema } from '@/schemas/auth.schema';
import { UserProfile } from '@/types/appwrite';
import { sanitizeInput } from '@/lib/utils';
import { asyncHandler, successResponse } from '@/lib/errors/errorHandler';
import { ValidationError } from '@/lib/errors/ValidationError';
import { createRequestLogger } from '@/lib/logger/requestLogger';
import { rateLimit, RateLimitType } from '@/lib/middleware/rateLimit';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export const POST = asyncHandler(async (request: NextRequest) => {
  // Apply rate limiting (5 requests per minute for auth)
  const rateLimitResult = await rateLimit(RateLimitType.AUTH)(request);
  if (rateLimitResult) {
    return rateLimitResult; // Return rate limit error response
  }

  const logger = createRequestLogger(request);
  
  try {
    logger.debug('Starting registration process');
    
    // Parse and validate request body
    const body = await request.json();
    
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Registration validation failed', { errors: validation.error.issues });
      throw ValidationError.fromZod(validation.error, 'Invalid registration data');
    }
    
    const { email, password, username, displayName } = validation.data;
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.toLowerCase(), 30);
    const sanitizedDisplayName = sanitizeInput(displayName, 50);
    
    logger.info('Creating new user account', { email, username: sanitizedUsername });
    
    // Create Appwrite Auth user using server Users API
    const user = await serverUsers.create(
      ID.unique(),
      email,
      undefined, // phone (optional)
      password,
      sanitizedDisplayName
    );
    
    logger.info('Auth user created', { userId: user.$id });
    
    // Create user profile document
    const profile = await serverDatabases.createDocument<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      ID.unique(),
      {
        userId: user.$id,
        username: sanitizedUsername,
        displayName: sanitizedDisplayName,
        bio: '',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    
    logger.info('User registered successfully', { userId: user.$id, profileId: profile.$id });
    
    return successResponse({ user, profile }, 201);
  } catch (error: unknown) {
    logger.error('Registration failed', error, { type: (error as { type?: string }).type, code: (error as { code?: number }).code });
    throw error;
  }
});
