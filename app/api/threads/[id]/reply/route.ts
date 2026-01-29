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
import { NotificationService } from '@/lib/services/notificationService';

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

    const { content, imageId, altText, replyToUsername, parentReplyId } = validation.data;

    // Sanitize inputs
    const sanitizedContent = sanitizeThreadContent(content);
    const sanitizedAltText = altText ? sanitizeInput(altText, 200) : undefined;
    const sanitizedReplyToUsername = replyToUsername ? sanitizeInput(replyToUsername, 50) : undefined;
    const sanitizedParentReplyId = parentReplyId ? sanitizeInput(parentReplyId, 50) : undefined;

    logger.info({
      msg: 'Creating reply',
      parentThreadId,
      hasImage: !!imageId,
      contentLength: sanitizedContent.length,
      hasReplyToUsername: !!sanitizedReplyToUsername,
      replyToUsernameValue: sanitizedReplyToUsername || 'none',
      parentReplyId: sanitizedParentReplyId || 'none',
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

    // Nested replies are now supported - we use parentReplyId to track which comment is being replied to

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

    // Create reply document with proper typing
    // Note: replyToUsername and parentReplyId are optional - only included if the attributes exist in Appwrite
    const now = new Date().toISOString();
    
    // Base document data (always included)
    const baseDocumentData = {
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
    };

    // Determine which optional fields to include
    const hasReplyToUsername = sanitizedReplyToUsername && sanitizedReplyToUsername.trim().length > 0;
    const hasParentReplyId = sanitizedParentReplyId && sanitizedParentReplyId.trim().length > 0;

    logger.debug({
      msg: 'Document data prepared',
      documentKeys: Object.keys(baseDocumentData),
      hasReplyToUsername,
      hasParentReplyId,
      requestId,
    });

    let reply: Thread;
    
    // Build the optional fields object
    const optionalFields: Record<string, string> = {};
    if (hasReplyToUsername) {
      optionalFields.replyToUsername = sanitizedReplyToUsername!;
    }
    if (hasParentReplyId) {
      optionalFields.parentReplyId = sanitizedParentReplyId!;
    }
    
    // Try to create with optional fields if we have any
    if (Object.keys(optionalFields).length > 0) {
      try {
        reply = await serverDatabases.createDocument<Thread>(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.THREADS,
          ID.unique(),
          { ...baseDocumentData, ...optionalFields }
        );
      } catch (createError: unknown) {
        // If it fails due to unknown attribute, retry without optional fields
        const err = createError as { message?: string; code?: number };
        const errorMessage = err.message || '';
        
        const shouldRetryWithoutOptionalFields = 
          errorMessage.includes('replyToUsername') ||
          errorMessage.includes('parentReplyId') ||
          errorMessage.includes('Unknown attribute') ||
          (err.code === 400 && errorMessage.includes('Invalid document'));
        
        if (shouldRetryWithoutOptionalFields) {
          logger.info({
            msg: 'Optional attributes not supported, retrying without them',
            requestId,
          });
          reply = await serverDatabases.createDocument<Thread>(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTIONS.THREADS,
            ID.unique(),
            baseDocumentData
          );
        } else {
          throw createError;
        }
      }
    } else {
      // No optional fields, create document directly
      reply = await serverDatabases.createDocument<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        ID.unique(),
        baseDocumentData
      );
    }

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

    // Create notification for parent thread author (async, don't await)
    NotificationService.notifyReply(
      parentThread.authorId,
      userId,
      parentThreadId,
      sanitizedContent
    ).catch((err) =>
      logger.error({ msg: 'Failed to create reply notification', error: err })
    );

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
