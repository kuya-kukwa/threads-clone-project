/**
 * Thread API Route
 * GET /api/threads?userId=... - Get threads by user
 * POST /api/threads - Create a new thread
 * 
 * Features:
 * - Rate limiting (10 posts per minute)
 * - Authentication required
 * - Content sanitization
 * - Image handling
 * - Structured logging
 * 
 * Security:
 * - Only authenticated users can create threads
 * - Rate limiting prevents spam
 * - Content sanitization prevents XSS
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { createThread, createThreadWithMedia, getUserThreads } from '@/lib/services/threadService';
import { rateLimit, RateLimitType } from '@/lib/middleware/rateLimit';
import { threadCreateSchema } from '@/schemas/thread.schema';
import { createRequestLogger } from '@/lib/logger/requestLogger';
import { getErrorMessage } from '@/lib/errors';
import { MediaItem } from '@/types/appwrite';

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      },
    }
  );
}

/**
 * GET /api/threads?userId=...&cursor=...&limit=...
 * Fetch threads by a specific user
 */
export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    logger.debug('Fetching user threads', { userId, cursor, limit });

    const result = await getUserThreads(userId, cursor, limit);

    return NextResponse.json({
      threads: result.threads,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    logger.error('Failed to fetch user threads', {
      error: getErrorMessage(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Log incoming request for debugging cross-device issues
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Thread creation request received', {
        hasSessionHeader: !!request.headers.get('x-session-id'),
        hasCSRFToken: !!request.headers.get('x-csrf-token'),
        contentType: request.headers.get('content-type'),
      });
    }

    // Apply rate limiting (10 posts per minute per SECURITY_CONFIG)
    const rateLimitResult = await rateLimit(RateLimitType.POST_CREATE)(request);
    if (rateLimitResult) {
      logger.warn('Rate limit exceeded for thread creation');
      return rateLimitResult;
    }

    // Get session from header
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      logger.warn('Thread creation attempted without session');
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
      logger.warn('Invalid session for thread creation', {
        error: getErrorMessage(sessionError),
      });
      return NextResponse.json(
        { success: false, error: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = threadCreateSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Thread validation failed', {
        userId: currentUser.$id,
        errors: validation.error.issues,
      });
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid thread data',
        },
        { status: 400 }
      );
    }

    const { content, imageId, altText } = validation.data;
    
    // Check if we have new multi-media format
    const media = body.media as MediaItem[] | undefined;

    logger.info('Creating thread', {
      userId: currentUser.$id,
      hasImage: !!imageId,
      hasMedia: !!(media && media.length > 0),
      mediaCount: media?.length || 0,
      contentLength: content.length,
    });

    // Use new multi-media function if media array is provided
    let thread;
    if (media && media.length > 0) {
      thread = await createThreadWithMedia(
        currentUser.$id,
        content,
        media
      );
    } else {
      // Fall back to legacy single image function
      thread = await createThread(
        currentUser.$id,
        content,
        imageId,
        altText
      );
    }

    logger.info('Thread created successfully', {
      threadId: thread.$id,
      userId: currentUser.$id,
    });

    return NextResponse.json(
      { success: true, thread },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Thread creation failed', error instanceof Error ? error : new Error(errorMessage), {
      errorMessage,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}
