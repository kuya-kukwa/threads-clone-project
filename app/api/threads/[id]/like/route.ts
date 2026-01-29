/**
 * Thread Like API Route
 * 
 * POST /api/threads/[id]/like - Toggle like on a thread
 * GET /api/threads/[id]/like - Check if user has liked the thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { LikeService } from '@/lib/services/likeService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/threads/[id]/like
 * Check if the current user has liked the thread
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const threadId = params.id;

    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { liked } = await LikeService.hasUserLikedThread(user.$id, threadId);

    return NextResponse.json({
      success: true,
      liked,
      threadId,
    });
  } catch {
    // User not authenticated
    return NextResponse.json({
      success: true,
      liked: false,
      threadId: (await context.params).id,
    });
  }
}

/**
 * POST /api/threads/[id]/like
 * Toggle like on a thread (like if not liked, unlike if liked)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const threadId = params.id;

    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info({
      msg: 'Like toggle request',
      userId: user.$id,
      threadId,
    });

    const result = await LikeService.toggleLike(user.$id, threadId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: result.liked,
      likeCount: result.likeCount,
      threadId,
    });
  } catch (error) {
    logger.error({
      msg: 'Like toggle error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to toggle like',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined,
      },
      { status: 500 }
    );
  }
}
