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

export const POST = asyncHandler(async (request: NextRequest) => {
  const logger = createRequestLogger(request);
  
  try {
    console.log('[Register API] Starting registration process');
    
    // Parse and validate request body
    const body = await request.json();
    console.log('[Register API] Request body received:', { email: body.email, username: body.username });
    
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      console.log('[Register API] Validation failed:', validation.error.issues);
      logger.warn('Registration validation failed', { errors: validation.error.issues });
      throw ValidationError.fromZod(validation.error, 'Invalid registration data');
    }
    
    const { email, password, username, displayName } = validation.data;
    console.log('[Register API] Validation passed');
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.toLowerCase(), 30);
    const sanitizedDisplayName = sanitizeInput(displayName, 50);
    console.log('[Register API] Inputs sanitized');
    
    logger.info('Creating new user account', { email, username: sanitizedUsername });
    
    // Create Appwrite Auth user using server Users API
    console.log('[Register API] Creating Appwrite user...');
    const user = await serverUsers.create(
      ID.unique(),
      email,
      undefined, // phone (optional)
      password,
      sanitizedDisplayName
    );
    
    console.log('[Register API] User created:', user.$id);
    logger.info('Auth user created', { userId: user.$id });
    
    // Create user profile document
    console.log('[Register API] Creating profile document...');
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
    
    console.log('[Register API] Profile created:', profile.$id);
    logger.info('User registered successfully', { userId: user.$id, profileId: profile.$id });
    
    return successResponse({ user, profile }, 201);
  } catch (error: any) {
    console.error('[Register API] Error:', error.message, error.type, error.code);
    throw error;
  }
});
