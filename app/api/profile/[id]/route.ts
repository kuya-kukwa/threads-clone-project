/**
 * Profile API Route
 * Handles profile retrieval and updates from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient, serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { profileUpdateSchema } from '@/schemas/profile.schema';
import { UserProfile } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';
import { Query } from 'node-appwrite';

/**
 * Sanitize user input (prevent XSS)
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 500); // Hard limit on input length
}

/**
 * GET /api/profile/[id]
 * Get user profile by userId
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    logger.debug({ msg: 'Fetching profile', userId });
    
    // Search for profile by userId field
    const response = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', userId), Query.limit(1)]
    );
    
    logger.debug({ 
      msg: 'Profile query result', 
      userId, 
      found: response.documents.length,
      total: response.total 
    });
    
    if (response.documents.length === 0) {
      // Log more details to help debug
      logger.warn({ 
        msg: 'Profile not found', 
        userId,
        databaseId: APPWRITE_CONFIG.DATABASE_ID,
        collectionId: APPWRITE_CONFIG.COLLECTIONS.USERS
      });
      return NextResponse.json(
        { success: false, error: 'Profile not found', userId },
        { status: 404 }
      );
    }
    
    const profile = response.documents[0];
    logger.debug({ msg: 'Profile found', userId, profileId: profile.$id });
    
    return NextResponse.json({ 
      success: true, 
      profile 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: number }).code;
    logger.error({ 
      msg: 'Failed to fetch profile', 
      error: errorMessage,
      code: errorCode 
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params;

    // Get session JWT from Authorization header
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      logger.warn({ msg: 'No session ID found in request header', profileId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No session found' },
        { status: 401 }
      );
    }
    
    // Create session-specific client with the session ID
    const { account, databases } = createSessionClient(sessionId);
    
    // Validate session and get current user
    let currentUser;
    try {
      currentUser = await account.get();
      logger.debug({ msg: 'User authenticated', userId: currentUser.$id, profileId });
    } catch (sessionError: unknown) {
      const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown error';
      logger.warn({ msg: 'Session validation failed', error: errorMessage, profileId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired session. Please log in again.',
          details: errorMessage 
        },
        { status: 401 }
      );
    }
    
    // Get the profile to verify ownership - use databases from session client
    const existingProfile = await databases.getDocument<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      profileId
    );
    
    logger.debug({
      msg: 'Checking profile ownership',
      profileOwner: existingProfile.userId,
      currentUser: currentUser.$id,
      profileId,
    });
    
    // Verify user owns this profile
    if (existingProfile.userId !== currentUser.$id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Forbidden: You can only edit your own profile',
          details: `Profile belongs to user ${existingProfile.userId}, but you are logged in as ${currentUser.$id}`
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { displayName, bio, avatarUrl } = validation.data;
    
    // Sanitize inputs
    const sanitizedDisplayName = sanitizeInput(displayName);
    const sanitizedBio = bio ? sanitizeInput(bio) : '';
    
    // Update profile document - use databases from session client
    const updatedProfile = await databases.updateDocument<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      profileId,
      {
        displayName: sanitizedDisplayName,
        bio: sanitizedBio,
        avatarUrl: avatarUrl || '',
        updatedAt: new Date().toISOString(),
      }
    );
    
    logger.info({ msg: 'Profile updated successfully', profileId, userId: currentUser.$id });
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ msg: 'Profile update failed', error: errorMessage, stack: errorStack });
    return NextResponse.json(
      { success: false, error: errorMessage || 'Profile update failed' },
      { status: 500 }
    );
  }
}
