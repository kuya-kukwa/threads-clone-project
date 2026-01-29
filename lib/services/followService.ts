/**
 * Follow Service
 * Handles follow/unfollow operations between users
 * 
 * Features:
 * - Follow/unfollow users
 * - Check follow status
 * - Get followers/following lists
 * - Get following feed
 */

import { ID, Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Follow, UserProfile, Thread, ThreadWithAuthor } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

export class FollowService {
  /**
   * Check if a user is following another user
   */
  static async isFollowing(
    followerId: string,
    followingId: string
  ): Promise<{ following: boolean; followId?: string }> {
    try {
      const response = await serverDatabases.listDocuments<Follow>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        [
          Query.equal('followerId', followerId),
          Query.equal('followingId', followingId),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        return { following: true, followId: response.documents[0].$id };
      }

      return { following: false };
    } catch (error) {
      logger.error({
        msg: 'Error checking follow status',
        followerId,
        followingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { following: false };
    }
  }

  /**
   * Follow a user
   */
  static async followUser(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; follow?: Follow; error?: string }> {
    try {
      // Can't follow yourself
      if (followerId === followingId) {
        return { success: false, error: 'Cannot follow yourself' };
      }

      // Check if already following
      const { following } = await this.isFollowing(followerId, followingId);
      if (following) {
        return { success: false, error: 'Already following this user' };
      }

      // Verify the target user exists
      const targetUsers = await serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('userId', followingId), Query.limit(1)]
      );

      if (targetUsers.documents.length === 0) {
        return { success: false, error: 'User not found' };
      }

      // Create follow document
      const follow = await serverDatabases.createDocument<Follow>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        ID.unique(),
        {
          followerId,
          followingId,
          createdAt: new Date().toISOString(),
        }
      );

      logger.info({
        msg: 'User followed',
        followerId,
        followingId,
        followId: follow.$id,
      });

      return { success: true, follow };
    } catch (error) {
      logger.error({
        msg: 'Error following user',
        followerId,
        followingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to follow user',
      };
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if following
      const { following, followId } = await this.isFollowing(followerId, followingId);
      if (!following || !followId) {
        return { success: false, error: 'Not following this user' };
      }

      // Delete follow document
      await serverDatabases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        followId
      );

      logger.info({
        msg: 'User unfollowed',
        followerId,
        followingId,
      });

      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Error unfollowing user',
        followerId,
        followingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unfollow user',
      };
    }
  }

  /**
   * Toggle follow status
   */
  static async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; following: boolean; error?: string }> {
    try {
      const { following } = await this.isFollowing(followerId, followingId);

      if (following) {
        const result = await this.unfollowUser(followerId, followingId);
        return { success: result.success, following: false, error: result.error };
      } else {
        const result = await this.followUser(followerId, followingId);
        return { success: result.success, following: true, error: result.error };
      }
    } catch (error) {
      logger.error({
        msg: 'Error toggling follow',
        followerId,
        followingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        following: false,
        error: error instanceof Error ? error.message : 'Failed to toggle follow',
      };
    }
  }

  /**
   * Get follower count for a user
   */
  static async getFollowerCount(userId: string): Promise<number> {
    try {
      const response = await serverDatabases.listDocuments<Follow>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        [Query.equal('followingId', userId), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      logger.error({
        msg: 'Error getting follower count',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Get following count for a user
   */
  static async getFollowingCount(userId: string): Promise<number> {
    try {
      const response = await serverDatabases.listDocuments<Follow>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        [Query.equal('followerId', userId), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      logger.error({
        msg: 'Error getting following count',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Get list of user IDs that a user is following
   */
  static async getFollowingIds(
    userId: string,
    limit: number = 100
  ): Promise<string[]> {
    try {
      const response = await serverDatabases.listDocuments<Follow>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.FOLLOWS,
        [
          Query.equal('followerId', userId),
          Query.limit(limit),
          Query.orderDesc('createdAt'),
        ]
      );

      return response.documents.map((f) => f.followingId);
    } catch (error) {
      logger.error({
        msg: 'Error getting following IDs',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get following feed - threads from users that currentUser follows
   */
  static async getFollowingFeed(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{ threads: ThreadWithAuthor[]; nextCursor: string | null; hasMore: boolean; followingCount: number }> {
    try {
      // Get list of users the current user follows
      const followingIds = await this.getFollowingIds(userId, 100);

      if (followingIds.length === 0) {
        return { threads: [], nextCursor: null, hasMore: false, followingCount: 0 };
      }

      // Build query for threads
      const queries: string[] = [
        Query.equal('authorId', followingIds),
        Query.equal('parentThreadId', ''), // Only top-level threads, not replies
        Query.orderDesc('createdAt'),
        Query.limit(limit + 1),
      ];

      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      // Fetch threads
      const response = await serverDatabases.listDocuments<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        queries
      );

      // Determine pagination
      const hasMore = response.documents.length > limit;
      const threads = hasMore
        ? response.documents.slice(0, limit)
        : response.documents;
      const nextCursor = hasMore && threads.length > 0
        ? threads[threads.length - 1].$id
        : null;

      // Get unique author IDs
      const authorIds = [...new Set(threads.map((t) => t.authorId))];

      // Fetch author profiles
      const authorsResponse = await serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('userId', authorIds), Query.limit(100)]
      );

      // Create author map
      const authorMap = new Map<string, UserProfile>();
      authorsResponse.documents.forEach((author) => {
        authorMap.set(author.userId, author);
      });

      // Combine threads with author data
      const threadsWithAuthors: ThreadWithAuthor[] = threads
        .filter((thread) => authorMap.has(thread.authorId))
        .map((thread) => ({
          ...thread,
          author: authorMap.get(thread.authorId)!,
        }));

      logger.info({
        msg: 'Following feed fetched',
        userId,
        followingCount: followingIds.length,
        threadCount: threadsWithAuthors.length,
        hasMore,
      });

      return { threads: threadsWithAuthors, nextCursor, hasMore, followingCount: followingIds.length };
    } catch (error) {
      logger.error({
        msg: 'Error getting following feed',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { threads: [], nextCursor: null, hasMore: false, followingCount: 0 };
    }
  }

  /**
   * Get follow counts for a user (followers and following)
   */
  static async getFollowCounts(
    userId: string
  ): Promise<{ followers: number; following: number }> {
    try {
      const [followers, following] = await Promise.all([
        this.getFollowerCount(userId),
        this.getFollowingCount(userId),
      ]);

      return { followers, following };
    } catch (error) {
      logger.error({
        msg: 'Error getting follow counts',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { followers: 0, following: 0 };
    }
  }
}
