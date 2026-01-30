/**
 * Thread Replies API
 * GET /api/threads/[id]/replies
 * 
 * Retrieves paginated replies for a specific thread
 * 
 * Features:
 * - Cursor-based pagination
 * - Sorted by creation date (oldest first for better conversation flow)
 * - Includes author information
 * - Public read access
 * 
 * Query params:
 * - cursor: Optional cursor for pagination
 * - limit: Number of replies to fetch (default: 20, max: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread, ThreadWithAuthor, UserProfile } from '@/types/appwrite';
import { threadIdSchema, feedPaginationSchema } from '@/schemas/thread.schema';
import { logger } from '@/lib/logger/logger';
import { Query } from 'node-appwrite';

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

    const { id: threadId } = threadValidation.data;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination parameters
    const paginationValidation = feedPaginationSchema.safeParse({ cursor, limit });
    if (!paginationValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: paginationValidation.error.issues[0]?.message || 'Invalid pagination parameters',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const { cursor: validCursor, limit: validLimit } = paginationValidation.data;

    logger.info({
      msg: 'Fetching thread replies',
      threadId,
      cursor: validCursor,
      limit: validLimit,
      requestId,
    });

    // Verify parent thread exists
    try {
      await serverDatabases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        threadId
      );
    } catch (error: unknown) {
      const err = error as { code?: number };
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
      throw error;
    }

    // Build queries for replies
    const queries: string[] = [
      Query.equal('parentThreadId', threadId),
      Query.orderAsc('createdAt'), // Oldest first for conversation flow
      Query.limit(validLimit + 1), // Fetch one extra to determine if there are more
    ];

    // Add cursor if provided (fetch replies after this timestamp)
    if (validCursor) {
      queries.push(Query.cursorAfter(validCursor));
    }

    // Fetch replies
    const repliesResult = await serverDatabases.listDocuments<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      queries
    );

    // Determine if there are more replies
    const hasMore = repliesResult.documents.length > validLimit;
    const replies = hasMore
      ? repliesResult.documents.slice(0, validLimit)
      : repliesResult.documents;

    // Generate next cursor from last reply's $id
    const nextCursor = hasMore && replies.length > 0
      ? replies[replies.length - 1].$id
      : null;

    // If no replies, return early with empty array
    if (replies.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            replies: [],
            nextCursor: null,
            hasMore: false,
            total: 0,
          },
          requestId,
        },
        { status: 200 }
      );
    }

    // Fetch author profiles for all replies
    const authorIds = [...new Set(replies.map((r) => r.authorId))];
    const authorsResult = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', authorIds), Query.limit(100)]
    );

    // Create author lookup map
    const authorMap = new Map<string, UserProfile>();
    authorsResult.documents.forEach((author) => {
      authorMap.set(author.userId, author);
    });

    // Combine replies with author data
    const repliesWithAuthors: ThreadWithAuthor[] = replies
      .filter((reply) => {
        const author = authorMap.get(reply.authorId);
        if (!author) {
          logger.warn({
            msg: 'Author not found for reply, skipping',
            replyId: reply.$id,
            authorId: reply.authorId,
          });
          return false;
        }
        return true;
      })
      .map((reply) => ({
        ...reply,
        author: authorMap.get(reply.authorId)!,
      }));

    logger.info({
      msg: 'Replies fetched successfully',
      threadId,
      count: replies.length,
      hasMore,
      requestId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          replies: repliesWithAuthors,
          nextCursor,
          hasMore,
          total: repliesResult.total,
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    
    logger.error({
      msg: 'Error fetching replies',
      error: err.message,
      code: err.code,
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch replies',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
