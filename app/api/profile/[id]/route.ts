/**
 * Profile Update API Route
 * Handles profile updates from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwriteServer';
import { AuthService } from '@/lib/services/authService';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { profileUpdateSchema } from '@/schemas/profile.schema';
import { UserProfile } from '@/types/appwrite';

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
  { params }: { params: { id: string } }
) {
  try {
    const profileId = params.id;

    
    // Check if user is authenticated
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the profile to verify ownership
    const existingProfile = await serverDatabases.getDocument<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      profileId
    );
    
    // Verify user owns this profile
    if (existingProfile.userId !== currentUser.$id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only edit your own profile' },
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
    
    // Update profile document
    const updatedProfile = await serverDatabases.updateDocument<UserProfile>(
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
    
    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Profile update failed' },
      { status: 500 }
    );
  }
}
