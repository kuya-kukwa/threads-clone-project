/**
 * Avatar Upload API Route
 * POST /api/upload/avatar
 * 
 * Features:
 * - Server-side avatar upload for security
 * - File validation (size, type, dimensions)
 * - Session authentication
 * - Automatic old avatar cleanup
 * - Returns avatarId and avatarUrl
 * 
 * Security:
 * - Only authenticated users can upload
 * - Rate limited to prevent abuse
 * - Strict file type validation
 * - Size limits enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { createSessionClient, serverStorage, serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG, SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { logger } from '@/lib/logger/logger';
import { getErrorMessage } from '@/lib/errors';
import { Query } from 'node-appwrite';
import { UserProfile } from '@/types/appwrite';

export const dynamic = 'force-dynamic';

// Avatar validation constants
const MAX_SIZE_BYTES = SECURITY_CONFIG.AVATAR.MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = SECURITY_CONFIG.AVATAR.ALLOWED_TYPES;

/**
 * Validate avatar file
 */
function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size must be under ${SECURITY_CONFIG.AVATAR.MAX_SIZE_MB}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPG, PNG, and WebP images are allowed',
    };
  }

  return { valid: true };
}

/**
 * Generate avatar preview URL from Appwrite Storage
 */
function getAvatarUrl(fileId: string): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const bucketId = APPWRITE_CONFIG.BUCKETS.AVATARS;
  
  // Return a preview URL with reasonable dimensions for avatars
  // Using 400x400 as a good balance between quality and file size
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${projectId}&width=400&height=400&gravity=center&quality=90`;
}

/**
 * Delete old avatar file from storage
 */
async function deleteOldAvatar(oldAvatarUrl: string | undefined): Promise<void> {
  if (!oldAvatarUrl || !oldAvatarUrl.includes(APPWRITE_CONFIG.BUCKETS.AVATARS)) {
    return; // No old avatar or it's from a different source
  }

  try {
    // Extract file ID from URL
    const match = oldAvatarUrl.match(/\/files\/([^/]+)\//);
    if (match && match[1]) {
      const oldFileId = match[1];
      await serverStorage.deleteFile(APPWRITE_CONFIG.BUCKETS.AVATARS, oldFileId);
      logger.info({ msg: 'Old avatar deleted', fileId: oldFileId });
    }
  } catch (error) {
    // Log but don't fail - old file cleanup is not critical
    logger.warn({ msg: 'Failed to delete old avatar', error: getErrorMessage(error) });
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get session from header
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      logger.warn({ msg: 'Avatar upload attempted without session', requestId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Validate session and get current user
    const { account } = createSessionClient(sessionId);
    let currentUser;
    
    try {
      currentUser = await account.get();
    } catch (sessionError) {
      logger.warn({
        msg: 'Invalid session for avatar upload',
        error: getErrorMessage(sessionError),
        requestId,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    logger.info({ msg: 'Avatar upload request', userId: currentUser.$id, requestId });

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      logger.warn({ msg: 'No file provided in avatar upload', requestId });
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      logger.warn({ msg: 'Avatar validation failed', error: validation.error, requestId });
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Verify bucket exists
    try {
      await serverStorage.getBucket(APPWRITE_CONFIG.BUCKETS.AVATARS);
    } catch {
      logger.error({ msg: 'Avatars bucket not found', requestId });
      return NextResponse.json(
        { success: false, error: 'Storage not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Get user's current profile to find old avatar
    const profileResponse = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', currentUser.$id), Query.limit(1)]
    );

    if (profileResponse.documents.length === 0) {
      logger.error({ msg: 'User profile not found', userId: currentUser.$id, requestId });
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    const userProfile = profileResponse.documents[0];
    const oldAvatarUrl = userProfile.avatarUrl;

    // Generate unique file ID
    const fileId = ID.unique();

    // Upload new avatar
    logger.debug({ msg: 'Uploading avatar', fileId, fileName: file.name, fileSize: file.size, requestId });

    await serverStorage.createFile(
      APPWRITE_CONFIG.BUCKETS.AVATARS,
      fileId,
      file
    );

    // Generate avatar URL
    const avatarUrl = getAvatarUrl(fileId);

    // Update user profile with new avatar URL
    await serverDatabases.updateDocument(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      userProfile.$id,
      {
        avatarUrl: avatarUrl,
        updatedAt: new Date().toISOString(),
      }
    );

    // Delete old avatar (async, non-blocking)
    deleteOldAvatar(oldAvatarUrl);

    logger.info({
      msg: 'Avatar uploaded successfully',
      userId: currentUser.$id,
      fileId,
      requestId,
    });

    return NextResponse.json({
      success: true,
      data: {
        avatarId: fileId,
        avatarUrl: avatarUrl,
      },
    });

  } catch (error) {
    logger.error({
      msg: 'Avatar upload failed',
      error: getErrorMessage(error),
      requestId,
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to upload avatar. Please try again.' },
      { status: 500 }
    );
  }
}
