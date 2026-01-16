/**
 * Profile Update API Route
 * Handles profile updates from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases, createSessionClient } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { profileUpdateSchema } from '@/schemas/profile.schema';
import { UserProfile } from '@/types/appwrite';
import { cookies } from 'next/headers';

/**
 * Sanitize user input (prevent XSS)
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 500); // Hard limit on input length
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
      console.log('[Profile API] No session ID found in x-session-id header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No session found' },
        { status: 401 }
      );
    }

    console.log('[Profile API] Received session ID:', sessionId.substring(0, 50) + '...');
    
    // Create session-specific client with the session ID
    const { account, databases } = createSessionClient(sessionId);
    
    // Validate session and get current user
    let currentUser;
    try {
      currentUser = await account.get();
      console.log('[Profile API] Current user:', currentUser.$id);
    } catch (sessionError: any) {
      console.error('[Profile API] Session validation failed:', sessionError.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired session. Please log in again.',
          details: sessionError.message 
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
    
    console.log('[Profile API] Profile owner:', existingProfile.userId, 'Current user:', currentUser.$id);
    
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
    
    console.log('[Profile API] Profile updated successfully');
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Profile update failed' },
      { status: 500 }
    );
  }
}
