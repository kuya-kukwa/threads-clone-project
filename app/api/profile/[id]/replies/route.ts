/**
 * User Replies API Route
 * 
 * GET /api/profile/[id]/replies
 * Fetches all replies (threads with parentThreadId) made by a specific user
 * 
 * Features:
 * - Paginated results
 * - Sorted by creation date (newest first)
 * - Public read access
 */

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/[id]/replies
 * Fetch replies by a specific user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const params = await context.params;
    const userId = params.id;

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );

    logger.info({
      msg: 'Fetching user replies',
      userId,
      cursor,
      limit,
      requestId,
    });

    // Build queries - find threads by this user that have a parentThreadId (are replies)
    const queries: string[] = [
      Query.equal('authorId', userId),
      Query.isNotNull('parentThreadId'),
      Query.orderDesc('createdAt'),
      Query.limit(limit + 1), // Fetch one extra to check if there's more
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    // Fetch replies
    const result = await serverDatabases.listDocuments<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      queries
    );

    // Determine pagination
    const hasMore = result.documents.length > limit;
    const replies = hasMore
      ? result.documents.slice(0, limit)
      : result.documents;
    const nextCursor = hasMore && replies.length > 0
      ? replies[replies.length - 1].$id
      : null;

    logger.info({
      msg: 'User replies fetched successfully',
      userId,
      count: replies.length,
      hasMore,
      requestId,
    });

    return NextResponse.json({
      success: true,
      replies,
      nextCursor,
      hasMore,
      total: result.total,
    });
  } catch (error) {
    logger.error({
      msg: 'Error fetching user replies',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch replies',
        replies: [],
      },
      { status: 500 }
    );
  }
}
