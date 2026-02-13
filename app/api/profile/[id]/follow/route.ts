/**
 * User Follow API Route
 * 
 * POST /api/profile/[id]/follow - Toggle follow on a user
 * GET /api/profile/[id]/follow - Check if current user is following
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { FollowService } from '@/lib/services/followService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/[id]/follow
 * Check if the current user is following the target user
 * Supports ?list=followers or ?list=following to get user lists
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const targetUserId = params.id;
    const { searchParams } = new URL(request.url);
    const listType = searchParams.get('list');

    // Handle list requests (followers/following)
    if (listType === 'followers' || listType === 'following') {
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = listType === 'followers'
        ? await FollowService.getFollowersList(targetUserId, limit, offset)
        : await FollowService.getFollowingList(targetUserId, limit, offset);

      // Check if current user follows each person — batch query instead of N+1
      let currentUserId: string | null = null;
      try {
        const { account } = await createSessionClient(request);
        const user = await account.get();
        currentUserId = user.$id;
      } catch {
        // Not authenticated, no follow status
      }

      // Single batch: get all IDs the current user follows from this list
      let followedSet = new Set<string>();
      if (currentUserId) {
        const userIds = result.users.map((u) => u.userId).filter((id) => id !== currentUserId);
        if (userIds.length > 0) {
          followedSet = await FollowService.getFollowingSetFor(currentUserId, userIds);
        }
      }

      const usersWithFollowStatus = result.users.map((user) => ({
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || null,
        isFollowedByMe: followedSet.has(user.userId),
        isOwnProfile: currentUserId === user.userId,
      }));

      return NextResponse.json({
        success: true,
        users: usersWithFollowStatus,
        total: result.total,
        listType,
      });
    }

    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { following } = await FollowService.isFollowing(user.$id, targetUserId);
    const counts = await FollowService.getFollowCounts(targetUserId);

    return NextResponse.json({
      success: true,
      following,
      targetUserId,
      followersCount: counts.followers,
      followingCount: counts.following,
    });
  } catch {
    // User not authenticated - return counts only
    try {
      const params = await context.params;
      const counts = await FollowService.getFollowCounts(params.id);
      return NextResponse.json({
        success: true,
        following: false,
        targetUserId: params.id,
        followersCount: counts.followers,
        followingCount: counts.following,
      });
    } catch {
      return NextResponse.json({
        success: true,
        following: false,
        targetUserId: (await context.params).id,
        followersCount: 0,
        followingCount: 0,
      });
    }
  }
}

/**
 * POST /api/profile/[id]/follow
 * Toggle follow status (follow if not following, unfollow if following)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const targetUserId = params.id;

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
      msg: 'Follow toggle request',
      followerId: user.$id,
      targetUserId,
    });

    const result = await FollowService.toggleFollow(user.$id, targetUserId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Get updated counts
    const counts = await FollowService.getFollowCounts(targetUserId);

    return NextResponse.json({
      success: true,
      following: result.following,
      targetUserId,
      followersCount: counts.followers,
      followingCount: counts.following,
    });
  } catch (error) {
    logger.error({
      msg: 'Follow toggle error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to toggle follow',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined,
      },
      { status: 500 }
    );
  }
}
