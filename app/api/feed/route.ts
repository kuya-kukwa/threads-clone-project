/**
 * Public Feed API Route
 * GET /api/feed
 * 
 * Features:
 * - Cursor-based pagination
 * - Public access (no auth required)
 * - Returns threads with author data
 * - Includes like status if user is authenticated
 * 
 * Query Parameters:
 * - cursor: Optional cursor for pagination (thread ID)
 * - limit: Number of threads to fetch (default: 20, max: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicFeed } from '@/lib/services/threadService';
import { LikeService } from '@/lib/services/likeService';
import { feedPaginationSchema } from '@/schemas/thread.schema';
import { createRequestLogger } from '@/lib/logger/requestLogger';
import { createSessionClient } from '@/lib/appwriteServer';
import { getErrorMessage } from '@/lib/errors';

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate pagination parameters
    const validation = feedPaginationSchema.safeParse({ cursor, limit });

    if (!validation.success) {
      logger.warn('Feed pagination validation failed', {
        errors: validation.error.issues,
      });
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid pagination parameters',
        },
        { status: 400 }
      );
    }

    logger.debug('Fetching public feed', {
      cursor,
      limit: validation.data.limit,
    });

    // Fetch feed
    const { threads, nextCursor, hasMore } = await getPublicFeed(
      validation.data.cursor,
      validation.data.limit
    );

    logger.debug('Feed fetched successfully', {
      threadCount: threads.length,
      hasMore,
    });

    // Try to get current user for like status
    let userId: string | null = null;
    try {
      const { account } = await createSessionClient(request);
      const user = await account.get();
      userId = user.$id;
    } catch {
      // User not authenticated, continue without like status
    }

    // Add like status if user is authenticated
    let threadsWithLikeStatus = threads;
    if (userId) {
      const threadIds = threads.map((t) => t.$id);
      const likeMap = await LikeService.getUserLikeStatusBatch(userId, threadIds);
      threadsWithLikeStatus = threads.map((thread) => ({
        ...thread,
        isLiked: likeMap.get(thread.$id) || false,
      }));
    }

    return NextResponse.json(
      {
        success: true,
        threads: threadsWithLikeStatus,
        nextCursor,
        hasMore,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Failed to fetch feed', error instanceof Error ? error : new Error(errorMessage), {
      errorMessage,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
