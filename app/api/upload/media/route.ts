/**
 * Media Upload API Route
 * POST /api/upload/media
 * 
 * Features:
 * - Multi-file upload support
 * - Image and video validation
 * - Session authentication
 * - Returns array of MediaItems
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { uploadMediaFile, validateMediaFile } from '@/lib/services/mediaService';
import { createRequestLogger } from '@/lib/logger/requestLogger';
import { getErrorMessage } from '@/lib/errors';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { MediaItem } from '@/types/appwrite';

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie, x-session-id',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Get session from header
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      logger.warn('Media upload attempted without session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Validate session and get current user
    const { account } = createSessionClient(sessionId);
    let session;
    
    try {
      session = await account.get();
    } catch (sessionError) {
      logger.warn('Invalid session for media upload', {
        error: getErrorMessage(sessionError),
      });
      return NextResponse.json(
        { success: false, error: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    logger.debug('Media upload request', { userId: session.$id });

    // Parse multipart form data
    const formData = await request.formData();
    const files: File[] = [];
    const altTexts: string[] = [];

    // Collect all files and alt texts
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      } else if (key.startsWith('altText') && typeof value === 'string') {
        altTexts.push(value);
      }
    }

    if (files.length === 0) {
      logger.warn('No files provided in upload request');
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Check file count limit
    if (files.length > SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST) {
      logger.warn('Too many files in upload request', { count: files.length });
      return NextResponse.json(
        { 
          success: false, 
          error: `Maximum ${SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST} files allowed` 
        },
        { status: 400 }
      );
    }

    // Validate all files first
    for (const file of files) {
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        logger.warn('File validation failed', { 
          fileName: file.name,
          error: validation.error 
        });
        return NextResponse.json(
          { success: false, error: `${file.name}: ${validation.error}` },
          { status: 400 }
        );
      }
    }

    // Upload all files
    const uploadedMedia: MediaItem[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const altText = altTexts[i] || undefined;

      const result = await uploadMediaFile(file, altText);
      
      if (result.success && result.item) {
        uploadedMedia.push(result.item);
      } else {
        failedUploads.push(`${file.name}: ${result.error}`);
        
        // For partial failure, we still return what we uploaded
        // but mark overall as failed
        logger.error('Partial upload failure', new Error(result.error || 'Unknown error'), {
          fileName: file.name,
          uploadedCount: uploadedMedia.length,
          totalCount: files.length,
        });
      }
    }

    // If any uploads failed
    if (failedUploads.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Some uploads failed: ${failedUploads.join('; ')}`,
          partialMedia: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        },
        { status: 500 }
      );
    }

    logger.info('All media uploaded successfully', {
      userId: session.$id,
      count: uploadedMedia.length,
      mediaIds: uploadedMedia.map(m => m.id),
    });

    return NextResponse.json(
      {
        success: true,
        media: uploadedMedia,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Media upload failed', error instanceof Error ? error : new Error(errorMessage), {
      errorMessage,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}
