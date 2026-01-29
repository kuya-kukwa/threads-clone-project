/**
 * Like Service
 * Handles like/unlike operations for threads
 * 
 * Features:
 * - Toggle like (create or delete)
 * - Check if user has liked a thread
 * - Update thread like counts (denormalized)
 */

import { ID, Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Like, Thread } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';
import { NotificationService } from './notificationService';

export class LikeService {
  /**
   * Check if a user has liked a thread
   */
  static async hasUserLikedThread(
    userId: string,
    threadId: string
  ): Promise<{ liked: boolean; likeId?: string }> {
    try {
      const response = await serverDatabases.listDocuments<Like>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.LIKES,
        [
          Query.equal('userId', userId),
          Query.equal('threadId', threadId),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        return { liked: true, likeId: response.documents[0].$id };
      }

      return { liked: false };
    } catch (error) {
      logger.error({
        msg: 'Error checking user like status',
        userId,
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { liked: false };
    }
  }

  /**
   * Like a thread
   */
  static async likeThread(
    userId: string,
    threadId: string
  ): Promise<{ success: boolean; like?: Like; error?: string }> {
    try {
      // Check if already liked
      const { liked } = await this.hasUserLikedThread(userId, threadId);
      if (liked) {
        return { success: false, error: 'Thread already liked' };
      }

      // Verify thread exists and get current count
      const thread = await serverDatabases.getDocument<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        threadId
      );

      // Create like document
      const like = await serverDatabases.createDocument<Like>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.LIKES,
        ID.unique(),
        {
          userId,
          threadId,
          createdAt: new Date().toISOString(),
        }
      );

      logger.info({
        msg: 'Like document created',
        userId,
        threadId,
        likeId: like.$id,
        databaseId: APPWRITE_CONFIG.DATABASE_ID,
        collectionId: APPWRITE_CONFIG.COLLECTIONS.LIKES,
      });

      // Update thread like count (denormalized)
      await serverDatabases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        threadId,
        {
          likeCount: (thread.likeCount || 0) + 1,
        }
      );

      logger.info({
        msg: 'Thread liked',
        userId,
        threadId,
        likeId: like.$id,
      });

      // Create notification for thread author (async, non-blocking, fail-safe)
      try {
        NotificationService.notifyLike(thread.authorId, userId, threadId).catch(
          (err) => logger.error({ msg: 'Failed to create like notification', error: err })
        );
      } catch (notifError) {
        // Don't let notification errors affect the like operation
        logger.error({ msg: 'Notification service error (like)', error: notifError });
      }

      return { success: true, like };
    } catch (error) {
      logger.error({
        msg: 'Error liking thread',
        userId,
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like thread',
      };
    }
  }

  /**
   * Unlike a thread
   */
  static async unlikeThread(
    userId: string,
    threadId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if liked
      const { liked, likeId } = await this.hasUserLikedThread(userId, threadId);
      if (!liked || !likeId) {
        return { success: false, error: 'Thread not liked' };
      }

      // Verify thread exists and get current count
      const thread = await serverDatabases.getDocument<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        threadId
      );

      // Delete like document
      await serverDatabases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.LIKES,
        likeId
      );

      // Update thread like count (denormalized)
      await serverDatabases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        threadId,
        {
          likeCount: Math.max((thread.likeCount || 0) - 1, 0),
        }
      );

      logger.info({
        msg: 'Thread unliked',
        userId,
        threadId,
      });

      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Error unliking thread',
        userId,
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike thread',
      };
    }
  }

  /**
   * Toggle like status (convenience method)
   */
  static async toggleLike(
    userId: string,
    threadId: string
  ): Promise<{ success: boolean; liked: boolean; likeCount: number; error?: string }> {
    try {
      const { liked } = await this.hasUserLikedThread(userId, threadId);

      if (liked) {
        const result = await this.unlikeThread(userId, threadId);
        if (result.success) {
          // Get updated count
          const thread = await serverDatabases.getDocument<Thread>(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTIONS.THREADS,
            threadId
          );
          return { success: true, liked: false, likeCount: thread.likeCount || 0 };
        }
        return { success: false, liked: true, likeCount: 0, error: result.error };
      } else {
        const result = await this.likeThread(userId, threadId);
        if (result.success) {
          // Get updated count
          const thread = await serverDatabases.getDocument<Thread>(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTIONS.THREADS,
            threadId
          );
          return { success: true, liked: true, likeCount: thread.likeCount || 0 };
        }
        return { success: false, liked: false, likeCount: 0, error: result.error };
      }
    } catch (error) {
      logger.error({
        msg: 'Error toggling like',
        userId,
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        liked: false,
        likeCount: 0,
        error: error instanceof Error ? error.message : 'Failed to toggle like',
      };
    }
  }

  /**
   * Get like status for multiple threads (batch)
   * Useful for feed display
   */
  static async getUserLikeStatusBatch(
    userId: string,
    threadIds: string[]
  ): Promise<Map<string, boolean>> {
    const likeMap = new Map<string, boolean>();

    if (!userId || threadIds.length === 0) {
      return likeMap;
    }

    try {
      // Initialize all as false
      threadIds.forEach((id) => likeMap.set(id, false));

      // Query all likes by this user for these threads
      const response = await serverDatabases.listDocuments<Like>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.LIKES,
        [
          Query.equal('userId', userId),
          Query.equal('threadId', threadIds),
          Query.limit(100),
        ]
      );

      // Mark liked threads
      response.documents.forEach((like) => {
        likeMap.set(like.threadId, true);
      });

      return likeMap;
    } catch (error) {
      logger.error({
        msg: 'Error getting batch like status',
        userId,
        threadCount: threadIds.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return likeMap;
    }
  }
}
