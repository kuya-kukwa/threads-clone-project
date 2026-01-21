/**
 * Image Upload API Route
 * POST /api/upload/image
 * 
 * Features:
 * - Server-side image upload for security
 * - File validation
 * - Session authentication
 * - Returns imageId and imageUrl
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { uploadThreadImage, validateImageFile } from '@/lib/services/imageService';
import { createRequestLogger } from '@/lib/logger/requestLogger';
import { getErrorMessage } from '@/lib/errors';

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Get session from header (same pattern as threads endpoint)
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      logger.warn('Image upload attempted without session');
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
      logger.warn('Invalid session for image upload', {
        error: getErrorMessage(sessionError),
      });
      return NextResponse.json(
        { success: false, error: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    logger.debug('Image upload request', { userId: session.$id });

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      logger.warn('No file provided in upload request');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      logger.warn('File validation failed', { error: validation.error });
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload image
    const result = await uploadThreadImage(file);

    if (!result.success) {
      logger.error('Image upload failed', new Error(result.error || 'Unknown error'), { 
        error: result.error,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Upload failed',
          // Include debug info for troubleshooting (safe since it's not exposing secrets)
          debug: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          }
        },
        { status: 500 }
      );
    }

    logger.info('Image uploaded successfully', {
      imageId: result.imageId,
      userId: session.$id,
    });

    return NextResponse.json(
      {
        success: true,
        imageId: result.imageId,
        imageUrl: result.imageUrl,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Image upload failed', error instanceof Error ? error : new Error(errorMessage), {
      errorMessage,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
