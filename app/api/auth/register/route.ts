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

export const POST = asyncHandler(async (request: NextRequest) => {
  // Apply rate limiting (5 requests per minute for auth)
  const rateLimitResult = await rateLimit(RateLimitType.AUTH)(request);
  if (rateLimitResult) {
    return rateLimitResult; // Return rate limit error response
  }

  const logger = createRequestLogger(request);
  
  try {
    logger.debug({ msg: 'Starting registration process' });
    
    // Parse and validate request body
    const body = await request.json();
    
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn({ msg: 'Registration validation failed', errors: validation.error.issues });
      throw ValidationError.fromZod(validation.error, 'Invalid registration data');
    }
    
    const { email, password, username, displayName } = validation.data;
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.toLowerCase(), 30);
    const sanitizedDisplayName = sanitizeInput(displayName, 50);
    
    logger.info({ msg: 'Creating new user account', email, username: sanitizedUsername });
    
    // Create Appwrite Auth user using server Users API
    const user = await serverUsers.create(
      ID.unique(),
      email,
      undefined, // phone (optional)
      password,
      sanitizedDisplayName
    );
    
    logger.info({ msg: 'Auth user created', userId: user.$id });
    
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
    
    logger.info({ msg: 'User registered successfully', userId: user.$id, profileId: profile.$id });
    
    return successResponse({ user, profile }, 201);
  } catch (error: any) {
    logger.error({ msg: 'Registration failed', error: error.message, type: error.type, code: error.code });
    throw error;
  }
});
