/**
 * Thread Detail API
 * GET /api/threads/[id]
 * 
 * Retrieves a single thread by ID with author information
 * 
 * Security:
 * - Public read access
 * - Returns 404 if thread doesn't exist
 * - Validates thread ID parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases, createSessionClient } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread, ThreadWithAuthor, UserProfile } from '@/types/appwrite';
import { threadIdSchema } from '@/schemas/thread.schema';
import { logger } from '@/lib/logger/logger';
import { Query } from 'node-appwrite';
import { LikeService } from '@/lib/services/likeService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  
  try {
    // Await params
    const params = await context.params;
    
    // Validate thread ID
    const validation = threadIdSchema.safeParse({ id: params.id });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid thread ID',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    logger.info({
      msg: 'Fetching thread detail',
      threadId: id,
      requestId,
    });

    // Fetch thread document
    const thread = await serverDatabases.getDocument<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      id
    );

    if (!thread) {
      logger.warn({
        msg: 'Thread not found',
        threadId: id,
        requestId,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Thread not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Fetch author profile
    const authorResults = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', thread.authorId), Query.limit(1)]
    );

    const author = authorResults.documents[0];
    if (!author) {
      logger.error({
        msg: 'Author profile not found for thread',
        threadId: id,
        authorId: thread.authorId,
        requestId,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Thread data incomplete',
          code: 'AUTHOR_NOT_FOUND',
        },
        { status: 500 }
      );
    }

    // Combine thread with author
    const threadWithAuthor: ThreadWithAuthor = {
      ...thread,
      author,
    };

    // Try to get like status if user is authenticated
    let isLiked = false;
    try {
      const { account } = await createSessionClient(request);
      const user = await account.get();
      if (user) {
        const likeStatus = await LikeService.hasUserLikedThread(user.$id, thread.$id);
        isLiked = likeStatus.liked;
      }
    } catch {
      // User not authenticated, continue without like status
    }

    logger.info({
      msg: 'Thread fetched successfully',
      threadId: id,
      authorId: thread.authorId,
      hasParent: !!thread.parentThreadId,
      replyCount: thread.replyCount,
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...threadWithAuthor, isLiked },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    
    logger.error({
      msg: 'Error fetching thread',
      error: err.message,
      code: err.code,
      requestId,
    });

    // Handle not found (404 from Appwrite)
    if (err.code === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch thread',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
