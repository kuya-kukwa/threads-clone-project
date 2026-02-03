/**
 * Suggested Users API Route
 * GET /api/users/suggested
 * Returns users that the current user might want to follow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient, serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Query } from 'node-appwrite';
import { UserProfile } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user
    const { account } = createSessionClient(sessionId);
    const currentUser = await account.get();

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    // Get users that the current user is following
    let followingIds: string[] = [];
    try {
      const followingResponse = await serverDatabases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        [
          Query.equal('followerId', currentUser.$id),
          Query.limit(100),
        ]
      );
      followingIds = followingResponse.documents.map(doc => doc.followingId as string);
    } catch (error) {
      logger.debug({ msg: 'No follows collection or empty', error });
    }

    // Get users excluding current user and those already followed
    const excludeIds = [currentUser.$id, ...followingIds];
    
    // Fetch random users (in real app, you'd want a recommendation algorithm)
    const usersResponse = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [
        Query.limit(limit + excludeIds.length), // Fetch extra to account for filtering
        Query.orderDesc('$createdAt'),
      ]
    );

    // Filter out excluded users and limit
    const suggestedUsers = usersResponse.documents
      .filter(user => !excludeIds.includes(user.userId))
      .slice(0, limit)
      .map(user => ({
        $id: user.$id,
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isFollowing: false,
      }));

    return NextResponse.json({
      success: true,
      users: suggestedUsers,
    });
  } catch (error) {
    logger.error({ msg: 'Failed to fetch suggested users', error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggested users' },
      { status: 500 }
    );
  }
}
