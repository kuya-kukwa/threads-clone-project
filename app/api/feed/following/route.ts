/**
 * Following Feed API Route
 * 
 * GET /api/feed/following - Get threads from users the current user follows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { FollowService } from '@/lib/services/followService';
import { LikeService } from '@/lib/services/likeService';
import { feedPaginationSchema } from '@/schemas/thread.schema';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feed/following
 * Get paginated feed of threads from followed users
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate pagination
    const validation = feedPaginationSchema.safeParse({ cursor, limit });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Invalid pagination',
        },
        { status: 400 }
      );
    }

    logger.info({
      msg: 'Fetching following feed',
      userId: user.$id,
      cursor,
      limit: validation.data.limit,
    });

    // Get following feed
    const { threads, nextCursor, hasMore, followingCount } = await FollowService.getFollowingFeed(
      user.$id,
      validation.data.cursor,
      validation.data.limit
    );

    // Get like status for all threads
    const threadIds = threads.map((t) => t.$id);
    const likeMap = await LikeService.getUserLikeStatusBatch(user.$id, threadIds);

    // Add like status to threads
    const threadsWithLikeStatus = threads.map((thread) => ({
      ...thread,
      isLiked: likeMap.get(thread.$id) || false,
    }));

    return NextResponse.json(
      {
        success: true,
        threads: threadsWithLikeStatus,
        nextCursor,
        hasMore,
        followingCount,
      },
      {
        headers: {
          // Personalized feed - private cache only, shorter duration
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    logger.error({
      msg: 'Following feed error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch following feed' },
      { status: 500 }
    );
  }
}
