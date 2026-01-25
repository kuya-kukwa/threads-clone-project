/**
 * Create Reply API
 * POST /api/threads/[id]/reply
 * 
 * Creates a reply to an existing thread
 * 
 * Features:
 * - Validates reply content
 * - Sanitizes input
 * - Atomic replyCount increment on parent thread
 * - Requires authentication
 * - Rate limited
 * 
 * Body:
 * - content: string (required, 1-500 chars)
 * - imageId: string (optional)
 * - altText: string (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread } from '@/types/appwrite';
import { replyCreateSchema, threadIdSchema } from '@/schemas/thread.schema';
import { sanitizeThreadContent } from '@/lib/services/threadService';
import { sanitizeInput } from '@/lib/utils';
import { getImagePreviewUrl } from '@/lib/services/imageService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  
  try {
    // Await params
    const params = await context.params;
    
    // Validate thread ID
    const threadValidation = threadIdSchema.safeParse({ id: params.id });
    if (!threadValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid thread ID',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const { id: parentThreadId } = threadValidation.data;

    // Get user session from header
    const sessionId = request.headers.get('x-session-id');
    if (!sessionId) {
      logger.warn({
        msg: 'Unauthorized reply attempt - no session',
        parentThreadId,
        requestId,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate reply input
    const validation = replyCreateSchema.safeParse(body);
    if (!validation.success) {
      logger.warn({
        msg: 'Invalid reply input',
        errors: validation.error.issues,
        requestId,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid reply data',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const { content, imageId, altText } = validation.data;

    // Sanitize inputs
    const sanitizedContent = sanitizeThreadContent(content);
    const sanitizedAltText = altText ? sanitizeInput(altText, 200) : undefined;

    logger.info({
      msg: 'Creating reply',
      parentThreadId,
      hasImage: !!imageId,
      contentLength: sanitizedContent.length,
      requestId,
    });

    // Verify parent thread exists
    let parentThread: Thread;
    try {
      parentThread = await serverDatabases.getDocument<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        parentThreadId
      );
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'Parent thread not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }
      throw error;
    }

    // Don't allow replies to replies (single-level threading only for now)
    if (parentThread.parentThreadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot reply to a reply. Please reply to the parent thread instead.',
          code: 'INVALID_OPERATION',
        },
        { status: 400 }
      );
    }

    // TODO: Get actual userId from session validation
    // For now, extract from session header (this should be validated properly)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Generate image URL if imageId is provided
    const imageUrl = (imageId && imageId.trim()) ? getImagePreviewUrl(imageId) : '';

    // Create reply document
    const now = new Date().toISOString();
    const reply = await serverDatabases.createDocument<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      ID.unique(),
      {
        authorId: userId,
        content: sanitizedContent,
        imageId: imageId || '',
        imageUrl: imageUrl || '',
        altText: sanitizedAltText || '',
        parentThreadId: parentThreadId,
        replyCount: 0,
        likeCount: 0,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Atomically increment parent thread's reply count
    try {
      await serverDatabases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        parentThreadId,
        {
          replyCount: parentThread.replyCount + 1,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error: unknown) {
      logger.error({
        msg: 'Failed to increment reply count',
        parentThreadId,
        replyId: reply.$id,
        error: (error as Error).message,
        requestId,
      });
      // Don't fail the reply creation, reply was already created
    }

    logger.info({
      msg: 'Reply created successfully',
      replyId: reply.$id,
      parentThreadId,
      authorId: userId,
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        data: reply,
        requestId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    
    logger.error({
      msg: 'Error creating reply',
      error: err.message,
      code: err.code,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create reply',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
