/**
 * User Search API Route
 * 
 * Provides real-time search for usernames and display names
 * Uses Appwrite Query for efficient partial matching
 * 
 * @endpoint GET /api/search?q={query}&limit={limit}
 */

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { UserProfile } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

/**
 * Sanitize search query
 * Remove special characters and limit length
 */
function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .slice(0, 50);
}

/**
 * GET /api/search
 * Search users by username or display name
 * 
 * @query q - Search query string (min 1 character)
 * @query limit - Max results to return (default: 10, max: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      20
    );

    // Validate query
    if (!rawQuery || rawQuery.length < 1) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Empty search query',
      });
    }

    const query = sanitizeSearchQuery(rawQuery);

    if (!query) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Invalid search query',
      });
    }

    logger.info({
      msg: 'User search request',
      query,
      limit,
    });

    // Search by username (case-insensitive partial match)
    // Appwrite supports startsWith, contains for string queries
    const [usernameResults, displayNameResults] = await Promise.all([
      // Search usernames starting with query
      serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [
          Query.startsWith('username', query),
          Query.limit(limit),
          Query.orderDesc('$createdAt'),
        ]
      ),
      // Search display names containing query
      serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [
          Query.contains('displayName', query),
          Query.limit(limit),
          Query.orderDesc('$createdAt'),
        ]
      ),
    ]);

    // Combine and deduplicate results
    const seenIds = new Set<string>();
    const users: Array<{
      $id: string;
      userId: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      bio?: string;
    }> = [];

    // Add username matches first (higher priority)
    for (const user of usernameResults.documents) {
      if (!seenIds.has(user.$id)) {
        seenIds.add(user.$id);
        users.push({
          $id: user.$id,
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
        });
      }
    }

    // Add display name matches
    for (const user of displayNameResults.documents) {
      if (!seenIds.has(user.$id) && users.length < limit) {
        seenIds.add(user.$id);
        users.push({
          $id: user.$id,
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
        });
      }
    }

    logger.info({
      msg: 'User search completed',
      query,
      resultsCount: users.length,
    });

    return NextResponse.json({
      success: true,
      users,
      query,
    });
  } catch (error) {
    logger.error({
      msg: 'User search error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search users',
        users: [],
      },
      { status: 500 }
    );
  }
}
