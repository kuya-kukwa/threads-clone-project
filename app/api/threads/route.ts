/**
 * Thread Creation API Route
 * POST /api/threads
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
import { createThread } from '@/lib/services/threadService';
import { rateLimit, RateLimitType } from '@/lib/middleware/rateLimit';
import { threadCreateSchema } from '@/schemas/thread.schema';
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

    logger.info('Creating thread', {
      userId: currentUser.$id,
      hasImage: !!imageId,
      contentLength: content.length,
    });

    // Create thread
    const thread = await createThread(
      currentUser.$id,
      content,
      imageId,
      altText
    );

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
